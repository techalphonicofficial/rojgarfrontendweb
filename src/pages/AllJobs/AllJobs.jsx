import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import JobCard from '../../components/JobCard/JobCard';
import ApplyModal from '../../components/ApplyModal/ApplyModal';
import { apiRequest, authApiRequest, optionalAuthApiRequest, resolveAssetUrl, applyJob, applyGigJob } from '../../api';
import { useAuth } from '../../context/auth-state';
import './AllJobs.css';

const ITEMS_PER_PAGE = 10;
const OPEN_JOB_STATUS = 'active,published';
const NEARBY_GIG_RADIUS_KM = 10;

const titleCase = (value = '') => value
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

const formatNumber = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
};

const formatAmount = (value, currencyCode = 'INR') => {
  if (value === null || value === undefined || value === '') return '';
  return `${currencyCode || 'INR'} ${formatNumber(value)}`;
};

const formatExperience = (job) => {
  const hasMin = job.experience_min !== null && job.experience_min !== undefined && job.experience_min !== '';
  const hasMax = job.experience_max !== null && job.experience_max !== undefined && job.experience_max !== '';

  if (hasMin && hasMax) {
    const min = Number(job.experience_min);
    const max = Number(job.experience_max);
    if (min === 0 && max === 0) return 'Fresher';
    if (min === max) return `${min} ${min === 1 ? 'year' : 'years'} experience`;
    return `${min}-${max} years experience`;
  }

  if (hasMin) return `${Number(job.experience_min)}+ years experience`;
  return job.experience_required ? titleCase(job.experience_required) : '';
};

const formatCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate.toFixed(5) : '';
};

const formatDistance = (value) => {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return '';

  if (distance < 1) {
    return `${Math.max(1, Math.round(distance * 1000))} m away`;
  }

  return `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km away`;
};

const formatSalary = (job, source) => {
  const currency = job.currency_code || 'INR';

  if (source === 'gig') {
    const amount = formatAmount(job.amount, currency);
    return amount ? `${amount}${job.payment_type ? ` / ${titleCase(job.payment_type)}` : ''}` : 'Payment not shown';
  }

  const min = formatAmount(job.salary_min, currency);
  const maxAmountOnly = job.salary_max ? formatNumber(job.salary_max) : '';
  const range = min && maxAmountOnly ? `${min} - ${maxAmountOnly}` : (min || formatAmount(job.salary_max, currency));

  if (range) {
    return `${range}${job.salary_type ? ` / ${titleCase(job.salary_type)}` : ''}`;
  }

  if (job.is_salary_visible === false || job.hide_salary_from_seeker) {
    return 'Salary hidden by employer';
  }

  return 'Salary not shown';
};

const buildLocation = (job) => {
  const city = job.city?.name || job.city;
  const state = job.state?.name;
  const country = job.country?.name;

  return job.location || [city, state, country].filter(Boolean).join(', ') || 'Location not specified';
};

const normalizeJob = (job, source = 'normal') => {
  const typeName = source === 'gig'
    ? 'Gig'
    : (job.jobTypeMaster?.name || titleCase(job.job_type || 'Job'));

  return {
    id: job.id,
    key: `${source}-${job.id}`,
    source,
    title: job.title || 'Untitled job',
    company: job.company?.name || 'Company not available',
    companyLogo: resolveAssetUrl(job.company?.logo || ''),
    location: buildLocation(job),
    salary: formatSalary(job, source),
    type: typeName,
    workplace: job.workplaceTypeMaster?.name || titleCase(job.workplace_type || ''),
    experience: formatExperience(job),
    posted: formatPosted(job.posted_at || job.created_at),
    distance: source === 'gig' ? formatDistance(job.distance_km) : '',
    skills: Array.isArray(job.skills) ? job.skills.map((skill) => skill.name || skill).filter(Boolean).slice(0, 4) : [],
    createdAt: job.created_at || job.posted_at,
    appliedStatus: job.applied_status,
    isSaved: job.is_saved,
    isUrgent: Boolean(job.is_urgent_hiring),
    isRemote: job.workplace_type === 'remote',
    category: job.jobRole?.category?.name || job.category || '',
    currencyCode: job.currency_code || 'INR'
  };
};

const getJobRows = (response) => response.jobs || response.gig_jobs || [];

const getAppliedIds = async () => {
  const [normalResult, gigResult] = await Promise.allSettled([
    authApiRequest('/api/jobs/my-applications?page=1&limit=100'),
    authApiRequest('/api/gig-jobs/my-applications?page=1&limit=100')
  ]);

  return {
    normal: new Set(
      normalResult.status === 'fulfilled'
        ? (normalResult.value.applications || []).map((application) => Number(application.job_id)).filter(Boolean)
        : []
    ),
    gig: new Set(
      gigResult.status === 'fulfilled'
        ? (gigResult.value.applications || []).map((application) => Number(application.gig_job_id)).filter(Boolean)
        : []
    )
  };
};

const buildQueryString = (params) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  return query.toString();
};

const AllJobs = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get('keyword') || '';
  const initialCompany = searchParams.get('company') || '';
  const initialLocation = searchParams.get('location') || '';
  const initialCategory = searchParams.get('category_id') || '';
  const initialJobRole = searchParams.get('job_role_id') || '';
  const initialJobRoleName = searchParams.get('role_name') || '';
  const initialType = searchParams.get('type') === 'gig' || searchParams.get('type') === 'normal'
    ? searchParams.get('type')
    : 'all';

  const [keywordInput, setKeywordInput] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [companyFilter, setCompanyFilter] = useState(initialCompany);
  const [filterType, setFilterType] = useState(initialType);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedJobRole, setSelectedJobRole] = useState(initialJobRole);
  const [selectedJobRoleName, setSelectedJobRoleName] = useState(initialJobRoleName);
  const [selectedJobType, setSelectedJobType] = useState('');
  const [locationTerm, setLocationTerm] = useState(initialLocation);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyGigOnly, setNearbyGigOnly] = useState(false);
  const [minimumPay, setMinimumPay] = useState(0);
  const [postedWithin, setPostedWithin] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1
  });
  const [lookups, setLookups] = useState({
    categories: [],
    jobTypes: [],
    countries: [],
    states: [],
    cities: []
  });
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingJobKeys, setSavingJobKeys] = useState([]);
  const [applyingJobKeys, setApplyingJobKeys] = useState([]);
  const [applyTarget, setApplyTarget] = useState(null); // job to open modal for

  useEffect(() => {
    let ignore = false;

    const loadLookups = async () => {
      setLookupLoading(true);

      try {
        const [masters, countryResult] = await Promise.all([
          apiRequest('/api/jobs/masters'),
          apiRequest('/api/locations/countries?limit=300')
        ]);

        if (!ignore) {
          setLookups((current) => ({
            ...current,
            categories: masters.job_categories || [],
            jobTypes: masters.job_types || [],
            countries: countryResult.locations || countryResult.countries || []
          }));
        }
      } catch (lookupError) {
        if (!ignore) {
          setError(lookupError.message);
        }
      } finally {
        if (!ignore) {
          setLookupLoading(false);
        }
      }
    };

    loadLookups();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    if (!selectedCountry) {
      return () => {
        ignore = true;
      };
    }

    const loadStates = async () => {
      try {
        const data = await apiRequest(`/api/locations/countries/${selectedCountry}/states?limit=300`);
        if (!ignore) {
          setLookups((current) => ({ ...current, states: data.states || data.locations || [], cities: [] }));
        }
      } catch (stateError) {
        if (!ignore) {
          setError(stateError.message);
        }
      }
    };

    loadStates();

    return () => {
      ignore = true;
    };
  }, [selectedCountry]);

  useEffect(() => {
    let ignore = false;

    if (!selectedState) {
      return () => {
        ignore = true;
      };
    }

    const loadCities = async () => {
      try {
        const data = await apiRequest(`/api/locations/states/${selectedState}/cities?limit=500`);
        if (!ignore) {
          setLookups((current) => ({ ...current, cities: data.cities || data.locations || [] }));
        }
      } catch (cityError) {
        if (!ignore) {
          setError(cityError.message);
        }
      }
    };

    loadCities();

    return () => {
      ignore = true;
    };
  }, [selectedState]);

  useEffect(() => {
    let ignore = false;

    const fetchJobs = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      setLoading(true);
      setError('');

      const commonParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        status: OPEN_JOB_STATUS,
        keyword,
        category_id: selectedCategory,
        job_role_id: selectedJobRole,
        country_id: selectedCountry,
        state_id: selectedState,
        city_id: selectedCity,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        min_salary: minimumPay > 0 ? minimumPay : undefined,
        posted_within: postedWithin || undefined
      };

      const normalQuery = buildQueryString({
        ...commonParams,
        company: companyFilter,
        location: locationTerm,
        job_type: selectedJobType
      });
      const gigQuery = buildQueryString({
        ...commonParams,
        city: locationTerm,
        radius_km: nearbyGigOnly && userLocation ? NEARBY_GIG_RADIUS_KM : ''
      });
      const requests = [];

      if (filterType !== 'gig') {
        requests.push(optionalAuthApiRequest(`/api/jobs?${normalQuery}`).then((data) => ({ source: 'normal', data })));
      }

      if (filterType !== 'normal' && !selectedJobType) {
        requests.push(optionalAuthApiRequest(`/api/gig-jobs?${gigQuery}`).then((data) => ({ source: 'gig', data })));
      }

      try {
        const [responses, appliedIds] = await Promise.all([
          Promise.all(requests),
          getAppliedIds()
        ]);
        if (ignore) return;

        const nextJobs = responses
          .flatMap(({ source, data }) => getJobRows(data).map((job) => {
            const normalized = normalizeJob(job, source);
            const alreadyApplied = Boolean(normalized.appliedStatus) || appliedIds[source]?.has(Number(job.id));

            return {
              ...normalized,
              appliedStatus: alreadyApplied ? 'applied' : normalized.appliedStatus
            };
          }))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const totalItems = responses.reduce((sum, item) => sum + Number(item.data.total_items || getJobRows(item.data).length || 0), 0);
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        setJobs(nextJobs.slice(0, ITEMS_PER_PAGE));
        setMeta({
          totalItems,
          totalPages,
          currentPage
        });
      } catch (fetchError) {
        if (!ignore) {
          setJobs([]);
          setMeta({ totalItems: 0, totalPages: 0, currentPage: 1 });
          setError(fetchError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      ignore = true;
    };
  }, [
    currentPage,
    filterType,
    isAuthenticated,
    keyword,
    companyFilter,
    locationTerm,
    navigate,
    nearbyGigOnly,
    selectedCategory,
    selectedJobRole,
    selectedCity,
    selectedCountry,
    selectedJobType,
    selectedState,
    userLocation,
    minimumPay,
    postedWithin
  ]);

  const lookupName = (items, selectedId) => items.find((item) => String(item.id) === String(selectedId))?.name || '';

  const activeFilters = useMemo(() => {
    const filters = [];

    if (filterType !== 'all') filters.push({ key: 'source', label: filterType === 'normal' ? 'Normal Jobs' : 'Gig Jobs' });
    if (keyword) filters.push({ key: 'keyword', label: keyword });
    if (companyFilter) filters.push({ key: 'company', label: companyFilter });
    if (locationTerm) filters.push({ key: 'location', label: locationTerm });
    if (selectedCategory) filters.push({ key: 'category', label: lookupName(lookups.categories, selectedCategory) || 'Selected category' });
    if (selectedJobRole) filters.push({ key: 'jobRole', label: selectedJobRoleName || 'Selected role' });
    if (selectedJobType) filters.push({ key: 'jobType', label: titleCase(selectedJobType) });
    if (selectedCountry) filters.push({ key: 'country', label: lookupName(lookups.countries, selectedCountry) || 'Selected country' });
    if (selectedState) filters.push({ key: 'state', label: lookupName(lookups.states, selectedState) || 'Selected state' });
    if (selectedCity) filters.push({ key: 'city', label: lookupName(lookups.cities, selectedCity) || 'Selected city' });
    if (userLocation && nearbyGigOnly) {
      filters.push({
        key: 'nearbyGig',
        label: `Gig jobs under ${NEARBY_GIG_RADIUS_KM} km - Lat ${formatCoordinate(userLocation.latitude)}, Long ${formatCoordinate(userLocation.longitude)}`
      });
    } else if (userLocation) {
      filters.push({
        key: 'locationCoords',
        label: `Lat ${formatCoordinate(userLocation.latitude)}, Long ${formatCoordinate(userLocation.longitude)}`
      });
    }
    if (minimumPay > 0) {
      filters.push({ key: 'minPay', label: `Min ${formatNumber(minimumPay)}/mo` });
    }
    if (postedWithin) {
      const postedLabels = { '1': 'Last 24 hours', '3': 'Last 3 days', '7': 'Last 7 days', '30': 'Last 30 days' };
      filters.push({ key: 'postedWithin', label: postedLabels[postedWithin] || `Posted within ${postedWithin}d` });
    }

    return filters;
  }, [
    filterType,
    keyword,
    companyFilter,
    locationTerm,
    lookups.categories,
    lookups.cities,
    lookups.countries,
    lookups.states,
    nearbyGigOnly,
    selectedCategory,
    selectedJobRole,
    selectedJobRoleName,
    selectedCity,
    selectedCountry,
    selectedJobType,
    selectedState,
    userLocation,
    minimumPay,
    postedWithin
  ]);

  const resultCopy = loading
    ? 'Loading matching roles'
    : `Showing ${jobs.length} of ${meta.totalItems} roles`;

  const updatePageOne = (update) => {
    setCurrentPage(1);
    update();
  };

  const clearFilters = () => {
    setCurrentPage(1);
    setKeyword('');
    setKeywordInput('');
    setCompanyFilter('');
    setFilterType('all');
    setSelectedCategory('');
    setSelectedJobRole('');
    setSelectedJobRoleName('');
    setSelectedJobType('');
    setLocationTerm('');
    setSelectedCountry('');
    setSelectedState('');
    setSelectedCity('');
    setUserLocation(null);
    setNearbyGigOnly(false);
    setMinimumPay(0);
    setPostedWithin('');
    setCategorySearch('');
    setLookups((current) => ({ ...current, states: [], cities: [] }));
    setSearchParams({});
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextKeyword = keywordInput.trim();
    const nextLocation = locationTerm.trim();

    setKeyword(nextKeyword);
    setLocationTerm(nextLocation);
    setCurrentPage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextKeyword) next.set('keyword', nextKeyword);
      else next.delete('keyword');
      if (companyFilter) next.set('company', companyFilter);
      else next.delete('company');
      if (nextLocation) next.set('location', nextLocation);
      else next.delete('location');
      if (filterType !== 'all') next.set('type', filterType);
      else next.delete('type');
      return next;
    });
  };

  const handleFilterTypeChange = (value) => {
    updatePageOne(() => {
      setFilterType(value);
      if (value === 'gig') {
        setSelectedJobType('');
      } else {
        setNearbyGigOnly(false);
      }
    });
  };

  const handleCountryChange = (event) => {
    updatePageOne(() => {
      setSelectedCountry(event.target.value);
      setSelectedState('');
      setSelectedCity('');
      setLookups((current) => ({ ...current, states: [], cities: [] }));
    });
  };

  const handleStateChange = (event) => {
    updatePageOne(() => {
      setSelectedState(event.target.value);
      setSelectedCity('');
      setLookups((current) => ({ ...current, cities: [] }));
    });
  };

  const requestCurrentLocation = ({ gigNearby = false } = {}) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updatePageOne(() => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });

            if (gigNearby) {
              setFilterType('gig');
              setSelectedJobType('');
              setNearbyGigOnly(true);
            }
          });
        },
        (locationError) => {
          console.error('Error getting location:', locationError);
          setError('Could not get your location. Please check browser permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const clearCurrentLocation = () => {
    updatePageOne(() => {
      setUserLocation(null);
      setNearbyGigOnly(false);
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveToggle = async (job) => {
    if (!isAuthenticated) {
      setError('Please login as a job seeker to save jobs.');
      return;
    }

    const jobKey = job.key || `${job.source}-${job.id}`;
    setSavingJobKeys((current) => [...current, jobKey]);
    setError('');

    try {
      const endpoint = job.source === 'gig'
        ? `/api/gig-jobs/${job.id}/save`
        : `/api/jobs/${job.id}/save`;
      const data = await authApiRequest(endpoint, { method: 'POST' });
      const nextSaved = typeof data.saved === 'boolean' ? data.saved : !job.isSaved;

      setJobs((current) => current.map((item) => (
        item.key === jobKey ? { ...item, isSaved: nextSaved } : item
      )));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingJobKeys((current) => current.filter((key) => key !== jobKey));
    }
  };

  // Open the apply modal (instead of directly calling API)
  // JobCard calls onApply(job.id, job.source) — two separate args
  const handleApply = (jobId, jobSource) => {
    if (!isAuthenticated) {
      setError('Please login as a job seeker to apply.');
      return;
    }
    // Find the full job object from the jobs list
    const job = jobs.find((j) => j.id === jobId && j.source === jobSource);
    if (!job || job.appliedStatus) return;
    setApplyTarget(job);
  };

  // Called when user submits the modal form
  const handleApplySubmit = async ({ cover_letter, proposed_amount }) => {
    const job = applyTarget;
    if (!job) return;

    const jobKey = job.key || `${job.source}-${job.id}`;
    setApplyingJobKeys((current) => [...current, jobKey]);
    setError('');

    try {
      if (job.source === 'gig') {
        await applyGigJob(job.id, { cover_letter });
      } else {
        await applyJob(job.id, { cover_letter, proposed_amount });
      }
      setJobs((current) => current.map((item) =>
        item.key === jobKey ? { ...item, appliedStatus: 'applied' } : item
      ));
      setApplyTarget(null); // close modal on success
    } catch (applyError) {
      if (/already applied/i.test(applyError.message)) {
        setJobs((current) => current.map((item) =>
          item.key === jobKey ? { ...item, appliedStatus: 'applied' } : item
        ));
        setApplyTarget(null);
      } else {
        throw applyError; // re-throw so modal shows the error
      }
    } finally {
      setApplyingJobKeys((current) => current.filter((key) => key !== jobKey));
    }
  };

  return (
    <div className="all-jobs-page">
      <section className="all-jobs-hero">
        <div className="container all-jobs-hero-inner">
          <div className="jobs-hero-copy">
            <span className="jobs-eyebrow">Your next opportunity starts here</span>
            <h1>Find the right job. Build your future.</h1>
            <p>Explore verified full-time, part-time, contract, and gig opportunities across India.</p>
          </div>

          <form className="jobs-search-panel" onSubmit={handleSearchSubmit}>
            <label className="jobs-search-field">
              <span>Role or keyword</span>
              <input
                type="text"
                placeholder="Data entry, developer, delivery..."
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </label>
            <label className="jobs-search-field">
              <span>Location</span>
              <input
                type="text"
                placeholder="City, state, or saved location"
                value={locationTerm}
                onChange={(event) => setLocationTerm(event.target.value)}
              />
            </label>
            <label className="jobs-search-field">
              <span>Company</span>
              <input
                type="text"
                placeholder="Company name"
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
              />
            </label>
            <button className="btn-primary jobs-search-button" type="submit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m20 20-3.5-3.5"></path>
              </svg>
              Search jobs
            </button>
          </form>

          <div className="jobs-hero-highlights" aria-label="Marketplace benefits">
            <span>Verified employers</span>
            <span>Jobs and gigs together</span>
            <span>Location-aware search</span>
          </div>
        </div>
      </section>

      <div className="container all-jobs-content">
        <aside className="filters-sidebar">
          <div className="filters-header-block">
            <div>
              <h2>Filters</h2>
              <p>{meta.totalItems} open roles near you</p>
            </div>
            <button
              type="button"
              className="filters-clear-btn"
              onClick={clearFilters}
              disabled={activeFilters.length === 0}
            >
              Reset
            </button>
          </div>

          <div className="filters-body">

          <div className="filter-group">
            <h4>Job Type</h4>
            <div className="job-source-switch">
              {[
                ['all', 'All', <svg key="all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>],
                ['normal', 'Normal', <svg key="normal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path></svg>],
                ['gig', 'Gig', <svg key="gig" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>]
              ].map(([value, label, icon]) => (
                <label key={value} className={filterType === value ? 'is-active' : ''}>
                  <input type="radio" name="jobType" checked={filterType === value} onChange={() => handleFilterTypeChange(value)} />
                  {icon}
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4>Category</h4>
            <div className="category-search-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search categories"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
            </div>
            <div className="category-pills">
              {lookups.categories
                .filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                .slice(0, 6)
                .map((category) => (
                  <button
                    key={category.id || category.code}
                    className={`category-pill ${String(selectedCategory) === String(category.id) ? 'is-active' : ''}`}
                    onClick={() => updatePageOne(() => {
                      setSelectedCategory(String(selectedCategory) === String(category.id) ? '' : category.id);
                      setSelectedJobRole('');
                      setSelectedJobRoleName('');
                    })}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                    </svg>
                    {category.name}
                  </button>
                ))}
            </div>
            {lookups.categories.length > 6 && !categorySearch && (
              <button className="more-categories-btn">
                +{lookups.categories.length - 6} more
              </button>
            )}
          </div>

          <div className="filter-group">
            <h4>Employment Type</h4>
            <select
              className="filter-select"
              value={selectedJobType}
              onChange={(event) => updatePageOne(() => setSelectedJobType(event.target.value))}
              disabled={filterType === 'gig'}
            >
              <option value="">All Types</option>
              {lookups.jobTypes.map((type) => (
                <option key={type.id || type.code} value={type.code}>{type.name}</option>
              ))}
            </select>
            {filterType === 'gig' && <p className="filter-help">Employment type applies to normal jobs.</p>}
          </div>

          <div className="filter-group">
            <div className="pay-slider-header">
              <h4>Minimum pay</h4>
              <span className="pay-value">
                {minimumPay > 0 ? formatNumber(minimumPay) : 'Any'}
              </span>
            </div>
            <input
              type="range"
              className="pay-slider"
              min="0"
              max="150000"
              step="5000"
              value={minimumPay}
              onChange={(e) => updatePageOne(() => setMinimumPay(Number(e.target.value)))}
            />
          </div>

          <div className="filter-group">
            <div className="location-card">
              <div className="location-card-header">
                <div className="location-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <div className="location-info">
                  <h5>Gigs near you</h5>
                  <p>{userLocation ? `Lat ${formatCoordinate(userLocation.latitude)}, Long ${formatCoordinate(userLocation.longitude)}` : 'Location not set'}</p>
                </div>
                <button type="button" className="location-change-btn" onClick={() => requestCurrentLocation({ gigNearby: true })}>
                  {userLocation ? 'Change' : 'Set'}
                </button>
              </div>

              {userLocation && filterType === 'gig' && (
                <div className="radius-pills">
                  {[5, 10, 25, 50].map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      className={`radius-pill ${NEARBY_GIG_RADIUS_KM === radius && nearbyGigOnly ? 'is-active' : ''}`}
                      onClick={() => requestCurrentLocation({ gigNearby: true })}
                    >
                      {radius} km
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="filter-group">
            <h4>Posted Within</h4>
            <div className="posted-within-pills">
              {[
                ['', 'Any time'],
                ['1', 'Last 24h'],
                ['3', 'Last 3 days'],
                ['7', 'Last 7 days'],
                ['30', 'Last 30 days'],
              ].map(([value, label]) => (
                <button
                  key={value || 'any'}
                  type="button"
                  className={`posted-within-pill${postedWithin === value ? ' is-active' : ''}`}
                  onClick={() => updatePageOne(() => setPostedWithin(value))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4>Location Filters</h4>

            <Select
              className="react-select-container filter-select-react"
              classNamePrefix="react-select"
              options={lookups.countries.map(c => ({ value: c.id, label: c.name }))}
              value={selectedCountry ? { value: selectedCountry, label: lookups.countries.find(c => c.id == selectedCountry)?.name || '' } : null}
              onChange={(selected) => handleCountryChange({ target: { value: selected ? selected.value : '' } })}
              isClearable
              placeholder="All Countries"
            />

            <Select
              className="react-select-container filter-select-react"
              classNamePrefix="react-select"
              options={lookups.states.map(s => ({ value: s.id, label: s.name }))}
              value={selectedState ? { value: selectedState, label: lookups.states.find(s => s.id == selectedState)?.name || '' } : null}
              onChange={(selected) => handleStateChange({ target: { value: selected ? selected.value : '' } })}
              isDisabled={!selectedCountry}
              isClearable
              placeholder="All States"
            />

            <Select
              className="react-select-container filter-select-react"
              classNamePrefix="react-select"
              options={lookups.cities.map(c => ({ value: c.id, label: c.name }))}
              value={selectedCity ? { value: selectedCity, label: lookups.cities.find(c => c.id == selectedCity)?.name || '' } : null}
              onChange={(selected) => updatePageOne(() => setSelectedCity(selected ? selected.value : ''))}
              isDisabled={!selectedState}
              isClearable
              placeholder="All Cities"
            />

            {userLocation && (
              <button type="button" className="apply-filters-btn" onClick={clearCurrentLocation} style={{marginTop: '1rem', background: '#333'}}>
                Clear current location
              </button>
            )}
            
            <button type="button" className="apply-filters-btn" onClick={() => {/* Since filters apply immediately, this could be a visual reinforcement or scrolling helper */}}>
              Apply Filters
            </button>
          </div>
          </div>
        </aside>

        <main className="jobs-list-main">
          <div className="jobs-toolbar">
            <div>
              <span className="jobs-toolbar-label">Opportunities picked for you</span>
              <h2>{resultCopy}</h2>
            </div>
            <div className="jobs-toolbar-meta">
              {lookupLoading && <span>Loading filters...</span>}
              <span>Newest first</span>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="active-filters" aria-label="Active filters">
              {activeFilters.map((filter) => (
                <div key={filter.key} className="active-filter-tag">
                  <span>{filter.label}</span>
                  <button
                    type="button"
                    title="Remove filter"
                    onClick={() => {
                      if (filter.key === 'keyword') setKeyword('');
                      else if (filter.key === 'company') setCompanyFilter('');
                      else if (filter.key === 'location') setLocationTerm('');
                      else if (filter.key === 'category') setSelectedCategory('');
                      else if (filter.key === 'jobRole') setSelectedJobRole('');
                      else if (filter.key === 'jobType') setSelectedJobType('');
                      else if (filter.key === 'country') setSelectedCountry('');
                      else if (filter.key === 'state') setSelectedState('');
                      else if (filter.key === 'city') setSelectedCity('');
                      else if (filter.key === 'minPay') setMinimumPay(0);
                      else if (filter.key === 'postedWithin') setPostedWithin('');
                      else if (filter.key === 'nearbyGig' || filter.key === 'locationCoords') clearCurrentLocation();
                      else if (filter.key === 'source') setFilterType('all');
                      setCurrentPage(1);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="jobs-error-message">
              {error}
            </div>
          )}

          <div className="job-grid">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div className="job-card-skeleton" key={index}></div>
              ))
            ) : jobs.length > 0 ? (
              jobs.map((job) => (
                <JobCard
                  key={job.key}
                  job={job}
                  onSaveToggle={handleSaveToggle}
                  onApply={handleApply}
                  saving={savingJobKeys.includes(job.key)}
                  applying={applyingJobKeys.includes(job.key)}
                />
              ))
            ) : (
              !error && <div className="no-jobs-message">No jobs found matching your criteria.</div>
            )}
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &laquo;
              </button>

              {Array.from({ length: meta.totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === meta.totalPages}
              >
                &raquo;
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Apply Modal */}
      {applyTarget && (
        <ApplyModal
          job={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSubmit={handleApplySubmit}
        />
      )}
    </div>
  );
};

export default AllJobs;
