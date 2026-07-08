import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { io } from 'socket.io-client';
import ChatAttachment from '../../components/ChatAttachment/ChatAttachment';
import {
  API_BASE_URL,
  authApiRequest,
  getGigJobApplicants,
  getJobApplicants,
  resolveAssetUrl,
  updateApplicationStatus,
  updateGigApplicationStatus,
} from '../../api';

const SOCKET_URL = API_BASE_URL || window.location.origin;

const APPLICATION_STATUSES = [
  'applied',
  'reviewing',
  'shortlisted',
  'offered',
  'rejected',
  'accepted',
  'hired',
  'completed',
  'cancelled',
];

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatStatus = (value) => String(value || '').replace(/_/g, ' ');

const formatAmount = (value) => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
};

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeSkills = (value) => {
  if (Array.isArray(value)) {
    return value.map((skill) => skill?.name || skill).filter(Boolean);
  }
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    return normalizeSkills(JSON.parse(value));
  } catch {
    return value.split(',').map((skill) => skill.trim()).filter(Boolean);
  }
};

const normalizeApplicant = (application, jobsByKey, source = 'job') => {
  const isGig = source === 'gig';
  const user = application.user || application.applicant || {};
  const profile = user.seeker_profile || {};
  const includedJob = isGig ? application.gigJob : application.job;
  const jobId = includedJob?.id || (isGig ? application.gig_job_id : application.job_id);
  const job = {
    ...(jobsByKey.get(`${source}:${jobId}`) || {}),
    ...(includedJob || {}),
  };
  const skills = normalizeSkills(user.skills).length > 0
    ? normalizeSkills(user.skills)
    : normalizeSkills(application.skills);

  return {
    id: application.id,
    key: `${source}:${application.id}`,
    source,
    sourceLabel: isGig ? 'Gig' : 'Job',
    status: application.status || 'applied',
    applied: formatDate(application.applied_at || application.created_at),
    appliedAt: application.applied_at || application.created_at,
    updatedAt: application.updated_at,
    userId: user.id || application.user_id,
    name: user.full_name || user.name || application.full_name || 'Candidate',
    phone: user.phone || application.mobile_number || '',
    email: user.email || '',
    avatar: resolveAssetUrl(user.avatar || '', '/uploads/avatars'),
    coverLetter: application.cover_letter || '',
    proposedAmount: application.proposed_amount,
    headline: profile.headline || '',
    bio: profile.bio || '',
    experienceYears: profile.experience_years || formatStatus(application.experience),
    location: profile.current_location || application.location || '',
    expectedSalary: profile.expected_salary || application.expected_salary,
    resumeUrl: resolveAssetUrl(profile.resume_path || '', '/uploads/resumes'),
    jobType: profile.jobType?.name || (isGig ? 'Gig' : ''),
    jobShift: profile.jobShift?.name || '',
    industry: profile.industry?.name || job.industry || '',
    jobCategory: profile.jobCategory?.name || job.category || '',
    jobRole: profile.jobRole?.name || job.role || '',
    qualification: profile.qualification?.name || formatStatus(application.education),
    specialization: profile.courseSpecialization?.name || '',
    skills,
    experiences: user.experiences || [],
    projects: user.projects || [],
    availableImmediately: isGig ? Boolean(application.available_immediately) : null,
    job: {
      id: job.id || jobId,
      title: job.title || (isGig ? 'Gig' : 'Job'),
      currency: job.currency_code || 'INR',
      amount: job.amount,
      paymentType: formatStatus(job.payment_type || job.paymentType),
      workDuration: formatStatus(job.work_duration || job.workDuration),
      city: job.city || '',
    },
  };
};

const DetailItem = ({ label, value }) => (
  <div className="employer-candidate-detail">
    <dt>{label}</dt>
    <dd>{value || 'Not provided'}</dd>
  </div>
);

const Applicants = () => {
  const { jobs = [], profile, refreshDashboard } = useOutletContext();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [jobKey, setJobKey] = useState('all');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState({ type: '', message: '' });
  const [busyApplicantKey, setBusyApplicantKey] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [panelMode, setPanelMode] = useState('details');
  const [shortlistApplicant, setShortlistApplicant] = useState(null);
  const [interviewForm, setInterviewForm] = useState({ scheduledAt: '', meetingLink: '' });
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messageFile, setMessageFile] = useState(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const requestIdRef = useRef(0);
  const messagesEndRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const currentUserId = profile?.id;

  const jobsByKey = useMemo(
    () => new Map(jobs.map((job) => [job.key || `${job.source || 'job'}:${job.id}`, job])),
    [jobs]
  );

  const selectableJobs = useMemo(
    () => (source === 'all' ? jobs : jobs.filter((job) => job.source === source)),
    [jobs, source]
  );

  const requestApplicants = useCallback(async () => {
    const selectedJob = jobKey === 'all' ? null : jobsByKey.get(jobKey);
    const statusFilter = status !== 'all' ? status : undefined;
    const includeJobs = selectedJob ? selectedJob.source === 'job' : source !== 'gig';
    const includeGigs = selectedJob ? selectedJob.source === 'gig' : source !== 'job';

    const [jobData, gigData] = await Promise.all([
      includeJobs
        ? getJobApplicants({
          status: statusFilter,
          job_id: selectedJob?.source === 'job' ? selectedJob.id : undefined,
        })
        : Promise.resolve({ applicants: [] }),
      includeGigs
        ? getGigJobApplicants({
          status: statusFilter,
          gig_job_id: selectedJob?.source === 'gig' ? selectedJob.id : undefined,
        })
        : Promise.resolve({ applicants: [] }),
    ]);

    return [
      ...(jobData.applicants || []).map((application) => normalizeApplicant(application, jobsByKey, 'job')),
      ...(gigData.applicants || []).map((application) => normalizeApplicant(application, jobsByKey, 'gig')),
    ].sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
  }, [jobKey, jobsByKey, source, status]);

  const loadApplicants = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const normalizedApplicants = await requestApplicants();
      if (requestId !== requestIdRef.current) return;
      setApplicants(normalizedApplicants);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load applicants');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [requestApplicants]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    requestApplicants()
      .then((normalizedApplicants) => {
        if (requestId !== requestIdRef.current) return;
        setApplicants(normalizedApplicants);
        setError(null);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setError(err.message || 'Failed to load applicants');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [requestApplicants]);

  const visibleApplicants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return applicants.filter((applicant) => {
      if (!normalizedQuery) return true;
      return [
        applicant.name,
        applicant.email,
        applicant.phone,
        applicant.headline,
        applicant.location,
        applicant.job.title,
        ...applicant.skills,
      ]
        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    });
  }, [applicants, query]);

  const selectedUserId = selectedApplicant?.userId;

  const appendMessage = useCallback((newMessage) => {
    if (!newMessage?.id) return;
    setMessages((current) => (
      current.some((message) => message.id === newMessage.id)
        ? current
        : [...current, newMessage]
    ));
  }, []);

  const loadConversation = async (applicant) => {
    if (!applicant?.userId) {
      setChatError('This applicant does not have a valid user account.');
      return;
    }

    setSelectedApplicant(applicant);
    setPanelMode('chat');
    setMessageLoading(true);
    setMessages([]);
    setMessageFile(null);
    setChatError('');

    try {
      const data = await authApiRequest(`/api/messages?user_id=${applicant.userId}&page=1&limit=100`);
      setMessages(data.messages || []);
      await authApiRequest('/api/messages/read', {
        method: 'PATCH',
        body: JSON.stringify({ sender_id: applicant.userId }),
      });
    } catch (chatRequestError) {
      setChatError(chatRequestError.message || 'Unable to load this conversation.');
    } finally {
      setMessageLoading(false);
    }
  };

  const openApplicantDetails = (applicant) => {
    setSelectedApplicant(applicant);
    setPanelMode('details');
    setChatError('');
  };

  const closeApplicantPanel = () => {
    setSelectedApplicant(null);
    setMessages([]);
    setMessageText('');
    setMessageFile(null);
    setChatError('');
  };

  useEffect(() => {
    if (!selectedApplicant) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeApplicantPanel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedApplicant]);

  useEffect(() => {
    if (panelMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, panelMode]);

  useEffect(() => {
    if (!currentUserId || !selectedUserId || panelMode !== 'chat') return undefined;

    const candidateUserId = Number(selectedUserId);
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      socket.emit('send-user-id', currentUserId);
    });

    socket.on('message-received', (payload) => {
      const newMessage = payload?.chat_message;
      if (Number(newMessage?.sender_id) !== candidateUserId) return;
      appendMessage(newMessage);
      authApiRequest('/api/messages/read', {
        method: 'PATCH',
        body: JSON.stringify({ sender_id: candidateUserId }),
      }).catch(() => {});
    });

    socket.on('message-sent', (payload) => {
      const newMessage = payload?.chat_message;
      if (Number(newMessage?.receiver_id) === candidateUserId) appendMessage(newMessage);
    });

    return () => socket.disconnect();
  }, [appendMessage, currentUserId, panelMode, selectedUserId]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmedMessage = messageText.trim();
    if (!selectedApplicant?.userId || (!trimmedMessage && !messageFile) || messageSending) return;

    setMessageSending(true);
    setChatError('');
    try {
      const payload = new FormData();
      payload.append('receiver_id', String(selectedApplicant.userId));
      if (trimmedMessage) payload.append('message', trimmedMessage);
      if (messageFile) payload.append('attachment', messageFile);

      const data = await authApiRequest('/api/messages/send', {
        method: 'POST',
        body: payload,
      });
      appendMessage(data.chat_message);
      setMessageText('');
      setMessageFile(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    } catch (chatRequestError) {
      setChatError(chatRequestError.message || 'Unable to send the message.');
    } finally {
      setMessageSending(false);
    }
  };

  const selectMessageFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 15 * 1024 * 1024) {
      setChatError('Attachment must be 15MB or smaller.');
      event.target.value = '';
      setMessageFile(null);
      return;
    }
    setChatError('');
    setMessageFile(file);
  };

  const handleRefresh = () => {
    setActionNotice({ type: '', message: '' });
    loadApplicants();
    refreshDashboard();
  };

  const openShortlistForm = (applicant) => {
    setShortlistApplicant(applicant);
    setInterviewForm({ scheduledAt: '', meetingLink: '' });
    setActionNotice({ type: '', message: '' });
  };

  const handleShortlist = async (event) => {
    event.preventDefault();
    if (!shortlistApplicant) return;

    const scheduledAt = new Date(interviewForm.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      setActionNotice({ type: 'error', message: 'Enter a valid interview date and time.' });
      return;
    }

    const applicant = shortlistApplicant;
    const isReschedule = applicant.status === 'shortlisted';
    setBusyApplicantKey(applicant.key);
    setActionNotice({ type: '', message: '' });
    try {
      const updateStatus = applicant.source === 'gig'
        ? updateGigApplicationStatus
        : updateApplicationStatus;
      await updateStatus(applicant.id, {
        status: 'shortlisted',
        interview: {
          scheduled_at: scheduledAt.toISOString(),
          meeting_link: interviewForm.meetingLink.trim(),
        },
      });
      setSelectedApplicant((current) => (
        current?.key === applicant.key ? { ...current, status: 'shortlisted' } : current
      ));
      setShortlistApplicant(null);
      await loadApplicants();
      if (panelMode === 'chat' && selectedApplicant?.key === applicant.key) {
        await loadConversation({ ...selectedApplicant, status: 'shortlisted' });
      }
      refreshDashboard();
      setActionNotice({
        type: 'success',
        message: isReschedule
          ? `${applicant.name}'s interview was rescheduled.`
          : `${applicant.name} was shortlisted.`,
      });
    } catch (e) {
      setActionNotice({ type: 'error', message: e.message || 'Failed to shortlist applicant.' });
    } finally {
      setBusyApplicantKey(null);
    }
  };

  const handleReject = async (applicant) => {
    if (!window.confirm(`Reject ${applicant.name}'s application?`)) return;

    setBusyApplicantKey(applicant.key);
    setActionNotice({ type: '', message: '' });
    try {
      const updateStatus = applicant.source === 'gig'
        ? updateGigApplicationStatus
        : updateApplicationStatus;
      await updateStatus(applicant.id, { status: 'rejected' });
      setSelectedApplicant((current) => (
        current?.key === applicant.key ? { ...current, status: 'rejected' } : current
      ));
      await loadApplicants();
      refreshDashboard();
      setActionNotice({ type: 'success', message: `${applicant.name}'s application was rejected.` });
    } catch (e) {
      setActionNotice({ type: 'error', message: e.message || 'Failed to reject applicant.' });
    } finally {
      setBusyApplicantKey(null);
    }
  };

  const handleOffer = async (applicant) => {
    setBusyApplicantKey(applicant.key);
    setActionNotice({ type: '', message: '' });
    try {
      const updateStatus = applicant.source === 'gig'
        ? updateGigApplicationStatus
        : updateApplicationStatus;
      await updateStatus(applicant.id, { status: 'offered' });
      setSelectedApplicant((current) => (
        current?.key === applicant.key ? { ...current, status: 'offered' } : current
      ));
      await loadApplicants();
      refreshDashboard();
      setActionNotice({ type: 'success', message: `Offer sent to ${applicant.name}.` });
    } catch (e) {
      setActionNotice({ type: 'error', message: e.message || 'Failed to send the offer.' });
    } finally {
      setBusyApplicantKey(null);
    }
  };

  if (loading && applicants.length === 0) {
    return (
      <div className="employer-loading-list" aria-label="Loading applicants">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (error) {
    return (
      <div className="employer-error" role="alert">
        <strong>Unable to load applicants</strong>
        <p>{error}</p>
        <button type="button" onClick={loadApplicants}>Try again</button>
      </div>
    );
  }

  return (
    <>
      <header className="employer-page-header">
        <div>
          <p className="employer-kicker">Candidate pipeline</p>
          <h1>Applicants</h1>
          <p>Review the people interested in your open roles and keep the pipeline organized.</p>
        </div>
        <button type="button" className="employer-refresh-btn" onClick={handleRefresh} disabled={loading}>
          Refresh applicants
        </button>
      </header>

      {actionNotice.message && (
        <div className={`employer-notice is-${actionNotice.type}`} role={actionNotice.type === 'error' ? 'alert' : 'status'}>
          {actionNotice.message}
        </div>
      )}

      <section className="employer-filter-controls employer-applicant-controls">
        <label className="employer-search-box">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <span className="sr-only">Search applicants</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidate or job"
          />
        </label>
        <label className="employer-sort-box">
          <span>Type</span>
          <select
            value={source}
            onChange={(event) => {
              setLoading(true);
              setSource(event.target.value);
              setJobKey('all');
            }}
          >
            <option value="all">Jobs and gigs</option>
            <option value="job">Jobs only</option>
            <option value="gig">Gigs only</option>
          </select>
        </label>
        <label className="employer-sort-box">
          <span>Role</span>
          <select
            value={jobKey}
            onChange={(event) => {
              setLoading(true);
              setJobKey(event.target.value);
            }}
          >
            <option value="all">All roles</option>
            {selectableJobs.map((job) => (
              <option value={job.key} key={job.key}>[{job.sourceLabel}] {job.title}</option>
            ))}
          </select>
        </label>
        <label className="employer-sort-box">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value);
            }}
          >
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((item) => <option value={item} key={item}>{formatStatus(item)}</option>)}
          </select>
        </label>
      </section>

      <section className="employer-panel employer-applicants-panel">
        <div className="employer-panel-head">
          <div>
            <p className="employer-section-eyebrow">Candidate directory</p>
            <h2>{visibleApplicants.length} {visibleApplicants.length === 1 ? 'applicant' : 'applicants'}</h2>
          </div>
        </div>

        {visibleApplicants.length === 0 ? (
          <div className="employer-empty-state">
            <strong>No applicants found</strong>
            <p>New applications will appear here as candidates apply.</p>
          </div>
        ) : (
          <div className="employer-applicant-table">
            <div className="employer-applicant-table-head">
              <span>Candidate</span>
              <span>Applied for</span>
              <span>Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {visibleApplicants.map((applicant) => (
              <article className="employer-applicant-table-row" key={applicant.key}>
                <div className="employer-applicant-identity">
                  <span>{applicant.name ? applicant.name.charAt(0).toUpperCase() : ''}</span>
                  <div>
                    <strong>{applicant.name}</strong>
                    <small>{applicant.email || applicant.phone || 'Contact not available'}</small>
                  </div>
                </div>
                <div className="employer-applicant-role">
                  <strong>{applicant.job?.title || 'Job'}</strong>
                  <span className={`employer-source-badge is-${applicant.source}`}>{applicant.sourceLabel}</span>
                </div>
                <span>{applicant.applied}</span>
                <span className={`employer-status is-${applicant.status}`}>{formatStatus(applicant.status)}</span>
                <div className="employer-actions">
                  <button
                    type="button"
                    className="details-btn"
                    onClick={() => openApplicantDetails(applicant)}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="chat-btn"
                    disabled={!applicant.userId}
                    onClick={() => loadConversation(applicant)}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    className="shortlist-btn"
                    disabled={busyApplicantKey === applicant.key}
                    onClick={() => openShortlistForm(applicant)}
                  >
                    {applicant.status === 'shortlisted' ? 'Reschedule' : 'Shortlist'}
                  </button>
                  <button
                    type="button"
                    className="offer-btn"
                    disabled={
                      busyApplicantKey === applicant.key
                      || ['offered', 'accepted', 'hired', 'completed', 'rejected', 'cancelled'].includes(applicant.status)
                    }
                    onClick={() => handleOffer(applicant)}
                  >
                    {applicant.status === 'offered' ? 'Offered' : 'Offer'}
                  </button>
                  <button
                    type="button"
                    className="reject-btn"
                    disabled={busyApplicantKey === applicant.key || applicant.status === 'rejected'}
                    onClick={() => handleReject(applicant)}
                  >
                    {applicant.status === 'rejected' ? 'Rejected' : 'Reject'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedApplicant && (
        <div
          className="employer-applicant-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeApplicantPanel();
          }}
        >
          <aside
            className={`employer-applicant-drawer is-${panelMode}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-panel-title"
          >
            <header className="employer-candidate-header">
              <div className="employer-candidate-avatar">
                {selectedApplicant.avatar ? (
                  <img src={selectedApplicant.avatar} alt="" />
                ) : (
                  <span>{selectedApplicant.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <p>{selectedApplicant.sourceLabel} applicant</p>
                <h2 id="candidate-panel-title">{selectedApplicant.name}</h2>
                <small>{selectedApplicant.headline || selectedApplicant.email || 'Applicant profile'}</small>
              </div>
              <button
                type="button"
                className="employer-drawer-close"
                aria-label="Close candidate panel"
                onClick={closeApplicantPanel}
              >
                ×
              </button>
            </header>

            <nav className="employer-candidate-tabs" aria-label="Candidate panel">
              <button
                type="button"
                className={panelMode === 'details' ? 'is-active' : ''}
                onClick={() => setPanelMode('details')}
              >
                Candidate details
              </button>
              <button
                type="button"
                className={panelMode === 'chat' ? 'is-active' : ''}
                onClick={() => loadConversation(selectedApplicant)}
              >
                Chat
              </button>
            </nav>

            {panelMode === 'details' ? (
              <div className="employer-candidate-body">
                <div className="employer-candidate-contact">
                  <a href={selectedApplicant.email ? `mailto:${selectedApplicant.email}` : undefined}>
                    <span>Email</span>
                    <strong>{selectedApplicant.email || 'Not provided'}</strong>
                  </a>
                  <a href={selectedApplicant.phone ? `tel:${selectedApplicant.phone}` : undefined}>
                    <span>Phone</span>
                    <strong>{selectedApplicant.phone || 'Not provided'}</strong>
                  </a>
                </div>

                <section className="employer-candidate-section">
                  <div className="employer-candidate-section-head">
                    <h3>Application</h3>
                    <span className={`employer-status is-${selectedApplicant.status}`}>
                      {formatStatus(selectedApplicant.status)}
                    </span>
                  </div>
                  <dl className="employer-candidate-grid">
                    <DetailItem label="Application type" value={selectedApplicant.sourceLabel} />
                    <DetailItem label="Applied for" value={selectedApplicant.job.title} />
                    <DetailItem label="Applied on" value={selectedApplicant.applied} />
                    <DetailItem
                      label={selectedApplicant.source === 'gig' ? 'Gig payment' : 'Proposed amount'}
                      value={selectedApplicant.source === 'gig'
                        ? selectedApplicant.job.amount
                          ? `${selectedApplicant.job.currency} ${formatAmount(selectedApplicant.job.amount)}${
                            selectedApplicant.job.paymentType ? ` / ${selectedApplicant.job.paymentType}` : ''
                          }`
                          : ''
                        : selectedApplicant.proposedAmount !== null && selectedApplicant.proposedAmount !== undefined
                          ? `${selectedApplicant.job.currency} ${formatAmount(selectedApplicant.proposedAmount)}`
                          : ''}
                    />
                    {selectedApplicant.source === 'gig' && (
                      <DetailItem
                        label="Availability"
                        value={selectedApplicant.availableImmediately ? 'Available immediately' : 'Not immediate'}
                      />
                    )}
                    <DetailItem label="Application ID" value={`${selectedApplicant.sourceLabel} #${selectedApplicant.id}`} />
                  </dl>
                  {selectedApplicant.source === 'job' && (
                    <div className="employer-candidate-note">
                      <span>Cover letter</span>
                      <p>{selectedApplicant.coverLetter || 'No cover letter was submitted.'}</p>
                    </div>
                  )}
                </section>

                <section className="employer-candidate-section">
                  <h3>Professional profile</h3>
                  <dl className="employer-candidate-grid">
                    <DetailItem label="Headline" value={selectedApplicant.headline} />
                    <DetailItem
                      label="Experience"
                      value={selectedApplicant.experienceYears
                        ? selectedApplicant.source === 'gig'
                          ? formatStatus(selectedApplicant.experienceYears)
                          : `${selectedApplicant.experienceYears} years`
                        : ''}
                    />
                    <DetailItem label="Current location" value={selectedApplicant.location} />
                    <DetailItem
                      label="Expected salary"
                      value={selectedApplicant.expectedSalary
                        ? `${selectedApplicant.job.currency} ${formatAmount(selectedApplicant.expectedSalary)}`
                        : ''}
                    />
                  </dl>
                  <div className="employer-candidate-note">
                    <span>About candidate</span>
                    <p>{selectedApplicant.bio || 'No bio has been added.'}</p>
                  </div>
                </section>

                <section className="employer-candidate-section">
                  <h3>Preferences and education</h3>
                  <dl className="employer-candidate-grid">
                    <DetailItem label="Preferred job type" value={selectedApplicant.jobType} />
                    <DetailItem label="Preferred shift" value={selectedApplicant.jobShift} />
                    <DetailItem label="Industry" value={selectedApplicant.industry} />
                    <DetailItem label="Category" value={selectedApplicant.jobCategory} />
                    <DetailItem label="Role" value={selectedApplicant.jobRole} />
                    <DetailItem label="Qualification" value={selectedApplicant.qualification} />
                    <DetailItem label="Course / specialization" value={selectedApplicant.specialization} />
                  </dl>
                </section>

                <section className="employer-candidate-section">
                  <h3>Skills</h3>
                  {selectedApplicant.skills.length > 0 ? (
                    <div className="employer-candidate-skills">
                      {selectedApplicant.skills.map((skill) => <span key={skill}>{skill}</span>)}
                    </div>
                  ) : (
                    <p className="employer-candidate-muted">No skills have been added.</p>
                  )}
                </section>

                <section className="employer-candidate-section">
                  <h3>Work history</h3>
                  {selectedApplicant.experiences.length > 0 ? (
                    <div className="employer-candidate-timeline">
                      {selectedApplicant.experiences.map((exp) => (
                        <div key={exp.id} className="employer-timeline-item">
                          <strong>{exp.job_title}</strong>
                          <p>{exp.company_name}</p>
                          <small>
                            {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                          </small>
                          {exp.description && <p className="employer-timeline-desc">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="employer-candidate-muted">No experience details added.</p>
                  )}
                </section>

                <section className="employer-candidate-section">
                  <h3>Projects</h3>
                  {selectedApplicant.projects.length > 0 ? (
                    <div className="employer-candidate-timeline">
                      {selectedApplicant.projects.map((proj) => (
                        <div key={proj.id} className="employer-timeline-item">
                          <strong>{proj.project_name}</strong>
                          <p>{proj.role}</p>
                          <small>
                            {formatDate(proj.start_date)} - {proj.is_current ? 'Present' : formatDate(proj.end_date)}
                          </small>
                          {proj.project_link && (
                            <a href={proj.project_link} target="_blank" rel="noreferrer" style={{ display: 'block', margin: '0.25rem 0', fontSize: '0.85rem' }}>
                              View Project
                            </a>
                          )}
                          {proj.description && <p className="employer-timeline-desc">{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="employer-candidate-muted">No projects added.</p>
                  )}
                </section>

                <div className="employer-candidate-footer">
                  {selectedApplicant.resumeUrl && (
                    <a href={selectedApplicant.resumeUrl} target="_blank" rel="noreferrer">
                      View resume
                    </a>
                  )}
                  <button type="button" className="chat-btn" onClick={() => loadConversation(selectedApplicant)}>
                    Open chat
                  </button>
                  <button
                    type="button"
                    className="shortlist-btn"
                    disabled={busyApplicantKey === selectedApplicant.key}
                    onClick={() => openShortlistForm(selectedApplicant)}
                  >
                    {selectedApplicant.status === 'shortlisted' ? 'Reschedule' : 'Shortlist'}
                  </button>
                  <button
                    type="button"
                    className="offer-btn"
                    disabled={
                      busyApplicantKey === selectedApplicant.key
                      || ['offered', 'accepted', 'hired', 'completed', 'rejected', 'cancelled'].includes(selectedApplicant.status)
                    }
                    onClick={() => handleOffer(selectedApplicant)}
                  >
                    {selectedApplicant.status === 'offered' ? 'Offered' : 'Offer'}
                  </button>
                  <button
                    type="button"
                    className="reject-btn"
                    disabled={busyApplicantKey === selectedApplicant.key || selectedApplicant.status === 'rejected'}
                    onClick={() => handleReject(selectedApplicant)}
                  >
                    {selectedApplicant.status === 'rejected' ? 'Rejected' : 'Reject'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="employer-candidate-chat">
                <div className="employer-chat-context">
                  <span>Conversation about</span>
                  <strong>{selectedApplicant.sourceLabel} · {selectedApplicant.job.title}</strong>
                </div>
                {chatError && <div className="employer-chat-error" role="alert">{chatError}</div>}
                <div className="employer-message-stream" aria-live="polite">
                  {messageLoading ? (
                    <div className="employer-chat-empty">
                      <strong>Loading conversation…</strong>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="employer-chat-empty">
                      <strong>No messages yet</strong>
                      <p>Send the first message to {selectedApplicant.name}.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        className={`employer-message-bubble ${
                          Number(message.sender_id) === Number(currentUserId) ? 'is-mine' : ''
                        }`}
                        key={message.id}
                      >
                        <ChatAttachment message={message} />
                        {message.message && <p>{message.message}</p>}
                        <span>{formatMessageTime(message.sent_at || message.created_at)}</span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form className="employer-message-compose" onSubmit={sendMessage}>
                  <input
                    ref={attachmentInputRef}
                    className="sr-only"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={selectMessageFile}
                  />
                  <button
                    type="button"
                    className="employer-attach-button"
                    title="Attach a PDF or file"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    Attach
                  </button>
                  <textarea
                    value={messageText}
                    maxLength={5000}
                    placeholder={`Message ${selectedApplicant.name}`}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button type="submit" disabled={(!messageText.trim() && !messageFile) || messageSending}>
                    {messageSending ? 'Sending…' : 'Send'}
                  </button>
                  {messageFile && (
                    <div className="employer-selected-file">
                      <span>{messageFile.name}</span>
                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={() => {
                          setMessageFile(null);
                          if (attachmentInputRef.current) attachmentInputRef.current.value = '';
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </aside>
        </div>
      )}

      {shortlistApplicant && (
        <div className="employer-dialog-overlay">
          <div
            className="employer-interview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="interview-dialog-title"
          >
            <div className="employer-interview-dialog-head">
              <div>
                <p>{shortlistApplicant.status === 'shortlisted' ? 'Update interview' : 'Shortlist candidate'}</p>
                <h2 id="interview-dialog-title">
                  {shortlistApplicant.status === 'shortlisted' ? 'Reschedule' : 'Schedule'} interview with {shortlistApplicant.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close interview form"
                onClick={() => setShortlistApplicant(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleShortlist}>
              {actionNotice.type === 'error' && actionNotice.message && (
                <div className="employer-notice is-error" role="alert">{actionNotice.message}</div>
              )}
              <label>
                <span>Interview date and time</span>
                <input
                  type="datetime-local"
                  required
                  value={interviewForm.scheduledAt}
                  onChange={(event) => setInterviewForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))}
                />
              </label>
              <label>
                <span>Meeting link</span>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={interviewForm.meetingLink}
                  onChange={(event) => setInterviewForm((current) => ({
                    ...current,
                    meetingLink: event.target.value,
                  }))}
                />
              </label>
              <div className="employer-interview-dialog-actions">
                <button
                  type="button"
                  className="is-secondary"
                  disabled={busyApplicantKey === shortlistApplicant.key}
                  onClick={() => setShortlistApplicant(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={busyApplicantKey === shortlistApplicant.key}>
                  {busyApplicantKey === shortlistApplicant.key
                    ? 'Saving…'
                    : shortlistApplicant.status === 'shortlisted'
                      ? 'Update interview'
                      : 'Shortlist and schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Applicants;
