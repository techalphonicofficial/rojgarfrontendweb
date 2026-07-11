import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { apiRequest, storeAuthSession } from '../../api';

/* ── SVG Icons ─────────────────────────────────────────── */
const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/* ── Component ─────────────────────────────────────────── */
const Login = ({ role = 'job_seeker' }) => {
  const navigate = useNavigate();
  const isEmployer = role === 'employer';

  const [formData, setFormData] = useState({ mobile: '', otp: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const normalizePhone = () => formData.mobile.replace(/\D/g, '');

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSendOtp = async () => {
    const phone = normalizePhone();
    if (!phone) {
      setStatus({ type: 'error', message: 'Please enter your mobile number.' });
      return;
    }
    setIsSendingOtp(true);
    setStatus({ type: '', message: '' });
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, role })
      });
      setFormData((cur) => ({ ...cur, otp: data.otp || cur.otp }));
      setStatus({
        type: 'success',
        message: data.otp
          ? `OTP sent! Dev OTP: ${data.otp}`
          : data.message || 'OTP sent to your number.'
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phone = normalizePhone();
    setIsVerifying(true);
    setStatus({ type: '', message: '' });
    try {
      const data = await apiRequest('/api/auth/verify-login', {
        method: 'POST',
        body: JSON.stringify({ phone, role, otp: formData.otp.trim() })
      });
      storeAuthSession(data);
      setStatus({ type: 'success', message: data.message || 'Login successful!' });
      navigate(isEmployer ? '/dashboard/employer' : '/dashboard/job-seeker');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Glass Card ── */}
      <div className="login-card">

        {/* Brand strip */}
        <div className="login-brand-strip">
          <div className="login-brand-icon">
            <BriefcaseIcon />
          </div>
          <span className="login-brand-name">RozgaarSetu</span>
        </div>

        {/* Role tabs */}
        <div className="login-role-tabs" role="tablist">
          <div
            className={`login-role-tab${!isEmployer ? ' active' : ''}`}
            role="tab"
            onClick={() => navigate('/login')}
          >
            Job Seeker
          </div>
          <div
            className={`login-role-tab${isEmployer ? ' active' : ''}`}
            role="tab"
            onClick={() => navigate('/login/employer')}
          >
            Employer
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h1>{isEmployer ? 'Employer Login' : 'Welcome Back'}</h1>
          <p>
            {isEmployer
              ? 'Sign in to manage your job listings & applications.'
              : 'Sign in to explore thousands of opportunities across India.'}
          </p>
        </div>

        <div className="login-divider" />

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Mobile */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-mobile">Mobile Number</label>
            <div className="login-input-wrap">
              <PhoneIcon />
              <span className="login-prefix">+91</span>
              <input
                id="login-mobile"
                type="tel"
                name="mobile"
                className="login-input"
                placeholder="Enter 10-digit number"
                required
                value={formData.mobile}
                onChange={handleChange}
              />
              <button
                type="button"
                className="login-send-otp"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
              >
                {isSendingOtp ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          </div>

          {/* OTP */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-otp">One-Time Password</label>
            <div className="login-input-wrap">
              <KeyIcon />
              <input
                id="login-otp"
                type="text"
                name="otp"
                className="login-input"
                placeholder="Enter OTP received"
                required
                value={formData.otp}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Status */}
          {status.message && (
            <div className={`login-alert ${status.type === 'error' ? 'error' : 'success'}`}>
              {status.type === 'error' ? <AlertIcon /> : <CheckIcon />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            className="login-submit"
            disabled={isVerifying}
          >
            {isVerifying
              ? <span className="login-spinner">Verifying</span>
              : isEmployer ? 'Login as Employer →' : 'Login as Job Seeker →'}
          </button>
        </form>

        {/* Footer links */}
        <div className="login-footer">
          <p>
            New to RozgaarSetu?&nbsp;
            <Link to={isEmployer ? '/register/employer' : '/register/job-seeker'}>
              {isEmployer ? 'Register as Employer' : 'Register as Job Seeker'}
            </Link>
          </p>
          <div className="login-footer-sep" />
          <p className="login-switch-text">
            {isEmployer
              ? <Link to="/login">Switch to Job Seeker Login</Link>
              : <Link to="/login/employer">Switch to Employer Login</Link>}
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
