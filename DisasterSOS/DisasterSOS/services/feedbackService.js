import { BASE_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const submitFeedback = async ({ message, category = "general" }) => {
  const token = await AsyncStorage.getItem("userToken");

  const response = await fetch(`${BASE_URL}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, category }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to send feedback");
  }

  return data;
};

export const getAdminFeedbackList = async () => {
  const token = await AsyncStorage.getItem("userToken");

  const response = await fetch(`${BASE_URL}/api/feedback`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch feedback list");
  }

  return data;
};

export const markFeedbackAsRead = async (feedbackId) => {
  const token = await AsyncStorage.getItem("userToken");

  const response = await fetch(`${BASE_URL}/api/feedback/${feedbackId}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to mark feedback as read");
  }

  return data;
};
