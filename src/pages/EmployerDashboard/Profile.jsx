import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { API_BASE_URL, apiRequest, resolveAssetUrl, storeAuthSession } from '../../api';

const profileFields = [
  ['Full name', (profile) => profile?.full_name],
  ['Phone', (profile) => profile?.phone],
  ['Email', (profile) => profile?.email],
  ['Designation', (profile) => profile?.profile?.designation],
];

const companyFields = [
  ['Company name', (company) => company?.name],
  ['Industry', (company) => company?.industry?.name],
  ['Company size', (company) => company?.company_size],
  ['Founded', (company) => company?.founded_year],
  ['Website', (company) => company?.website],
  ['GST number', (company) => company?.gst_no],
  ['Location', (company) => company?.location],
  ['Country', (company) => company?.country],
  ['State', (company) => company?.state],
  ['City', (company) => company?.city],
  ['Pincode', (company) => company?.pincode],
  ['Verification', (company) => company?.is_verified ? 'Verified' : 'Pending verification'],
];

const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Current location is not supported in this browser.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 30000,
  });
});

const findLocationByName = (items = [], name = '') => {
  const normalizedName = String(name || '').trim().toLowerCase();
  return items.find((item) => String(item.name || '').trim().toLowerCase() === normalizedName);
};

const Profile = () => {
  const {
    profile,
    company,
    editMode,
    setEditMode,
    editForm,
    setEditForm,
    avatarFile,
    setAvatarFile,
    updateNotice,
    setUpdateNotice,
    loading,
    token,
    setProfile,
  } = useOutletContext();
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: [],
  });
  const [locationSelection, setLocationSelection] = useState({
    countryId: '',
    stateId: '',
    cityId: '',
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  if (loading) {
    return (
      <div className="employer-loading-list" aria-label="Loading company profile">
        <span />
        <span />
      </div>
    );
  }

  const companyLogoUrl = resolveAssetUrl(company?.logo || '');

  const loadStates = async (countryId) => {
    if (!countryId) return [];
    const data = await apiRequest(`/api/locations/countries/${countryId}/states?limit=300`);
    return data.locations || data.states || [];
  };

  const loadCities = async (stateId) => {
    if (!stateId) return [];
    const data = await apiRequest(`/api/locations/states/${stateId}/cities?limit=500`);
    return data.locations || data.cities || [];
  };

  const initializeLocationFields = async () => {
    setLocationLoading(true);

    try {
      const countryData = await apiRequest('/api/locations/countries?limit=300');
      const countries = countryData.locations || countryData.countries || [];
      const selectedCountry = findLocationByName(countries, company?.country);
      const states = selectedCountry ? await loadStates(selectedCountry.id) : [];
      const selectedState = findLocationByName(states, company?.state);
      const cities = selectedState ? await loadCities(selectedState.id) : [];
      const selectedCity = findLocationByName(cities, company?.city);

      setLocationOptions({ countries, states, cities });
      setLocationSelection({
        countryId: selectedCountry?.id ? String(selectedCountry.id) : '',
        stateId: selectedState?.id ? String(selectedState.id) : '',
        cityId: selectedCity?.id ? String(selectedCity.id) : '',
      });
    } catch (error) {
      setUpdateNotice({ type: 'error', message: error.message || 'Unable to load location options.' });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
    setUpdateNotice({ type: '', message: '' });
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      designation: profile?.profile?.designation || '',
      company_name: company?.name || '',
      company_size: company?.company_size || '',
      company_founded_year: company?.founded_year || '',
      company_website: company?.website || '',
      company_gst_no: company?.gst_no || '',
      company_pan_card: company?.pan_card || '',
      company_aadhaar_card: company?.aadhaar_card || '',
      company_location: company?.location || '',
      company_country: company?.country || '',
      company_state: company?.state || '',
      company_city: company?.city || '',
      company_pincode: company?.pincode || '',
      company_latitude: company?.latitude || '',
      company_longitude: company?.longitude || '',
      company_description: company?.company_description || company?.description || '',
    });
    initializeLocationFields();
  };

  const updateField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleCountryChange = async (event) => {
    const countryId = event.target.value;
    const country = locationOptions.countries.find((item) => String(item.id) === countryId);

    setLocationSelection({ countryId, stateId: '', cityId: '' });
    setLocationOptions((current) => ({ ...current, states: [], cities: [] }));
    setEditForm((current) => ({
      ...current,
      company_country: country?.name || '',
      company_state: '',
      company_city: '',
    }));

    if (!countryId) return;
    setLocationLoading(true);
    try {
      const states = await loadStates(countryId);
      setLocationOptions((current) => ({ ...current, states, cities: [] }));
    } catch (error) {
      setUpdateNotice({ type: 'error', message: error.message || 'Unable to load states.' });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleStateChange = async (event) => {
    const stateId = event.target.value;
    const state = locationOptions.states.find((item) => String(item.id) === stateId);

    setLocationSelection((current) => ({ ...current, stateId, cityId: '' }));
    setLocationOptions((current) => ({ ...current, cities: [] }));
    setEditForm((current) => ({
      ...current,
      company_state: state?.name || '',
      company_city: '',
    }));

    if (!stateId) return;
    setLocationLoading(true);
    try {
      const cities = await loadCities(stateId);
      setLocationOptions((current) => ({ ...current, cities }));
    } catch (error) {
      setUpdateNotice({ type: 'error', message: error.message || 'Unable to load cities.' });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCityChange = (event) => {
    const cityId = event.target.value;
    const city = locationOptions.cities.find((item) => String(item.id) === cityId);

    setLocationSelection((current) => ({ ...current, cityId }));
    setEditForm((current) => ({ ...current, company_city: city?.name || '' }));
  };

  const syncLocationSelections = async (countryName, stateName, cityName) => {
    const countryData = locationOptions.countries.length > 0
      ? { locations: locationOptions.countries }
      : await apiRequest('/api/locations/countries?limit=300');
    const countries = countryData.locations || countryData.countries || [];
    const country = findLocationByName(countries, countryName);
    const states = country ? await loadStates(country.id) : [];
    const state = findLocationByName(states, stateName);
    const cities = state ? await loadCities(state.id) : [];
    const city = findLocationByName(cities, cityName);

    setLocationOptions({ countries, states, cities });
    setLocationSelection({
      countryId: country?.id ? String(country.id) : '',
      stateId: state?.id ? String(state.id) : '',
      cityId: city?.id ? String(city.id) : '',
    });
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setUpdateNotice({ type: '', message: '' });

    try {
      const position = await getCurrentPosition();
      const latitude = position.coords.latitude.toFixed(7);
      const longitude = position.coords.longitude.toFixed(7);
      let address = {};
      let displayName = '';

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await response.json().catch(() => ({}));
        address = data.address || {};
        displayName = data.display_name || '';
      } catch {
        address = {};
      }

      const countryName = address.country || editForm.company_country || '';
      const stateName = address.state || editForm.company_state || '';
      const cityName = address.city || address.town || address.village || editForm.company_city || '';

      setEditForm((current) => ({
        ...current,
        company_location: displayName || `${latitude}, ${longitude}`,
        company_country: countryName,
        company_state: stateName,
        company_city: cityName,
        company_pincode: address.postcode || current.company_pincode || '',
        company_latitude: latitude,
        company_longitude: longitude,
      }));

      await syncLocationSelections(countryName, stateName, cityName);
      setUpdateNotice({ type: 'success', message: 'Current location added successfully.' });
    } catch (error) {
      setUpdateNotice({
        type: 'error',
        message: error.code === 1
          ? 'Location permission denied. Please allow location access or enter the location manually.'
          : (error.message || 'Unable to fetch current location.'),
      });
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = new FormData();

    Object.entries(editForm).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') payload.append(key, value);
    });
    if (avatarFile) payload.append('company_logo', avatarFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/employer`, {
        method: 'PUT',
        body: payload,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || 'Profile update failed.');

      setProfile(data.user);
      storeAuthSession({ user: data.user });
      setAvatarFile(null);
      setUpdateNotice({ type: 'success', message: data.message || 'Profile updated successfully.' });
      setEditMode(false);
    } catch (error) {
      setUpdateNotice({ type: 'error', message: error.message });
    }
  };

  return (
    <>
      <header className="employer-page-header">
        <div>
          <p className="employer-kicker">Organization settings</p>
          <h1>Company profile</h1>
          <p>Keep your employer identity complete and trustworthy for every candidate.</p>
        </div>
        {!editMode && <button type="button" className="employer-primary-btn" onClick={handleEdit}>Edit profile</button>}
      </header>

      {updateNotice.message && (
        <div className={`employer-notice is-${updateNotice.type}`}>{updateNotice.message}</div>
      )}

      {editMode ? (
        <form className="employer-panel employer-profile-form" onSubmit={handleSubmit}>
          <div className="employer-panel-head">
            <div>
              <p className="employer-section-eyebrow">Profile editor</p>
              <h2>Employer and company details</h2>
            </div>
          </div>

          <div className="employer-form-grid">
            <label><span>Full name</span><input value={editForm.full_name} onChange={(event) => updateField('full_name', event.target.value)} required /></label>
            <label><span>Phone</span><input value={editForm.phone} onChange={(event) => updateField('phone', event.target.value)} required /></label>
            <label><span>Email</span><input type="email" value={editForm.email} onChange={(event) => updateField('email', event.target.value)} /></label>
            <label><span>Designation</span><input value={editForm.designation} onChange={(event) => updateField('designation', event.target.value)} /></label>
            <label><span>Company name</span><input value={editForm.company_name} onChange={(event) => updateField('company_name', event.target.value)} required /></label>
            <label><span>Company size</span><input value={editForm.company_size} onChange={(event) => updateField('company_size', event.target.value)} /></label>
            <label><span>Founded year</span><input type="number" value={editForm.company_founded_year} onChange={(event) => updateField('company_founded_year', event.target.value)} /></label>
            <label><span>Website</span><input type="url" value={editForm.company_website} onChange={(event) => updateField('company_website', event.target.value)} /></label>
            <label><span>GST number</span><input value={editForm.company_gst_no} onChange={(event) => updateField('company_gst_no', event.target.value)} /></label>
            <label><span>PAN card</span><input value={editForm.company_pan_card} onChange={(event) => updateField('company_pan_card', event.target.value)} /></label>
            <label><span>Aadhaar card</span><input value={editForm.company_aadhaar_card} onChange={(event) => updateField('company_aadhaar_card', event.target.value)} /></label>
            <label><span>Company logo</span><input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} /></label>
            <section className="employer-location-editor">
              <div className="employer-location-editor-head">
                <div>
                  <span>Office location</span>
                  <strong>Company address and coordinates</strong>
                  <p>Select the location hierarchy or use your device location.</p>
                </div>
                <button type="button" className="employer-current-location-btn" onClick={useCurrentLocation} disabled={locating}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>
                  </svg>
                  {locating ? 'Locating...' : 'Use current location'}
                </button>
              </div>

              <div className="employer-location-selects">
                <label>
                  <span>Country</span>
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Select country"
                    isClearable
                    isDisabled={locationLoading}
                    options={locationOptions.countries.map(c => ({ value: c.id, label: c.name }))}
                    value={locationSelection.countryId ? { value: locationSelection.countryId, label: locationOptions.countries.find(c => c.id == locationSelection.countryId)?.name || '' } : null}
                    onChange={option => handleCountryChange({ target: { value: option ? option.value : '' } })}
                  />
                </label>
                <label>
                  <span>State</span>
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Select state"
                    isClearable
                    isDisabled={!locationSelection.countryId || locationLoading}
                    options={locationOptions.states.map(s => ({ value: s.id, label: s.name }))}
                    value={locationSelection.stateId ? { value: locationSelection.stateId, label: locationOptions.states.find(s => s.id == locationSelection.stateId)?.name || '' } : null}
                    onChange={option => handleStateChange({ target: { value: option ? option.value : '' } })}
                  />
                </label>
                <label>
                  <span>City</span>
                  <Select
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Select city"
                    isClearable
                    isDisabled={!locationSelection.stateId || locationLoading}
                    options={locationOptions.cities.map(c => ({ value: c.id, label: c.name }))}
                    value={locationSelection.cityId ? { value: locationSelection.cityId, label: locationOptions.cities.find(c => c.id == locationSelection.cityId)?.name || '' } : null}
                    onChange={option => handleCityChange({ target: { value: option ? option.value : '' } })}
                  />
                </label>
              </div>

              <label className="employer-location-address">
                <span>Exact office address</span>
                <input
                  value={editForm.company_location}
                  onChange={(event) => updateField('company_location', event.target.value)}
                  placeholder="Building, area, landmark, street"
                />
              </label>

              <div className="employer-location-coordinates">
                <label>
                  <span>Pincode</span>
                  <input
                    value={editForm.company_pincode}
                    onChange={(event) => updateField('company_pincode', event.target.value)}
                    placeholder="Area pincode"
                  />
                </label>
                <label>
                  <span>Latitude</span>
                  <input
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={editForm.company_latitude}
                    onChange={(event) => updateField('company_latitude', event.target.value)}
                    placeholder="Auto-filled"
                  />
                </label>
                <label>
                  <span>Longitude</span>
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={editForm.company_longitude}
                    onChange={(event) => updateField('company_longitude', event.target.value)}
                    placeholder="Auto-filled"
                  />
                </label>
              </div>
            </section>
            <label className="is-full"><span>Company description</span><textarea rows="5" value={editForm.company_description} onChange={(event) => updateField('company_description', event.target.value)} /></label>
          </div>

          <div className="employer-form-actions">
            <button type="button" className="employer-secondary-btn" onClick={() => setEditMode(false)}>Cancel</button>
            <button type="submit" className="employer-primary-btn">Save changes</button>
          </div>
        </form>
      ) : (
        <div className="employer-profile-layout">
          <section className="employer-panel employer-profile-card">
            <div className="employer-panel-head">
              <div>
                <p className="employer-section-eyebrow">Account owner</p>
                <h2>Employer details</h2>
              </div>
            </div>
            <div className="employer-profile-grid employer-profile-grid-account">
              {profileFields.map(([label, getValue]) => (
                <div className="employer-profile-item" key={label}>
                  <span>{label}</span>
                  <strong>{getValue(profile) || 'Not set'}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="employer-panel employer-profile-card">
            <div className="employer-panel-head">
              <div>
                <p className="employer-section-eyebrow">Public identity</p>
                <h2>Company details</h2>
              </div>
            </div>
            <div className="employer-company-profile-summary">
              <div className="employer-company-profile-logo">
                {companyLogoUrl ? <img src={companyLogoUrl} alt="" /> : (company?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <span>Employer organization</span>
                <strong>{company?.name || 'Company name not set'}</strong>
                <p>{[company?.industry?.name, company?.location].filter(Boolean).join(' • ') || 'Complete your public company information'}</p>
              </div>
              <span className={`employer-verification-badge ${company?.is_verified ? 'is-verified' : 'is-pending'}`}>
                {company?.is_verified ? 'Verified company' : 'Verification pending'}
              </span>
            </div>
            <div className="employer-profile-grid employer-profile-grid-company">
              {companyFields.map(([label, getValue]) => {
                const value = getValue(company);

                return (
                  <div className={`employer-profile-item ${label === 'Verification' ? 'is-verification' : ''}`} key={label}>
                    <span>{label}</span>
                    {label === 'Website' && value ? (
                      <a href={/^https?:\/\//i.test(value) ? value : `https://${value}`} target="_blank" rel="noreferrer">
                        {value}
                      </a>
                    ) : (
                      <strong>{value || 'Not set'}</strong>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="employer-profile-description">
              <span>Company description</span>
              <p>{company?.company_description || company?.description || 'No company description added yet.'}</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default Profile;
