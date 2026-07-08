import React from 'react';
import '../Shared/StaticPage.css';

const CookiePolicy = () => {
  return (
    <div className="static-page-wrapper">
      <div className="container">
        <div className="static-page-header">
          <h1 className="static-page-title">Cookie <span className="text-gradient">Policy</span></h1>
          <p className="static-page-subtitle">Last updated: June 15, 2026</p>
        </div>
        
        <div className="static-content-card glass-panel">
          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files that are placed on your computer or mobile device when you browse websites. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information and assist with service or advertising personalization.</p>
          
          <h2>2. How We Use Cookies</h2>
          <p>We use cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Website.</p>

          <h2>3. Your Choices Regarding Cookies</h2>
          <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager.</p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
