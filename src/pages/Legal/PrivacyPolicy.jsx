import React from 'react';
import '../Shared/StaticPage.css';

const PrivacyPolicy = () => {
  return (
    <div className="static-page-wrapper">
      <div className="container">
        <div className="static-page-header">
          <h1 className="static-page-title">Privacy <span className="text-gradient">Policy</span></h1>
          <p className="static-page-subtitle">Last updated: June 15, 2026</p>
        </div>
        
        <div className="static-content-card glass-panel">
          <h2>1. Introduction</h2>
          <p>Welcome to Rojgar Setu. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.</p>
          
          <h2>2. Information We Collect</h2>
          <p>We collect personal information that you voluntarily provide to us when registering on the Services, expressing an interest in obtaining information about us or our products and services.</p>
          <ul>
            <li>Name and Contact Data</li>
            <li>Credentials and Work History</li>
            <li>Payment Data</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests.</p>
          
          <h2>4. Will Your Information Be Shared?</h2>
          <p>We only share and disclose your information in the following situations: Compliance with Laws, Vital Interests and Legal Rights, Vendors, Consultants and Other Third-Party Service Providers.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
