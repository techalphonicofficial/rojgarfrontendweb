import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.jpg';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <div className="brand">
            <img src={logo} alt="RojgarSetu" className="brand-logo" />
          </div>
          <p className="footer-desc">
            Bridging the gap between talent and opportunity across India. Find your next traditional role or gig with ease.
          </p>
        </div>
        
        <div className="footer-links">
          <div className="link-column">
            <h4>For Candidates</h4>
            <Link to="/jobs">Browse Jobs</Link>
            <Link to="/jobs?type=gig">Gig Economy</Link>
            <Link to="/about">About Us</Link>
          </div>
          <div className="link-column">
            <h4>For Employers</h4>
            <Link to="/register/employer">Post a Job</Link>
            <Link to="/register/employer">Search Resumes</Link>
            <Link to="/register/employer">Pricing</Link>
          </div>
          <div className="link-column">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Policy</Link>
            <Link to="/accessibility">Accessibility</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom container">
        <p>&copy; {new Date().getFullYear()} Rojgar Setu. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
