import { BASE_URL } from "../config/api";

export const registerUser = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ Register Error:", error);
    throw error;
  }
};

export const loginUser = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ Login Error:", error);
    throw error;
  }
};
