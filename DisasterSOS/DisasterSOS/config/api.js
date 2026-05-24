import { Platform } from 'react-native';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

// Use explicit env override when provided, otherwise default to DisasterSOS backend (port 5002).
export const BASE_URL = ENV_API_URL || (Platform.OS === 'web' ? 'http://localhost:5002' : 'http://10.40.31.211:5002');