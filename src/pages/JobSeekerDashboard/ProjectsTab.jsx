import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../api';

const ProjectsTab = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentProjId, setCurrentProjId] = useState(null);
  
  const [formData, setFormData] = useState({
    project_name: '',
    role: '',
    start_date: '',
    end_date: '',
    is_current: false,
    project_link: '',
    description: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await authApiRequest('/api/projects');
      if (data && data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects. Please try again.');
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

  const handleEdit = (proj) => {
    setFormData({
      project_name: proj.project_name,
      role: proj.role,
      start_date: proj.start_date || '',
      end_date: proj.end_date || '',
      is_current: proj.is_current || false,
      project_link: proj.project_link || '',
      description: proj.description || ''
    });
    setCurrentProjId(proj.id);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await authApiRequest(`/api/projects/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        setProjects(prev => prev.filter(proj => proj.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete project');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentProjId) {
        // Update
        const res = await authApiRequest(`/api/projects/${currentProjId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        if (res && res.success) {
          setProjects(prev => prev.map(proj => proj.id === currentProjId ? res.data : proj));
          resetForm();
        }
      } else {
        // Create
        const res = await authApiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (res && res.success) {
          setProjects(prev => [res.data, ...prev]);
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save project');
    }
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      role: '',
      start_date: '',
      end_date: '',
      is_current: false,
      project_link: '',
      description: ''
    });
    setIsEditing(false);
    setCurrentProjId(null);
  };

  if (loading) return <div className="dashboard-panel">Loading projects...</div>;

  return (
    <section className="dashboard-section premium-dashboard-layout">
      <div className="dashboard-panel premium-panel">
        <div className="premium-panel-header">
          <h2>My Projects</h2>
          {!isEditing && (
            <button type="button" className="premium-btn primary-gradient" onClick={() => setIsEditing(true)}>
              <span>+ Add Project</span>
            </button>
          )}
        </div>

        {error && <div className="dashboard-notice is-error">{error}</div>}

        {isEditing ? (
          <form className="premium-form" onSubmit={handleSubmit}>
            <div className="premium-input-group">
              <input required type="text" id="project_name" name="project_name" value={formData.project_name} onChange={handleChange} placeholder=" " className="premium-input" />
              <label htmlFor="project_name" className="premium-floating-label">Project Name</label>
            </div>
            
            <div className="premium-input-group">
              <input required type="text" id="role" name="role" value={formData.role} onChange={handleChange} placeholder=" " className="premium-input" />
              <label htmlFor="role" className="premium-floating-label">Your Role</label>
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
              <label htmlFor="is_current">I am currently working on this project</label>
            </div>
            
            <div className="premium-input-group full-width">
              <input type="url" id="project_link" name="project_link" value={formData.project_link} onChange={handleChange} placeholder=" " className="premium-input" />
              <label htmlFor="project_link" className="premium-floating-label">Project Link (URL)</label>
            </div>
            
            <div className="premium-input-group full-width">
              <textarea id="description" name="description" rows="4" value={formData.description} onChange={handleChange} placeholder=" " className="premium-input"></textarea>
              <label htmlFor="description" className="premium-floating-label">Description & Achievements</label>
            </div>
            
            <div className="premium-form-actions">
              <button type="submit" className="premium-btn primary-gradient">Save Project</button>
              <button type="button" className="premium-btn outline" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="premium-list">
            {projects.length === 0 ? (
              <div className="premium-empty-state">
                <div className="empty-icon">📁</div>
                <h3>Showcase Your Work</h3>
                <p>Add projects you've worked on to stand out to employers.</p>
                <button type="button" className="premium-btn primary-gradient" onClick={() => setIsEditing(true)}>
                  Add Your First Project
                </button>
              </div>
            ) : (
              projects.map(proj => (
                <div key={proj.id} className="premium-card">
                  <div className="premium-card-content">
                    <h3 className="premium-card-title">{proj.project_name}</h3>
                    <h4 className="premium-card-subtitle">{proj.role}</h4>
                    <p className="premium-card-date">
                      {new Date(proj.start_date).toLocaleDateString()} - {proj.is_current ? 'Present' : (proj.end_date ? new Date(proj.end_date).toLocaleDateString() : 'N/A')}
                    </p>
                    {proj.project_link && (
                      <a href={proj.project_link} target="_blank" rel="noopener noreferrer" className="premium-card-link">View Project ↗</a>
                    )}
                    {proj.description && <p className="premium-card-desc">{proj.description}</p>}
                  </div>
                  <div className="premium-card-actions">
                    <button type="button" className="premium-icon-btn edit" onClick={() => handleEdit(proj)} aria-label="Edit">✏️</button>
                    <button type="button" className="premium-icon-btn delete" onClick={() => handleDelete(proj.id)} aria-label="Delete">🗑️</button>
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

export default ProjectsTab;
