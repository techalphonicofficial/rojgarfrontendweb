import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../api';
import './Location.css';

// Utility to build query strings
const buildQuery = (params) => {
  const esc = encodeURIComponent;
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${esc(k)}=${esc(v)}`)
    .join('&');
};

/**
 * Location picker – fetches countries, then states, then cities.
 * All requests are paginated but we request a large limit to get the full list.
 */
const LocationPicker = () => {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Load all countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const query = buildQuery({ page: 1, limit: 5000, search: '' });
        const res = await fetch(`${API_BASE_URL}/api/locations/countries?${query}`);
        const data = await res.json();
        if (res.ok) setCountries(data.countries || data);
      } catch (e) {
        console.error('Failed to load countries', e);
      }
    };
    fetchCountries();
  }, []);

  // Load states whenever a country is chosen
  useEffect(() => {
    if (!selectedCountry) return;
    const fetchStates = async () => {
      try {
        const query = buildQuery({ page: 1, limit: 5000, search: '' });
        const url = `${API_BASE_URL}/api/locations/countries/${selectedCountry}/states?${query}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) setStates(data.states || data);
      } catch (e) {
        console.error('Failed to load states', e);
      }
    };
    fetchStates();
  }, [selectedCountry]);

  // Load cities whenever a state is chosen
  useEffect(() => {
    if (!selectedState) return;
    const fetchCities = async () => {
      try {
        const query = buildQuery({ page: 1, limit: 5000, search: '' });
        const url = `${API_BASE_URL}/api/locations/states/${selectedState}/cities?${query}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) setCities(data.cities || data);
      } catch (e) {
        console.error('Failed to load cities', e);
      }
    };
    fetchCities();
  }, [selectedState]);

  const handleFindJobs = (event) => {
    event.preventDefault();
    const city = cities.find((item) => String(item.id) === selectedCity);
    if (city?.name) {
      navigate(`/jobs?location=${encodeURIComponent(city.name)}`);
    }
  };

  return (
    <section className="location-picker">
      <h2 className="section-title">Select Location</h2>
      <p className="location-helper">Choose a city to find nearby opportunities.</p>
      <form onSubmit={handleFindJobs}>
        <div className="select-group">
          <label className="select-label">
            Country
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState('');
                setSelectedCity('');
                setStates([]);
                setCities([]);
              }}
              className="styled-select"
            >
              <option value="">-- Choose Country --</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            State
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('');
                setCities([]);
              }}
              disabled={!selectedCountry}
              className="styled-select"
            >
              <option value="">-- Choose State --</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            City
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedState}
              className="styled-select"
            >
              <option value="">-- Choose City --</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="location-actions">
          <button type="submit" className="btn-primary" disabled={!selectedCity}>
            Find Jobs
          </button>
        </div>
      </form>
    </section>
  );
};

export default LocationPicker;
