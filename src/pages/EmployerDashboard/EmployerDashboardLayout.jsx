import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authApiRequest, getAuthToken, getStoredUser, resolveAssetUrl, storeAuthSession } from '../../api';
import './EmployerDashboard.css';

const EmployerNavIcon = ({ name }) => {
  const paths = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    jobs: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    applicants: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2.5 21a6.5 6.5 0 0 1 13 0M17 11a3.5 3.5 0 1 0 0-7M17 15a5.5 5.5 0 0 1 5 3.2" />
      </>
    ),
  };

  return (
    <span className="employer-tab-icon">
      <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatSalary = (job) => {
  const currency = job.currency_code || 'INR';
  if (!job.is_salary_visible && !job.salary_min && !job.salary_max) return 'Salary not disclosed';
  if (!job.salary_min && !job.salary_max) return 'Salary not set';
  if (job.salary_min && job.salary_max) return `${currency} ${job.salary_min} - ${job.salary_max}`;
  return `${currency} ${job.salary_min || job.salary_max}`;
};

const parseRequirements = (value) => {
  const requirements = [];

  const collect = (item, depth = 0) => {
    if (item === null || item === undefined || depth > 8) return;
    if (Array.isArray(item)) {
      item.forEach((entry) => collect(entry, depth + 1));
      return;
    }

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
        try {
          collect(JSON.parse(trimmed), depth + 1);
          return;
        } catch {
          // Keep malformed legacy values readable instead of dropping them.
        }
      }

      requirements.push(trimmed);
      return;
    }

    requirements.push(String(item));
  };

  collect(value);
  return [...new Set(requirements)];
};

const humanizeCode = (value) => String(value || '').replace(/_/g, ' ');

const normalizeJobs = (jobs = [], applicationCounts = new Map()) =>
  jobs.map((job) => ({
    id: job.id,
    key: `job:${job.id}`,
    source: 'job',
    sourceLabel: 'Job',
    title: job.title || 'Untitled job',
    status: job.status || 'draft',
    description: job.description || '',
    location: job.location
      || [job.city?.name, job.state?.name, job.country?.name].filter(Boolean).join(', ')
      || 'Location not set',
    salary: formatSalary(job),
    posted: formatDate(job.posted_at || job.created_at),
    postedAt: job.posted_at || job.created_at,
    expires: formatDate(job.expires_at),
    expiresAt: job.expires_at,
    applications: applicationCounts.get(Number(job.id))
      ?? job.applications_count
      ?? job.applications?.length
      ?? 0,
    views: job.view?.view_count || 0,
    jobType: job.jobTypeMaster?.name || job.job_type || 'Not set',
    workplace: job.workplaceTypeMaster?.name || job.workplace_type || (job.is_remote ? 'Remote' : 'Not set'),
    qualification: job.qualification?.name || 'Not set',
    specialization: job.courseSpecialization?.name || '',
    role: job.jobRole?.name || 'Not set',
    category: job.jobRole?.category?.name || '',
    industry: job.jobRole?.industry?.name || job.company?.industry?.name || '',
    vacancies: job.vacancies,
    experienceMin: job.experience_min,
    experienceMax: job.experience_max,
    urgent: Boolean(job.is_urgent_hiring),
    walkIn: Boolean(job.is_walk_in_interview),
    negotiable: Boolean(job.is_salary_negotiable),
    requirements: parseRequirements(job.requirements),
    skills: (job.skills || []).map((skill) => skill.name || skill).filter(Boolean),
    company: job.company?.name || '',
  }));

const normalizeGigJobs = (jobs = [], applicationCounts = new Map()) =>
  jobs.map((job) => ({
    id: job.id,
    key: `gig:${job.id}`,
    source: 'gig',
    sourceLabel: 'Gig',
    title: job.title || 'Untitled gig',
    status: job.status || 'draft',
    description: job.description || '',
    location: [
      job.cityLocation?.name || job.city,
      job.stateLocation?.name,
      job.countryLocation?.name,
    ].filter(Boolean).join(', ') || job.location || 'Location not set',
    salary: job.amount
      ? `${job.currency_code || 'INR'} ${job.amount} / ${humanizeCode(job.payment_type || 'gig')}`
      : 'Payment not set',
    posted: formatDate(job.posted_at || job.created_at),
    postedAt: job.posted_at || job.created_at,
    expires: formatDate(job.expires_at || job.end_date),
    expiresAt: job.expires_at || job.end_date,
    applications: applicationCounts.get(Number(job.id)) ?? 0,
    views: job.view?.view_count || 0,
    jobType: 'Gig',
    workplace: 'On-site',
    qualification: job.qualification?.name || humanizeCode(job.education_required) || 'Not set',
    specialization: job.courseSpecialization?.name || '',
    role: job.jobRole?.name || 'Not set',
    category: job.categoryMaster?.name || job.jobRole?.category?.name || humanizeCode(job.category),
    industry: job.categoryMaster?.industry?.name || job.jobRole?.industry?.name || '',
    vacancies: job.openings,
    experienceMin: job.experience_min,
    experienceMax: job.experience_max,
    urgent: false,
    walkIn: false,
    negotiable: false,
    requirements: [
      humanizeCode(job.education_required),
      humanizeCode(job.experience_required),
      humanizeCode(job.work_duration),
    ].filter(Boolean),
    skills: [],
    company: job.company?.name || '',
    paymentType: humanizeCode(job.payment_type),
    workDuration: humanizeCode(job.work_duration),
    startDate: job.start_date,
    endDate: job.end_date,
    startTime: job.start_time,
    endTime: job.end_time,
  }));

const normalizeApplicants = (applicants = [], source = 'job') =>
  applicants.map((application) => ({
    id: application.id,
    key: `${source}:${application.id}`,
    source,
    sourceLabel: source === 'gig' ? 'Gig' : 'Job',
    status: application.status || 'applied',
    applied: formatDate(application.applied_at || application.created_at),
    appliedAt: application.applied_at || application.created_at,
    name: application.user?.full_name || 'Candidate',
    phone: application.user?.phone || '',
    email: application.user?.email || '',
    job: source === 'gig'
      ? application.gigJob?.title || 'Gig'
      : application.job?.title || 'Job',
    jobId: source === 'gig'
      ? application.gigJob?.id || application.gig_job_id
      : application.job?.id || application.job_id,
  }));

const EmployerDashboardLayout = () => {
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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const token = getAuthToken();

  const company = profile?.profile?.company;
  const logoUrl = resolveAssetUrl(company?.logo || '');
  const navigationItems = [
    { id: 'overview', label: 'Overview', to: '/dashboard/employer/overview' },
    { id: 'profile', label: 'Profile', to: '/dashboard/employer/profile' },
    { id: 'jobs', label: 'Jobs', to: '/dashboard/employer/jobs', count: jobs.length },
    { id: 'applicants', label: 'Applicants', to: '/dashboard/employer/applicants', count: applicants.length },
  ];
  const statCards = useMemo(
    () => [
      { label: 'Jobs', value: stats?.total_jobs ?? 0 },
      { label: 'Applicants', value: stats?.total_applicants ?? 0 },
      { label: 'Shortlisted', value: stats?.total_shortlisted ?? 0 },
      { label: 'Interviews', value: stats?.total_interviews ?? 0 },
    ],
    [stats]
  );

  useEffect(() => {
    if (!token) {
      navigate('/login/employer');
      return;
    }
    let ignore = false;
    const loadDashboard = async () => {
      setLoading(true);
      setNotice({ type: '', message: '' });
      const [
        profileResult,
        statsResult,
        jobsResult,
        gigJobsResult,
        applicantsResult,
        gigApplicantsResult,
      ] = await Promise.allSettled([
        authApiRequest('/api/auth/profile/employer'),
        authApiRequest('/api/jobs/employer/dashboard/stats'),
        authApiRequest('/api/jobs/employer'),
        authApiRequest('/api/gig-jobs/employer'),
        authApiRequest('/api/jobs/applicants'),
        authApiRequest('/api/gig-jobs/applicants'),
      ]);
      if (ignore) return;
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.user);
        storeAuthSession({ user: profileResult.value.user });
      } else {
        setNotice({ type: 'error', message: profileResult.reason.message });
      }
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.stats || {});
      const normalApplications = applicantsResult.status === 'fulfilled'
        ? applicantsResult.value.applicants || []
        : [];
      const gigApplications = gigApplicantsResult.status === 'fulfilled'
        ? gigApplicantsResult.value.applicants || []
        : [];
      const normalApplicationCounts = normalApplications.reduce((counts, application) => {
        const id = Number(application.job?.id || application.job_id);
        counts.set(id, (counts.get(id) || 0) + 1);
        return counts;
      }, new Map());
      const gigApplicationCounts = gigApplications.reduce((counts, application) => {
        const id = Number(application.gigJob?.id || application.gig_job_id);
        counts.set(id, (counts.get(id) || 0) + 1);
        return counts;
      }, new Map());

      const normalizedJobs = jobsResult.status === 'fulfilled'
        ? normalizeJobs(jobsResult.value.jobs || [], normalApplicationCounts)
        : [];
      const normalizedGigJobs = gigJobsResult.status === 'fulfilled'
        ? normalizeGigJobs(gigJobsResult.value.gig_jobs || [], gigApplicationCounts)
        : [];
      setJobs(
        [...normalizedJobs, ...normalizedGigJobs]
          .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
      );

      if (jobsResult.status === 'rejected') {
        setNotice({ type: 'error', message: jobsResult.reason.message || 'Unable to load employer jobs.' });
      }
      if (gigJobsResult.status === 'rejected') {
        setNotice({ type: 'error', message: gigJobsResult.reason.message || 'Unable to load employer gig jobs.' });
      }

      setApplicants(
        [
          ...normalizeApplicants(normalApplications, 'job'),
          ...normalizeApplicants(gigApplications, 'gig'),
        ].sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0))
      );
      setLoading(false);
    };
    loadDashboard();
    return () => {
      ignore = true;
    };
  }, [navigate, refreshVersion, token]);

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
            <p className="employer-workspace-label">Employer workspace</p>
          </div>
          <nav className="employer-tabs">
            {navigationItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                replace
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                <EmployerNavIcon name={item.id} />
                <span>{item.label}</span>
                {Number.isFinite(item.count) && <small className="employer-tab-count">{item.count}</small>}
              </NavLink>
            ))}
          </nav>
          <div className="employer-sidebar-cta">
            <span>Grow your team</span>
            <strong>Ready to hire?</strong>
            <p>Create a clear role and start receiving applications.</p>
            <Link to="/dashboard/employer/jobs/new">Post a new job</Link>
          </div>
        </aside>
        <main className="employer-main">
          {notice.message && <div className={`employer-notice is-${notice.type}`}>{notice.message}</div>}
          <Outlet
            context={{
              profile,
              setProfile,
              company,
              stats,
              statCards,
              jobs,
              applicants,
              loading,
              editMode,
              setEditMode,
              editForm,
              setEditForm,
              avatarFile,
              setAvatarFile,
              updateNotice,
              setUpdateNotice,
              token,
              notice,
              setNotice,
              refreshDashboard: () => setRefreshVersion((current) => current + 1),
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboardLayout;
