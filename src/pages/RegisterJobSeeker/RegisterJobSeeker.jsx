import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterJobSeeker.css';
import { apiRequest, storeAuthSession } from '../../api';

const UserIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const MailIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>);
const KeyIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>);
const BriefcaseIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>);
const FileTextIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>);
const ClockIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>);
const RupeeIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"></path><path d="M6 8h12"></path><path d="M6 13h8.5l-5 8h5l5-8"></path></svg>);
const PuzzleIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611c-.941.941-2.468.941-3.408 0L8.73 19.73a1.2 1.2 0 0 1-.276-.837c.07-.47.48-.802.925-9.68a2.5 2.5 0 1 0-3.214-3.214c-.166-.446-.497-.855-.968-.925a.979.979 0 0 1-.837-.276L2.748 11.88c-.941-.941-.941-2.468 0-3.408l1.611-1.611a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.5 2.5 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.611c.941-.941 2.468-.941 3.408 0L18.56 2.748a1.2 1.2 0 0 1 .276.837c-.07.47-.48.802-.925.968a2.5 2.5 0 1 0 3.214 3.214z"></path></svg>);
const MapMarkerIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>);
const CrosshairIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>);
const CompassIcon = () => (<svg className="js-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>);
const ChevronDownIcon = () => (<svg className="js-select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>);

const RegisterJobSeeker = () => {
  const navigate = useNavigate();
  const skillsDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    otp: '',
    headline: '',
    bio: '',
    experience: '',
    expectedSalary: '',
    skills: [],
    location: '',
    lat: '',
    lng: ''
  });
  const [skillsOptions, setSkillsOptions] = useState([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadSkills = async () => {
      try {
        const data = await apiRequest('/api/skills');
        if (!ignore) {
          setSkillsOptions(Array.isArray(data.skills) ? data.skills : []);
        }
      } catch (error) {
        if (!ignore) {
          setStatus({ type: 'error', message: error.message });
        }
      }
    };

    loadSkills();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(event.target)) {
        setSkillsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const normalizePhone = () => formData.mobile.replace(/\D/g, '');

  const handleSkillToggle = (skillName) => {
    setFormData((current) => {
      const hasSkill = current.skills.includes(skillName);
      return {
        ...current,
        skills: hasSkill
          ? current.skills.filter((skill) => skill !== skillName)
          : [...current.skills, skillName]
      };
    });
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            location: "Current Location (Auto-filled)"
          });
        },
        (error) => {
          console.error(error);
          alert("Could not retrieve location. Please check browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSendOTP = async () => {
    const phone = normalizePhone();

    if (!phone) {
      setStatus({ type: 'error', message: 'Please enter a mobile number first.' });
      return;
    }

    setIsSendingOtp(true);
    setStatus({ type: '', message: '' });

    try {
      const data = await apiRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });

      setFormData((current) => ({
        ...current,
        otp: data.otp || current.otp
      }));
      setStatus({
        type: 'success',
        message: data.otp
          ? `OTP sent successfully. Dev OTP: ${data.otp}`
          : data.message || 'OTP sent successfully.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phone = normalizePhone();

    if (formData.skills.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one skill.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone,
        otp: formData.otp.trim(),
        headline: formData.headline.trim(),
        bio: formData.bio.trim(),
        experience_years: Number(formData.experience),
        current_location: formData.location.trim(),
        expected_salary: Number(formData.expectedSalary),
        latitude: formData.lat ? Number(formData.lat) : undefined,
        longitude: formData.lng ? Number(formData.lng) : undefined,
        skills: formData.skills
      };
      const data = await apiRequest('/api/auth/register/job-seeker', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      storeAuthSession(data);
      setStatus({ type: 'success', message: data.message || 'Registration completed successfully.' });
      navigate('/dashboard/job-seeker');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSkillsLabel = formData.skills.length > 0
    ? formData.skills.join(', ')
    : 'Select Skills *';

  return (
    <div className="js-auth-page">
      <div className="js-auth-card">
        <form onSubmit={handleSubmit}>
          
          <h3 className="js-section-title">BASIC INFO</h3>
          
          <div className="js-input-group">
            <UserIcon />
            <input type="text" name="fullName" className="js-input" placeholder="Full Name *" required value={formData.fullName} onChange={handleChange} />
          </div>

          <div className="js-input-group">
            <MailIcon />
            <input type="email" name="email" className="js-input" placeholder="Email Address *" required value={formData.email} onChange={handleChange} />
          </div>

          <div className="js-input-group">
            <span className="js-prefix">+91</span>
            <input type="tel" name="mobile" className="js-input" placeholder="Mobile Number *" required value={formData.mobile} onChange={handleChange} />
            <button type="button" className="js-otp-btn" onClick={handleSendOTP} disabled={isSendingOtp}>
              {isSendingOtp ? 'Sending' : 'OTP'}
            </button>
          </div>

          <div className="js-input-group">
            <KeyIcon />
            <input type="text" name="otp" className="js-input" placeholder="OTP *" required value={formData.otp} onChange={handleChange} />
          </div>

          <h3 className="js-section-title">PROFESSIONAL INFO</h3>

          <div className="js-input-group">
            <BriefcaseIcon />
            <input type="text" name="headline" className="js-input" placeholder="Headline (e.g. Full Stack Developer) *" required value={formData.headline} onChange={handleChange} />
          </div>

          <div className="js-input-group">
            <FileTextIcon />
            <input type="text" name="bio" className="js-input" placeholder="Short Bio (e.g. Specialized in React & Node.js)" value={formData.bio} onChange={handleChange} />
          </div>

          <div className="js-input-group">
            <ClockIcon />
            <input type="number" step="0.1" name="experience" className="js-input" placeholder="Experience Years (e.g. 2.5) *" required value={formData.experience} onChange={handleChange} />
          </div>

          <div className="js-input-group">
            <RupeeIcon />
            <input type="number" name="expectedSalary" className="js-input" placeholder="Expected Salary (e.g. 85000) *" required value={formData.expectedSalary} onChange={handleChange} />
          </div>

          <h3 className="js-section-title">SKILLS *</h3>

          <div className="js-input-group js-skills-field" ref={skillsDropdownRef}>
            <PuzzleIcon />
            <button
              type="button"
              className={`js-skills-trigger ${formData.skills.length === 0 ? 'is-placeholder' : ''}`}
              onClick={() => setSkillsOpen((open) => !open)}
              aria-expanded={skillsOpen}
            >
              {selectedSkillsLabel}
            </button>
            <ChevronDownIcon />
            {skillsOpen && (
              <div className="js-skills-menu">
                {skillsOptions.length === 0 ? (
                  <p className="js-skills-empty">No skills found</p>
                ) : skillsOptions.map((skill) => (
                  <label className="js-skill-option" key={skill.id || skill.name}>
                    <input
                      type="checkbox"
                      checked={formData.skills.includes(skill.name)}
                      onChange={() => handleSkillToggle(skill.name)}
                    />
                    <span>{skill.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <h3 className="js-section-title">LOCATION</h3>

          <div className="js-input-group" onClick={handleGetLocation} style={{cursor: 'pointer'}}>
            <MapMarkerIcon />
            <input type="text" name="location" className="js-input" style={{cursor: 'pointer'}} placeholder="Current Location (e.g. Bangalore, India) *" readOnly value={formData.location} />
          </div>

          <div className="js-row">
            <div className="js-input-group">
              <CrosshairIcon />
              <input type="text" name="lat" className="js-input" placeholder="Latitude" readOnly value={formData.lat} />
            </div>
            
            <div className="js-input-group">
              <CompassIcon />
              <input type="text" name="lng" className="js-input" placeholder="Longitude" readOnly value={formData.lng} />
            </div>
          </div>

          {status.message && (
            <div className={`js-form-message ${status.type === 'error' ? 'is-error' : 'is-success'}`}>
              {status.message}
            </div>
          )}

          <button type="submit" className="js-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register Now'}
          </button>

          <div className="js-auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterJobSeeker;
