import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../api';

const ExperienceTab = () => {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentExpId, setCurrentExpId] = useState(null);
  
  const [formData, setFormData] = useState({
    company_name: '',
    job_title: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  });

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const data = await authApiRequest('/api/experiences');
      if (data && data.success) {
        setExperiences(data.experiences);
      }
    } catch (err) {
      console.error('Failed to fetch experiences:', err);
      setError('Failed to load experiences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (exp) => {
    setFormData({
      company_name: exp.company_name,
      job_title: exp.job_title,
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      is_current: exp.is_current || false,
      description: exp.description || ''
    });
    setCurrentExpId(exp.id);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this experience?')) return;
    try {
      const res = await authApiRequest(`/api/experiences/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        setExperiences(prev => prev.filter(exp => exp.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete experience');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentExpId) {
        // Update
        const res = await authApiRequest(`/api/experiences/${currentExpId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (res && res.success) {
          setExperiences(prev => prev.map(exp => exp.id === currentExpId ? res.experience : exp));
          resetForm();
        }
      } else {
        // Create
        const res = await authApiRequest('/api/experiences', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (res && res.success) {
          setExperiences(prev => [res.experience, ...prev]);
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save experience');
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      job_title: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: ''
    });
    setIsEditing(false);
    setCurrentExpId(null);
  };

  if (loading) return <div className="dashboard-panel">Loading experiences...</div>;

  return (
    <section className="dashboard-section premium-dashboard-layout">
      <div className="dashboard-panel premium-panel">
        <div className="premium-panel-header">
          <h2>Work Experience</h2>
          {!isEditing && (
            <button type="button" className="premium-btn primary-gradient" onClick={() => setIsEditing(true)}>
              <span>+ Add Experience</span>
            </button>
          )}
        </div>

        {error && <div className="dashboard-notice is-error">{error}</div>}

        {isEditing ? (
          <form className="premium-form" onSubmit={handleSubmit}>
            <div className="premium-input-group">
              <input required type="text" id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} placeholder=" " className="premium-input" />
              <label htmlFor="company_name" className="premium-floating-label">Company Name</label>
            </div>
            
            <div className="premium-input-group">
              <input required type="text" id="job_title" name="job_title" value={formData.job_title} onChange={handleChange} placeholder=" " className="premium-input" />
              <label htmlFor="job_title" className="premium-floating-label">Job Title</label>
            </div>
            
            <div className="premium-input-group half-width">
              <input required type="date" id="start_date" name="start_date" value={formData.start_date} onChange={handleChange} className="premium-input has-value" />
              <label htmlFor="start_date" className="premium-floating-label always-float">Start Date</label>
            </div>
            
            <div className="premium-input-group half-width">
              <input type="date" id="end_date" name="end_date" value={formData.end_date} onChange={handleChange} disabled={formData.is_current} className="premium-input has-value" />
              <label htmlFor="end_date" className="premium-floating-label always-float">End Date</label>
            </div>
            
            <div className="premium-checkbox-group">
              <input type="checkbox" id="is_current" name="is_current" checked={formData.is_current} onChange={handleChange} className="premium-checkbox" />
              <label htmlFor="is_current">I currently work here</label>
            </div>
            
            <div className="premium-input-group full-width">
              <textarea id="description" name="description" rows="4" value={formData.description} onChange={handleChange} placeholder=" " className="premium-input"></textarea>
              <label htmlFor="description" className="premium-floating-label">Description</label>
            </div>
            
            <div className="premium-form-actions">
              <button type="submit" className="premium-btn primary-gradient">Save Experience</button>
              <button type="button" className="premium-btn outline" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="premium-list">
            {experiences.length === 0 ? (
              <div className="premium-empty-state">
                <div className="empty-icon">💼</div>
                <h3>Showcase Your Experience</h3>
                <p>Add your work history to stand out to employers.</p>
                <button type="button" className="premium-btn primary-gradient" onClick={() => setIsEditing(true)}>
                  Add Work Experience
                </button>
              </div>
            ) : (
              experiences.map(exp => (
                <div key={exp.id} className="premium-card">
                  <div className="premium-card-content">
                    <h3 className="premium-card-title">{exp.job_title}</h3>
                    <h4 className="premium-card-subtitle">{exp.company_name}</h4>
                    <p className="premium-card-date">
                      {new Date(exp.start_date).toLocaleDateString()} - {exp.is_current ? 'Present' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'N/A')}
                    </p>
                    {exp.description && <p className="premium-card-desc" style={{ marginTop: '0.5rem' }}>{exp.description}</p>}
                  </div>
                  <div className="premium-card-actions">
                    <button type="button" className="premium-icon-btn edit" onClick={() => handleEdit(exp)} aria-label="Edit">✏️</button>
                    <button type="button" className="premium-icon-btn delete" onClick={() => handleDelete(exp.id)} aria-label="Delete">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ExperienceTab;
