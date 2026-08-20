import { BASE_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

console.log('Sending to:', `${BASE_URL}/api/alerts`);

export const sendAlert = async (data) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    console.log('📱 [sendAlert] Data being sent:', {
      type: data.type,
      userName: data.userName,
      userPhone: data.userPhone,
      latitude: data.latitude,
      longitude: data.longitude,
      locationName: data.locationName,
    });
    const response = await fetch(`${BASE_URL}/api/alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to send alert: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in sendAlert:", error);
    throw error;
  }
};

export const getMyReports = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const response = await fetch(`${BASE_URL}/api/alerts/my-reports`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in getMyReports:", error);
    throw error;
  }
};
