import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroArt from '../../assets/hero.png';
import './HeroSection.css';

const SearchIcon = () => (
  <svg className="hero-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const MapPinIcon = () => (
  <svg className="hero-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const BriefcaseIcon = () => (
  <svg className="hero-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2"></rect>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
  </svg>
);

const EXPERIENCE_OPTIONS = [
  ['', 'Your Experience'],
  ['fresher', 'Fresher'],
  ['0-1', '0-1 year'],
  ['1-3', '1-3 years'],
  ['3-5', '3-5 years'],
  ['5-10', '5-10 years'],
  ['10-15', '10-15 years'],
  ['15-20', '15-20 years'],
  ['20+', '20+ years experience']
];

const HERO_STATS = [
  ['50 lakh+', 'Career opportunities'],
  ['20+ years', 'Experience supported'],
  ['10 km', 'Nearby gig search']
];

const TRUSTED_COMPANIES = ['Tech Mahindra', 'Jio', 'Shoppers Stop', 'Teleperformance', 'Bajaj Allianz'];

const OPPORTUNITY_CARDS = [
  ['Full-time roles', 'Verified companies hiring today'],
  ['Gig economy', 'Nearby shifts with live location'],
  ['Employer chat', 'Message recruiters after applying']
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();

    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (experience) params.set('experience', experience);
    if (location.trim()) params.set('location', location.trim());

    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="hero-section">
      <div className="container hero-container">
        <div className="hero-content">
          <span className="hero-kicker">Rojgar Setu career network</span>
          <h1 className="hero-title">Find work that matches your life and experience</h1>
          <p className="hero-subtitle">Search full-time jobs, local gig shifts, and employer connections from fresher level to 20+ years experience.</p>

          <div className="hero-search-console">
            <div className="hero-console-top">
              <span>Search jobs</span>
              <strong>Normal + gig opportunities</strong>
            </div>

            <form className="search-form" onSubmit={handleSubmit}>
              <label className="input-group">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Job title, skill, or company"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
              <div className="divider"></div>
              <label className="input-group">
                <BriefcaseIcon />
                <select value={experience} onChange={(event) => setExperience(event.target.value)}>
                  {EXPERIENCE_OPTIONS.map(([value, label]) => (
                    <option value={value} key={label}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="divider"></div>
              <label className="input-group">
                <MapPinIcon />
                <input
                  type="text"
                  placeholder="City, area, or pincode"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
              <button type="submit" className="search-btn">Search jobs</button>
            </form>
          </div>

          <div className="hero-stats" aria-label="Platform highlights">
            {HERO_STATS.map(([value, label]) => (
              <div className="hero-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-board">
            <div className="hero-board-header">
              <div>
                <span>Live hiring board</span>
                <strong>Today&apos;s opportunities</strong>
              </div>
              <img src={heroArt} alt="" />
            </div>

            <div className="opportunity-stack">
              {OPPORTUNITY_CARDS.map(([title, copy]) => (
                <div className="opportunity-card" key={title}>
                  <span></span>
                  <div>
                    <strong>{title}</strong>
                    <p>{copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="trusted-strip">
              <span>Trusted by</span>
              <div>
                {TRUSTED_COMPANIES.map((company) => (
                  <button type="button" key={company} onClick={() => navigate(`/jobs?keyword=${encodeURIComponent(company)}`)}>
                    {company}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
