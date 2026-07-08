import React from 'react';
import '../Shared/StaticPage.css';

const Accessibility = () => {
  return (
    <div className="static-page-wrapper">
      <div className="container">
        <div className="static-page-header">
          <h1 className="static-page-title">Accessibility <span className="text-gradient">Statement</span></h1>
          <p className="static-page-subtitle">Our commitment to inclusive design</p>
        </div>
        
        <div className="static-content-card glass-panel">
          <h2>Our Commitment</h2>
          <p>Rojgar Setu is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, and applying the relevant accessibility standards.</p>
          
          <h2>Conformance Status</h2>
          <p>The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. Rojgar Setu is partially conformant with WCAG 2.1 level AA.</p>

          <h2>Feedback</h2>
          <p>We welcome your feedback on the accessibility of Rojgar Setu. Please let us know if you encounter accessibility barriers on Rojgar Setu by contacting our support team.</p>
        </div>
      </div>
    </div>
  );
};

export default Accessibility;
