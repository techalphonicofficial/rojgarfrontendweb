import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../RegisterJobSeeker/RegisterJobSeeker.css';
import { apiRequest, storeAuthSession } from '../../api';

const PhoneIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>);
const KeyIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>);

const Login = ({ role = 'job_seeker' }) => {
  const navigate = useNavigate();
  const isEmployer = role === 'employer';
  const [formData, setFormData] = useState({
    mobile: '',
    otp: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const normalizePhone = () => formData.mobile.replace(/\D/g, '');

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

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
        body: JSON.stringify({
          phone,
          role
        })
      });

      setFormData((current) => ({
        ...current,
        otp: data.otp || current.otp
      }));
      setStatus({
        type: 'success',
        message: data.otp
          ? `Login OTP sent successfully. Dev OTP: ${data.otp}`
          : data.message || 'Login OTP sent successfully.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const phone = normalizePhone();

    setIsVerifying(true);
    setStatus({ type: '', message: '' });

    try {
      const data = await apiRequest('/api/auth/verify-login', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          role,
          otp: formData.otp.trim()
        })
      });

      storeAuthSession(data);
      setStatus({ type: 'success', message: data.message || 'Login successful.' });
      navigate(isEmployer ? '/dashboard/employer' : '/dashboard/job-seeker');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="js-auth-page">
      <div className="js-auth-card">
        <form onSubmit={handleSubmit}>
          <h3 className="js-section-title">{isEmployer ? 'EMPLOYER LOGIN' : 'JOB SEEKER LOGIN'}</h3>

          <div className="js-input-group">
            <span className="js-prefix">+91</span>
            <PhoneIcon />
            <input
              type="tel"
              name="mobile"
              className="js-input"
              placeholder="Mobile Number *"
              required
              value={formData.mobile}
              onChange={handleChange}
            />
            <button type="button" className="js-otp-btn" onClick={handleSendOtp} disabled={isSendingOtp}>
              {isSendingOtp ? 'Sending' : 'OTP'}
            </button>
          </div>

          <div className="js-input-group">
            <KeyIcon />
            <input
              type="text"
              name="otp"
              className="js-input"
              placeholder="OTP *"
              required
              value={formData.otp}
              onChange={handleChange}
            />
          </div>

          {status.message && (
            <div className={`js-form-message ${status.type === 'error' ? 'is-error' : 'is-success'}`}>
              {status.message}
            </div>
          )}

          <button type="submit" className="js-submit-btn" disabled={isVerifying}>
            {isVerifying ? 'Verifying...' : 'Login'}
          </button>

          <div className="js-auth-switch">
            {isEmployer ? (
              <>New to RozgaarSetu? <Link to="/register/employer">Register as Employer</Link></>
            ) : (
              <>New to RozgaarSetu? <Link to="/register/job-seeker">Register as Job Seeker</Link></>
            )}
          </div>

          <div className="js-auth-switch" style={{ marginTop: '0.65rem', paddingTop: 0, borderTop: 0 }}>
            {isEmployer ? (
              <Link to="/login">Login as Job Seeker</Link>
            ) : (
              <Link to="/login/employer">Login as Employer</Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
