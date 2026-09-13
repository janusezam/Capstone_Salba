import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  // Use explicit env override when provided (useful for production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback to web localhost if on web
  if (Platform.OS === 'web') {
    return 'https://salba-backend-zam-4f45f4b26eb0.herokuapp.com';
  }

  // Extract host IP from the Expo packager's address if running in Expo Go
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }

  // Standalone APK / Production fallback
  return 'https://salba-backend-zam-4f45f4b26eb0.herokuapp.com';
};

export const BASE_URL = getApiBaseUrl();