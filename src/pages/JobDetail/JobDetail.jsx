import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { apiRequest, authApiRequest, applyJob, applyGigJob } from '../../api';
import { useAuth } from '../../context/auth-state';
import ApplyModal from '../../components/ApplyModal/ApplyModal';
import './JobDetail.css';

const cleanDisplayValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return ['undefined', 'null', 'nan', '[object object]'].includes(text.toLowerCase()) ? '' : text;
};

const titleCase = (value = '') => cleanDisplayValue(value)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPosted = (value) => {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hours ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (value) => {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':');
  if (!hours || !minutes) return String(value);
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const formatNumber = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
};

const formatAmount = (value, currencyCode = 'INR') => {
  if (value === null || value === undefined || value === '') return '';
  return `${currencyCode || 'INR'} ${formatNumber(value)}`;
};

const formatExperienceRange = (job = {}) => {
  const hasMin = job.experience_min !== null && job.experience_min !== undefined && job.experience_min !== '';
  const hasMax = job.experience_max !== null && job.experience_max !== undefined && job.experience_max !== '';

  if (hasMin && hasMax) {
    const min = Number(job.experience_min);
    const max = Number(job.experience_max);
    if (min === 0 && max === 0) return 'Fresher (0 years)';
    if (min === max) return `${min} ${min === 1 ? 'year' : 'years'}`;
    return `${min}-${max} years`;
  }

  if (hasMin) {
    const min = Number(job.experience_min);
    return `${min}+ ${min === 1 ? 'year' : 'years'}`;
  }

  return titleCase(job.experience_required || '');
};

const formatPay = (job, source) => {
  const currency = job.currency_code || 'INR';

  if (source === 'gig') {
    const amount = formatAmount(job.amount, currency);
    return amount ? `${amount}${job.payment_type ? ` / ${titleCase(job.payment_type)}` : ''}` : 'Payment not shown';
  }

  const min = formatAmount(job.salary_min, currency);
  const max = job.salary_max ? formatNumber(job.salary_max) : '';
  const range = min && max ? `${min} - ${max}` : (min || formatAmount(job.salary_max, currency));

  if (range) {
    return `${range}${job.salary_type ? ` / ${titleCase(job.salary_type)}` : ''}`;
  }

  if (job.is_salary_visible === false || job.hide_salary_from_seeker) {
    return 'Salary hidden by employer';
  }

  return 'Salary not shown';
};

const buildLocation = (job, source) => {
  const city = cleanDisplayValue(source === 'gig'
    ? (job.cityLocation?.name || job.city)
    : (job.city?.name || job.locations?.[0]?.name || job.city));
  const state = cleanDisplayValue(source === 'gig' ? job.stateLocation?.name : job.state?.name);
  const country = cleanDisplayValue(source === 'gig' ? job.countryLocation?.name : job.country?.name);
  const explicitLocation = cleanDisplayValue(job.location);

  return explicitLocation || [city, state, country].filter(Boolean).join(', ') || 'Location not specified';
};

const flattenValues = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap(flattenValues);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      try {
        return flattenValues(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (typeof value === 'object') {
    return Object.values(value).flatMap(flattenValues);
  }

  return [String(value)];
};

const uniqueItems = (items) => [...new Set(items.map(cleanDisplayValue).filter(Boolean))];

const getExistingApplicationStatus = async (jobId, source) => {
  const endpoint = source === 'gig'
    ? '/api/gig-jobs/my-applications?page=1&limit=100'
    : '/api/jobs/my-applications?page=1&limit=100';

  try {
    const data = await authApiRequest(endpoint);
    const applications = data.applications || [];
    const matchedApplication = applications.find((application) => (
      source === 'gig'
        ? Number(application.gig_job_id) === Number(jobId)
        : Number(application.job_id) === Number(jobId)
    ));

    return matchedApplication?.status || '';
  } catch {
    return '';
  }
};

const buildRequirements = (job, source) => {
  const parsedRequirements = uniqueItems(flattenValues(job.requirements));

  if (source !== 'gig') {
    return parsedRequirements;
  }

  return uniqueItems([
    ...parsedRequirements,
    job.qualification?.name && `Qualification: ${job.qualification.name}`,
    job.courseSpecialization?.name && `Specialization: ${job.courseSpecialization.name}`,
    job.education_required && `Education: ${titleCase(job.education_required)}`,
    formatExperienceRange(job) && `Experience: ${formatExperienceRange(job)}`
  ]);
};

const normalizeJobDetail = (job, source) => {
  const companyName = cleanDisplayValue(job.company?.name) || 'Company not available';
  const roleName = cleanDisplayValue(job.jobRole?.name || job.title) || 'Role not specified';
  const industryName = cleanDisplayValue(job.jobRole?.industry?.name || job.categoryMaster?.industry?.name || job.company?.industry?.name);
  const categoryName = cleanDisplayValue(job.jobRole?.category?.name || job.categoryMaster?.name || job.category);
  const startDate = formatDate(job.start_date);
  const endDate = formatDate(job.end_date);
  const startTime = formatTime(job.start_time);
  const endTime = formatTime(job.end_time);
  const schedule = [
    startDate && endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate,
    startTime && endTime ? `${startTime} - ${endTime}` : ''
  ].filter(Boolean).join(', ');

  const facts = source === 'gig'
    ? [
      { label: 'Openings', value: job.openings },
      { label: 'Experience', value: formatExperienceRange(job) },
      { label: 'Duration', value: titleCase(job.work_duration || '') },
      { label: 'Schedule', value: schedule },
      { label: 'Role', value: roleName },
      { label: 'Category', value: titleCase(categoryName) },
      { label: 'Contact', value: job.contact_number }
    ]
    : [
      { label: 'Vacancies', value: job.vacancies },
      { label: 'Experience', value: formatExperienceRange(job) },
      { label: 'Workplace', value: job.workplaceTypeMaster?.name || titleCase(job.workplace_type || '') },
      { label: 'Role', value: roleName },
      { label: 'Category', value: categoryName },
      { label: 'Expires', value: formatDate(job.expires_at) }
    ];

  return {
    id: job.id,
    source,
    title: job.title || 'Untitled job',
    company: companyName,
    companyDescription: job.company?.company_description || job.company?.description || '',
    companyWebsite: job.company?.website || '',
    companySize: job.company?.company_size || '',
    companyLocation: job.company?.location || '',
    companyVerified: Boolean(job.company?.is_verified),
    employerName: job.employer?.user?.full_name || '',
    employerPhone: job.employer?.user?.phone || '',
    employerEmail: job.employer?.user?.email || '',
    location: buildLocation(job, source),
    pay: formatPay(job, source),
    type: source === 'gig' ? 'Gig' : (job.jobTypeMaster?.name || titleCase(job.job_type || 'Job')),
    posted: formatPosted(job.posted_at || job.created_at),
    status: titleCase(job.status || ''),
    appliedStatus: job.applied_status || '',
    description: job.description || 'No description has been added for this role yet.',
    requirements: buildRequirements(job, source),
    skills: Array.isArray(job.skills) ? job.skills.map((skill) => skill.name || skill).filter(Boolean) : [],
    details: facts
      .map((item) => ({ ...item, value: cleanDisplayValue(item.value) }))
      .filter((item) => item.value),
    highlights: uniqueItems([
      industryName,
      source === 'gig' ? titleCase(job.payment_type || '') : (job.is_remote ? 'Remote' : ''),
      job.is_urgent_hiring ? 'Urgent hiring' : '',
      job.is_walk_in_interview ? 'Walk-in interview' : '',
      job.is_salary_negotiable ? 'Salary negotiable' : '',
      job.gender_preference && `Preferred: ${titleCase(job.gender_preference)}`
    ])
  };
};

const JobDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const source = searchParams.get('source') === 'gig' ? 'gig' : 'normal';
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadJob = async () => {
      setLoading(true);
      setError('');
      setApplyMessage('');

      try {
        const endpoint = source === 'gig' ? `/api/gig-jobs/${id}` : `/api/jobs/${id}`;
        const data = await apiRequest(endpoint);
        const payload = source === 'gig' ? data.gig_job : data.job;

        if (!payload) {
          throw new Error('Job details were not found.');
        }

        const normalizedJob = normalizeJobDetail(payload, source);

        if (isAuthenticated) {
          normalizedJob.appliedStatus = await getExistingApplicationStatus(id, source) || normalizedJob.appliedStatus;
        }

        if (!ignore) {
          setJob(normalizedJob);
          // Track view count
          try {
            const trackEndpoint = source === 'gig' ? `/api/gig-jobs/${id}/view` : `/api/jobs/${id}/view`;
            await apiRequest(trackEndpoint, { method: 'POST' });
          } catch (e) {
            console.error('Failed to track job view', e);
          }
        }
      } catch (jobError) {
        if (!ignore) {
          setJob(null);
          setError(jobError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadJob();

    return () => {
      ignore = true;
    };
  }, [id, isAuthenticated, source]);

  const backPath = useMemo(() => {
    const params = source === 'gig' ? '?type=gig' : '';
    return `/jobs${params}`;
  }, [source]);

  // Opens the modal
  const handleApply = () => {
    if (!isAuthenticated) {
      setApplyMessage('Please login as a job seeker to apply.');
      return;
    }
    setShowApplyModal(true);
  };

  // Called when modal form is submitted
  const handleApplySubmit = async ({ cover_letter, proposed_amount }) => {
    setApplying(true);
    setApplyMessage('');

    try {
      if (source === 'gig') {
        await applyGigJob(id, { cover_letter });
      } else {
        await applyJob(id, { cover_letter, proposed_amount });
      }
      setJob((current) => current ? { ...current, appliedStatus: 'applied' } : current);
      setApplyMessage('Application submitted successfully! 🎉');
      setShowApplyModal(false);
    } catch (applyError) {
      if (/already applied/i.test(applyError.message)) {
        setJob((current) => current ? { ...current, appliedStatus: 'applied' } : current);
        setShowApplyModal(false);
      }
      throw applyError; // let modal show the error
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="job-detail-page">
        <div className="container job-detail-state">
          <div className="job-detail-loader">Loading job details...</div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="job-detail-page">
        <div className="container job-detail-state">
          <Link to="/jobs" className="back-link">&larr; Back to Jobs</Link>
          <div className="glass-panel job-detail-empty">
            <h1>Job not available</h1>
            <p>{error || 'We could not find this job.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-detail-page">
      <div className="job-hero-section">
        <div className="container job-hero-content">
          <Link to={backPath} className="back-link">&larr; Back to Jobs</Link>
          <div className="job-hero-main">
            <div className="job-hero-info">
              <span className="job-type-pill">{job.type}</span>
              <h1 className="job-title">{job.title}</h1>
              <p className="job-company">{job.company}</p>

              <div className="job-meta">
                <span>{job.location}</span>
                <span>{job.pay}</span>
                <span>{job.posted}</span>
              </div>

              {job.highlights.length > 0 && (
                <div className="job-highlights">
                  {job.highlights.map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="job-hero-action">
              <button className="btn-primary btn-large" type="button" onClick={handleApply} disabled={applying || Boolean(job.appliedStatus)}>
                {job.appliedStatus ? 'Applied' : (applying ? 'Applying...' : 'Apply Now')}
              </button>
              {applyMessage && <p className="apply-message">{applyMessage}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="container job-detail-body">
        <div className="job-main-content glass-panel">
          <h2>Job Description</h2>
          <div className="rich-description" dangerouslySetInnerHTML={{ __html: job.description }} />

          {job.requirements.length > 0 && (
            <>
              <h2>Requirements</h2>
              <ul>
                {job.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
              </ul>
            </>
          )}

          {job.skills.length > 0 && (
            <>
              <h2>Skills</h2>
              <div className="job-skill-list">
                {job.skills.map((skill) => <span key={skill}>{skill}</span>)}
              </div>
            </>
          )}

          {job.details.length > 0 && (
            <>
              <h2>Role Details</h2>
              <div className="job-detail-grid">
                {job.details.map((item) => (
                  <div className="job-detail-fact" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="job-sidebar">
          <div className="glass-panel company-card">
            <h3>About the Company</h3>
            <p>
              <strong>{job.company}</strong>
              {job.companyDescription ? ` ${job.companyDescription}` : ' has not added a company description yet.'}
            </p>
            <div className="company-facts">
              {job.companySize && <span>{job.companySize}</span>}
              {job.companyLocation && <span>{job.companyLocation}</span>}
              {job.companyVerified && <span>Verified company</span>}
              {job.status && <span>Status: {job.status}</span>}
            </div>
            {job.companyWebsite ? (
              <a className="btn-secondary company-link" href={job.companyWebsite} target="_blank" rel="noreferrer">
                View Company Website
              </a>
            ) : (
              <button className="btn-secondary" type="button" disabled>Company profile unavailable</button>
            )}
          </div>

          {(job.employerName || job.employerPhone || job.employerEmail) && (
            <div className="glass-panel company-card">
              <h3>Employer Contact</h3>
              <div className="company-facts">
                {job.employerName && <span>{job.employerName}</span>}
                {job.employerPhone && <span>{job.employerPhone}</span>}
                {job.employerEmail && <span>{job.employerEmail}</span>}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Apply Modal */}
      {showApplyModal && job && (
        <ApplyModal
          job={{ id: job.id, title: job.title, company: job.company, source }}
          onClose={() => setShowApplyModal(false)}
          onSubmit={handleApplySubmit}
        />
      )}
    </div>
  );
};

export default JobDetail;
