import React from 'react';
import '../Shared/StaticPage.css';

const TermsOfService = () => {
  return (
    <div className="static-page-wrapper">
      <div className="container">
        <div className="static-page-header">
          <h1 className="static-page-title">Terms of <span className="text-gradient">Service</span></h1>
          <p className="static-page-subtitle">Last updated: June 15, 2026</p>
        </div>
        
        <div className="static-content-card glass-panel">
          <h2>1. Agreement to Terms</h2>
          <p>These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and Rojgar Setu (“Company”, “we”, “us”, or “our”), concerning your access to and use of our website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.</p>
          
          <h2>2. Intellectual Property Rights</h2>
          <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the “Content”) are owned or controlled by us.</p>

          <h2>3. User Representations</h2>
          <p>By using the Site, you represent and warrant that all registration information you submit will be true, accurate, current, and complete.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
