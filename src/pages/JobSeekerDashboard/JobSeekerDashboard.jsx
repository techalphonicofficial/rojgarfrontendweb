import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  API_BASE_URL,
  authApiRequest,
  getAuthToken,
  getJobSeekerOffers,
  getStoredUser,
  resolveAssetUrl,
  storeAuthSession
} from '../../api';
import ChatAttachment from '../../components/ChatAttachment/ChatAttachment';
import ExperienceTab from './ExperienceTab';
import ProjectsTab from './ProjectsTab';
import './JobSeekerDashboard.css';
import Select from 'react-select';
const SOCKET_URL = API_BASE_URL || window.location.origin;
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'saved', label: 'Saved Jobs' },
  { id: 'applications', label: 'Applied Jobs' },
  { id: 'messages', label: 'Messages' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'profile-view', label: 'View Profile', to: '/my-profile' },
  { id: 'profile-edit', label: 'Edit Profile', to: '/my-profile/edit' }
];
const DashboardTabIcon = ({ name }) => {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    saved: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
    applications: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    messages: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    experience: <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>,
    projects: <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />,
    'profile-view': <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    'profile-edit': <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  };

  return (
    <span className="dashboard-tab-icon">
      <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
    </span>
  );
};
const defaultProfileForm = {
  full_name: '',
  email: '',
  avatar: '',
  headline: '',
  bio: '',
  experience_years: '',
  current_location: '',
  exact_location: '',
  latitude: '',
  longitude: '',
  current_country_id: '',
  current_state_id: '',
  current_city_id: '',
  expected_salary: '',
  skills: '',
  job_type_id: '',
  job_shift_id: '',
  industry_id: '',
  job_category_id: '',
  job_role_id: '',
  qualification_id: '',
  course_specialization_id: '',
  resume_path: ''
};
const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatMoney = (min, max, currency = 'INR') => {
  if (!min && !max) return 'Salary not shown';
  if (min && max) return `${currency} ${min} - ${max}`;
  return `${currency} ${min || max}`;
};
const formatProfileAmount = (value, currency = 'INR') => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `${currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
};
const formatProfileLocation = (profile = {}) => {
  const fallback = [profile.city?.name, profile.state?.name, profile.country?.name]
    .filter(Boolean)
    .join(', ');
  const source = String(profile.current_location || fallback).trim();
  if (!source) return '';

  const seen = new Set();
  return source
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
};
const titleCase = (value = '') => String(value)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
const splitSkills = (value = '') => String(value)
  .split(',')
  .map((skill) => skill.trim())
  .filter(Boolean);
const joinSkills = (skills = []) => skills.join(', ');
const findLookupName = (items = [], id) => items.find((item) => String(item.id) === String(id))?.name || '';
const extractExactLocation = (profile = {}) => {
  const location = String(profile.current_location || '').trim();
  const hierarchy = [
    profile.city?.name,
    profile.state?.name,
    profile.country?.name
  ].filter(Boolean).join(', ');

  if (!location || !hierarchy || !location.toLowerCase().endsWith(hierarchy.toLowerCase())) {
    return location;
  }

  return location.slice(0, location.length - hierarchy.length).replace(/[,\s]+$/g, '');
};
const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    reject(new Error('Current location is not supported in this browser.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000
  });
});


const buildSavedLocation = (job, source = 'normal') => {
  const city = source === 'gig'
    ? (job.cityLocation?.name || job.city)
    : (job.city?.name || job.locations?.[0]?.name || job.city);
  const state = source === 'gig' ? job.stateLocation?.name : job.state?.name;
  const country = source === 'gig' ? job.countryLocation?.name : job.country?.name;

  return job.location || [city, state, country].filter(Boolean).join(', ') || 'Location unavailable';
};

const formatSavedPay = (job, source = 'normal') => {
  if (source === 'gig') {
    const amount = formatMoney(job.amount, null, job.currency_code);
    return job.payment_type ? `${amount} / ${titleCase(job.payment_type)}` : amount;
  }

  return formatMoney(job.salary_min, job.salary_max, job.currency_code);
};

const normalizeNormalApplication = (application) => ({
  id: application.id,
  source: 'normal',
  sourceLabel: 'Job',
  jobId: application.job_id,
  employerUserId: application.job?.employer?.user_id,
  employerName: application.job?.employer?.user?.full_name || application.job?.company?.name || 'Employer',
  title: application.job?.title || 'Job title unavailable',
  company: application.job?.company?.name || 'Company unavailable',
  location: application.job?.location || application.job?.city?.name || application.job?.city || 'Location unavailable',
  salary: formatMoney(application.job?.salary_min, application.job?.salary_max, application.job?.currency_code),
  status: application.status,
  appliedAt: application.applied_at,
  raw: application
});

const normalizeGigApplication = (application) => ({
  id: application.id,
  source: 'gig',
  sourceLabel: 'Gig',
  gigJobId: application.gig_job_id,
  employerUserId: application.gigJob?.employer?.user_id,
  employerName: application.gigJob?.employer?.user?.full_name || application.gigJob?.company?.name || 'Employer',
  title: application.gigJob?.title || 'Gig job title unavailable',
  company: application.gigJob?.company?.name || 'Company unavailable',
  location: application.gigJob?.location || application.gigJob?.city || 'Location unavailable',
  salary: formatMoney(application.gigJob?.amount, null, application.gigJob?.currency_code),
  status: application.status,
  appliedAt: application.applied_at,
  raw: application
});

const normalizeSavedJob = (job, source = 'normal') => ({
  id: job.id,
  source,
  title: job.title || 'Job title unavailable',
  company: job.company?.name || 'Company unavailable',
  location: buildSavedLocation(job, source),
  salary: formatSavedPay(job, source),
  status: job.status || 'saved'
});

const stepClassName = (state) => {
  if (state === 'completed') return 'dashboard-step is-completed';
  if (state === 'current') return 'dashboard-step is-current';
  return 'dashboard-step';
};

const JobSeekerDashboard = ({ defaultTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [profile, setProfile] = useState(getStoredUser());
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [savedJobs, setSavedJobs] = useState([]);
  const [normalApplications, setNormalApplications] = useState([]);
  const [gigApplications, setGigApplications] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messageFile, setMessageFile] = useState(null);
  const [newChatUserId, setNewChatUserId] = useState('');
  const [tracking, setTracking] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersOpen, setOffersOpen] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [offersError, setOffersError] = useState('');
  const [dashboardCounts, setDashboardCounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removingSavedKey, setRemovingSavedKey] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });

  const [qualifications, setQualifications] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [courseSpecializations, setCourseSpecializations] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [jobShifts, setJobShifts] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [profileCountries, setProfileCountries] = useState([]);
  const [profileStates, setProfileStates] = useState([]);
  const [profileCities, setProfileCities] = useState([]);
  const [locatingProfile, setLocatingProfile] = useState(false);

  const isAuthenticated = Boolean(getAuthToken());

  const allApplications = useMemo(() => ([
    ...normalApplications.map(normalizeNormalApplication),
    ...gigApplications.map(normalizeGigApplication)
  ]).sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0)), [normalApplications, gigApplications]);

  const unreadCount = useMemo(() => chats.reduce((total, chat) => total + Number(chat.unread_count || 0), 0), [chats]);
  const offerCount = offersLoaded
    ? dashboardCounts?.offers_count ?? offers.length
    : allApplications.filter((application) => application.status === 'offered').length;
  const appliedCount = dashboardCounts?.applied_count ?? allApplications.length;
  const savedCount = dashboardCounts?.saved_count ?? savedJobs.length;
  const currentUserId = profile?.id || getStoredUser()?.id;
  const profileAvatarUrl = resolveAssetUrl(profile?.avatar || '', '/uploads/avatars');
  const editAvatarUrl = avatarPreviewUrl || resolveAssetUrl(profileForm.avatar || '', '/uploads/avatars');
  const profileResumeUrl = resolveAssetUrl(profile?.profile?.resume_path || '', '/uploads/resumes');
  const seekerProfile = profile?.profile || {};
  const profileSkills = Array.isArray(profile?.skills)
    ? profile.skills.map((skill) => skill?.name || skill).filter(Boolean)
    : [];
  const profileLocation = formatProfileLocation(seekerProfile);
  const profileCompletionFields = [
    profile?.full_name,
    profile?.email,
    profile?.phone,
    seekerProfile.headline,
    seekerProfile.bio,
    seekerProfile.experience_years,
    seekerProfile.current_location,
    seekerProfile.industry?.name,
    seekerProfile.job_role?.name,
    seekerProfile.qualification?.name,
    profileResumeUrl,
    profileSkills.length > 0
  ];
  const profileCompletion = Math.round(
    (profileCompletionFields.filter(Boolean).length / profileCompletionFields.length) * 100
  );
  const selectedSkillKeys = useMemo(() => new Set(splitSkills(profileForm.skills).map((skill) => skill.toLowerCase())), [profileForm.skills]);

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const openOffers = async () => {
    setOffersOpen(true);
    if (offersLoaded) return;

    setOffersLoading(true);
    setOffersError('');

    try {
      const data = await getJobSeekerOffers();
      setOffers(data.offers || []);
      setDashboardCounts({
        applied_count: Number(data.applied_count) || 0,
        saved_count: Number(data.saved_count) || 0,
        offers_count: Number(data.offers_count ?? data.count) || 0,
      });
      setOffersLoaded(true);
    } catch (error) {
      setOffersError(error.message || 'Unable to load offers.');
    } finally {
      setOffersLoading(false);
    }
  };

  const closeOffers = () => {
    setOffersOpen(false);
    setOffersError('');
  };

  useEffect(() => {
    if (!offersOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOffersOpen(false);
        setOffersError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [offersOpen]);

  const messagesEndRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const avatarObjectUrlRef = useRef('');

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'profile-edit' || (qualifications.length > 0 && jobTypes.length > 0 && allSkills.length > 0 && profileCountries.length > 0)) return;

    Promise.allSettled([
      authApiRequest('/api/qualifications?limit=100'),
      authApiRequest('/api/industries?limit=100').catch(() => ({})),
      authApiRequest('/api/jobs/masters'),
      authApiRequest('/api/skills'),
      authApiRequest('/api/locations/countries?limit=300')
    ]).then(([qualResult, indResult, masterResult, skillsResult, countryResult]) => {
      if (qualResult.status === 'fulfilled') setQualifications(qualResult.value.qualifications || []);
      if (indResult.status === 'fulfilled') setIndustries(indResult.value.industries || []);
      if (masterResult.status === 'fulfilled') {
        setJobTypes(masterResult.value.job_types || []);
        setJobShifts(masterResult.value.job_shifts || []);
      }
      if (skillsResult.status === 'fulfilled') setAllSkills(skillsResult.value.skills || []);
      if (countryResult.status === 'fulfilled') setProfileCountries(countryResult.value.locations || countryResult.value.countries || []);
    });
  }, [activeTab, allSkills.length, jobTypes.length, profileCountries.length, qualifications.length]);

  useEffect(() => {
    if (activeTab !== 'profile-edit' || !profileForm.current_country_id) {
      return;
    }

    authApiRequest(`/api/locations/countries/${profileForm.current_country_id}/states?limit=300`)
      .then((data) => setProfileStates(data.locations || data.states || []))
      .catch(() => setProfileStates([]));
  }, [activeTab, profileForm.current_country_id]);

  useEffect(() => {
    if (activeTab !== 'profile-edit' || !profileForm.current_state_id) {
      return;
    }

    authApiRequest(`/api/locations/states/${profileForm.current_state_id}/cities?limit=500`)
      .then((data) => setProfileCities(data.locations || data.cities || []))
      .catch(() => setProfileCities([]));
  }, [activeTab, profileForm.current_state_id]);

  useEffect(() => {
    if (activeTab !== 'profile-edit' || !profileForm.industry_id) {
      return;
    }

    authApiRequest(`/api/job-categories?industry_id=${profileForm.industry_id}&limit=100`)
      .then((data) => setJobCategories(data.job_categories || []))
      .catch(() => setJobCategories([]));
  }, [activeTab, profileForm.industry_id]);

  useEffect(() => {
    if (activeTab !== 'profile-edit' || !profileForm.job_category_id) {
      return;
    }

    authApiRequest(`/api/job-roles?category_id=${profileForm.job_category_id}&limit=100`)
      .then((data) => setJobRoles(data.job_roles || []))
      .catch(() => setJobRoles([]));
  }, [activeTab, profileForm.job_category_id]);

  useEffect(() => {
    if (activeTab === 'profile-edit' && profileForm.qualification_id) {
      authApiRequest(`/api/qualifications/${profileForm.qualification_id}/course-specializations?limit=100`)
        .then(data => setCourseSpecializations(data.course_specializations || []))
        .catch(() => setCourseSpecializations([]));
    }
  }, [activeTab, profileForm.qualification_id]);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messagesPage === 1) {
      scrollToBottom();
    }
  }, [messages, messagesPage]);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    let socket;
    if (isAuthenticated && currentUserId) {
      socket = io(SOCKET_URL);

      socket.on('connect', () => {
        socket.emit('send-user-id', currentUserId);
      });

      socket.on('message-received', (payload) => {
        const newMessage = payload.chat_message;
        const currentActiveChat = activeChatRef.current;

        setChats((currentChats) => {
          const senderId = newMessage.sender_id;
          const existingChat = currentChats.find((chat) => chat.user.id === senderId);
          const isActive = currentActiveChat && currentActiveChat.user.id === senderId;

          const updatedChat = existingChat ? {
            ...existingChat,
            last_message: newMessage,
            unread_count: isActive ? 0 : (existingChat.unread_count || 0) + 1
          } : {
            user: newMessage.sender,
            last_message: newMessage,
            unread_count: isActive ? 0 : 1
          };

          return [updatedChat, ...currentChats.filter(c => c.user.id !== senderId)];
        });

        if (currentActiveChat && currentActiveChat.user.id === newMessage.sender_id) {
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          authApiRequest('/api/messages/read', {
            method: 'PATCH',
            body: JSON.stringify({ sender_id: newMessage.sender_id })
          }).catch(() => { });
        }
      });

      socket.on('message-sent', (payload) => {
        const newMessage = payload.chat_message;
        const currentActiveChat = activeChatRef.current;

        setChats((currentChats) => {
          const receiverId = newMessage.receiver_id;
          const existingChat = currentChats.find((chat) => chat.user.id === receiverId);

          const updatedChat = existingChat ? {
            ...existingChat,
            last_message: newMessage
          } : {
            user: newMessage.receiver,
            last_message: newMessage,
            unread_count: 0
          };

          return [updatedChat, ...currentChats.filter(c => c.user.id !== receiverId)];
        });

        if (currentActiveChat && currentActiveChat.user.id === newMessage.receiver_id) {
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, currentUserId]);

  const fillProfileForm = (user) => {
    const userProfile = user?.profile || {};
    const skills = Array.isArray(user?.skills)
      ? user.skills.map((skill) => skill.name || skill).join(', ')
      : '';

    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
      headline: userProfile.headline || '',
      bio: userProfile.bio || '',
      experience_years: userProfile.experience_years ?? '',
      current_location: userProfile.current_location || '',
      exact_location: extractExactLocation(userProfile),
      latitude: userProfile.latitude ?? '',
      longitude: userProfile.longitude ?? '',
      current_country_id: userProfile.country_id ?? userProfile.current_country_id ?? userProfile.country?.id ?? '',
      current_state_id: userProfile.state_id ?? userProfile.current_state_id ?? userProfile.state?.id ?? '',
      current_city_id: userProfile.city_id ?? userProfile.current_city_id ?? userProfile.city?.id ?? '',
      expected_salary: userProfile.expected_salary ?? '',
      skills,
      job_type_id: userProfile.job_type_id ?? userProfile.job_type?.id ?? '',
      job_shift_id: userProfile.job_shift_id ?? userProfile.job_shift?.id ?? '',
      industry_id: userProfile.industry_id ?? userProfile.industry?.id ?? '',
      job_category_id: userProfile.job_category_id ?? userProfile.job_category?.id ?? '',
      job_role_id: userProfile.job_role_id ?? userProfile.job_role?.id ?? '',
      qualification_id: userProfile.qualification_id ?? userProfile.qualification?.id ?? '',
      course_specialization_id: userProfile.course_specialization_id
        ?? userProfile.course_specialization?.id
        ?? '',
      resume_path: userProfile.resume_path || ''
    });
    setResumeFile(null);
    setAvatarFile(null);
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = '';
    }
    setAvatarPreviewUrl('');
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const loadDashboard = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setNotice({ type: '', message: '' });

    const [
      profileResult,
      savedResult,
      savedGigResult,
      normalAppsResult,
      gigAppsResult,
      chatsResult,
      offersResult
    ] = await Promise.allSettled([
      authApiRequest('/api/auth/profile/job-seeker'),
      authApiRequest('/api/jobs/saved/me?page=1&limit=20'),
      authApiRequest('/api/gig-jobs/saved/me?page=1&limit=20'),
      authApiRequest('/api/jobs/my-applications?page=1&limit=20'),
      authApiRequest('/api/gig-jobs/my-applications?page=1&limit=20'),
      authApiRequest('/api/messages/chats?page=1&limit=20'),
      getJobSeekerOffers()
    ]);

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value.user);
      fillProfileForm(profileResult.value.user);
      storeAuthSession({ user: profileResult.value.user });
    }

    if (savedResult.status === 'fulfilled' || savedGigResult.status === 'fulfilled') {
      const normalSaved = savedResult.status === 'fulfilled'
        ? (savedResult.value.jobs || []).map((job) => normalizeSavedJob(job, 'normal'))
        : [];
      const gigSaved = savedGigResult.status === 'fulfilled'
        ? (savedGigResult.value.gig_jobs || []).map((job) => normalizeSavedJob(job, 'gig'))
        : [];
      setSavedJobs([...normalSaved, ...gigSaved]);
    }

    if (normalAppsResult.status === 'fulfilled') {
      setNormalApplications(normalAppsResult.value.applications || []);
    }

    if (gigAppsResult.status === 'fulfilled') {
      setGigApplications(gigAppsResult.value.applications || []);
    }

    if (chatsResult.status === 'fulfilled') {
      setChats(chatsResult.value.chats || []);
    }

    if (offersResult.status === 'fulfilled') {
      setOffers(offersResult.value.offers || []);
      setDashboardCounts({
        applied_count: Number(offersResult.value.applied_count) || 0,
        saved_count: Number(offersResult.value.saved_count) || 0,
        offers_count: Number(offersResult.value.offers_count ?? offersResult.value.count) || 0,
      });
      setOffersLoaded(true);
      setOffersError('');
    } else {
      setOffersLoaded(false);
      setOffersError(offersResult.reason?.message || 'Unable to load offers.');
    }

    const rejected = [
      profileResult,
      savedResult,
      savedGigResult,
      normalAppsResult,
      gigAppsResult,
      chatsResult,
      offersResult
    ]
      .find((result) => result.status === 'rejected');

    if (rejected) {
      showNotice('error', rejected.reason.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async (chat) => {
    if (!chat?.user?.id) return;

    setActiveChat(chat);
    setMessageLoading(true);
    setMessageFile(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';

    try {
      const data = await authApiRequest(`/api/messages?user_id=${chat.user.id}&page=1&limit=25`);
      setMessages(data.messages || []);
      setMessagesPage(1);
      setHasMoreMessages(data.current_page < data.total_pages);

      if (chat.unread_count > 0) {
        await authApiRequest('/api/messages/read', {
          method: 'PATCH',
          body: JSON.stringify({ sender_id: chat.user.id })
        });
        setChats((current) => current.map((item) => (
          item.user.id === chat.user.id ? { ...item, unread_count: 0 } : item
        )));
      }
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setMessageLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (messageLoading || !hasMoreMessages || !activeChat) return;

    setMessageLoading(true);
    const nextPage = messagesPage + 1;

    try {
      const data = await authApiRequest(`/api/messages?user_id=${activeChat.user.id}&page=${nextPage}&limit=25`);

      const scrollContainer = document.querySelector('.dashboard-message-stream');
      const previousScrollHeight = scrollContainer?.scrollHeight || 0;

      setMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMessages = (data.messages || []).filter(m => !existingIds.has(m.id));
        return [...newMessages, ...prev];
      });

      setMessagesPage(nextPage);
      setHasMoreMessages(data.current_page < data.total_pages);

      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight - previousScrollHeight;
        }
      }, 0);
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setMessageLoading(false);
    }
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  const startChat = () => {
    const id = Number(newChatUserId);
    if (!Number.isInteger(id) || id <= 0) {
      showNotice('error', 'Enter a valid user id to start a chat.');
      return;
    }

    const existing = chats.find((chat) => Number(chat.user.id) === id);
    const chat = existing || {
      user: {
        id,
        full_name: `User #${id}`,
        role: 'user'
      },
      last_message: null,
      unread_count: 0
    };

    loadMessages(chat);
  };

  const sendMessage = async () => {
    const trimmedMessage = messageText.trim();
    if (!activeChat?.user?.id || (!trimmedMessage && !messageFile) || messageSending) return;

    setMessageSending(true);
    try {
      const payload = new FormData();
      payload.append('receiver_id', String(activeChat.user.id));
      if (trimmedMessage) payload.append('message', trimmedMessage);
      if (messageFile) payload.append('attachment', messageFile);

      const data = await authApiRequest('/api/messages/send', {
        method: 'POST',
        body: payload
      });

      setMessages((current) => {
        if (current.some(m => m.id === data.chat_message.id)) return current;
        return [...current, data.chat_message];
      });
      setMessageText('');
      setMessageFile(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      setChats((current) => {
        const existing = current.filter((chat) => chat.user.id !== activeChat.user.id);
        return [{
          user: activeChat.user,
          last_message: data.chat_message,
          unread_count: 0
        }, ...existing];
      });
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setMessageSending(false);
    }
  };

  const selectMessageFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 15 * 1024 * 1024) {
      showNotice('error', 'Attachment must be 15MB or smaller.');
      event.target.value = '';
      setMessageFile(null);
      return;
    }
    setNotice({ type: '', message: '' });
    setMessageFile(file);
  };

  const trackApplication = async (application) => {
    setLoading(true);
    setActiveTab('applications');

    try {
      const path = application.source === 'gig'
        ? `/api/gig-jobs/track?gig_job_id=${application.gigJobId}`
        : `/api/jobs/track?job_id=${application.jobId}`;
      const data = await authApiRequest(path);
      setTracking({
        ...data.tracking,
        source: application.source
      });
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const messageEmployer = async (application) => {
    const employerUserId = Number(application.employerUserId);

    if (!Number.isInteger(employerUserId) || employerUserId <= 0) {
      showNotice('error', 'Employer contact is not available for this application.');
      return;
    }

    const existing = chats.find((chat) => Number(chat.user.id) === employerUserId);
    const chat = existing || {
      user: {
        id: employerUserId,
        full_name: application.employerName || `${application.company} employer`,
        role: 'employer'
      },
      last_message: null,
      unread_count: 0
    };

    setActiveTab('messages');
    setMessageText(`Hello, I am interested in this ${application.source === 'gig' ? 'gig job' : 'job'}.`);
    await loadMessages(chat);
  };

  const removeSavedJob = async (job) => {
    const savedKey = `${job.source}-${job.id}`;
    setRemovingSavedKey(savedKey);
    setNotice({ type: '', message: '' });

    try {
      const path = job.source === 'gig'
        ? `/api/gig-jobs/${job.id}/save`
        : `/api/jobs/${job.id}/save`;
      await authApiRequest(path, { method: 'DELETE' });
      setSavedJobs((current) => current.filter((item) => `${item.source}-${item.id}` !== savedKey));
      setDashboardCounts((current) => (
        current
          ? { ...current, saved_count: Math.max(0, current.saved_count - 1) }
          : current
      ));
      showNotice('success', 'Saved job removed.');
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setRemovingSavedKey('');
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const skills = splitSkills(profileForm.skills);
      const countryName = findLookupName(profileCountries, profileForm.current_country_id);

      const stateName = findLookupName(profileStates, profileForm.current_state_id);
      const cityName = findLookupName(profileCities, profileForm.current_city_id);
      const currentLocation = [
        profileForm.exact_location.trim(),
        cityName,
        stateName,
        countryName
      ].filter(Boolean).join(', ') || profileForm.current_location.trim();

      const data = await authApiRequest('/api/auth/profile/job-seeker', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: profileForm.full_name.trim(),
          email: profileForm.email.trim(),
          avatar: profileForm.avatar.trim() || null,
          headline: profileForm.headline.trim(),
          bio: profileForm.bio.trim(),
          experience_years: profileForm.experience_years ? Number(profileForm.experience_years) : null,
          current_location: currentLocation,
          latitude: profileForm.latitude ? Number(profileForm.latitude) : null,
          longitude: profileForm.longitude ? Number(profileForm.longitude) : null,
          country_id: profileForm.current_country_id ? Number(profileForm.current_country_id) : null,
          state_id: profileForm.current_state_id ? Number(profileForm.current_state_id) : null,
          city_id: profileForm.current_city_id ? Number(profileForm.current_city_id) : null,
          expected_salary: profileForm.expected_salary ? Number(profileForm.expected_salary) : null,
          job_type_id: profileForm.job_type_id ? Number(profileForm.job_type_id) : null,
          job_shift_id: profileForm.job_shift_id ? Number(profileForm.job_shift_id) : null,
          industry_id: profileForm.industry_id ? Number(profileForm.industry_id) : null,
          job_category_id: profileForm.job_category_id ? Number(profileForm.job_category_id) : null,
          job_role_id: profileForm.job_role_id ? Number(profileForm.job_role_id) : null,
          qualification_id: profileForm.qualification_id ? Number(profileForm.qualification_id) : null,
          course_specialization_id: profileForm.course_specialization_id ? Number(profileForm.course_specialization_id) : null,
          skills
        })
      });

      let updatedUser = data.user;
      let successMessage = data.message || 'Profile updated successfully.';
      setProfile(updatedUser);
      storeAuthSession({ user: updatedUser });

      if (avatarFile) {
        const avatarPayload = new FormData();
        avatarPayload.append('avatar', avatarFile);
        const avatarData = await authApiRequest('/api/auth/profile/job-seeker/avatar', {
          method: 'PUT',
          body: avatarPayload
        });
        updatedUser = avatarData.user || updatedUser;
        successMessage = `${successMessage} Profile photo updated successfully.`;
      }

      if (resumeFile) {
        const resumePayload = new FormData();
        resumePayload.append('resume', resumeFile);
        const resumeData = await authApiRequest('/api/auth/profile/job-seeker/resume', {
          method: 'PUT',
          body: resumePayload
        });
        updatedUser = resumeData.user || updatedUser;
        successMessage = `${successMessage} Resume updated successfully.`;
      }

      setProfile(updatedUser);
      fillProfileForm(updatedUser);
      storeAuthSession({ user: updatedUser });
      showNotice('success', successMessage);
    } catch (error) {
      showNotice('error', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const updateProfileField = (field, value) => {
    if (field === 'current_country_id') {
      setProfileStates([]);
      setProfileCities([]);
    }
    if (field === 'current_state_id') {
      setProfileCities([]);
    }
    if (field === 'industry_id') {
      setJobCategories([]);
      setJobRoles([]);
    }
    if (field === 'job_category_id') {
      setJobRoles([]);
    }
    if (field === 'qualification_id') {
      setCourseSpecializations([]);
    }

    setProfileForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'industry_id') {
        next.job_category_id = '';
        next.job_role_id = '';
      }
      if (field === 'job_category_id') {
        next.job_role_id = '';
      }
      if (field === 'qualification_id') {
        next.course_specialization_id = '';
      }
      if (field === 'current_country_id') {
        next.current_state_id = '';
        next.current_city_id = '';
      }
      if (field === 'current_state_id') {
        next.current_city_id = '';
      }
      if (field === 'exact_location') {
        next.current_location = value;
      }
      return next;
    });
  };

  const clearAvatarSelection = () => {
    setAvatarFile(null);
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = '';
    }
    setAvatarPreviewUrl('');
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const selectAvatarFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedTypes.has(file.type)) {
      event.target.value = '';
      showNotice('error', 'Profile photo must be a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      showNotice('error', 'Profile photo must be 5MB or smaller.');
      return;
    }

    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = nextPreviewUrl;
    setAvatarFile(file);
    setAvatarPreviewUrl(nextPreviewUrl);
    setNotice({ type: '', message: '' });
  };

  const selectResumeFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      event.target.value = '';
      setResumeFile(null);
      showNotice('error', 'Resume must be 10MB or smaller.');
      return;
    }
    setResumeFile(file);
    setNotice({ type: '', message: '' });
  };

  const fetchProfileCurrentLocation = async () => {
    setLocatingProfile(true);
    setNotice({ type: '', message: '' });

    try {
      const position = await getCurrentPosition();
      const latitude = position.coords.latitude.toFixed(7);
      const longitude = position.coords.longitude.toFixed(7);
      let locationName = '';

      try {
        const reverseResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const reverseData = await reverseResponse.json().catch(() => ({}));
        locationName = reverseData.display_name || '';
      } catch {
        locationName = '';
      }

      setProfileForm((current) => ({
        ...current,
        latitude,
        longitude,
        exact_location: locationName || `${latitude}, ${longitude}`,
        current_location: locationName || `${latitude}, ${longitude}`
      }));
      showNotice('success', locationName ? 'Current location fetched.' : 'Latitude and longitude fetched.');
    } catch (error) {
      const message = error.code === 1
        ? 'Location permission denied. Please allow location access or enter location manually.'
        : (error.message || 'Unable to fetch current location.');
      showNotice('error', message);
    } finally {
      setLocatingProfile(false);
    }
  };

  const toggleProfileSkill = (skillName) => {
    const normalizedName = String(skillName || '').trim();
    if (!normalizedName) return;

    setProfileForm((current) => {
      const skills = splitSkills(current.skills);
      const exists = skills.some((skill) => skill.toLowerCase() === normalizedName.toLowerCase());
      return {
        ...current,
        skills: joinSkills(exists
          ? skills.filter((skill) => skill.toLowerCase() !== normalizedName.toLowerCase())
          : [...skills, normalizedName])
      };
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-auth-empty">
          <h1>Job Seeker Dashboard</h1>
          <p>Please login as a job seeker to view saved jobs, applications, messages, and profile details.</p>
          <div className="dashboard-auth-actions">
            <Link className="dashboard-primary-btn" to="/login">Login</Link>
            <Link className="dashboard-secondary-btn" to="/register/job-seeker">Register</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-user-card">
            <div className="dashboard-avatar">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={`${profile?.full_name || 'Job seeker'} avatar`} />
              ) : (
                (profile?.full_name || 'J').charAt(0).toUpperCase()
              )}
            </div>
            <h2>{profile?.full_name || 'Job Seeker'}</h2>
            <p>{profile?.profile?.headline || 'Profile headline not set'}</p>
          </div>

          <nav className="dashboard-tabs" aria-label="Job seeker dashboard">
            {tabs.map((tab) => (
              tab.to ? (
                <Link
                  key={tab.id}
                  className={`dashboard-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  to={tab.to}
                >
                  <span className="dashboard-tab-label">
                    <DashboardTabIcon name={tab.id} />
                    {tab.label}
                  </span>
                </Link>
              ) : (
                <button
                  key={tab.id}
                  type="button"
                  className={`dashboard-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="dashboard-tab-label">
                    <DashboardTabIcon name={tab.id} />
                    {tab.label}
                  </span>
                  {tab.id === 'messages' && unreadCount > 0 && <span className="dashboard-tab-count">{unreadCount}</span>}
                </button>
              )
            ))}
          </nav>
          <Link className="dashboard-sidebar-cta" to="/jobs">
            <span>Discover opportunities</span>
            <strong>Find your next role</strong>
            <small>Browse verified jobs and flexible gigs.</small>
          </Link>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-topbar">
            <div>
              <p className="dashboard-kicker">Job Seeker</p>
              <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            </div>
            <button type="button" className="dashboard-secondary-btn" onClick={loadDashboard} disabled={loading}>
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>

          {notice.message && (
            <div className={`dashboard-notice ${notice.type === 'error' ? 'is-error' : 'is-success'}`}>
              {notice.message}
            </div>
          )}

          {activeTab === 'overview' && (
            <section className="dashboard-section">
              <div className="dashboard-stat-grid">
                <div className="dashboard-stat-card">
                  <span>Applications</span>
                  <strong>{appliedCount}</strong>
                </div>
                <div className="dashboard-stat-card">
                  <span>Saved</span>
                  <strong>{savedCount}</strong>
                </div>
                <button
                  type="button"
                  className="dashboard-stat-card dashboard-offers-trigger"
                  onClick={openOffers}
                  aria-haspopup="dialog"
                >
                  <span>Offers</span>
                  <strong>{offerCount}</strong>
                  <small>View offers</small>
                </button>
                <div className="dashboard-stat-card">
                  <span>Unread</span>
                  <strong>{unreadCount}</strong>
                </div>
              </div>

              <div className="dashboard-two-column">
                <div className="dashboard-panel">
                  <h2>Recent Applications</h2>
                  <ApplicationList applications={allApplications.slice(0, 3)} onTrack={trackApplication} onMessage={messageEmployer} compact />
                </div>
                <div className="dashboard-panel">
                  <h2>Recent Chats</h2>
                  <ChatList chats={chats.slice(0, 4)} onSelect={loadMessages} activeChat={activeChat} />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'saved' && (
            <section className="dashboard-section">
              <div className="dashboard-list">
                {savedJobs.length === 0 ? (
                  <EmptyState title="No saved jobs yet" text="Jobs you save will appear here." />
                ) : savedJobs.map((job) => (
                  <div className="dashboard-job-row dashboard-saved-row" key={`${job.source}-${job.id}`}>
                    <div className="dashboard-saved-copy">
                      <span className="dashboard-pill">{job.source === 'gig' ? 'Gig' : 'Job'}</span>
                      <h3>{job.title}</h3>
                      <p>{job.company} | {job.location}</p>
                    </div>
                    <div className="dashboard-row-actions">
                      <span className="dashboard-saved-pay">{job.salary}</span>
                      <div className="dashboard-saved-actions">
                        <Link className="dashboard-secondary-btn" to={`/jobs/${job.id}${job.source === 'gig' ? '?source=gig' : ''}`}>View</Link>
                        <button
                          type="button"
                          className="dashboard-secondary-btn"
                          onClick={() => removeSavedJob(job)}
                          disabled={removingSavedKey === `${job.source}-${job.id}`}
                        >
                          {removingSavedKey === `${job.source}-${job.id}` ? 'Removing' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'applications' && (
            <section className="dashboard-section dashboard-application-layout">
              <div className="dashboard-panel">
                <h2>Applied Jobs</h2>
                <ApplicationList applications={allApplications} onTrack={trackApplication} onMessage={messageEmployer} />
              </div>
              <TrackingPanel tracking={tracking} />
            </section>
          )}

          {activeTab === 'messages' && (
            <section className="dashboard-section dashboard-message-layout">
              <aside className="dashboard-chat-sidebar">
                <div className="dashboard-start-chat">
                  <input
                    type="number"
                    placeholder="User id"
                    value={newChatUserId}
                    onChange={(event) => setNewChatUserId(event.target.value)}
                  />
                  <button type="button" onClick={startChat}>Start</button>
                </div>
                <ChatList chats={chats} onSelect={loadMessages} activeChat={activeChat} />
              </aside>
              <div className="dashboard-chat-window">
                {activeChat ? (
                  <>
                    <div className="dashboard-chat-header">
                      <strong>{activeChat.user.full_name || `User #${activeChat.user.id}`}</strong>
                      <span>{activeChat.user.role || 'user'}</span>
                    </div>
                    <div className="dashboard-message-stream" onScroll={handleScroll}>
                      {messageLoading && messages.length === 0 ? (
                        <EmptyState title="Loading messages" text="Please wait." />
                      ) : messages.length === 0 ? (
                        <EmptyState title="No messages yet" text="Send the first message." />
                      ) : (
                        <>
                          {messageLoading && <div className="dashboard-loading-more">Loading older messages...</div>}
                          {messages.map((message) => (
                            <div
                              className={`dashboard-message-bubble ${Number(message.sender_id) === Number(currentUserId) ? 'is-mine' : ''}`}
                              key={message.id}
                            >
                              <ChatAttachment message={message} />
                              {message.message && <p>{message.message}</p>}
                              <span>{formatDate(message.sent_at || message.created_at)}</span>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                    <div className="dashboard-message-compose">
                      <input
                        ref={attachmentInputRef}
                        className="dashboard-file-input"
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif"
                        onChange={selectMessageFile}
                      />
                      <button
                        type="button"
                        className="dashboard-attach-btn"
                        title="Attach a PDF or file"
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        Attach
                      </button>
                      <input
                        type="text"
                        placeholder="Type a message"
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') sendMessage();
                        }}
                      />
                      <button
                        type="button"
                        disabled={(!messageText.trim() && !messageFile) || messageSending}
                        onClick={sendMessage}
                      >
                        {messageSending ? 'Sending...' : 'Send'}
                      </button>
                      {messageFile && (
                        <div className="dashboard-selected-file">
                          <span>{messageFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMessageFile(null);
                              if (attachmentInputRef.current) attachmentInputRef.current.value = '';
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState title="Select a chat" text="Choose a conversation or start one by user id." />
                )}
              </div>
            </section>
          )}

          {activeTab === 'experience' && <ExperienceTab />}
          {activeTab === 'projects' && <ProjectsTab />}

          {activeTab === 'profile-view' && (
            <section className="dashboard-section dashboard-profile-view">
              <div className="dashboard-profile-hero">
                <div className="dashboard-profile-hero-avatar">
                  {profileAvatarUrl && (
                    <img
                      src={profileAvatarUrl}
                      alt={`${profile?.full_name || 'Job seeker'} profile`}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        event.currentTarget.nextElementSibling?.classList.remove('is-hidden');
                      }}
                    />
                  )}
                  <span className={profileAvatarUrl ? 'is-hidden' : ''}>
                    {(profile?.full_name || 'J').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="dashboard-profile-hero-copy">
                  <p className="dashboard-profile-eyebrow">Professional profile</p>
                  <h2>{profile?.full_name || 'Job seeker'}</h2>
                  <p className="dashboard-profile-headline">
                    {seekerProfile.headline || 'Add a professional headline to stand out'}
                  </p>
                  <div className="dashboard-profile-meta">
                    {seekerProfile.job_role?.name && <span>{seekerProfile.job_role.name}</span>}
                    {seekerProfile.experience_years && (
                      <span>{seekerProfile.experience_years} years experience</span>
                    )}
                    {seekerProfile.city?.name && <span>{seekerProfile.city.name}</span>}
                  </div>
                  <div className="dashboard-profile-actions">
                    <Link className="dashboard-primary-btn" to="/my-profile/edit">Edit profile</Link>
                    {profileResumeUrl && (
                      <a className="dashboard-secondary-btn" href={profileResumeUrl} target="_blank" rel="noreferrer">
                        View resume
                      </a>
                    )}
                  </div>
                </div>
                <div className="dashboard-profile-strength">
                  <div>
                    <span>Profile strength</span>
                    <strong>{profileCompletion}%</strong>
                  </div>
                  <div
                    className="dashboard-profile-strength-bar"
                    role="progressbar"
                    aria-label="Profile completion"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={profileCompletion}
                  >
                    <span style={{ width: `${profileCompletion}%` }} />
                  </div>
                  <p>
                    {profileCompletion === 100
                      ? 'Your profile is ready for employers.'
                      : 'Complete your profile to improve visibility.'}
                  </p>
                </div>
              </div>

              <div className="dashboard-profile-layout">
                <div className="dashboard-profile-main">
                  <section className="dashboard-profile-card">
                    <div className="dashboard-profile-card-head">
                      <div>
                        <span>Introduction</span>
                        <h3>About me</h3>
                      </div>
                    </div>
                    <p className="dashboard-profile-about">
                      {seekerProfile.bio || 'Tell employers about your experience, strengths, and career goals.'}
                    </p>
                  </section>

                  <section className="dashboard-profile-card">
                    <div className="dashboard-profile-card-head">
                      <div>
                        <span>Career</span>
                        <h3>Professional preferences</h3>
                      </div>
                    </div>
                    <div className="dashboard-profile-detail-grid">
                      <ProfileDetail label="Industry" value={seekerProfile.industry?.name} />
                      <ProfileDetail label="Job category" value={seekerProfile.job_category?.name} />
                      <ProfileDetail label="Preferred role" value={seekerProfile.job_role?.name} />
                      <ProfileDetail label="Experience" value={seekerProfile.experience_years ? `${seekerProfile.experience_years} years` : ''} />
                      <ProfileDetail label="Job type" value={seekerProfile.job_type?.name} />
                      <ProfileDetail label="Preferred shift" value={seekerProfile.job_shift?.name} />
                      <ProfileDetail
                        label="Expected salary"
                        value={formatProfileAmount(seekerProfile.expected_salary)}
                      />
                      <ProfileDetail label="Current location" value={profileLocation} wide />
                    </div>
                  </section>

                  <section className="dashboard-profile-card">
                    <div className="dashboard-profile-card-head">
                      <div>
                        <span>Expertise</span>
                        <h3>Skills</h3>
                      </div>
                      <small>{profileSkills.length} listed</small>
                    </div>
                    {profileSkills.length > 0 ? (
                      <div className="dashboard-profile-skills">
                        {profileSkills.map((skill) => <span key={skill}>{skill}</span>)}
                      </div>
                    ) : (
                      <p className="dashboard-profile-muted">No skills added yet.</p>
                    )}
                  </section>
                </div>

                <aside className="dashboard-profile-aside">
                  <section className="dashboard-profile-card">
                    <div className="dashboard-profile-card-head">
                      <div>
                        <span>Reach me</span>
                        <h3>Contact</h3>
                      </div>
                    </div>
                    <div className="dashboard-profile-contact-list">
                      <div>
                        <span>Email</span>
                        {profile?.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : <strong>Not provided</strong>}
                      </div>
                      <div>
                        <span>Phone</span>
                        {profile?.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : <strong>Not provided</strong>}
                      </div>
                      <div>
                        <span>Location</span>
                        <strong>{profileLocation || 'Not provided'}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="dashboard-profile-card">
                    <div className="dashboard-profile-card-head">
                      <div>
                        <span>Background</span>
                        <h3>Education</h3>
                      </div>
                    </div>
                    <div className="dashboard-profile-detail-stack">
                      <ProfileDetail label="Qualification" value={seekerProfile.qualification?.name} />
                      <ProfileDetail label="Specialization" value={seekerProfile.course_specialization?.name} />
                    </div>
                  </section>

                  <section className="dashboard-profile-card dashboard-profile-document-card">
                    <div className="dashboard-profile-document-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M7 3h7l4 4v14H7z" />
                        <path d="M14 3v5h5M10 13h5M10 17h5" />
                      </svg>
                    </div>
                    <div>
                      <span>Resume</span>
                      <strong>{profileResumeUrl ? 'Resume uploaded' : 'No resume uploaded'}</strong>
                    </div>
                    {profileResumeUrl ? (
                      <a href={profileResumeUrl} target="_blank" rel="noreferrer">Open</a>
                    ) : (
                      <Link to="/my-profile/edit">Add resume</Link>
                    )}
                  </section>

                  <section className="dashboard-profile-wallet">
                    <span>Wallet balance</span>
                    <strong>
                      {profile?.wallet
                        ? formatProfileAmount(profile.wallet.balance, profile.wallet.currency || 'INR')
                        : 'INR 0'}
                    </strong>
                  </section>
                </aside>
              </div>
            </section>
          )}

          {activeTab === 'profile-edit' && (
            <section className="dashboard-section">
              <div className="dashboard-panel dashboard-profile-page-panel">
                <div className="dashboard-panel-title-row">
                  <h2>Edit Profile</h2>
                  <Link className="dashboard-secondary-btn" to="/my-profile">View Profile</Link>
                </div>
                <form className="dashboard-profile-form" onSubmit={updateProfile}>
                  <label><span>Full Name</span><input required value={profileForm.full_name} onChange={(event) => updateProfileField('full_name', event.target.value)} placeholder="Full name" /></label>
                  <label><span>Email</span><input type="email" value={profileForm.email} onChange={(event) => updateProfileField('email', event.target.value)} placeholder="Email" /></label>
                  <div className="dashboard-avatar-upload">
                    <div className="dashboard-avatar-preview">
                      {editAvatarUrl && (
                        <img
                          src={editAvatarUrl}
                          alt="Profile preview"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                            event.currentTarget.nextElementSibling?.classList.remove('is-hidden');
                          }}
                        />
                      )}
                      <span className={editAvatarUrl ? 'is-hidden' : ''}>
                        {(profileForm.full_name || profile?.full_name || 'J').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="dashboard-avatar-upload-copy">
                      <span>Profile photo</span>
                      <strong>Upload a clear profile image</strong>
                      <p>JPG, PNG, WEBP, or GIF. Maximum file size 5MB.</p>
                      <input
                        ref={avatarInputRef}
                        className="dashboard-avatar-file-input"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                        onChange={selectAvatarFile}
                      />
                      <div className="dashboard-avatar-upload-actions">
                        <button
                          type="button"
                          className="dashboard-secondary-btn"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          {avatarFile ? 'Change image' : 'Choose image'}
                        </button>
                        {avatarFile && (
                          <>
                            <small title={avatarFile.name}>{avatarFile.name}</small>
                            <button type="button" className="dashboard-avatar-remove" onClick={clearAvatarSelection}>
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <label><span>Headline</span><input value={profileForm.headline} onChange={(event) => updateProfileField('headline', event.target.value)} placeholder="Headline" /></label>
                  <label><span>Bio</span><textarea value={profileForm.bio} onChange={(event) => updateProfileField('bio', event.target.value)} placeholder="Bio" rows="4" /></label>
                  <label><span>Experience Years</span><input type="number" min="0" step="0.1" value={profileForm.experience_years} onChange={(event) => updateProfileField('experience_years', event.target.value)} placeholder="Experience years" /></label>
                  <div className="dashboard-location-fields">
                    <label>
                      <span>Country</span>
                      <Select
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder="Select Country"
                        isClearable
                        options={profileCountries.map(c => ({ value: c.id, label: c.name }))}
                        value={profileForm.current_country_id ? { value: profileForm.current_country_id, label: profileCountries.find(c => c.id == profileForm.current_country_id)?.name || '' } : null}
                        onChange={option => updateProfileField('current_country_id', option ? option.value : '')}
                      />
                    </label>

                    <label>
                      <span>State</span>
                      <Select
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder="Select State"
                        isClearable
                        isDisabled={!profileForm.current_country_id}
                        options={profileStates.map(c => ({ value: c.id, label: c.name }))}
                        value={profileForm.current_state_id ? { value: profileForm.current_state_id, label: profileStates.find(c => c.id == profileForm.current_state_id)?.name || '' } : null}
                        onChange={option => updateProfileField('current_state_id', option ? option.value : '')}
                      />
                    </label>

                    <label>
                      <span>City</span>
                      <Select
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder="Select City"
                        isClearable
                        isDisabled={!profileForm.current_state_id}
                        options={profileCities.map(c => ({ value: c.id, label: c.name }))}
                        value={profileForm.current_city_id ? { value: profileForm.current_city_id, label: profileCities.find(c => c.id == profileForm.current_city_id)?.name || '' } : null}
                        onChange={option => updateProfileField('current_city_id', option ? option.value : '')}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Exact Location</span>
                    <div className="dashboard-location-input-row">
                      <input value={profileForm.exact_location} onChange={(event) => updateProfileField('exact_location', event.target.value)} placeholder="Area, street, landmark, pincode" />
                      <button type="button" className="dashboard-secondary-btn" onClick={fetchProfileCurrentLocation} disabled={locatingProfile}>
                        {locatingProfile ? 'Fetching' : 'Use Current'}
                      </button>
                    </div>
                  </label>
                  <div className="dashboard-coordinate-row">
                    <label><span>Latitude</span><input type="number" min="-90" max="90" step="any" value={profileForm.latitude} onChange={(event) => updateProfileField('latitude', event.target.value)} placeholder="Auto-filled" /></label>
                    <label><span>Longitude</span><input type="number" min="-180" max="180" step="any" value={profileForm.longitude} onChange={(event) => updateProfileField('longitude', event.target.value)} placeholder="Auto-filled" /></label>
                  </div>
                  <label><span>Expected Salary</span><input type="number" min="0" step="0.01" value={profileForm.expected_salary} onChange={(event) => updateProfileField('expected_salary', event.target.value)} placeholder="Expected salary" /></label>
                  <label>
                    <span>Resume</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={selectResumeFile}
                    />
                    <small>
                      {resumeFile?.name || (profileForm.resume_path ? 'Current resume is already uploaded.' : 'PDF, DOC, or DOCX up to 10MB.')}
                    </small>
                    {profileResumeUrl && <a href={profileResumeUrl} target="_blank" rel="noreferrer">View current resume</a>}
                  </label>

                  <label>
                    <span>Industry</span>
                    <select value={profileForm.industry_id} onChange={(event) => updateProfileField('industry_id', event.target.value)}>
                      <option value="">Select Industry</option>
                      {industries.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Job Category</span>
                    <select value={profileForm.job_category_id} onChange={(event) => updateProfileField('job_category_id', event.target.value)} disabled={!profileForm.industry_id}>
                      <option value="">Select Job Category</option>
                      {jobCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Job Role</span>
                    <select value={profileForm.job_role_id} onChange={(event) => updateProfileField('job_role_id', event.target.value)} disabled={!profileForm.job_category_id}>
                      <option value="">Select Job Role</option>
                      {jobRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Qualification</span>
                    <select value={profileForm.qualification_id} onChange={(event) => updateProfileField('qualification_id', event.target.value)}>
                      <option value="">Select Qualification</option>
                      {qualifications.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Course/Specialization</span>
                    <select value={profileForm.course_specialization_id} onChange={(event) => updateProfileField('course_specialization_id', event.target.value)} disabled={!profileForm.qualification_id}>
                      <option value="">Select Course/Specialization</option>
                      {courseSpecializations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Job Type</span>
                    <select value={profileForm.job_type_id} onChange={(event) => updateProfileField('job_type_id', event.target.value)}>
                      <option value="">Select Job Type</option>
                      {jobTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Job Shift</span>
                    <select value={profileForm.job_shift_id} onChange={(event) => updateProfileField('job_shift_id', event.target.value)}>
                      <option value="">Select Job Shift</option>
                      {jobShifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Skills</span>
                    <input
                      value={profileForm.skills}
                      onChange={(event) => updateProfileField('skills', event.target.value)}
                      placeholder="MySQL, Communication, Data structure"
                    />
                  </label>

                  {allSkills.length > 0 && (
                    <div className="dashboard-skill-picker" aria-label="Available skills">
                      {allSkills.map((skill) => (
                        <button
                          key={skill.id || skill.name}
                          type="button"
                          className={selectedSkillKeys.has(String(skill.name).toLowerCase()) ? 'is-selected' : ''}
                          onClick={() => toggleProfileSkill(skill.name)}
                        >
                          {skill.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <button type="submit" className="dashboard-primary-btn" disabled={savingProfile}>
                    {savingProfile ? 'Saving' : 'Save Profile'}
                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>

      {offersOpen && (
        <div
          className="dashboard-offers-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOffers();
          }}
        >
          <aside
            className="dashboard-offers-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-offers-title"
          >
            <header>
              <div>
                <p>New opportunities</p>
                <h2 id="dashboard-offers-title">Offers</h2>
              </div>
              <button type="button" onClick={closeOffers} aria-label="Close offers">×</button>
            </header>

            <div className="dashboard-offers-body">
              {offersLoading ? (
                <div className="dashboard-offers-message" role="status">Loading offers…</div>
              ) : offersError ? (
                <div className="dashboard-offers-message is-error" role="alert">
                  <p>{offersError}</p>
                  <button type="button" onClick={openOffers}>Try again</button>
                </div>
              ) : offers.length === 0 ? (
                <div className="dashboard-offers-message">
                  <strong>No offers yet</strong>
                  <p>Offers from employers will appear here.</p>
                </div>
              ) : (
                offers.map((offer) => (
                  <article className="dashboard-offer-card" key={`${offer.source}-${offer.application_id}`}>
                    <div className="dashboard-offer-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <rect x="4" y="7" width="16" height="13" rx="2" />
                        <path d="M9 7V5a3 3 0 0 1 6 0v2M4 12h16" />
                      </svg>
                    </div>
                    <div className="dashboard-offer-copy">
                      <span>{offer.source_label}</span>
                      <h3>{offer.job?.title || 'Job offer'}</h3>
                      <p>{offer.job?.company?.name || 'Employer'}</p>
                    </div>
                    <div className="dashboard-offer-footer">
                      <small>Offered on {formatDate(offer.offered_at)}</small>
                      <Link
                        to={`/jobs/${offer.job?.id}${offer.source === 'gig' ? '?source=gig' : ''}`}
                        onClick={closeOffers}
                      >
                        View details
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ title, text }) => (
  <div className="dashboard-empty">
    <strong>{title}</strong>
    <p>{text}</p>
  </div>
);

const ChatList = ({ chats, onSelect, activeChat }) => (
  <div className="dashboard-chat-list">
    {chats.length === 0 ? (
      <EmptyState title="No chats yet" text="Conversations will appear here." />
    ) : chats.map((chat) => (
      <button
        type="button"
        className={`dashboard-chat-item ${activeChat?.user?.id === chat.user.id ? 'is-active' : ''}`}
        key={chat.user.id}
        onClick={() => onSelect(chat)}
      >
        <div className="dashboard-chat-avatar">
          {(chat.user.full_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <strong>{chat.user.full_name || `User #${chat.user.id}`}</strong>
          <span>{chat.last_message?.message || chat.last_message?.attachment_name || 'No messages yet'}</span>
        </div>
        {chat.unread_count > 0 && <em>{chat.unread_count}</em>}
      </button>
    ))}
  </div>
);

const ApplicationList = ({ applications, onTrack, onMessage, compact = false }) => (
  <div className="dashboard-list">
    {applications.length === 0 ? (
      <EmptyState title="No applications yet" text="Your applied jobs will appear here." />
    ) : applications.map((application) => (
      <div className="dashboard-job-row" key={`${application.source}-${application.id}`}>
        <div>
          <span className="dashboard-pill">{application.sourceLabel}</span>
          <h3>{application.title}</h3>
          <p>{application.company} | {application.location}</p>
          {!compact && <small>Applied on {formatDate(application.appliedAt)}</small>}
        </div>
        <div className="dashboard-row-actions">
          <span className={`dashboard-status status-${application.status}`}>{application.status}</span>
          {onMessage && (
            <button
              type="button"
              className="dashboard-secondary-btn"
              onClick={() => onMessage(application)}
              disabled={!application.employerUserId}
            >
              Message
            </button>
          )}
          <button type="button" className="dashboard-secondary-btn" onClick={() => onTrack(application)}>Track</button>
        </div>
      </div>
    ))}
  </div>
);

const TrackingPanel = ({ tracking }) => (
  <aside className="dashboard-panel dashboard-tracking-panel">
    <h2>Track Application</h2>
    {!tracking ? (
      <EmptyState title="No application selected" text="Choose Track on an applied job." />
    ) : (
      <>
        <div className="dashboard-tracking-head">
          <span className="dashboard-pill">{tracking.source === 'gig' ? 'Gig' : 'Job'}</span>
          <h3>{tracking.gig_job?.title || tracking.job?.title || 'Application'}</h3>
          <p>{tracking.message}</p>
          <strong>{tracking.progress_percent}% complete</strong>
        </div>
        <div className="dashboard-progress">
          <span style={{ width: `${tracking.progress_percent || 0}%` }} />
        </div>
        <div className="dashboard-steps">
          {(tracking.steps || []).map((step) => (
            <div className={stepClassName(step.state)} key={step.code}>
              <span />
              <p>{step.label}</p>
            </div>
          ))}
        </div>
        {tracking.interview && (
          <div className="dashboard-interview">
            <strong>Interview</strong>
            <p>{formatDate(tracking.interview.scheduled_at)}</p>
            <a href={tracking.interview.meeting_link} target="_blank" rel="noreferrer">Open meeting link</a>
          </div>
        )}
      </>
    )}
  </aside>
);

const ProfileDetail = ({ label, value, wide = false }) => (
  <div className={`dashboard-profile-detail ${wide ? 'is-wide' : ''}`}>
    <span>{label}</span>
    <strong>{value || 'Not set'}</strong>
  </div>
);

export default JobSeekerDashboard;
