import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./context/ThemeContext";
import AdminPanel from "./pages/AdminPanel";
import UserPanel from "./pages/UserPanel";
import RescuerPanel from "./pages/RescuerPanel";
import SitrepPage from "./pages/SitrepPage";
import TermsAndConditions from "./pages/TermsAndConditions";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import "./App.css";
import "leaflet/dist/leaflet.css";
import './index.css';

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn("REACT_APP_GOOGLE_CLIENT_ID not configured in environment variables");
  }

  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={googleClientId || ""}>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/rescuer" element={<RescuerPanel />} />
            <Route path="/user" element={<UserPanel />} />
            <Route path="/sitrep/:reportId" element={<SitrepPage />} />
          </Routes>
        </Router>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

export default App;
