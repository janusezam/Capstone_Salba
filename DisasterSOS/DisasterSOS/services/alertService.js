import { BASE_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

console.log('Sending to:', `${BASE_URL}/api/alerts`);

export const sendAlert = async (data) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const payload = {
      ...data,
      clientRequestId: data.clientRequestId || `sos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    console.log('📱 [sendAlert] Data being sent:', {
      type: payload.type,
      userName: payload.userName,
      userPhone: payload.userPhone,
      latitude: payload.latitude,
      longitude: payload.longitude,
      locationName: payload.locationName,
      clientRequestId: payload.clientRequestId,
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`${BASE_URL}/api/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

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
