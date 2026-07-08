import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';
import { useAuth } from '../../context/auth-state';
import NotificationMenu from '../NotificationMenu/NotificationMenu';
import './Navbar.css';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0]?.slice(0, 2);

  return (initials || 'JS').toUpperCase();
};

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const displayName = user?.full_name || user?.name || 'Job Seeker';
  const initials = getInitials(displayName);
  const isEmployer = user?.role === 'employer';
  const dashboardPath = isEmployer ? '/dashboard/employer' : '/dashboard/job-seeker';
  const profilePath = isEmployer ? '/dashboard/employer' : '/my-profile';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(isEmployer ? '/login/employer' : '/login');
  };

  return (
    <header className={`navbar-wrapper ${scrolled ? 'scrolled glass-panel' : ''}`}>
      <div className="container navbar-container">
        <Link to="/" className="brand">
          <img src={logo} alt="RojgarSetu" className="brand-logo" />
        </Link>
        
        <nav className="nav-links">
          <Link to="/jobs" className="nav-link">Find Jobs</Link>
          <Link to="/jobs?type=gig" className="nav-link">Gig Economy</Link>
          <Link to="/location" className="nav-link">Location</Link>
          {isAuthenticated && <Link to={dashboardPath} className="nav-link">Dashboard</Link>}
          <Link to="/about" className="nav-link">About Us</Link>
        </nav>

        <div className="nav-actions">
          {isAuthenticated ? (
            <div className="nav-account-actions" aria-label="Account">
              <NotificationMenu role={user?.role} />
              <Link to={profilePath} className="nav-profile-link" title={displayName}>
                <span className="nav-profile-avatar">{initials}</span>
                <span>{isEmployer ? 'Employer' : 'My Profile'}</span>
              </Link>
              <button type="button" className="nav-logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-secondary nav-button">Login</Link>
              <Link to="/register/job-seeker" className="btn-secondary nav-button">Sign Up</Link>
            </>
          )}
          <Link
            to={isEmployer ? '/dashboard/employer/jobs/new' : '/login/employer'}
            className="btn-primary nav-button nav-employer-cta"
          >
            {isEmployer ? 'Post Job' : 'Employer Post Job'}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
