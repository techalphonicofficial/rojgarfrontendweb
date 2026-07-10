import { useState } from 'react';
import './ApplyModal.css';

/**
 * ApplyModal
 * Props:
 *   job      - { id, title, company, source } 
 *   onClose  - () => void
 *   onSubmit - ({ cover_letter, proposed_amount }) => Promise<void>
 */
const ApplyModal = ({ job, onClose, onSubmit }) => {
  const [coverLetter, setCoverLetter] = useState('I am interested in this role.');
  const [proposedAmount, setProposedAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isGig = job?.source === 'gig';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coverLetter.trim()) {
      setError('Please write a cover letter.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        cover_letter: coverLetter.trim(),
        proposed_amount: isGig ? undefined : (proposedAmount ? Number(proposedAmount) : undefined),
      });
    } catch (err) {
      setError(err.message || 'Application failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="apply-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="apply-modal-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="apply-modal">
        {/* Header */}
        <div className="apply-modal-header">
          <div className="apply-modal-title-wrap">
            <span className="apply-modal-eyebrow">Apply Now</span>
            <h2 id="apply-modal-title" className="apply-modal-title">{job?.title || 'Job'}</h2>
            <p className="apply-modal-company">{job?.company}</p>
          </div>
          <button className="apply-modal-close" onClick={onClose} aria-label="Close modal" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form className="apply-modal-form" onSubmit={handleSubmit}>
          <div className="apply-modal-field">
            <label htmlFor="apply-cover-letter" className="apply-modal-label">
              Cover Letter <span className="apply-required">*</span>
            </label>
            <textarea
              id="apply-cover-letter"
              className="apply-modal-textarea"
              rows={5}
              placeholder="Tell the employer why you're a great fit for this role..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              required
              disabled={submitting}
            />
            <span className="apply-modal-hint">{coverLetter.trim().length} / 2000 characters</span>
          </div>

          {!isGig && (
            <div className="apply-modal-field">
              <label htmlFor="apply-proposed-amount" className="apply-modal-label">
                Expected Salary (INR) <span className="apply-optional">— optional</span>
              </label>
              <div className="apply-amount-wrapper">
                <span className="apply-amount-prefix">₹</span>
                <input
                  id="apply-proposed-amount"
                  type="number"
                  className="apply-modal-input"
                  placeholder="e.g. 45000"
                  value={proposedAmount}
                  onChange={(e) => setProposedAmount(e.target.value)}
                  min={0}
                  disabled={submitting}
                />
              </div>
              <span className="apply-modal-hint">Leave blank to not specify a proposed amount</span>
            </div>
          )}

          {error && (
            <div className="apply-modal-error" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {error}
            </div>
          )}

          <div className="apply-modal-actions">
            <button type="button" className="apply-modal-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="apply-modal-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="apply-spinner" aria-hidden="true" />
                  Submitting…
                </>
              ) : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyModal;
