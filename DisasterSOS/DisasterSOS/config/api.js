import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  // Use explicit env override when provided (useful for production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback to web localhost if on web
  if (Platform.OS === 'web') {
    return 'http://localhost:5002';
  }

  // Extract host IP (e.g., "10.0.0.46") from the Expo packager's address
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  const ip = hostUri ? hostUri.split(':')[0] : '10.0.0.46'; // fallback to last known IP
  return `http://${ip}:5002`;
};

export const BASE_URL = getApiBaseUrl();