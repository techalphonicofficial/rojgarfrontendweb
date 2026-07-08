export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const AUTH_TOKEN_KEY = 'rozgaarsetu_token';
const LEGACY_AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'rozgaarsetu_user';

export const AUTH_CHANGE_EVENT = 'rozgaarsetu-auth-change';

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export async function apiRequest(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }

  return data;
}

export function resolveAssetUrl(value, fallbackFolder = '/uploads/company-logos') {
  if (!value || typeof value !== 'string') return '';

  const assetPath = value.trim();
  if (!assetPath) return '';
  if (/^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:')) return assetPath;

  const normalizedPath = assetPath.startsWith('/')
    ? assetPath
    : `${fallbackFolder}/${assetPath}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

export function getAuthToken() {
  const storage = getStorage();
  return storage?.getItem(AUTH_TOKEN_KEY) || storage?.getItem(LEGACY_AUTH_TOKEN_KEY) || '';
}

export function getStoredUser() {
  const storage = getStorage();

  try {
    return JSON.parse(storage?.getItem(AUTH_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getAuthSession() {
  return {
    token: getAuthToken(),
    user: getStoredUser()
  };
}

export async function authApiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Please login to continue.');
  }

  return apiRequest(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

export async function optionalAuthApiRequest(path, options = {}) {
  const token = getAuthToken();

  return apiRequest(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
}

export function getPages(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return apiRequest(`/api/pages${queryString ? `?${queryString}` : ''}`);
}

export function getPageById(pageId) {
  return apiRequest(`/api/pages/${pageId}`);
}

export function getPageBySlug(slug) {
  return apiRequest(`/api/pages/slug/${slug}`);
}

export function getPageDetails(pageId, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return apiRequest(`/api/pages/${pageId}/details${queryString ? `?${queryString}` : ''}`);
}

export function storeAuthSession(data = {}) {
  const storage = getStorage();
  if (!storage) return getAuthSession();

  const token = data.token || data.access_token || data.accessToken || data.data?.token;
  const user = data.user || data.data?.user;

  if (token) {
    storage.setItem(AUTH_TOKEN_KEY, token);
    storage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
  }

  if (user) {
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  notifyAuthChange();
  return getAuthSession();
}

export function clearAuthSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  storage.removeItem(AUTH_USER_KEY);
  notifyAuthChange();
}

// Fetch applicants with optional filters
export function getJobApplicants({ status, job_id } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (job_id) params.append('job_id', job_id);
  const query = params.toString();
  return authApiRequest(`/api/jobs/applicants${query ? `?${query}` : ''}`);
}

export function getJobSeekerOffers() {
  return authApiRequest('/api/jobs/offers');
}

// Update application status (shortlist/reject/offer)
export function updateApplicationStatus(applicationId, payload) {
  return authApiRequest(`/api/jobs/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Fetch the authenticated employer's gig jobs.
export function getEmployerGigJobs({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const query = params.toString();
  return authApiRequest(`/api/gig-jobs/employer${query ? `?${query}` : ''}`);
}

export function createGigJob(payload) {
  return authApiRequest('/api/gig-jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateGigJob(gigJobId, payload) {
  return authApiRequest(`/api/gig-jobs/${gigJobId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function updateJob(jobId, payload) {
  return authApiRequest(`/api/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Fetch gig applicants with optional employer-side filters.
export function getGigJobApplicants({ status, gig_job_id } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (gig_job_id) params.append('gig_job_id', gig_job_id);
  const query = params.toString();
  return authApiRequest(`/api/gig-jobs/applicants${query ? `?${query}` : ''}`);
}

// Shortlist/reject/offer a gig application and optionally schedule its interview.
export function updateGigApplicationStatus(applicationId, payload) {
  return authApiRequest(`/api/gig-jobs/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getNotifications({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return authApiRequest(`/api/notifications?${params.toString()}`);
}

export function getUnreadNotificationCount() {
  return authApiRequest('/api/notifications/unread-count');
}

export function markNotificationRead(notificationId) {
  return authApiRequest(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return authApiRequest('/api/notifications/read-all', {
    method: 'PATCH',
  });
}
