import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api';
import './NotificationMenu.css';

const NOTIFICATION_LIMIT = 20;
const UNREAD_REFRESH_INTERVAL = 60 * 1000;

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
    <path d="M10 21h4"></path>
  </svg>
);

const notificationIcon = (type = '') => {
  if (type.includes('interview')) return '📅';
  if (type.includes('shortlist')) return '★';
  if (type.includes('reject')) return '×';
  if (type.includes('application')) return '✦';
  if (type.includes('message')) return '✉';
  return '•';
};

const parseNotificationData = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const elapsed = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return 'Just now';
  if (elapsed < hour) return `${Math.floor(elapsed / minute)} min ago`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)} hr ago`;
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)} days ago`;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getNotificationTarget = (notification, role) => {
  const data = parseNotificationData(notification.data);

  if (role === 'employer') {
    if (notification.type?.includes('application') || data.application_id) {
      return '/dashboard/employer/applicants';
    }

    return '/dashboard/employer';
  }

  return '/dashboard/job-seeker';
};

const NotificationMenu = ({ role }) => {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(Number(data.unread_count) || 0);
    } catch {
      // Keep the last known badge value when a background refresh fails.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getNotifications({ page: 1, limit: NOTIFICATION_LIMIT });
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unread_count) || 0);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(loadUnreadCount, 0);
    const intervalId = window.setInterval(loadUnreadCount, UNREAD_REFRESH_INTERVAL);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadUnreadCount();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMenuToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) loadNotifications();
  };

  const markReadLocally = (notificationId) => {
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId
        ? { ...notification, is_read: true, read_at: notification.read_at || new Date().toISOString() }
        : notification
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const handleNotificationClick = async (notification) => {
    setIsOpen(false);

    if (!notification.is_read) {
      markReadLocally(notification.id);

      try {
        await markNotificationRead(notification.id);
      } catch {
        loadUnreadCount();
      }
    }

    navigate(getNotificationTarget(notification, role));
  };

  const handleMeetingLink = async (event, notification) => {
    event.stopPropagation();

    if (!notification.is_read) {
      markReadLocally(notification.id);

      try {
        await markNotificationRead(notification.id);
      } catch {
        loadUnreadCount();
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError('');

    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({
        ...notification,
        is_read: true,
        read_at: notification.read_at || new Date().toISOString(),
      })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="notification-center" ref={menuRef}>
      <button
        type="button"
        className={`notification-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={handleMenuToggle}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="notification-popover" role="dialog" aria-label="Notifications">
          <header className="notification-popover-head">
            <div>
              <span>Updates</span>
              <h2>Notifications</h2>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAll}
            >
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          </header>

          <div className="notification-list" aria-live="polite">
            {loading ? (
              <div className="notification-loading" aria-label="Loading notifications">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : error ? (
              <div className="notification-state is-error">
                <strong>Notifications unavailable</strong>
                <p>{error}</p>
                <button type="button" onClick={loadNotifications}>Try again</button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-state">
                <span className="notification-empty-icon">✓</span>
                <strong>You are all caught up</strong>
                <p>New job and account updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const data = parseNotificationData(notification.data);
                const meetingLink = typeof data.meeting_link === 'string' && /^https?:\/\//i.test(data.meeting_link)
                  ? data.meeting_link
                  : '';

                return (
                  <article
                    className={`notification-item ${notification.is_read ? 'is-read' : 'is-unread'}`}
                    key={notification.id}
                  >
                    <button
                      type="button"
                      className="notification-item-main"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className={`notification-type-icon is-${notification.type || 'general'}`}>
                        {notificationIcon(notification.type)}
                      </span>
                      <span className="notification-copy">
                        <strong>{notification.title || 'Notification'}</strong>
                        <span>{notification.body || 'You have a new update.'}</span>
                        <time dateTime={notification.created_at}>
                          {formatNotificationTime(notification.created_at)}
                        </time>
                      </span>
                      {!notification.is_read && <span className="notification-unread-dot" aria-label="Unread"></span>}
                    </button>

                    {meetingLink && (
                      <a
                        className="notification-meeting-link"
                        href={meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => handleMeetingLink(event, notification)}
                      >
                        Open interview link
                      </a>
                    )}
                  </article>
                );
              })
            )}
          </div>

          {!loading && notifications.length > 0 && (
            <footer className="notification-popover-foot">
              Showing latest {notifications.length} notifications
            </footer>
          )}
        </section>
      )}
    </div>
  );
};

export default NotificationMenu;
