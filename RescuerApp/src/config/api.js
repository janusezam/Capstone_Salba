import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  // Extract host IP (e.g., "10.0.0.35") from the Expo packager's address
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  const ip = hostUri ? hostUri.split(':')[0] : '10.0.0.35'; // fallback to last known IP
  return `http://${ip}:5000`;
};

const API_BASE_URL = getApiBaseUrl(); 

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
export const REQUEST_TIMEOUT = 5000; // 5 second timeout

// Helper function to get auth headers
export const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

// Fetch with timeout
export const fetchWithTimeout = (url, options = {}, timeout = REQUEST_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};

// API endpoints
export const endpoints = {
  // Auth
  login: `${API_URL}/auth/login`,
  register: `${API_URL}/auth/register`,
  profile: `${API_URL}/auth/profile`,
  
  // Rescuer
  pushToken: `${API_URL}/rescue/push-token`,
  myTeam: `${API_URL}/rescue/my-team`,
  myMission: `${API_URL}/rescue/my-mission`,
  myMissionStatus: `${API_URL}/rescue/my-mission/status`,
  missions: `${API_URL}/rescue/missions`, // Paginated list of missions
  notifications: `${API_URL}/rescue/notifications`,
  markRead: (id) => `${API_URL}/rescue/notifications/${id}/read`,
  markAllRead: `${API_URL}/rescue/notifications/read-all`,
  status: `${API_URL}/rescue/status`,
  
  // Teams
  teams: `${API_URL}/teams`,
  
  // Routes
  route: `${API_URL}/route`,
};
