import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, apiRequest, storeAuthSession } from '../../api';
import './RegisterEmployer.css';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  otp: '',
  designation: '',
  company_name: '',
  company_description: '',
  company_pan_card: '',
  company_aadhaar_card: '',
  company_gst_no: '',
  industry_id: '',
  company_founded_year: '',
  company_size: '',
  company_website: '',
  company_location: '',
  company_country: '',
  company_state: '',
  company_city: '',
  company_pincode: '',
  company_latitude: '',
  company_longitude: ''
};

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees'
];

const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    reject(new Error('Current location is not supported in this browser.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000
  });
});

const appendIfPresent = (payload, key, value) => {
  if (value === undefined || value === null) return;
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return;
  payload.append(key, normalized);
};

const RegisterEmployer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [form, setForm] = useState(emptyForm);
  const [industries, setIndustries] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const phone = useMemo(() => form.phone.replace(/\D/g, ''), [form.phone]);
  const logoLabel = logoFile?.name || 'Upload company logo';

  useEffect(() => {
    let ignore = false;

    apiRequest('/api/industries?limit=100')
      .then((data) => {
        if (!ignore) setIndustries(data.industries || []);
      })
      .catch((error) => {
        if (!ignore) setStatus({ type: 'error', message: error.message });
      });

    return () => {
      ignore = true;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const sendOtp = async (event) => {
    event.preventDefault();

    if (!phone || phone.length < 10) {
      setStatus({ type: 'error', message: 'Please enter a valid mobile number.' });
      return;
    }

    setSendingOtp(true);
    setStatus({ type: '', message: '' });

    try {
      const data = await apiRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });

      setForm((current) => ({ ...current, phone, otp: data.otp || current.otp }));
      setStep('details');
      setStatus({
        type: 'success',
        message: data.otp
          ? `OTP sent successfully. Dev OTP: ${data.otp}`
          : data.message || 'OTP sent successfully.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSendingOtp(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setStatus({ type: '', message: '' });

    try {
      const position = await getCurrentPosition();
      const latitude = position.coords.latitude.toFixed(7);
      const longitude = position.coords.longitude.toFixed(7);
      let address = {};
      let displayName = '';

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await response.json().catch(() => ({}));
        address = data.address || {};
        displayName = data.display_name || '';
      } catch {
        address = {};
      }

      setForm((current) => ({
        ...current,
        company_latitude: latitude,
        company_longitude: longitude,
        company_location: displayName || `${latitude}, ${longitude}`,
        company_country: address.country || current.company_country,
        company_state: address.state || current.company_state,
        company_city: address.city || address.town || address.village || current.company_city,
        company_pincode: address.postcode || current.company_pincode
      }));
      setStatus({ type: 'success', message: 'Current location fetched.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.code === 1
          ? 'Location permission denied. Please allow location access or enter details manually.'
          : error.message || 'Unable to fetch current location.'
      });
    } finally {
      setLocating(false);
    }
  };

  const submitEmployer = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = new FormData();
      const fields = {
        ...form,
        phone,
        company_website: form.company_website,
        website: form.company_website,
        latitude: form.company_latitude,
        longitude: form.company_longitude
      };

      Object.entries(fields).forEach(([key, value]) => appendIfPresent(payload, key, value));
      if (logoFile) payload.append('company_logo', logoFile);

      const response = await fetch(`${API_BASE_URL}/api/auth/register/employer`, {
        method: 'POST',
        body: payload
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Employer registration failed.');
      }

      storeAuthSession(data);
      setStatus({ type: 'success', message: data.message || 'Employer registered successfully.' });
      navigate('/');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="er-page">
      <section className="er-shell">
        <aside className="er-aside">
          <div>
            <p className="er-kicker">Employer Registration</p>
            <h1>Hire with a verified company profile.</h1>
            <p className="er-copy">Start with mobile OTP, then add company, compliance, location, and brand details in one clean setup.</p>
          </div>

          <div className="er-steps" aria-label="Registration steps">
            <div className={`er-step ${step === 'phone' ? 'is-active' : 'is-complete'}`}>
              <span>1</span>
              <div>
                <strong>Verify phone</strong>
                <p>Use registration OTP for this employer account.</p>
              </div>
            </div>
            <div className={`er-step ${step === 'details' ? 'is-active' : ''}`}>
              <span>2</span>
              <div>
                <strong>Company profile</strong>
                <p>Complete employer and company information.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="er-card">
          {step === 'phone' ? (
            <form className="er-form" onSubmit={sendOtp}>
              <div className="er-form-head">
                <p>Step 1 of 2</p>
                <h2>Enter employer mobile number</h2>
              </div>

              <label>
                <span>Mobile Number</span>
                <div className="er-phone-row">
                  <strong>+91</strong>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    placeholder="7017026233"
                    required
                  />
                </div>
              </label>

              {status.message && <p className={`er-message is-${status.type}`}>{status.message}</p>}

              <button type="submit" className="er-primary-btn" disabled={sendingOtp}>
                {sendingOtp ? 'Sending OTP' : 'Send OTP'}
              </button>

              <p className="er-switch">Already registered? <Link to="/login">Login</Link></p>
            </form>
          ) : (
            <form className="er-form" onSubmit={submitEmployer}>
              <div className="er-form-head">
                <button type="button" className="er-text-btn" onClick={() => setStep('phone')}>Change phone</button>
                <p>Step 2 of 2</p>
                <h2>Employer and company details</h2>
              </div>

              <div className="er-logo-row">
                <div className="er-logo-mark">{form.company_name ? form.company_name.charAt(0).toUpperCase() : 'C'}</div>
                <label className="er-file-btn">
                  {logoLabel}
                  <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="er-grid">
                <label>
                  <span>Full Name</span>
                  <input value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} placeholder="Employer full name" required />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="name@company.com" />
                </label>
                <label>
                  <span>OTP</span>
                  <input value={form.otp} onChange={(event) => updateField('otp', event.target.value)} placeholder="Enter OTP" required />
                </label>
                <label>
                  <span>Designation</span>
                  <input value={form.designation} onChange={(event) => updateField('designation', event.target.value)} placeholder="HR Manager, Founder, CEO" required />
                </label>
              </div>

              <h3>Company</h3>
              <div className="er-grid">
                <label>
                  <span>Company Name</span>
                  <input value={form.company_name} onChange={(event) => updateField('company_name', event.target.value)} placeholder="TechCorp Solutions Pvt Ltd" required />
                </label>
                <label>
                  <span>Industry</span>
                  <select value={form.industry_id} onChange={(event) => updateField('industry_id', event.target.value)}>
                    <option value="">Select industry</option>
                    {industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Founded Year</span>
                  <input type="number" value={form.company_founded_year} onChange={(event) => updateField('company_founded_year', event.target.value)} placeholder="2021" min="1800" max="2100" />
                </label>
                <label>
                  <span>Company Size</span>
                  <select value={form.company_size} onChange={(event) => updateField('company_size', event.target.value)}>
                    <option value="">Select company size</option>
                    {companySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <label>
                  <span>Website</span>
                  <input type="url" value={form.company_website} onChange={(event) => updateField('company_website', event.target.value)} placeholder="https://company.com" />
                </label>
                <label>
                  <span>GST Number</span>
                  <input value={form.company_gst_no} onChange={(event) => updateField('company_gst_no', event.target.value)} placeholder="27ABCDE1234F1Z5" />
                </label>
              </div>

              <label>
                <span>Company Description</span>
                <textarea value={form.company_description} onChange={(event) => updateField('company_description', event.target.value)} placeholder="Describe the company, hiring focus, and work culture." rows="4" />
              </label>

              <h3>Compliance</h3>
              <div className="er-grid">
                <label>
                  <span>PAN Card</span>
                  <input value={form.company_pan_card} onChange={(event) => updateField('company_pan_card', event.target.value)} placeholder="ABCDE1234F" />
                </label>
                <label>
                  <span>Aadhaar Card</span>
                  <input value={form.company_aadhaar_card} onChange={(event) => updateField('company_aadhaar_card', event.target.value)} placeholder="123412341234" />
                </label>
              </div>

              <h3>Location</h3>
              <label>
                <span>Company Location</span>
                <div className="er-location-row">
                  <input value={form.company_location} onChange={(event) => updateField('company_location', event.target.value)} placeholder="Office, city, state" />
                  <button type="button" className="er-secondary-btn" onClick={useCurrentLocation} disabled={locating}>
                    {locating ? 'Fetching' : 'Use Current'}
                  </button>
                </div>
              </label>
              <div className="er-grid">
                <label>
                  <span>Country</span>
                  <input value={form.company_country} onChange={(event) => updateField('company_country', event.target.value)} placeholder="India" />
                </label>
                <label>
                  <span>State</span>
                  <input value={form.company_state} onChange={(event) => updateField('company_state', event.target.value)} placeholder="Bihar" />
                </label>
                <label>
                  <span>City</span>
                  <input value={form.company_city} onChange={(event) => updateField('company_city', event.target.value)} placeholder="Patna" />
                </label>
                <label>
                  <span>Pincode</span>
                  <input value={form.company_pincode} onChange={(event) => updateField('company_pincode', event.target.value)} placeholder="110001" />
                </label>
                <label>
                  <span>Latitude</span>
                  <input value={form.company_latitude} onChange={(event) => updateField('company_latitude', event.target.value)} placeholder="28.613939" />
                </label>
                <label>
                  <span>Longitude</span>
                  <input value={form.company_longitude} onChange={(event) => updateField('company_longitude', event.target.value)} placeholder="77.209023" />
                </label>
              </div>

              {status.message && <p className={`er-message is-${status.type}`}>{status.message}</p>}

              <button type="submit" className="er-primary-btn" disabled={submitting}>
                {submitting ? 'Registering Employer' : 'Register Employer'}
              </button>

              <p className="er-switch">Already have an account? <Link to="/login">Login</Link></p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default RegisterEmployer;
