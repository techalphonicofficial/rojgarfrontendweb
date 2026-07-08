// src/pages/Countries/Countries.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, getAuthToken } from '../../api';
import './Countries.css';

const Countries = () => {
  const token = getAuthToken();
  const [countries, setCountries] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 20; // reasonable page size

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/countries?page=${page}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Assume API returns { countries: [], total: n }
        setCountries(data.countries || data);
      } catch (e) {
        console.error('Error loading countries', e);
      }
    };
    fetchCountries();
  }, [page, token]);

  return (
    <section className="countries-page">
      <h2 className="page-title">Countries</h2>
      <ul className="countries-list">
        {countries.map((c) => (
          <li key={c.id} className="country-item">
            <Link to={`/states/${c.id}`} className="country-link">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="pagination-controls">
        {page > 1 && (
          <button onClick={() => setPage(page - 1)} className="page-btn">
            Previous
          </button>
        )}
        <button onClick={() => setPage(page + 1)} className="page-btn">
          Next
        </button>
      </div>
    </section>
  );
};

export default Countries;
