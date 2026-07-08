import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

const normalizeStatus = (status) => String(status || '').replace(/_/g, ' ');

const isActiveStatus = (status) => ['active', 'published'].includes(status);

const Jobs = () => {
  const { jobs, loading, refreshDashboard } = useOutletContext();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const statusCounts = useMemo(() => ({
    all: jobs.length,
    active: jobs.filter((job) => isActiveStatus(job.status)).length,
    draft: jobs.filter((job) => job.status === 'draft').length,
    closed: jobs.filter((job) => ['closed', 'expired', 'inactive'].includes(job.status)).length,
  }), [jobs]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobs
      .filter((job) => {
        if (sourceFilter !== 'all' && job.source !== sourceFilter) return false;
        if (statusFilter === 'active' && !isActiveStatus(job.status)) return false;
        if (statusFilter === 'closed' && !['closed', 'expired', 'inactive'].includes(job.status)) return false;
        if (!['all', 'active', 'closed'].includes(statusFilter) && job.status !== statusFilter) return false;
        if (!normalizedQuery) return true;

        return [
          job.title,
          job.role,
          job.category,
          job.location,
          job.jobType,
          job.workplace,
          ...job.skills,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'expiry') return new Date(a.expiresAt || 0) - new Date(b.expiresAt || 0);
        return new Date(b.postedAt || 0) - new Date(a.postedAt || 0);
      });
  }, [jobs, query, sortBy, sourceFilter, statusFilter]);

  if (loading) {
    return (
      <div className="employer-loading-list" aria-label="Loading jobs">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <>
      <header className="employer-page-header employer-jobs-header">
        <div>
          <p className="employer-kicker">Talent acquisition</p>
          <h1>Job portfolio</h1>
          <p>Manage every role returned by your employer jobs API from one focused workspace.</p>
        </div>
        <div className="employer-header-actions">
          <button type="button" className="employer-refresh-btn" onClick={refreshDashboard}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 1 0 2 5.5M20 4v7h-7" /></svg>
            Refresh jobs
          </button>
          <Link className="employer-secondary-btn" to="/dashboard/employer/gigs/new">Create gig</Link>
          <Link className="employer-primary-btn" to="/dashboard/employer/jobs/new">Create job</Link>
        </div>
      </header>

      <section className="employer-job-filters" aria-label="Job filters">
        <div className="employer-filter-tabs">
          {[
            ['all', 'All jobs'],
            ['active', 'Active'],
            ['draft', 'Drafts'],
            ['closed', 'Closed'],
          ].map(([value, label]) => (
            <button
              type="button"
              className={statusFilter === value ? 'is-active' : ''}
              key={value}
              onClick={() => setStatusFilter(value)}
            >
              {label}
              <span>{statusCounts[value]}</span>
            </button>
          ))}
        </div>

        <div className="employer-filter-controls">
          <label className="employer-search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <span className="sr-only">Search jobs</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, skill, role or location"
            />
          </label>
          <label className="employer-sort-box">
            <span>Type</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">Jobs and gigs</option>
              <option value="job">Jobs only</option>
              <option value="gig">Gigs only</option>
            </select>
          </label>
          <label className="employer-sort-box">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="title">Title A–Z</option>
              <option value="expiry">Expiring soon</option>
            </select>
          </label>
        </div>
      </section>

      <div className="employer-results-heading">
        <p><strong>{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'role' : 'roles'} found</p>
        <span>Live jobs and gigs</span>
      </div>

      {filteredJobs.length === 0 ? (
        <section className="employer-panel employer-empty-state">
          <div className="employer-empty-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6V4h6v2m-9 4h12m-13 9h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z" /></svg>
          </div>
          <strong>No matching jobs</strong>
          <p>Try a different search or status filter.</p>
          <button type="button" onClick={() => { setQuery(''); setStatusFilter('all'); setSourceFilter('all'); }}>Clear filters</button>
        </section>
      ) : (
        <section className="employer-job-management-list">
          {filteredJobs.map((job) => (
            <article className="employer-managed-job" key={job.key}>
              <div className="employer-managed-job-main">
                <div className="employer-managed-job-heading">
                  <div>
                    <div className="employer-job-title-row">
                      <h2>{job.title}</h2>
                      <span className={`employer-source-badge is-${job.source}`}>{job.sourceLabel}</span>
                      <span className={`employer-status is-${job.status}`}>{normalizeStatus(job.status)}</span>
                      {job.urgent && <span className="employer-urgent-badge">Urgent</span>}
                    </div>
                    <p>{job.role}{job.category ? ` · ${job.category}` : ''}</p>
                  </div>
                  <div className="employer-job-card-actions">
                    <Link
                      className="employer-job-edit-link"
                      to={`/dashboard/employer/${job.source === 'gig' ? 'gigs' : 'jobs'}/${job.id}/edit`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="employer-job-view-link"
                      to={`/jobs/${job.id}${job.source === 'gig' ? '?source=gig' : ''}`}
                    >
                      View listing
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </Link>
                  </div>
                </div>

                <div className="employer-job-facts">
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    {job.location}
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4zM8 7V4h8v3m-6 6h4" /></svg>
                    {job.jobType} · {job.workplace}
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
                    {job.salary}{job.negotiable ? ' · Negotiable' : ''}
                  </span>
                </div>

                {(job.skills.length > 0 || job.requirements.length > 0) && (
                  <div className="employer-job-tags">
                    {job.skills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}
                    {job.skills.length === 0 && job.requirements.slice(0, 3).map((requirement) => (
                      <span key={requirement}>{requirement}</span>
                    ))}
                    {(job.skills.length > 4 || (job.skills.length === 0 && job.requirements.length > 3)) && (
                      <span>+{job.skills.length > 4 ? job.skills.length - 4 : job.requirements.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="employer-managed-job-side">
                <div>
                  <span>Applications</span>
                  <strong>{job.applications}</strong>
                </div>
                <div>
                  <span>Views</span>
                  <strong>{job.views}</strong>
                </div>
                <dl>
                  <div><dt>Posted</dt><dd>{job.posted}</dd></div>
                  <div><dt>Expires</dt><dd>{job.expires}</dd></div>
                  <div><dt>Qualification</dt><dd>{job.qualification}</dd></div>
                </dl>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
};

export default Jobs;
