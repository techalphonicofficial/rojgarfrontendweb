import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { authApiRequest, updateJob, API_BASE_URL } from '../../api';
import styles from './createJob.module.css';

const initialForm = {
  title: '',
  description: '',
  requirements: '',
  industry_id: '',
  job_category_id: '',
  job_role_id: '',
  country_id: '',
  state_id: '',
  city_id: '',
  location: '',
  latitude: '',
  longitude: '',
  qualification_id: '',
  course_specialization_id: '',
  workplace_type_id: '',
  job_type_id: '',
  salary_min: '',
  salary_max: '',
  currency_code: 'INR',
  experience_min: '0',
  experience_max: '0',
  gender_preference: 'any',
  skills: '',
  expires_at: '',
  hide_salary_from_seeker: false,
  is_salary_negotiable: false,
  is_urgent_hiring: false,
  is_walk_in_interview: false,
  status: 'published',
};

const defaultLocations = [
  { label: 'Delhi', value: { lat: 28.7041, lon: 77.1025, name: 'Delhi' } },
  { label: 'Noida, Uttar Pradesh', value: { lat: 28.5355, lon: 77.3910, name: 'Noida, Uttar Pradesh' } },
  { label: 'Gurugram, Haryana', value: { lat: 28.4595, lon: 77.0266, name: 'Gurugram, Haryana' } },
  { label: 'Bengaluru, Karnataka', value: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' } },
  { label: 'Mumbai, Maharashtra', value: { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' } },
  { label: 'Pune, Maharashtra', value: { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra' } },
  { label: 'Hyderabad, Telangana', value: { lat: 17.3850, lon: 78.4867, name: 'Hyderabad, Telangana' } },
  { label: 'Chennai, Tamil Nadu', value: { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu' } },
];

const loadLocationOptions = async (inputValue) => {
  if (!inputValue || inputValue.length < 3) return defaultLocations;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputValue)}&format=json&addressdetails=1&limit=5&countrycodes=in`);
    const data = await res.json();
    return data.map(place => ({
      label: place.display_name,
      value: { lat: place.lat, lon: place.lon, name: place.display_name }
    }));
  } catch {
    return [];
  }
};

const cx = (...classes) => classes.filter(Boolean).join(' ');
const inputValue = (value) => value === null || value === undefined ? '' : String(value);
const dateInputValue = (value) => value ? String(value).slice(0, 10) : '';

const requirementsToText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  if (!value) return '';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join('\n');
    } catch {
      // Preserve legacy plain-text requirements.
    }
  }

  return String(value);
};

const jobToForm = (job = {}) => ({
  ...initialForm,
  title: job.title || '',
  description: job.description || '',
  requirements: requirementsToText(job.requirements),
  industry_id: inputValue(job.jobRole?.industry_id || job.jobRole?.industry?.id),
  job_category_id: inputValue(job.jobRole?.job_category_id || job.jobRole?.category?.id),
  job_role_id: inputValue(job.job_role_id || job.jobRole?.id),
  country_id: inputValue(job.country_id || job.country?.id),
  state_id: inputValue(job.state_id || job.state?.id),
  city_id: inputValue(job.city_id || job.city?.id),
  location: job.location || '',
  latitude: inputValue(job.latitude),
  longitude: inputValue(job.longitude),
  qualification_id: inputValue(job.qualification_id || job.qualification?.id),
  course_specialization_id: inputValue(job.course_specialization_id || job.courseSpecialization?.id),
  workplace_type_id: inputValue(job.workplace_type_id || job.workplaceTypeMaster?.id),
  job_type_id: inputValue(job.job_type_id || job.jobTypeMaster?.id),
  salary_min: inputValue(job.salary_min),
  salary_max: inputValue(job.salary_max),
  currency_code: job.currency_code || 'INR',
  experience_min: inputValue(job.experience_min ?? 0),
  experience_max: inputValue(job.experience_max ?? 0),
  gender_preference: job.gender_preference || 'any',
  skills: (job.skills || []).map((skill) => skill.name || skill).filter(Boolean).join(', '),
  expires_at: dateInputValue(job.expires_at),
  hide_salary_from_seeker: job.hide_salary_from_seeker ?? job.is_salary_visible === false,
  is_salary_negotiable: Boolean(job.is_salary_negotiable),
  is_urgent_hiring: Boolean(job.is_urgent_hiring),
  is_walk_in_interview: Boolean(job.is_walk_in_interview),
  status: job.status || 'published',
});

const CreateJob = () => {
  const navigate = useNavigate();
  const { id: jobId } = useParams();
  const isEditing = Boolean(jobId);
  const { refreshDashboard, setNotice } = useOutletContext();
  const [form, setForm] = useState(initialForm);
  const [masters, setMasters] = useState({
    job_types: [],
    workplace_types: [],
    industries: [],
    job_categories: [],
    qualifications: [],
    course_specializations: [],
    job_roles: [],
    gender_preferences: [],
  });
  const [availableSkills, setAvailableSkills] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [requirementsList, setRequirementsList] = useState(['']);

  const categories = useMemo(
    () => masters.job_categories.filter((item) => !form.industry_id || String(item.industry_id) === String(form.industry_id)),
    [form.industry_id, masters.job_categories]
  );
  const roles = useMemo(
    () => masters.job_roles.filter((item) => !form.job_category_id || String(item.job_category_id) === String(form.job_category_id)),
    [form.job_category_id, masters.job_roles]
  );
  const specializations = useMemo(
    () => masters.course_specializations.filter((item) => !form.qualification_id || String(item.qualification_id) === String(form.qualification_id)),
    [form.qualification_id, masters.course_specializations]
  );
  const selectedSkills = useMemo(
    () => new Set(form.skills.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)),
    [form.skills]
  );
  const completion = useMemo(() => {
    const requiredFields = [
      'title',
      'description',
      'industry_id',
      'job_category_id',
      'job_role_id',
      'job_type_id',
      'country_id',
      'state_id',
      'city_id',
      'workplace_type_id',
      'qualification_id',
    ];
    const complete = requiredFields.filter((field) => String(form[field] || '').trim()).length;
    return Math.round((complete / requiredFields.length) * 100);
  }, [form]);

  useEffect(() => {
    let ignore = false;

    const requests = [
      authApiRequest('/api/jobs/masters'),
      authApiRequest('/api/skills'),
      authApiRequest('/api/locations/countries?limit=300'),
    ];

    if (isEditing) requests.push(authApiRequest(`/api/jobs/${jobId}`));

    Promise.all(requests)
      .then(([masterData, skillData, countryData, jobData]) => {
        if (ignore) return;
        setMasters((current) => ({ ...current, ...masterData }));
        setAvailableSkills(skillData.skills || []);
        setCountries(countryData.locations || countryData.countries || []);
        if (isEditing) {
          const parsed = jobToForm(jobData.job || jobData);
          setForm(parsed);
          const reqs = parsed.requirements.split('\n').filter(Boolean);
          setRequirementsList(reqs.length > 0 ? reqs : ['']);
        }
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message || `Unable to load ${isEditing ? 'the job' : 'job form options'}.`);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isEditing, jobId]);

  useEffect(() => {
    if (!form.country_id) {
      return;
    }

    let ignore = false;
    authApiRequest(`/api/locations/countries/${form.country_id}/states?limit=300`)
      .then((data) => {
        if (!ignore) setStates(data.locations || data.states || []);
      })
      .catch(() => {
        if (!ignore) setStates([]);
      });

    return () => {
      ignore = true;
    };
  }, [form.country_id]);

  useEffect(() => {
    if (!form.state_id) {
      return;
    }

    let ignore = false;
    authApiRequest(`/api/locations/states/${form.state_id}/cities?limit=500`)
      .then((data) => {
        if (!ignore) setCities(data.locations || data.cities || []);
      })
      .catch(() => {
        if (!ignore) setCities([]);
      });

    return () => {
      ignore = true;
    };
  }, [form.state_id]);

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'industry_id') {
        next.job_category_id = '';
        next.job_role_id = '';
      }
      if (field === 'job_category_id') next.job_role_id = '';
      if (field === 'qualification_id') next.course_specialization_id = '';
      if (field === 'country_id') {
        next.state_id = '';
        next.city_id = '';
      }
      if (field === 'state_id') next.city_id = '';

      return next;
    });
  };

  const toggleSkill = (name) => {
    const currentSkills = form.skills.split(',').map((item) => item.trim()).filter(Boolean);
    const exists = currentSkills.some((item) => item.toLowerCase() === name.toLowerCase());
    updateField('skills', (exists
      ? currentSkills.filter((item) => item.toLowerCase() !== name.toLowerCase())
      : [...currentSkills, name]).join(', '));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setForm((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const locName = data.display_name || `${lat}, ${lng}`;
          setForm((prev) => ({ ...prev, location: locName }));
        } catch {
          setForm((prev) => ({ ...prev, location: `${lat}, ${lng}` }));
        }
        setGettingLocation(false);
      },
      () => {
        setError('Unable to retrieve your location. Please allow location access.');
        setGettingLocation(false);
      }
    );
  };

  const updateRequirement = (index, value) => {
    setRequirementsList((prev) => {
      const next = [...prev];
      next[index] = value;
      updateField('requirements', next.filter(Boolean).join('\n'));
      return next;
    });
  };

  const addRequirement = () => {
    setRequirementsList((prev) => [...prev, '']);
  };

  const removeRequirement = (index) => {
    setRequirementsList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) next.push('');
      updateField('requirements', next.filter(Boolean).join('\n'));
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.salary_min && form.salary_max && Number(form.salary_min) > Number(form.salary_max)) {
      setError('Maximum salary must be greater than or equal to minimum salary.');
      return;
    }
    if (Number(form.experience_min) > Number(form.experience_max)) {
      setError('Maximum experience must be greater than or equal to minimum experience.');
      return;
    }

    const jobType = masters.job_types.find((item) => String(item.id) === String(form.job_type_id));
    const workplaceType = masters.workplace_types.find((item) => String(item.id) === String(form.workplace_type_id));
    const requirements = form.requirements.split('\n').map((item) => item.trim()).filter(Boolean);
    const skills = form.skills.split(',').map((item) => item.trim()).filter(Boolean);
    const numberValue = (value) => value === '' ? (isEditing ? null : undefined) : Number(value);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      requirements,
      country_id: numberValue(form.country_id),
      state_id: numberValue(form.state_id),
      city_id: numberValue(form.city_id),
      location: form.location.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      qualification_id: numberValue(form.qualification_id),
      course_specialization_id: numberValue(form.course_specialization_id),
      job_role_id: numberValue(form.job_role_id),
      workplace_type_id: numberValue(form.workplace_type_id),
      workplace_type: workplaceType?.code,
      job_type_id: numberValue(form.job_type_id),
      job_type: jobType?.code,
      salary_min: numberValue(form.salary_min),
      salary_max: numberValue(form.salary_max),
      currency_code: form.currency_code.trim().toUpperCase(),
      hide_salary_from_seeker: form.hide_salary_from_seeker,
      is_salary_negotiable: form.is_salary_negotiable,
      is_urgent_hiring: form.is_urgent_hiring,
      is_walk_in_interview: form.is_walk_in_interview,
      experience_min: Number(form.experience_min || 0),
      experience_max: Number(form.experience_max || 0),
      gender_preference: form.gender_preference,
      status: form.status,
      skills,
      location_ids: form.city_id ? [Number(form.city_id)] : [],
      expires_at: form.expires_at || (isEditing ? null : undefined),
    };

    setSubmitting(true);
    try {
      const data = isEditing
        ? await updateJob(jobId, payload)
        : await authApiRequest('/api/jobs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

      refreshDashboard();
      setNotice({
        type: 'success',
        message: data.message || `"${form.title}" was ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      navigate('/dashboard/employer/jobs');
    } catch (requestError) {
      setError(requestError.message || `Unable to ${isEditing ? 'update' : 'create'} the job.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="employer-loading-list" aria-label="Loading job form">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={styles.createJobPage}>
      <header className={styles.pageHero}>
        <div>
          <p className={styles.kicker}>{isEditing ? 'Manage opportunity' : 'New opportunity'}</p>
          <h1>{isEditing ? 'Edit job' : 'Create a job'}</h1>
          <p>{isEditing
            ? 'Update the role details and save the changes to the live listing.'
            : 'Build a polished role that tells candidates what matters, where they will work, and why they should apply.'}</p>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard/employer/gigs/new')}>
            Create gig instead
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard/employer/jobs')}>
            Cancel
          </button>
        </div>
      </header>

      {error && <div className="employer-notice is-error">{error}</div>}

      <div className={styles.createJobLayout}>
        <form className={styles.createJobForm} onSubmit={handleSubmit}>
          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>01</span>
              <div>
                <h2>Role essentials</h2>
                <p>Start with the information candidates use to understand the opportunity.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridTwo)}>
              <label className={styles.isFull}>
                <span>Job title *</span>
                <input value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="e.g. Senior React Developer" required />
              </label>
              <label>
                <span>Industry *</span>
                <select value={form.industry_id} onChange={(event) => updateField('industry_id', event.target.value)} required={!isEditing}>
                  <option value="">Select industry</option>
                  {masters.industries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Job category *</span>
                <select value={form.job_category_id} onChange={(event) => updateField('job_category_id', event.target.value)} disabled={!form.industry_id} required={!isEditing}>
                  <option value="">Select category</option>
                  {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Job role *</span>
                <select value={form.job_role_id} onChange={(event) => updateField('job_role_id', event.target.value)} disabled={!form.job_category_id} required={!isEditing}>
                  <option value="">Select role</option>
                  {roles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Employment type *</span>
                <select value={form.job_type_id} onChange={(event) => updateField('job_type_id', event.target.value)} required={!isEditing}>
                  <option value="">Select employment type</option>
                  {masters.job_types.filter((item) => item.code !== 'gig').map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Listing status</span>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="closed">Closed</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label className={styles.isFull}>
                <span>Description *</span>
                <div className={styles.quillContainer}>
                  <ReactQuill theme="snow" value={form.description || ''} onChange={(content) => updateField('description', content)} placeholder="Describe the role, responsibilities, team, and what success looks like." />
                </div>
              </label>
              <div className={`${styles.isFull} ${styles.requirementsBlock}`}>
                <span className={styles.requirementsLabel}>Requirements</span>
                {requirementsList.map((req, idx) => (
                  <div key={idx} className={styles.requirementRow}>
                    <input
                      value={req}
                      onChange={(e) => updateRequirement(idx, e.target.value)}
                      placeholder={`Requirement ${idx + 1}`}
                    />
                    <button type="button" className={styles.reqRemoveBtn} onClick={() => removeRequirement(idx)} title="Remove">&times;</button>
                  </div>
                ))}
                <button type="button" className={styles.reqAddBtn} onClick={addRequirement}>+ Add requirement</button>
              </div>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>02</span>
              <div>
                <h2>Location and work setup</h2>
                <p>Tell candidates where and how this role operates.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridThree)}>
              <label>
                <span>Country *</span>
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Select country"
                  isClearable
                  options={countries.map(c => ({ value: c.id, label: c.name }))}
                  value={form.country_id ? { value: form.country_id, label: countries.find(c => c.id == form.country_id)?.name || '' } : null}
                  onChange={option => updateField('country_id', option ? option.value : '')}
                />
              </label>
              <label>
                <span>State *</span>
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Select state"
                  isClearable
                  isDisabled={!form.country_id}
                  options={states.map(s => ({ value: s.id, label: s.name }))}
                  value={form.state_id ? { value: form.state_id, label: states.find(s => s.id == form.state_id)?.name || '' } : null}
                  onChange={option => updateField('state_id', option ? option.value : '')}
                />
              </label>
              <label>
                <span>City *</span>
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Select city"
                  isClearable
                  isDisabled={!form.state_id}
                  options={cities.map(c => ({ value: c.id, label: c.name }))}
                  value={form.city_id ? { value: form.city_id, label: cities.find(c => c.id == form.city_id)?.name || '' } : null}
                  onChange={option => updateField('city_id', option ? option.value : '')}
                />
              </label>
              <label>
                <span>Workplace type *</span>
                <select value={form.workplace_type_id} onChange={(event) => updateField('workplace_type_id', event.target.value)} required={!isEditing}>
                  <option value="">Select workplace type</option>
                  {masters.workplace_types.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Expiry date</span>
                <input type="date" min={isEditing ? undefined : new Date().toISOString().slice(0, 10)} value={form.expires_at} onChange={(event) => updateField('expires_at', event.target.value)} />
              </label>
            </div>
            <div className={styles.locationManualBlock}>
              <div className={styles.locationManualHeader}>
                <span className={styles.locationManualTitle}>📍 Location details</span>
                <button type="button" className={styles.useCurrentBtn} onClick={handleUseCurrentLocation} disabled={gettingLocation}>
                  {gettingLocation ? 'Getting location...' : '📌 Use current location'}
                </button>
              </div>
              <div className={cx(styles.formGrid, styles.formGridThree)}>
                <label className={styles.isFull}>
                  <span>Location name</span>
                  <AsyncSelect
                    className="react-select-container"
                    classNamePrefix="react-select"
                    cacheOptions
                    defaultOptions={defaultLocations}
                    loadOptions={loadLocationOptions}
                    placeholder="Search for a location..."
                    value={form.location ? { label: form.location, value: { name: form.location } } : null}
                    onChange={(option) => {
                      if (option) {
                        setForm(prev => ({
                          ...prev,
                          location: option.value.name,
                          latitude: String(option.value.lat || prev.latitude),
                          longitude: String(option.value.lon || prev.longitude)
                        }));
                      } else {
                        updateField('location', '');
                      }
                    }}
                    isClearable
                  />
                </label>
                <label>
                  <span>Latitude</span>
                  <input type="number" step="any" value={form.latitude} onChange={(e) => updateField('latitude', e.target.value)} placeholder="28.5355" readOnly />
                </label>
                <label>
                  <span>Longitude</span>
                  <input type="number" step="any" value={form.longitude} onChange={(e) => updateField('longitude', e.target.value)} placeholder="77.3910" readOnly />
                </label>
              </div>
              <small style={{ display: 'block', marginTop: '0.35rem', color: '#667085' }}>Start typing to see suggestions, or use "Use current location" to auto-fill.</small>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>03</span>
              <div>
                <h2>Eligibility and skills</h2>
                <p>Set realistic requirements to attract relevant candidates.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridThree)}>
              <label>
                <span>Qualification *</span>
                <select value={form.qualification_id} onChange={(event) => updateField('qualification_id', event.target.value)} required={!isEditing}>
                  <option value="">Select qualification</option>
                  {masters.qualifications.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Course / specialization</span>
                <select value={form.course_specialization_id} onChange={(event) => updateField('course_specialization_id', event.target.value)} disabled={!form.qualification_id}>
                  <option value="">Select specialization</option>
                  {specializations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Gender preference</span>
                <select value={form.gender_preference} onChange={(event) => updateField('gender_preference', event.target.value)}>
                  {masters.gender_preferences.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Minimum experience</span>
                <div className={styles.inputSuffix}><input type="number" min="0" value={form.experience_min} onChange={(event) => updateField('experience_min', event.target.value)} /><span>years</span></div>
              </label>
              <label>
                <span>Maximum experience</span>
                <div className={styles.inputSuffix}><input type="number" min="0" value={form.experience_max} onChange={(event) => updateField('experience_max', event.target.value)} /><span>years</span></div>
              </label>
              <label className={styles.isFull}>
                <span>Skills</span>
                <input value={form.skills} onChange={(event) => updateField('skills', event.target.value)} placeholder="JavaScript, React, Communication" />
                <small>Separate skills with commas, or choose common skills below.</small>
              </label>
            </div>
            {availableSkills.length > 0 && (
              <div className={styles.skillPicker}>
                {availableSkills.slice(0, 24).map((skill) => (
                  <button
                    type="button"
                    className={selectedSkills.has(skill.name.toLowerCase()) ? styles.isSelected : ''}
                    onClick={() => toggleSkill(skill.name)}
                    key={skill.id}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>04</span>
              <div>
                <h2>Compensation and hiring settings</h2>
                <p>Complete the offer details and choose how the role is presented.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridThree)}>
              <label>
                <span>Currency</span>
                <select value={form.currency_code} onChange={(event) => updateField('currency_code', event.target.value)}>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </label>
              <label>
                <span>Minimum salary</span>
                <input type="number" min="0" value={form.salary_min} onChange={(event) => updateField('salary_min', event.target.value)} placeholder="25000" />
              </label>
              <label>
                <span>Maximum salary</span>
                <input type="number" min="0" value={form.salary_max} onChange={(event) => updateField('salary_max', event.target.value)} placeholder="45000" />
              </label>
            </div>
            <div className={styles.settingGrid}>
              {[
                ['hide_salary_from_seeker', 'Hide salary from candidates', 'Keep compensation private on the public listing.'],
                ['is_salary_negotiable', 'Salary is negotiable', 'Let candidates know there is flexibility.'],
                ['is_urgent_hiring', 'Urgent hiring', 'Highlight this role as an immediate priority.'],
                ['is_walk_in_interview', 'Walk-in interview', 'Candidates can attend without a scheduled slot.'],
              ].map(([field, title, description]) => (
                <label className={styles.settingCard} key={field}>
                  <input type="checkbox" checked={form[field]} onChange={(event) => updateField(field, event.target.checked)} />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className={styles.createActions}>
            <div>
              <strong>{isEditing ? 'Ready to save?' : form.status === 'draft' ? 'Ready to save a draft?' : 'Ready to publish?'}</strong>
              <span>{isEditing ? 'Your changes will update this listing.' : 'The role will be added to your employer job portfolio.'}</span>
            </div>
            <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard/employer/jobs')}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting
                ? isEditing ? 'Saving changes...' : 'Saving job...'
                : isEditing ? 'Save changes' : form.status === 'draft' ? 'Save draft' : 'Publish job'}
            </button>
          </div>
        </form>
        <aside className={styles.publishRail} aria-label="Job posting progress">
          <div className={styles.railCard}>
            <span className={styles.railEyebrow}>Posting score</span>
            <strong>{completion}%</strong>
            <div className={styles.progressTrack}>
              <span style={{ width: `${completion}%` }} />
            </div>
            <p>Complete the essentials before publishing. Strong listings are specific, scannable, and honest about work setup.</p>
          </div>

          <div className={styles.railCard}>
            <span className={styles.railEyebrow}>Checklist</span>
            <ul className={styles.checkList}>
              <li className={form.title ? styles.done : ''}>Clear role title</li>
              <li className={form.description ? styles.done : ''}>Useful job description</li>
              <li className={form.city_id ? styles.done : ''}>Location selected</li>
              <li className={form.qualification_id ? styles.done : ''}>Eligibility set</li>
              <li className={form.salary_min || form.salary_max || form.hide_salary_from_seeker ? styles.done : ''}>Salary choice made</li>
            </ul>
          </div>

          <div className={styles.railCard}>
            <span className={styles.railEyebrow}>Quick preview</span>
            <h3>{form.title || 'Untitled role'}</h3>
            <p>{roles.find((item) => String(item.id) === String(form.job_role_id))?.name || 'Select a role'} - {masters.job_types.find((item) => String(item.id) === String(form.job_type_id))?.name || 'Employment type'}</p>
            <p>{cities.find((item) => String(item.id) === String(form.city_id))?.name || 'City'}, {states.find((item) => String(item.id) === String(form.state_id))?.name || 'State'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CreateJob;
