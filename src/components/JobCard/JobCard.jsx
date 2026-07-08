import { Link } from 'react-router-dom';
import './JobCard.css';

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const SalaryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 13l4 4L19 7"></path>
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2"></rect>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
  </svg>
);

const BookmarkIcon = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
  </svg>
);

const JobCard = ({ job, onSaveToggle, onApply, saving = false, applying = false }) => {
  const isApplied = Boolean(job.appliedStatus);
  const typeClassName = String(job.type || 'job').toLowerCase().replace(/[\s_]+/g, '-');

  return (
    <article className={`job-card-simple is-${job.source || 'normal'}`}>
      <div className="jc-header">
        <div className="jc-title-wrap">
          <h3 className="jc-title">
            <Link to={`/jobs/${job.id}${job.source === 'gig' ? '?source=gig' : ''}`}>{job.title}</Link>
          </h3>
          <div className="jc-company-info">
            <span className="jc-company">{job.company}</span>
            {job.location && (
              <span className="jc-location">{job.location}</span>
            )}
          </div>
        </div>
        <button
          className={`jc-save-btn ${job.savedStatus ? 'is-saved' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            onSaveToggle?.(job.id, job.source);
          }}
          disabled={saving}
          aria-label={job.savedStatus ? 'Unsave job' : 'Save job'}
        >
          <BookmarkIcon filled={job.savedStatus} />
        </button>
      </div>

      <div className="jc-body">
        <div className="jc-tags">
          {job.salary && (
            <span className="jc-salary-tag">
              <SalaryIcon />
              {job.salary}
            </span>
          )}
          {job.experience && (
            <span className="jc-meta-tag">
              <BriefcaseIcon />
              {job.experience}
            </span>
          )}
          {job.type && (
            <span className="jc-meta-tag">{job.type}</span>
          )}
        </div>
        
        {job.isUrgent && (
          <span className="jc-urgent-text">Urgent Hiring</span>
        )}
      </div>

      <div className="jc-footer">
        <span className="jc-posted">{job.posted}</span>
        <button
          className={`jc-apply-btn ${isApplied ? 'is-applied' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            if (!isApplied) onApply?.(job.id, job.source);
          }}
          disabled={isApplied || applying}
        >
          {isApplied ? 'Applied' : 'Apply Now'}
        </button>
      </div>
    </article>
  );
};

export default JobCard;
