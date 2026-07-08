import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { authApiRequest, getAuthToken, getStoredUser, resolveAssetUrl, storeAuthSession, API_BASE_URL } from '../../api';
import './EmployerDashboard.css';

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatSalary = (job) => {
  const currency = job.currency_code || 'INR';
  if (!job.salary_min && !job.salary_max) return 'Salary hidden';
  if (job.salary_min && job.salary_max) return `${currency} ${job.salary_min} - ${job.salary_max}`;
  return `${currency} ${job.salary_min || job.salary_max}`;
};

const normalizeJobs = (jobs = []) => jobs.map((job) => ({
  id: job.id,
  title: job.title || 'Untitled job',
  status: job.status || 'draft',
  location: job.location || job.city?.name || 'Location not set',
  salary: formatSalary(job),
  posted: formatDate(job.posted_at || job.created_at),
  applications: job.applications_count || job.applications?.length || 0,
  views: job.view?.view_count || 0
}));

const normalizeApplicants = (applicants = []) => applicants.slice(0, 8).map((application) => ({
  id: application.id,
  status: application.status || 'applied',
  applied: formatDate(application.applied_at),
  name: application.user?.full_name || 'Candidate',
  phone: application.user?.phone || '',
  email: application.user?.email || '',
  job: application.job?.title || 'Job'
}));

const ProfileItem = ({ label, value }) => (
  <div className="employer-profile-item">
    <span>{label}</span>
    <strong>{value || 'Not set'}</strong>
  </div>
);

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getStoredUser());
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [updateNotice, setUpdateNotice] = useState({ type: '', message: '' });
  const token = getAuthToken();

  const company = profile?.profile?.company;
  const logoUrl = resolveAssetUrl(company?.logo || '');
  const statCards = useMemo(() => ([
    { label: 'Jobs', value: stats?.total_jobs ?? 0 },
    { label: 'Applicants', value: stats?.total_applicants ?? 0 },
    { label: 'Shortlisted', value: stats?.total_shortlisted ?? 0 },
    { label: 'Interviews', value: stats?.total_interviews ?? 0 }
  ]), [stats]);

  useEffect(() => {
    if (!token) {
      navigate('/login/employer');
      return;
    }

    let ignore = false;

    const loadDashboard = async () => {
      setLoading(true);
      setNotice({ type: '', message: '' });

      const [profileResult, statsResult, jobsResult, applicantsResult] = await Promise.allSettled([
        authApiRequest('/api/auth/profile/employer'),
        authApiRequest('/api/jobs/employer/dashboard/stats'),
        authApiRequest('/api/jobs/employer'),
        authApiRequest('/api/jobs/applicants')
      ]);

      if (ignore) return;

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.user);
        storeAuthSession({ user: profileResult.value.user });
      } else {
        setNotice({ type: 'error', message: profileResult.reason.message });
      }

      if (statsResult.status === 'fulfilled') setStats(statsResult.value.stats || {});
      if (jobsResult.status === 'fulfilled') setJobs(normalizeJobs(jobsResult.value.jobs || []));
      if (applicantsResult.status === 'fulfilled') setApplicants(normalizeApplicants(applicantsResult.value.applicants || []));

      setLoading(false);
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [navigate, token]);

  if (!token) return null;

  return (
    <div className="employer-dashboard-page">
      <div className="employer-dashboard-shell">
        <aside className="employer-sidebar">
          <div className="employer-company-card">
            <div className="employer-logo">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.nextElementSibling?.style.removeProperty('display');
                  }}
                />
              ) : null}
              <span className={logoUrl ? 'employer-logo-fallback' : ''}>{(company?.name || 'E').charAt(0).toUpperCase()}</span>
            </div>
            <h2>{company?.name || profile?.full_name || 'Employer'}</h2>
            <p>{profile?.profile?.designation || 'Employer account'}</p>
            <div className="employer-company-meta">
              {company?.industry?.name && <span>{company.industry.name}</span>}
              {company?.company_size && <span>{company.company_size}</span>}
              {company?.location && <span>{company.location}</span>}
            </div>
          </div>
          <nav className="employer-tabs">
            <NavLink to="overview" className={({ isActive }) => isActive ? 'is-active' : ''}>Overview</NavLink>
            <NavLink to="profile" className={({ isActive }) => isActive ? 'is-active' : ''}>Profile</NavLink>
            <NavLink to="jobs" className={({ isActive }) => isActive ? 'is-active' : ''}>Jobs</NavLink>
            <NavLink to="applicants" className={({ isActive }) => isActive ? 'is-active' : ''}>Applicants</NavLink>
          </nav>
        </aside>

        <main className="employer-main">

          {notice.message && <div className={`employer-notice is-${notice.type}`}>{notice.message}</div>}

          {loading ? (
            <section className="employer-panel">
              <p className="employer-empty">Loading dashboard...</p>
            </section>
          ) : (
            <>
              <section id="overview" className="employer-stat-grid">
                {statCards.map((item) => (
                  <div className="employer-stat-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </section>

              <section id="profile" className="employer-panel">
                <div className="employer-panel-head">
                  <h2>Employer Profile</h2>
                  <span>GET /api/auth/profile/employer</span>
                  <button className="employer-primary-btn" onClick={() => {
                    setEditMode(true);
                    setEditForm({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                      email: profile?.email || '',
                      designation: profile?.profile?.designation || '',
                      company_name: company?.name || '',
                      company_industry: company?.industry?.name || '',
                      company_size: company?.company_size || '',
                      founded_year: company?.founded_year || '',
                      company_website: company?.website || '',
                      company_gst_no: company?.gst_no || '',
                      company_pan_card: company?.pan_card || '',
                      company_aadhaar_card: company?.aadhaar_card || '',
                      company_location: company?.location || '',
                      company_country: company?.country || '',
                      company_state: company?.state || '',
                      company_city: company?.city || '',
                      company_pincode: company?.pincode || '',
                      company_latitude: company?.latitude || '',
                      company_longitude: company?.longitude || '',
                      company_description: company?.company_description || company?.description || ''
                    });
                  }}>Edit</button>
                </div>
{editMode ? (
  <form className="er-form" onSubmit={async (e) => {
    e.preventDefault();
    const payload = new FormData();
    Object.entries(editForm).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        payload.append(key, value);
      }
    });
    if (avatarFile) payload.append('profile_image', avatarFile);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/employer`, {
        method: 'PUT',
        body: payload,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Update failed');
      }
      setProfile(data.user);
      storeAuthSession({ user: data.user });
      setUpdateNotice({ type: 'success', message: 'Profile updated' });
      setEditMode(false);
    } catch (err) {
      setUpdateNotice({ type: 'error', message: err.message });
    }
  }}>
    <div className="er-grid">
      <label><span>Full Name</span><input value={editForm.full_name} onChange={e => setEditForm(f => ({...f, full_name: e.target.value}))} required /></label>
      <label><span>Phone</span><input value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} required /></label>
      <label><span>Email</span><input type="email" value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} /></label>
      <label><span>Designation</span><input value={editForm.designation} onChange={e => setEditForm(f => ({...f, designation: e.target.value}))} /></label>
      <label><span>Company Name</span><input value={editForm.company_name} onChange={e => setEditForm(f => ({...f, company_name: e.target.value}))} required /></label>
      <label><span>Industry</span><input value={editForm.company_industry} onChange={e => setEditForm(f => ({...f, company_industry: e.target.value}))} /></label>
      <label><span>Company Size</span><input value={editForm.company_size} onChange={e => setEditForm(f => ({...f, company_size: e.target.value}))} /></label>
      <label><span>Founded Year</span><input type="number" value={editForm.founded_year} onChange={e => setEditForm(f => ({...f, founded_year: e.target.value}))} /></label>
      <label><span>Website</span><input type="url" value={editForm.company_website} onChange={e => setEditForm(f => ({...f, company_website: e.target.value}))} /></label>
      <label><span>GST Number</span><input value={editForm.company_gst_no} onChange={e => setEditForm(f => ({...f, company_gst_no: e.target.value}))} /></label>
      <label><span>PAN Card</span><input value={editForm.company_pan_card} onChange={e => setEditForm(f => ({...f, company_pan_card: e.target.value}))} /></label>
      <label><span>Aadhaar Card</span><input value={editForm.company_aadhaar_card} onChange={e => setEditForm(f => ({...f, company_aadhaar_card: e.target.value}))} /></label>
      <label><span>Location</span><input value={editForm.company_location} onChange={e => setEditForm(f => ({...f, company_location: e.target.value}))} /></label>
      <label><span>Country</span><input value={editForm.company_country} onChange={e => setEditForm(f => ({...f, company_country: e.target.value}))} /></label>
      <label><span>State</span><input value={editForm.company_state} onChange={e => setEditForm(f => ({...f, company_state: e.target.value}))} /></label>
      <label><span>City</span><input value={editForm.company_city} onChange={e => setEditForm(f => ({...f, company_city: e.target.value}))} /></label>
      <label><span>Pincode</span><input value={editForm.company_pincode} onChange={e => setEditForm(f => ({...f, company_pincode: e.target.value}))} /></label>
      <label><span>Latitude</span><input value={editForm.company_latitude} onChange={e => setEditForm(f => ({...f, company_latitude: e.target.value}))} /></label>
      <label><span>Longitude</span><input value={editForm.company_longitude} onChange={e => setEditForm(f => ({...f, company_longitude: e.target.value}))} /></label>
      <label><span>Company Description</span><textarea value={editForm.company_description} onChange={e => setEditForm(f => ({...f, company_description: e.target.value}))} rows={4} /></label>
      <label className="er-file-btn">
        Company Logo
        <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
      </label>
    </div>
    <button type="submit" className="employer-primary-btn">Save</button>
    <button type="button" className="er-text-btn" onClick={() => setEditMode(false)}>Cancel</button>
  </form>
) : (
  <div className="employer-profile-grid">
    <ProfileItem label="Full Name" value={profile?.full_name} />
    <ProfileItem label="Phone" value={profile?.phone} />
    <ProfileItem label="Email" value={profile?.email} />
    <ProfileItem label="Designation" value={profile?.profile?.designation} />
    <ProfileItem label="Company Name" value={company?.name} />
    <ProfileItem label="Industry" value={company?.industry?.name} />
    <ProfileItem label="Company Size" value={company?.company_size} />
    <ProfileItem label="Founded Year" value={company?.founded_year} />
    <ProfileItem label="Website" value={company?.website} />
    <ProfileItem label="GST Number" value={company?.gst_no} />
    <ProfileItem label="PAN Card" value={company?.pan_card} />
    <ProfileItem label="Aadhaar Card" value={company?.aadhaar_card} />
    <ProfileItem label="Location" value={company?.location} />
    <ProfileItem label="Country" value={company?.country} />
    <ProfileItem label="State" value={company?.state} />
    <ProfileItem label="City" value={company?.city} />
    <ProfileItem label="Pincode" value={company?.pincode} />
    <ProfileItem label="Latitude" value={company?.latitude} />
    <ProfileItem label="Longitude" value={company?.longitude} />
  </div>
)}
<div className="employer-profile-description">
  <span>Company Description</span>
  <p>{company?.company_description || company?.description || 'Not set'}</p>
</div>
              </section>

              <section id="jobs" className="employer-panel">
                <div className="employer-panel-head">
                  <h2>Posted Jobs</h2>
                  <span>{jobs.length} total</span>
                </div>
                <div className="employer-list">
                  {jobs.length > 0 ? jobs.slice(0, 8).map((job) => (
                    <article className="employer-job-row" key={job.id}>
                      <div>
                        <h3>{job.title}</h3>
                        <p>{job.location} - {job.salary}</p>
                        <p className="employer-row-stats">{job.applications} Applications · {job.views} Views</p>
                      </div>
                      <div className="employer-row-meta">
                        <span>{job.status}</span>
                        <small>{job.posted}</small>
                      </div>
                    </article>
                  )) : <p className="employer-empty">No jobs posted yet.</p>}
                </div>
              </section>

              <section id="applicants" className="employer-panel">
                <div className="employer-panel-head">
                  <h2>Recent Applicants</h2>
                  <span>{applicants.length} shown</span>
                </div>
                <div className="employer-list">
                  {applicants.length > 0 ? applicants.map((applicant) => (
                    <article className="employer-applicant-row" key={applicant.id}>
                      <div>
                        <h3>{applicant.name}</h3>
                        <p>{applicant.job}</p>
                      </div>
                      <div className="employer-row-meta">
                        <span>{applicant.status}</span>
                        <small>{applicant.applied}</small>
                      </div>
                    </article>
                  )) : <p className="employer-empty">No applicants yet.</p>}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;
