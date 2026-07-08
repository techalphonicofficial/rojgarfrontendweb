import React from 'react';
import '../Shared/StaticPage.css';

const About = () => {
  return (
    <div className="static-page-wrapper">
      <div className="container">
        <div className="static-page-header">
          <h1 className="static-page-title">About <span className="text-gradient">Rojgar Setu</span></h1>
          <p className="static-page-subtitle">Bridging the gap between talent and opportunity across India.</p>
        </div>
        
        <div className="static-content-card glass-panel">
          <h2>Our Mission</h2>
          <p>Our mission is to empower individuals by connecting them with meaningful traditional and gig opportunities while helping businesses find the right talent quickly and efficiently.</p>
          
          <h2>Our Vision</h2>
          <p>We envision a platform where geographical and socio-economic barriers are removed from the hiring process. A unified portal that serves the needs of both the formal employment sector and the rapidly growing gig economy.</p>

          <h2>Why Choose Us?</h2>
          <ul>
            <li><strong>Comprehensive:</strong> From daily tasks to full-time careers, all in one place.</li>
            <li><strong>Location-Aware:</strong> Find opportunities near you with our advanced spatial search.</li>
            <li><strong>Premium Experience:</strong> A seamless, modern, and engaging user interface.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About;
