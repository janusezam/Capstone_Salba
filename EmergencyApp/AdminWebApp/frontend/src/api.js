import axios from "axios";

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://salba-backend-zam-4f45f4b26eb0.herokuapp.com");

export const API_BASE_URL = `${BACKEND_URL}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
