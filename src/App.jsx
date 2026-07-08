import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import RegisterEmployer from './pages/RegisterEmployer/RegisterEmployer';
import RegisterJobSeeker from './pages/RegisterJobSeeker/RegisterJobSeeker';
import Login from './pages/Login/Login';
import JobSeekerDashboard from './pages/JobSeekerDashboard/JobSeekerDashboard';
import EmployerDashboardLayout from './pages/EmployerDashboard/EmployerDashboardLayout';
import AllJobs from './pages/AllJobs/AllJobs';
import Overview from './pages/EmployerDashboard/Overview';
import Profile from './pages/EmployerDashboard/Profile';
import Jobs from './pages/EmployerDashboard/Jobs';
import CreateJob from './pages/EmployerDashboard/CreateJob';
import CreateGigJob from './pages/EmployerDashboard/CreateGigJob';
import Applicants from './pages/EmployerDashboard/Applicants';
import JobDetail from './pages/JobDetail/JobDetail';
import About from './pages/About/About';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsOfService from './pages/Legal/TermsOfService';
import CookiePolicy from './pages/Legal/CookiePolicy';
import Accessibility from './pages/Legal/Accessibility';
import Location from './pages/Location/Location';
import BrandPage from './pages/BrandPage/BrandPage';
import { AuthProvider } from './context/AuthProvider';
import './App.css';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <ScrollToTop />
          <Navbar />

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register/employer" element={<RegisterEmployer />} />
              <Route path="/register/job-seeker" element={<RegisterJobSeeker />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/job-seeker" element={<Login />} />
              <Route path="/login/employer" element={<Login role="employer" />} />
              <Route path="/jobs" element={<AllJobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/dashboard/job-seeker" element={<JobSeekerDashboard key="dashboard" />} />
              <Route path="/dashboard/employer/*" element={<EmployerDashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="overview" element={<Overview />} />
                <Route path="profile" element={<Profile />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/new" element={<CreateJob />} />
                <Route path="jobs/:id/edit" element={<CreateJob />} />
                <Route path="gigs/new" element={<CreateGigJob />} />
                <Route path="gigs/:id/edit" element={<CreateGigJob />} />
                <Route path="applicants" element={<Applicants />} />
              </Route>
              <Route path="/employer/dashboard/*" element={<EmployerDashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="overview" element={<Overview />} />
                <Route path="profile" element={<Profile />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/new" element={<CreateJob />} />
                <Route path="jobs/:id/edit" element={<CreateJob />} />
                <Route path="gigs/new" element={<CreateGigJob />} />
                <Route path="gigs/:id/edit" element={<CreateGigJob />} />
                <Route path="applicants" element={<Applicants />} />
              </Route>
              <Route path="/job-seeker/dashboard" element={<JobSeekerDashboard key="job-seeker-dashboard" />} />
              <Route path="/my-profile" element={<JobSeekerDashboard key="profile-view" defaultTab="profile-view" />} />
              <Route path="/my-profile/edit" element={<JobSeekerDashboard key="profile-edit" defaultTab="profile-edit" />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/location" element={<Location />} />
              <Route path="/brands/:slug" element={<BrandPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
