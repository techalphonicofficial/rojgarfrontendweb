// src/pages/Location/LocationForm.jsx
import { useEffect, useState } from "react";
import { API_BASE_URL, getAuthToken } from "../../api";
import "./Location.css";

/* Utility to build query strings */
const buildQuery = (params) => {
  const esc = encodeURIComponent;
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${esc(k)}=${esc(v)}`)
    .join("&");
};

/**
 * LocationForm – country → state → city dropdowns + optional geolocation.
 *
 * Features:
 *  • Country list from GET /api/countries
 *  • States list from GET /api/locations/countries/{country_id}/states (paginated, we fetch a large limit)
 *  • Cities list from GET /api/locations/states/{state_id}/cities
 *  • Pincode (text input)
 *  • Latitude / Longitude – either typed manually, filled via "Use My Location" (browser geolocation),
 *    or resolved from a free‑text place name using OpenStreetMap Nominatim.
 */
const LocationForm = () => {
  const token = getAuthToken();

  // ---------- API data ----------
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // ---------- Selections ----------
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // ---------- Extra fields ----------
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [searchName, setSearchName] = useState("");
  const [geoError, setGeoError] = useState("");

  /* --------------------------------------------------------------- */
  /* Load Countries – once on mount                                    */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/countries`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCountries(data.countries || data);
      } catch (e) {
        console.error("❌ Failed to load countries", e);
      }
    };
    fetchCountries();
  }, [token]);

  /* --------------------------------------------------------------- */
  /* Load States when a country is chosen                               */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedCountry) return;
    const fetchStates = async () => {
      try {
        const query = buildQuery({ page: 1, limit: 5000, search: "" });
        const url = `${API_BASE_URL}/api/locations/countries/${selectedCountry}/states?${query}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStates(data.states || data);
        setSelectedState(""); // reset dependent selects
        setCities([]);
      } catch (e) {
        console.error("❌ Failed to load states", e);
      }
    };
    fetchStates();
  }, [selectedCountry, token]);

  /* --------------------------------------------------------------- */
  /* Load Cities when a state is chosen                                 */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedState) return;
    const fetchCities = async () => {
      try {
        const query = buildQuery({ page: 1, limit: 5000, search: "" });
        const url = `${API_BASE_URL}/api/locations/states/${selectedState}/cities?${query}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCities(data.cities || data);
        setSelectedCity("");
      } catch (e) {
        console.error("❌ Failed to load cities", e);
      }
    };
    fetchCities();
  }, [selectedState, token]);

  /* --------------------------------------------------------------- */
  /* Geolocation – browser API                                          */
  /* --------------------------------------------------------------- */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        setGeoError("");
      },
      (err) => {
        setGeoError(err.message || "Unable to fetch location.");
      }
    );
  };

  /* --------------------------------------------------------------- */
  /* Name → Lat/Lng – using OpenStreetMap Nominatim (free)            */
  /* --------------------------------------------------------------- */
  const resolveNameToCoords = async () => {
    if (!searchName.trim()) {
      setGeoError("Please type a location name.");
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchName
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLatitude(lat);
        setLongitude(lon);
        setGeoError("");
      } else {
        setGeoError("No results found for that name.");
      }
    } catch (e) {
      console.error("⚠️ Nominatim error", e);
      setGeoError("Failed to resolve name.");
    }
  };

  /* --------------------------------------------------------------- */
  /* Submit – for demo we just console.log the payload                  */
  /* --------------------------------------------------------------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      country_id: selectedCountry,
      state_id: selectedState,
      city_id: selectedCity,
      pincode,
      latitude,
      longitude,
    };
    console.log("📍 Location payload →", payload);
    // TODO: replace with your actual API call, e.g.:
    // fetch(`${API_BASE_URL}/api/your-endpoint`, { method: "POST", body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
  };

  return (
    <section className="location-picker">
      <h2 className="section-title">Select Location Details</h2>

      <form className="er-form" onSubmit={handleSubmit}>
        {/* ---------- Country ---------- */}
        <label className="select-label">
          Country
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
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

        {/* ---------- State ---------- */}
        <label className="select-label">
          State
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
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

        {/* ---------- City ---------- */}
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

        {/* ---------- Pincode ---------- */}
        <label className="select-label">
          Pincode
          <input
            type="text"
            placeholder="201301"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="styled-select"
          />
        </label>

        {/* ---------- Latitude & Longitude (manual) ---------- */}
        <label className="select-label">
          Latitude
          <input
            type="text"
            placeholder="e.g. 12.9716"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="styled-select"
          />
        </label>
        <label className="select-label">
          Longitude
          <input
            type="text"
            placeholder="e.g. 77.5946"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="styled-select"
          />
        </label>

        {/* ---------- Use Browser Geolocation ---------- */}
        <button
          type="button"
          className="employer-primary-btn"
          onClick={useCurrentLocation}
        >
          Use My Current Location
        </button>

        {/* ---------- Search by name (Nominatim) ---------- */}
        <div className="search-by-name">
          <input
            type="text"
            placeholder="Enter place name (e.g. Delhi)"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="styled-select"
          />
          <button
            type="button"
            className="employer-primary-btn"
            onClick={resolveNameToCoords}
          >
            Find Coordinates
          </button>
        </div>

        {geoError && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>{geoError}</p>
        )}

        {/* ---------- Submit ---------- */}
        <button type="submit" className="employer-primary-btn">
          Save Location
        </button>
      </form>
    </section>
  );
};

export default LocationForm;
