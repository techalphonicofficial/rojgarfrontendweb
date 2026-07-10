import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const About = () => {
  return (
    <div className="about-page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="about-eyebrow">Our Story</div>
        <h1>About <span>Rojgar Setu</span></h1>
        <p className="about-hero-subtitle">
          Bridging the gap between talent and opportunity across India — for job seekers, gig workers, and employers alike.
        </p>

        <div className="about-hero-stats">
          <div className="about-hero-stat">
            <strong>10K+</strong>
            <span>Active Jobs</span>
          </div>
          <div className="about-hero-stat">
            <strong>5K+</strong>
            <span>Employers</span>
          </div>
          <div className="about-hero-stat">
            <strong>50K+</strong>
            <span>Job Seekers</span>
          </div>
          <div className="about-hero-stat">
            <strong>500+</strong>
            <span>Cities Covered</span>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="about-body">

        {/* Mission & Vision */}
        <div className="about-mv-grid">
          <div className="about-mv-card mission">
            <div className="about-mv-icon">🎯</div>
            <h2>Our Mission</h2>
            <p>
              Our mission is to empower individuals by connecting them with meaningful traditional and gig opportunities while helping businesses find the right talent quickly and efficiently.
            </p>
          </div>

          <div className="about-mv-card vision">
            <div className="about-mv-icon">🔭</div>
            <h2>Our Vision</h2>
            <p>
              We envision a platform where geographical and socio-economic barriers are removed from the hiring process. A unified portal that serves the needs of both the formal employment sector and the rapidly growing gig economy.
            </p>
          </div>
        </div>

        {/* Why Choose Us */}
        <div>
          <div className="about-section-label">
            <h2>Why Choose Us?</h2>
            <p>Everything you need to find your next opportunity, built into one seamless platform.</p>
          </div>

          <div className="about-features-grid">
            <div className="about-feature-card">
              <div className="about-feature-icon">📦</div>
              <h3>Comprehensive</h3>
              <p>From daily gig tasks to full-time careers — all verified opportunities in one place, updated in real time.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon">📍</div>
              <h3>Location-Aware</h3>
              <p>Find opportunities near you with our advanced spatial search. Gigs within 10 km, jobs in your city.</p>
            </div>

            <div className="about-feature-card">
              <div className="about-feature-icon">✨</div>
              <h3>Premium Experience</h3>
              <p>A seamless, modern, and engaging interface designed for speed and clarity across all devices.</p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="about-cta">
          <h2>Ready to Find Your Next Role?</h2>
          <p>Join thousands of job seekers who found their perfect opportunity through Rojgar Setu.</p>
          <div className="about-cta-actions">
            <Link to="/jobs" className="about-cta-primary">
              Browse Jobs →
            </Link>
            <Link to="/register-job-seeker" className="about-cta-secondary">
              Create Free Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
