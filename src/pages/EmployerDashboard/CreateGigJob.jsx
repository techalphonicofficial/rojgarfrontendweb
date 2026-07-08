import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import AsyncSelect from 'react-select/async';

import { authApiRequest, createGigJob, updateGigJob } from '../../api';
import styles from './createJob.module.css';

const initialGigForm = {
  title: '',
  description: '',
  industry_id: '',
  category_id: '',
  job_role_id: '',
  country_id: '',
  state_id: '',
  city_id: '',
  qualification_id: '',
  course_specialization_id: '',
  location: '',
  city: '',
  area_pincode: '',
  latitude: '',
  longitude: '',
  payment_type: 'per_day',
  amount: '',
  currency_code: 'INR',
  work_duration: '1_day',
  education_required: 'no_education_required',
  experience_required: 'fresher',
  experience_min: '0',
  experience_max: '0',
  openings: '1',
  contact_number: '',
  status: 'published',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  expires_at: '',
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
const timeInputValue = (value) => value ? String(value).slice(0, 5) : '';
const EXPERIENCE_RANGES = {
  fresher: { min: '0', max: '0' },
  '0_1_year': { min: '0', max: '1' },
  '1_3_years': { min: '1', max: '3' },
  experienced: { min: '3', max: '' },
};

const gigJobToForm = (gigJob = {}) => ({
  ...initialGigForm,
  title: gigJob.title || '',
  description: gigJob.description || '',
  industry_id: inputValue(
    gigJob.categoryMaster?.industry_id
    || gigJob.categoryMaster?.industry?.id
    || gigJob.jobRole?.industry_id
  ),
  category_id: inputValue(gigJob.category_id || gigJob.categoryMaster?.id),
  job_role_id: inputValue(gigJob.job_role_id || gigJob.jobRole?.id),
  country_id: inputValue(gigJob.country_id || gigJob.countryLocation?.id),
  state_id: inputValue(gigJob.state_id || gigJob.stateLocation?.id),
  city_id: inputValue(gigJob.city_id || gigJob.cityLocation?.id),
  qualification_id: inputValue(gigJob.qualification_id || gigJob.qualification?.id),
  course_specialization_id: inputValue(gigJob.course_specialization_id || gigJob.courseSpecialization?.id),
  location: gigJob.location || '',
  city: gigJob.city || gigJob.cityLocation?.name || '',
  area_pincode: gigJob.area_pincode || '',
  latitude: inputValue(gigJob.latitude),
  longitude: inputValue(gigJob.longitude),
  payment_type: gigJob.payment_type || 'per_day',
  amount: inputValue(gigJob.amount),
  currency_code: gigJob.currency_code || 'INR',
  work_duration: gigJob.work_duration || '1_day',
  education_required: gigJob.education_required || 'no_education_required',
  experience_required: gigJob.experience_required || 'fresher',
  experience_min: inputValue(
    gigJob.experience_min
    ?? EXPERIENCE_RANGES[gigJob.experience_required || 'fresher']?.min
    ?? 0
  ),
  experience_max: inputValue(
    gigJob.experience_max
    ?? EXPERIENCE_RANGES[gigJob.experience_required || 'fresher']?.max
  ),
  openings: inputValue(gigJob.openings ?? 1),
  contact_number: gigJob.contact_number || '',
  status: gigJob.status || 'published',
  start_date: dateInputValue(gigJob.start_date),
  end_date: dateInputValue(gigJob.end_date),
  start_time: timeInputValue(gigJob.start_time),
  end_time: timeInputValue(gigJob.end_time),
  expires_at: dateInputValue(gigJob.expires_at),
});

const CreateGigJob = () => {
  const navigate = useNavigate();
  const { id: gigJobId } = useParams();
  const isEditing = Boolean(gigJobId);
  const { profile, refreshDashboard, setNotice } = useOutletContext();
  const [form, setForm] = useState(() => ({
    ...initialGigForm,
    contact_number: profile?.phone || '',
  }));
  const [masters, setMasters] = useState({
    industries: [],
    job_categories: [],
    job_roles: [],
    qualifications: [],
    course_specializations: [],
    payment_types: [],
    currencies: [],
    work_durations: [],
    education_options: [],
    experience_options: [],
    statuses: [],
  });
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const categories = useMemo(
    () => masters.job_categories.filter(
      (item) => !form.industry_id || String(item.industry_id) === String(form.industry_id)
    ),
    [form.industry_id, masters.job_categories]
  );
  const roles = useMemo(
    () => masters.job_roles.filter(
      (item) => !form.category_id || String(item.job_category_id) === String(form.category_id)
    ),
    [form.category_id, masters.job_roles]
  );
  const specializations = useMemo(
    () => masters.course_specializations.filter(
      (item) => !form.qualification_id || String(item.qualification_id) === String(form.qualification_id)
    ),
    [form.qualification_id, masters.course_specializations]
  );
  const selectedCity = useMemo(
    () => cities.find((item) => String(item.id) === String(form.city_id)),
    [cities, form.city_id]
  );
  const completion = useMemo(() => {
    const requiredFields = [
      'title',
      'description',
      'category_id',
      'country_id',
      'state_id',
      'city_id',
      'amount',
      'experience_min',
      'gender_preference',
      'contact_number',
    ];
    const complete = requiredFields.filter((field) => String(form[field] || '').trim()).length;
    return Math.round((complete / requiredFields.length) * 100);
  }, [form]);

  useEffect(() => {
    let ignore = false;
    const requests = [
      authApiRequest('/api/gig-jobs/masters'),
      authApiRequest('/api/locations/countries?limit=300'),
    ];

    if (isEditing) requests.push(authApiRequest(`/api/gig-jobs/${gigJobId}`));

    Promise.all(requests)
      .then(([masterData, countryData, gigJobData]) => {
        if (ignore) return;
        setMasters((current) => ({ ...current, ...masterData }));
        setCountries(countryData.locations || countryData.countries || masterData.locations?.countries || []);
        if (isEditing) setForm(gigJobToForm(gigJobData.gig_job || gigJobData));
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message || `Unable to load ${isEditing ? 'the gig job' : 'gig form options'}.`);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [gigJobId, isEditing]);

  useEffect(() => {
    if (!form.country_id) return undefined;
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
    if (!form.state_id) return undefined;
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

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'industry_id') {
        next.category_id = '';
        next.job_role_id = '';
      }
      if (field === 'category_id') next.job_role_id = '';
      if (field === 'qualification_id') next.course_specialization_id = '';
      if (field === 'country_id') {
        next.state_id = '';
        next.city_id = '';
      }
      if (field === 'state_id') next.city_id = '';
      if (field === 'experience_required' && EXPERIENCE_RANGES[value]) {
        next.experience_min = EXPERIENCE_RANGES[value].min;
        next.experience_max = EXPERIENCE_RANGES[value].max;
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (Number(form.amount) <= 0) {
      setError('Gig payment amount must be greater than zero.');
      return;
    }
    if (Number(form.openings) < 1) {
      setError('Openings must be at least one.');
      return;
    }
    if (form.experience_min === '' || Number(form.experience_min) < 0) {
      setError('Minimum experience must be zero or more years.');
      return;
    }
    if (
      form.experience_max !== ''
      && Number(form.experience_max) < Number(form.experience_min)
    ) {
      setError('Maximum experience must be greater than or equal to minimum experience.');
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('End date must be on or after the start date.');
      return;
    }
    if (
      (!form.start_date || !form.end_date || form.start_date === form.end_date)
      && form.start_time
      && form.end_time
      && form.end_time <= form.start_time
    ) {
      setError('End time must be after the start time.');
      return;
    }

    const selectedCategory = masters.job_categories.find(
      (item) => String(item.id) === String(form.category_id)
    );
    const numberValue = (value) => value === '' ? (isEditing ? null : undefined) : Number(value);
    const emptyValue = (value) => value || (isEditing ? null : undefined);
    const payload = {
      title: form.title.trim(),
      category_id: Number(form.category_id),
      category: selectedCategory?.code,
      description: form.description.trim(),
      country_id: numberValue(form.country_id),
      state_id: numberValue(form.state_id),
      city_id: numberValue(form.city_id),
      qualification_id: numberValue(form.qualification_id),
      course_specialization_id: numberValue(form.course_specialization_id),
      job_role_id: numberValue(form.job_role_id),
      location: form.location.trim() || selectedCity?.name || (isEditing ? null : 'Current Location'),
      city: selectedCity?.name || form.city || (isEditing ? null : ''),
      area_pincode: emptyValue(form.area_pincode.trim()),
      latitude: numberValue(form.latitude),
      longitude: numberValue(form.longitude),
      payment_type: form.payment_type,
      amount: Number(form.amount),
      currency_code: form.currency_code,
      work_duration: form.work_duration,
      education_required: form.education_required,
      experience_required: form.experience_required,
      experience_min: Number(form.experience_min),
      experience_max: numberValue(form.experience_max),
      openings: Number(form.openings),
      contact_number: form.contact_number.trim(),
      status: form.status,
      start_date: emptyValue(form.start_date),
      end_date: emptyValue(form.end_date),
      start_time: emptyValue(form.start_time),
      end_time: emptyValue(form.end_time),
      expires_at: emptyValue(form.expires_at),
    };

    setSubmitting(true);
    try {
      const data = isEditing
        ? await updateGigJob(gigJobId, payload)
        : await createGigJob(payload);
      refreshDashboard();
      setNotice({
        type: 'success',
        message: data.message || `"${form.title}" gig was ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      navigate('/dashboard/employer/jobs');
    } catch (requestError) {
      setError(requestError.message || `Unable to ${isEditing ? 'update' : 'create'} the gig job.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="employer-loading-list" aria-label="Loading gig form">
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
          <p className={styles.kicker}>{isEditing ? 'Manage gig' : 'Gig economy'}</p>
          <h1>{isEditing ? 'Edit gig job' : 'Create a gig job'}</h1>
          <p>{isEditing
            ? 'Update the gig details and save the changes to the listing.'
            : 'Publish a short-term opportunity with clear pay, location, timing, and eligibility details.'}</p>
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard/employer/jobs/new')}>
            Create standard job
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard/employer/jobs')}>
            Cancel
          </button>
        </div>
      </header>

      {error && <div className="employer-notice is-error" role="alert">{error}</div>}

      <div className={styles.createJobLayout}>
        <form className={styles.createJobForm} onSubmit={handleSubmit}>
          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>01</span>
              <div>
                <h2>Gig essentials</h2>
                <p>Describe the task and connect it to the correct category and role.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridTwo)}>
              <label className={styles.isFull}>
                <span>Gig title *</span>
                <input required value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="e.g. Delivery Partner" />
              </label>
              <label>
                <span>Industry *</span>
                <select required value={form.industry_id} onChange={(event) => updateField('industry_id', event.target.value)}>
                  <option value="">Select industry</option>
                  {masters.industries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Category *</span>
                <select required disabled={!form.industry_id} value={form.category_id} onChange={(event) => updateField('category_id', event.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Job role</span>
                <select disabled={!form.category_id} value={form.job_role_id} onChange={(event) => updateField('job_role_id', event.target.value)}>
                  <option value="">Select role</option>
                  {roles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Listing status</span>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  {(masters.statuses.length ? masters.statuses : [{ code: 'published', name: 'Published' }, { code: 'draft', name: 'Draft' }])
                    .map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label className={styles.isFull}>
                <span>Description *</span>
                <div className={styles.quillContainer}>
                  <ReactQuill theme="snow" value={form.description || ''} onChange={(content) => updateField('description', content)} placeholder="Describe the work, responsibilities, and expectations." />
                </div>
              </label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>02</span>
              <div>
                <h2>Location and contact</h2>
                <p>Tell gig workers where the work happens and how to reach the employer.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridThree)}>
              <label>
                <span>Country *</span>
                <select required={!isEditing} value={form.country_id} onChange={(event) => updateField('country_id', event.target.value)}>
                  <option value="">Select country</option>
                  {countries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>State *</span>
                <select required={!isEditing} disabled={!form.country_id} value={form.state_id} onChange={(event) => updateField('state_id', event.target.value)}>
                  <option value="">Select state</option>
                  {states.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>City *</span>
                <select required={!isEditing} disabled={!form.state_id} value={form.city_id} onChange={(event) => updateField('city_id', event.target.value)}>
                  <option value="">Select city</option>
                  {cities.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
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
            <div className={cx(styles.formGrid, styles.formGridThree)} style={{ marginTop: '2rem' }}>
              <label>
                <span>Area pincode</span>
                <input value={form.area_pincode} onChange={(event) => updateField('area_pincode', event.target.value)} placeholder="110001" />
              </label>
              <label>
                <span>Contact number *</span>
                <input required value={form.contact_number} onChange={(event) => updateField('contact_number', event.target.value)} placeholder="9999999999" />
              </label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>03</span>
              <div>
                <h2>Eligibility</h2>
                <p>Set education, experience, and capacity requirements.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridThree)}>
              <label>
                <span>Qualification</span>
                <select value={form.qualification_id} onChange={(event) => updateField('qualification_id', event.target.value)}>
                  <option value="">Select qualification</option>
                  {masters.qualifications.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Course / specialization</span>
                <select disabled={!form.qualification_id} value={form.course_specialization_id} onChange={(event) => updateField('course_specialization_id', event.target.value)}>
                  <option value="">Select specialization</option>
                  {specializations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Education required</span>
                <select value={form.education_required} onChange={(event) => updateField('education_required', event.target.value)}>
                  {masters.education_options.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Experience required</span>
                <select value={form.experience_required} onChange={(event) => updateField('experience_required', event.target.value)}>
                  {masters.experience_options.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Gender preference</span>
                <select value={form.gender_preference} onChange={(event) => updateField('gender_preference', event.target.value)}>
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span>Minimum experience *</span>
                <div className={styles.inputSuffix}>
                  <input required type="number" min="0" max="60" step="1" value={form.experience_min} onChange={(event) => updateField('experience_min', event.target.value)} />
                  <span>years</span>
                </div>
              </label>
              <label>
                <span>Maximum experience</span>
                <div className={styles.inputSuffix}>
                  <input type="number" min={form.experience_min || '0'} max="60" step="1" value={form.experience_max} onChange={(event) => updateField('experience_max', event.target.value)} placeholder="No maximum" />
                  <span>years</span>
                </div>
                <small>Leave blank for an open-ended range.</small>
              </label>
              <label>
                <span>Openings *</span>
                <input required type="number" min="1" value={form.openings} onChange={(event) => updateField('openings', event.target.value)} />
              </label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.sectionHead}>
              <span>04</span>
              <div>
                <h2>Payment and schedule</h2>
                <p>Define exactly how much the gig pays and when the work happens.</p>
              </div>
            </div>
            <div className={cx(styles.formGrid, styles.formGridThree)}>
              <label>
                <span>Currency</span>
                <select value={form.currency_code} onChange={(event) => updateField('currency_code', event.target.value)}>
                  {masters.currencies.map((item) => <option value={item.code} key={item.code}>{item.code} - {item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Payment type *</span>
                <select required value={form.payment_type} onChange={(event) => updateField('payment_type', event.target.value)}>
                  {masters.payment_types.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Amount *</span>
                <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="800" />
              </label>
              <label>
                <span>Work duration *</span>
                <select required value={form.work_duration} onChange={(event) => updateField('work_duration', event.target.value)}>
                  {masters.work_durations.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Start date</span>
                <input type="date" value={form.start_date} onChange={(event) => updateField('start_date', event.target.value)} />
              </label>
              <label>
                <span>End date</span>
                <input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} />
              </label>
              <label>
                <span>Start time</span>
                <input type="time" value={form.start_time} onChange={(event) => updateField('start_time', event.target.value)} />
              </label>
              <label>
                <span>End time</span>
                <input type="time" value={form.end_time} onChange={(event) => updateField('end_time', event.target.value)} />
              </label>
              <label>
                <span>Listing expiry</span>
                <input type="date" value={form.expires_at} onChange={(event) => updateField('expires_at', event.target.value)} />
              </label>
            </div>
          </section>

          <div className={styles.createActions}>
            <div>
              <strong>{isEditing ? 'Ready to save?' : form.status === 'draft' ? 'Ready to save?' : 'Ready to publish?'}</strong>
              <span>{isEditing ? 'Your changes will update this gig listing.' : 'The gig will be added to your combined employer portfolio.'}</span>
            </div>
            <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard/employer/jobs')}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting
                ? isEditing ? 'Saving changes...' : 'Saving gig...'
                : isEditing ? 'Save changes' : form.status === 'draft' ? 'Save gig draft' : 'Publish gig'}
            </button>
          </div>
        </form>

        <aside className={styles.publishRail} aria-label="Gig posting progress">
          <div className={styles.railCard}>
            <span className={styles.railEyebrow}>Posting score</span>
            <strong>{completion}%</strong>
            <div className={styles.progressTrack}>
              <span style={{ width: `${completion}%` }} />
            </div>
            <p>Clear pay, timing, and location information helps gig workers decide quickly.</p>
          </div>
          <div className={styles.railCard}>
            <span className={styles.railEyebrow}>Checklist</span>
            <ul className={styles.checkList}>
              <li className={form.title ? styles.done : ''}>Clear gig title</li>
              <li className={form.category_id ? styles.done : ''}>Category selected</li>
              <li className={form.city_id ? styles.done : ''}>Location selected</li>
              <li className={form.experience_min !== '' ? styles.done : ''}>Experience range defined</li>
              <li className={form.amount ? styles.done : ''}>Payment defined</li>
              <li className={form.contact_number ? styles.done : ''}>Contact provided</li>
            </ul>
          </div>
          <div className={styles.railCard}>
            <span className={styles.railEyebrow}>Quick preview</span>
            <h3>{form.title || 'Untitled gig'}</h3>
            <p>
              Experience: {form.experience_max === ''
                ? `${form.experience_min || 0}+ years`
                : `${form.experience_min || 0}-${form.experience_max || 0} years`}
            </p>
            <p>{form.amount ? `${form.currency_code} ${form.amount}` : 'Payment'} · {masters.payment_types.find((item) => item.code === form.payment_type)?.name || 'Payment type'}</p>
            <p>{selectedCity?.name || 'City'} · {masters.work_durations.find((item) => item.code === form.work_duration)?.name || 'Duration'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CreateGigJob;
