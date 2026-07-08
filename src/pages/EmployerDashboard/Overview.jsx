import { Link, useOutletContext } from 'react-router-dom';

const statIcons = {
  Jobs: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6V4h6v2m-9 4h12m-13 9h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z" /></svg>
  ),
  Applicants: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Shortlisted: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  Interviews: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Zm4 11h6" /></svg>
  ),
};

const statusLabel = (status) => String(status || '').replace(/_/g, ' ');

const Overview = () => {
  const { statCards, jobs, applicants, company, loading, refreshDashboard } = useOutletContext();

  if (loading) {
    return (
      <div className="employer-loading-grid" aria-label="Loading employer dashboard">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  const activeJobs = jobs.filter((job) => ['active', 'published'].includes(job.status)).length;
  const urgentJobs = jobs.filter((job) => job.urgent).length;
  const recentJobs = jobs.slice(0, 5);
  const recentApplicants = applicants.slice(0, 4);

  return (
    <>
      <header className="employer-page-header">
        <div>
          <p className="employer-kicker">Recruitment command center</p>
          <h1>Good to see you, {company?.name || 'Employer'}</h1>
          <p>Track hiring activity, review your job portfolio, and keep every role moving.</p>
        </div>
        <button type="button" className="employer-refresh-btn" onClick={refreshDashboard}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 1 0 2 5.5M20 4v7h-7" /></svg>
          Refresh data
        </button>
      </header>

      <section className="employer-stat-grid" aria-label="Hiring statistics">
        {statCards.map((item, index) => (
          <article className={`employer-stat-card accent-${index + 1}`} key={item.label}>
            <div className="employer-stat-icon">{statIcons[item.label]}</div>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.label === 'Jobs' ? `${activeJobs} currently active` : 'Across your hiring pipeline'}</small>
            </div>
          </article>
        ))}
      </section>

      <div className="employer-overview-grid">
        <section className="employer-panel employer-recent-jobs">
          <div className="employer-panel-head">
            <div>
              <p className="employer-section-eyebrow">Job portfolio</p>
              <h2>Recently posted roles</h2>
            </div>
            <Link to="/dashboard/employer/jobs">View all jobs</Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="employer-empty-state">
              <strong>No jobs posted yet</strong>
              <p>Your published and draft roles will appear here.</p>
            </div>
          ) : (
            <div className="employer-job-summary-list">
              {recentJobs.map((job) => (
                <Link
                  to={`/jobs/${job.id}${job.source === 'gig' ? '?source=gig' : ''}`}
                  className="employer-job-summary"
                  key={job.key}
                >
                  <div className="employer-job-monogram">{job.title.charAt(0).toUpperCase()}</div>
                  <div className="employer-job-summary-copy">
                    <strong>{job.title}</strong>
                    <span>{job.sourceLabel} · {job.role} · {job.location}</span>
                  </div>
                  <div className="employer-job-summary-meta">
                    <span className={`employer-status is-${job.status}`}>{statusLabel(job.status)}</span>
                    <small>{job.posted}</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="employer-overview-side">
          <section className="employer-panel employer-health-card">
            <div className="employer-panel-head">
              <div>
                <p className="employer-section-eyebrow">Portfolio health</p>
                <h2>Hiring snapshot</h2>
              </div>
            </div>
            <div className="employer-health-row">
              <span>Active roles</span>
              <strong>{activeJobs}</strong>
            </div>
            <div className="employer-health-row">
              <span>Urgent hiring</span>
              <strong>{urgentJobs}</strong>
            </div>
            <div className="employer-health-row">
              <span>Avg. applicants / job</span>
              <strong>{jobs.length ? Math.round((statCards.find((card) => card.label === 'Applicants')?.value || 0) / jobs.length) : 0}</strong>
            </div>
          </section>

          <section className="employer-panel employer-candidates-card">
            <div className="employer-panel-head">
              <div>
                <p className="employer-section-eyebrow">Latest activity</p>
                <h2>Recent applicants</h2>
              </div>
              <Link to="/dashboard/employer/applicants">View all</Link>
            </div>
            {recentApplicants.length === 0 ? (
              <p className="employer-empty">No recent applicants.</p>
            ) : recentApplicants.map((applicant) => (
              <div className="employer-mini-applicant" key={applicant.key}>
                <span>{applicant.name.charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{applicant.name}</strong>
                  <small>{applicant.sourceLabel} · {applicant.job}</small>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
};

export default Overview;
