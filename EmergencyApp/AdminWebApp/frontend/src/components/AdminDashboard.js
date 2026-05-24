import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import API from "../api";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { AlertCircle, CheckCircle, Clock, TrendingUp, Activity, Truck, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Sidebar from "./Sidebar";
import { Header } from "./layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import RescueMap from "./RescueMap";

const DefaultIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const FIRE_HYDRANTS = [
  { id: 'FH-001', name: 'Fire Hydrant 1', lat: 8.158771, lng: 125.123458 },
  { id: 'FH-002', name: 'Fire Hydrant 2', lat: 8.155131, lng: 125.127794 },
];

const fireHydrantIcon = L.icon({
  iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="#2563eb" stroke="#ffffff" stroke-width="2"/><text x="13" y="17" text-anchor="middle" font-size="12" font-family="Arial" font-weight="700" fill="#ffffff">H</text></svg>')}`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -12],
  className: 'hydrant-marker',
});

const isFireIncident = (disasterType) => {
  const text = String(disasterType || '').toLowerCase();
  return text.includes('fire') || text.includes('sunog');
};

const toRadians = (value) => (value * Math.PI) / 180;

const haversineDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const findNearestHydrant = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || FIRE_HYDRANTS.length === 0) {
    return null;
  }

  let nearest = null;
  for (const hydrant of FIRE_HYDRANTS) {
    const distanceMeters = haversineDistanceMeters(lat, lng, hydrant.lat, hydrant.lng);
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { hydrant, distanceMeters };
    }
  }

  return nearest;
};

// Utility function to capitalize first letter of each word (Title Case)
const toTitleCase = (str) => {
  if (!str) return "N/A";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper to convert status values to display format
const getStatusDisplay = (status) => {
  const statusMap = {
    'new': 'New',
    'pending': 'Pending',
    'acknowledged': 'Acknowledged',
    'in_progress': 'In Progress',
    'on_the_way': 'On The Way',
    'ongoing': 'Ongoing',
    'resolved': 'Resolved',
    'declined': 'Declined'
  };
  return statusMap[String(status || '').toLowerCase()] || toTitleCase(status);
};

const TEST_REPORT_REGEX = /\b(test|testing|prank|dummy|sample|drill|simulation|simulated|mock|trial)\b/i;

const isForceTestModeEnabled = () => {
  if (typeof window === 'undefined') return false;
  const explicitForce = window.localStorage?.getItem('force_test_reports') === '1';

  return explicitForce;
};

const isLikelyTestReport = (alert) => {
  if (isForceTestModeEnabled()) return true;

  const content = [
    alert?.note,
    alert?.description,
    alert?.details,
    alert?.message,
    alert?.disasterType,
    alert?.locationName,
    alert?.location
  ]
    .filter(Boolean)
    .join(' ');

  return TEST_REPORT_REGEX.test(String(content));
};

const getAlertConfidence = (alert) => {
  if (isLikelyTestReport(alert)) return 0.18;

  const ml = alert?.mlPredictions;
  if (typeof ml?.overall?.confidence === 'number') return ml.overall.confidence;
  if (typeof ml?.legitimacyConfidence === 'number') return ml.legitimacyConfidence;
  // Fallback while ML is still processing. Use stable per-report variance to avoid fixed-looking values.
  const source = String(alert?._id || alert?.createdAt || alert?.note || 'seed');
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  const severity = String(alert?.severity || '').toLowerCase();
  const base = severity === 'critical' ? 0.72 : severity === 'high' ? 0.68 : (severity === 'medium' || severity === 'moderate') ? 0.64 : 0.6;
  const variance = (((Math.abs(hash) % 9) - 4) / 100); // -0.04 .. +0.04
  return Math.max(0.5, Math.min(0.9, base + variance));
};

const getHotspotSummary = (alert, contextReports = []) => {
  const alertLat = Number(alert?.lat);
  const alertLng = Number(alert?.lng);
  const locationLabel = alert?.locationName || alert?.location || 'Unknown location';

  const hazardZones = Array.isArray(alert?.hazardZones) ? alert.hazardZones : [];
  const hasHighRiskHazard = hazardZones.some((zone) => String(zone?.riskLevel || '').toUpperCase() === 'HIGH');

  if (!Number.isFinite(alertLat) || !Number.isFinite(alertLng)) {
    if (hasHighRiskHazard) {
      return `• Location Intelligence: ${locationLabel} is treated as a hotspot due to high-risk hazard-zone data.`;
    }
    return `• Location Intelligence: Hotspot analysis unavailable for ${locationLabel} because precise coordinates are missing.`;
  }

  const nearbyActiveIncidents = (contextReports || []).filter((entry) => {
    if (!entry || String(entry._id) === String(alert?._id)) return false;
    const status = String(entry.status || '').toLowerCase();
    if (['resolved', 'declined', 'done', 'completed'].includes(status)) return false;

    const entryLat = Number(entry.lat);
    const entryLng = Number(entry.lng);
    if (!Number.isFinite(entryLat) || !Number.isFinite(entryLng)) return false;

    return haversineDistanceMeters(alertLat, alertLng, entryLat, entryLng) <= 800;
  }).length;

  if (hasHighRiskHazard || nearbyActiveIncidents >= 3) {
    return `• Location Intelligence: ${locationLabel} is a hotspot area (${nearbyActiveIncidents} nearby active incidents within 800m${hasHighRiskHazard ? ', plus high-risk hazard zone' : ''}).`;
  }

  if (nearbyActiveIncidents >= 1) {
    return `• Location Intelligence: ${locationLabel} shows moderate clustering (${nearbyActiveIncidents} nearby active incident${nearbyActiveIncidents > 1 ? 's' : ''} within 800m).`;
  }

  return `• Location Intelligence: ${locationLabel} is currently a non-hotspot area (no nearby active incidents within 800m).`;
};

// Generate AI Summary from ML Predictions
const generateAISummary = (alert, contextReports = []) => {
  if (!alert) {
    return "AI analysis pending";
  }

  const hotspotSummary = getHotspotSummary(alert, contextReports);
  const likelyTestReport = isLikelyTestReport(alert);

  if (!alert.mlPredictions) {
    const fallbackConfidence = Math.round(getAlertConfidence(alert) * 100);
    const fallbackType = toTitleCase(alert.disasterType || 'Unknown');
    const fallbackSeverity = toTitleCase(alert.severity || 'Unknown');
    const fallbackLooksLegitimate = !likelyTestReport && fallbackConfidence >= 50;
    const fallbackStatusLine = fallbackLooksLegitimate
      ? '• Status: ✓ Appears legitimate\n'
      : '• Status: ⚠️ Potential fake alarm detected\n';
    const fallbackRecommendation = fallbackLooksLegitimate
      ? 'dispatch-and-manual-verify'
      : 'flag-false-alarm';

    let summary = "";
    if (likelyTestReport) {
      summary = `🧪 Test Content Detected: This report appears to be a test/drill entry and is treated as non-legitimate for operational dispatch.`;
    } else if (fallbackConfidence >= 90) {
      summary = `🎯 Very High Confidence: Initial AI scoring strongly indicates a legitimate ${fallbackType} incident.`;
    } else if (fallbackConfidence >= 70) {
      summary = `✅ High Confidence: Initial AI scoring indicates a likely legitimate ${fallbackType} incident.`;
    } else if (fallbackConfidence >= 50) {
      summary = `⚠️ Moderate Confidence: Initial AI scoring detected a possible ${fallbackType} incident. Manual verification recommended.`;
    } else {
      summary = `❓ Low Confidence: Initial AI scoring is inconclusive. Strong manual review advised.`;
    }

    summary += `\n\n📊 AI Analysis:\n`;
    summary += `• Disaster Type: ${fallbackType} (initial estimate)\n`;
    summary += `• Predicted Severity: ${fallbackSeverity} (initial estimate)\n`;
    summary += `• Legitimacy Score: ${fallbackConfidence}%\n`;
    summary += `${hotspotSummary}\n`;
    summary += fallbackStatusLine;
    summary += `\n💡 AI Recommendation: ${fallbackRecommendation}`;

    return summary;
  }

  const ml = alert.mlPredictions;
  const confidenceLevel = ml.overall?.confidence || ml.legitimacyConfidence || 0;
  const disasterType = ml.disasterType || alert.disasterType || "Unknown";
  const severity = ml.severity || alert.severity || "Unknown";
  const typeConfidence = ml.disasterTypeConfidence ? Math.round(ml.disasterTypeConfidence * 100) : 0;
  const severityConfidence = ml.severityConfidence ? Math.round(ml.severityConfidence * 100) : 0;
  const legitimacyConfidence = ml.legitimacyConfidence ? Math.round(ml.legitimacyConfidence * 100) : 0;

  let summary = "";
  
  // Determine confidence level interpretation
  if (likelyTestReport) {
    summary = `🧪 Test Content Detected: This report appears to be a test/drill entry and should not be treated as a live emergency.`;
  } else if (confidenceLevel >= 0.9) {
    summary = `🎯 Very High Confidence: The AI system is highly confident this is a legitimate {${toTitleCase(disasterType)}} incident.`;
  } else if (confidenceLevel >= 0.7) {
    summary = `✅ High Confidence: The AI system is confident this is a legitimate ${toTitleCase(disasterType)} incident.`;
  } else if (confidenceLevel >= 0.5) {
    summary = `⚠️ Moderate Confidence: The AI detected a ${toTitleCase(disasterType)} but with some uncertainty. Manual verification recommended.`;
  } else {
    summary = `❓ Low Confidence: The AI has low confidence in this detection. Strong manual review advised.`;
  }

  // Add specific analysis
  summary += `\n\n📊 AI Analysis:\n`;
  summary += `• Disaster Type: ${toTitleCase(disasterType)} (${typeConfidence}% confidence)\n`;
  summary += `• Predicted Severity: ${toTitleCase(severity)} (${severityConfidence}% confidence)\n`;
  summary += `• Legitimacy Score: ${legitimacyConfidence}%\n`;
  summary += `${hotspotSummary}\n`;
  
  if (likelyTestReport) {
    summary += `• Status: ⚠️ Tagged as test/drill content\n`;
  } else if (ml.isLegitimate === false) {
    summary += `• Status: ⚠️ Potential fake alarm detected\n`;
  } else {
    summary += `• Status: ✓ Appears legitimate\n`;
  }

  const recommendation = likelyTestReport
    ? 'mark-as-test-or-false-alarm'
    : (ml.overall?.recommendation || 'prioritize-manual-validation');
  summary += `\n💡 AI Recommendation: ${recommendation}`;

  return summary;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [reports, setReports] = useState([]);
  const [ongoingRescues, setOngoingRescues] = useState([]);
  const [loadingOngoingRescues, setLoadingOngoingRescues] = useState(false);
  const [ongoingRescuesError, setOngoingRescuesError] = useState(null);
  const [expandedRescue, setExpandedRescue] = useState(null);
  const [resolvingRescueId, setResolvingRescueId] = useState(null);
  const [dbRescuers, setDbRescuers] = useState([]);
  const [dbTeams, setDbTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userFeedbackList, setUserFeedbackList] = useState([]);
  const [loadingUserFeedback, setLoadingUserFeedback] = useState(false);
  const [userFeedbackError, setUserFeedbackError] = useState("");
  const [allReports, setAllReports] = useState([]); // All reports for calculating alert counts
  const [groqPriorities, setGroqPriorities] = useState(null); // Groq AI prioritization analysis
  const [loadingGroqAnalysis, setLoadingGroqAnalysis] = useState(false); // Loading state for Groq
  const [groqAnalysisError, setGroqAnalysisError] = useState(null); // Error state for Groq
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterRescuerStatus, setFilterRescuerStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRescuerQuery, setSearchRescuerQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [showAddRescuerModal, setShowAddRescuerModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [newRescuer, setNewRescuer] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    team: "",
    status: "Available",
  });
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    username: "",
    phone: "+63",
    password: "",
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    username: user?.username || "",
    phone: user?.phone || "+63",
    jobTitle: user?.jobTitle || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState([
    { id: 1, type: "alert", message: "Critical fire alert at Casisang", time: "2 mins ago", read: false },
    { id: 2, type: "rescuer", message: "Carlos Sanchez assigned to ALT-001", time: "5 mins ago", read: false },
    { id: 3, type: "system", message: "System update completed", time: "1 hour ago", read: true },
  ]);
  
  // Loading and error states
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0,
    limit: 50
  });
  const [selectedAlertForDispatch, setSelectedAlertForDispatch] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedTeamForDispatch, setSelectedTeamForDispatch] = useState(null);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState(null);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [selectedDeployedTeam, setSelectedDeployedTeam] = useState(null);
  const [showTeamLocationModal, setShowTeamLocationModal] = useState(false);
  const [selectedRescuerProfile, setSelectedRescuerProfile] = useState(null);
  const [showRescuerProfileModal, setShowRescuerProfileModal] = useState(false);
  const [selectedReportForDetails, setSelectedReportForDetails] = useState(null);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userReportHistory, setUserReportHistory] = useState([]);
  const [selectedRescuerForDetails, setSelectedRescuerForDetails] = useState(null);
  const [showRescuerDetailsModal, setShowRescuerDetailsModal] = useState(false);
  const [rescuerRescueHistory, setRescuerRescueHistory] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [newMemberName, setNewMemberName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMemberRole, setSelectedMemberRole] = useState("Team Member");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedSettingsTab, setSelectedSettingsTab] = useState("profile");
  const [toasts, setToasts] = useState([]);
  const [incomingAlert, setIncomingAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveRescuerLocations, setLiveRescuerLocations] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [hoveredAlertId, setHoveredAlertId] = useState(null);
  const mapRef = useRef(null);
  const incomingAlertTimeoutRef = useRef(null);

  // Toast notification system
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  };

  // Auto-dismiss the incoming emergency popup after 5 seconds.
  useEffect(() => {
    if (incomingAlertTimeoutRef.current) {
      clearTimeout(incomingAlertTimeoutRef.current);
      incomingAlertTimeoutRef.current = null;
    }

    if (!incomingAlert) {
      return;
    }

    incomingAlertTimeoutRef.current = setTimeout(() => {
      setIncomingAlert(null);
      incomingAlertTimeoutRef.current = null;
    }, 5000);

    return () => {
      if (incomingAlertTimeoutRef.current) {
        clearTimeout(incomingAlertTimeoutRef.current);
        incomingAlertTimeoutRef.current = null;
      }
    };
  }, [incomingAlert]);

  // Compress image for profile picture
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsImage = reader.readAsDataURL;
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 400;
          const maxHeight = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to Base64 with reduced quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Fetch rescuers and teams from database
  const fetchRescuersAndTeams = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        API.get('/auth/users?role=rescuer'),
        API.get('/teams'),
      ]);
      
      setDbRescuers(usersRes.data || []);
      setDbTeams(teamsRes.data || []);
      console.log(`[API] ✓ Fetched ${usersRes.data?.length || 0} rescuers and ${teamsRes.data?.length || 0} teams`);
    } catch (err) {
      console.error('[API] Failed to fetch users/teams:', err.message);
      // Keep existing data if fetch fails
    }
  };

  // Fetch all users for User Management section
  const fetchAllUsers = async () => {
    try {
      const res = await API.get('/auth/users');
      setAllUsers(res.data || []);
      console.log(`[API] ✓ Fetched ${res.data?.length || 0} all users`);
    } catch (err) {
      console.error('[API] Failed to fetch all users:', err.message);
    }
  };

  const fetchUserFeedback = async () => {
    try {
      setLoadingUserFeedback(true);
      setUserFeedbackError("");
      const res = await API.get('/feedback/user-feedback');
      setUserFeedbackList(res.data || []);
    } catch (err) {
      console.error('[API] Failed to fetch user feedback:', err.message);
      setUserFeedbackList([]);
      setUserFeedbackError(err.response?.data?.message || 'Failed to load user feedback');
    } finally {
      setLoadingUserFeedback(false);
    }
  };

  const handleMarkFeedbackRead = async (feedbackId) => {
    try {
      await API.patch(`/feedback/user-feedback/${feedbackId}/read`);
      setUserFeedbackList((prev) =>
        prev.map((item) =>
          item._id === feedbackId
            ? { ...item, isReadByAdmin: true, readAt: new Date().toISOString() }
            : item
        )
      );
      showToast('Feedback marked as read', 'success');
    } catch (err) {
      console.error('Failed to mark feedback as read:', err);
      showToast('Failed to update feedback', 'error');
    }
  };

  // Notification and Sound Refs
  const prevReportsCountRef = useRef(0);
  const prevLatestReportIdRef = useRef(null);
  const audioContextRef = useRef(null);

  // Play alert sound with severity-based patterns.
  const playAlertSound = (severity = 'medium') => {
    try {
      // Create a new Audio element with a simple beep sound (base64 encoded WAV)
      // This is a 220Hz sine wave beep for 1 second
      const beepSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
      beepSound.volume = 0.7;
      beepSound.play().catch(e => {
        console.warn('Primary sound failed, trying alternative:', e.message);
        // Try Web Audio API as fallback
        tryWebAudioBeep(severity);
      });
      console.log('✓ Playing alert sound');
    } catch (err) {
      console.warn('Audio playback failed:', err.message);
      tryWebAudioBeep(severity);
    }
  };

  const tryWebAudioBeep = (severity = 'medium') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => playWebAudioBeep(audioContext, severity));
      } else {
        playWebAudioBeep(audioContext, severity);
      }
    } catch (err) {
      console.warn('Web Audio API fallback also failed:', err.message);
    }
  };

  const playWebAudioBeep = (audioContext, severity = 'medium') => {
    try {
      const now = audioContext.currentTime;
      const normalized = String(severity || 'medium').toLowerCase();

      let pattern = [{ freq: 880, dur: 0.18, gap: 0.08, gain: 0.24 }];
      if (normalized === 'critical') {
        // Critical: urgent siren-like multi-tone pattern.
        pattern = [
          { freq: 880, dur: 0.16, gap: 0.05, gain: 0.32 },
          { freq: 660, dur: 0.16, gap: 0.05, gain: 0.32 },
          { freq: 980, dur: 0.16, gap: 0.05, gain: 0.32 },
          { freq: 740, dur: 0.2, gap: 0.1, gain: 0.3 },
          { freq: 980, dur: 0.2, gap: 0.0, gain: 0.3 },
        ];
      } else if (normalized === 'high') {
        // High: two-tone warning.
        pattern = [
          { freq: 820, dur: 0.14, gap: 0.06, gain: 0.28 },
          { freq: 620, dur: 0.14, gap: 0.08, gain: 0.26 },
          { freq: 820, dur: 0.14, gap: 0.0, gain: 0.28 },
        ];
      }

      let cursor = now;
      pattern.forEach((tone) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = tone.freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(tone.gain, cursor);
        gainNode.gain.exponentialRampToValueAtTime(0.01, cursor + tone.dur);
        oscillator.start(cursor);
        oscillator.stop(cursor + tone.dur);
        cursor += tone.dur + tone.gap;
      });
      console.log('✓ Web Audio beep played');
    } catch (err) {
      console.warn('Web Audio beep failed:', err.message);
    }
  };

  // Send browser notification
  const sendBrowserNotification = (title, options = {}) => {
    console.log('[Notification] Attempting to send:', title);
    console.log('[Notification] Permission status:', Notification?.permission);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/logo192.png',
          badge: '/logo192.png',
          ...options
        });
        
        // Play sound immediately when notification is shown
        setTimeout(() => {
          console.log('[Notification] Playing sound for severity:', options?.severity);
          playAlertSound(options?.severity || 'medium');
        }, 100);
        
        console.log('✓ Notification sent:', title);
      } catch (err) {
        console.warn('Could not send notification:', err.message);
      }
    } else {
      console.warn('[Notification] Not available - Permission:', Notification?.permission);
      console.warn('[Notification] Notification support:', 'Notification' in window);
      // Still play sound as fallback even if notification fails
      console.log('[Notification] Playing sound anyway (notification permission denied)');
      setTimeout(() => playAlertSound(options?.severity || 'medium'), 100);
    }
  };

  // Request notification permission on component mount
  useEffect(() => {
    const unlockAudio = () => resumeAudioContext();
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✓ Notification permission granted');
        }
      });
    }

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Resume audio context (browser requires user interaction)
  const resumeAudioContext = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('✓ Audio context resumed');
          setSoundEnabled(true);
        });
      } else {
        setSoundEnabled(true);
      }
    } catch (err) {
      console.warn('Could not resume audio context:', err.message);
    }
  };

  // Load user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error parsing user from localStorage:", err);
      }
    }
  }, []);

  // Update profile data when user is loaded
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user?.name || "",
        email: user?.email || "",
        username: user?.username || "",
        phone: user?.phone || "+63",
        jobTitle: user?.jobTitle || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      // Load saved profile picture
      if (user?.picture) {
        setProfilePicture(user.picture);
      } else {
        setProfilePicture(null);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchRescuersAndTeams();
    fetchAllUsers();
    fetchUserFeedback();
    fetchReports(); // Fetch initial reports on component mount
    fetchAllReportsForCounts(); // Fetch all reports for alert count calculations

    // Event-driven updates are handled by Socket.IO listeners below.
    return undefined;
  }, []);

  useEffect(() => {
    if (activeTab === 'settings' && selectedSettingsTab === 'feedback') {
      fetchUserFeedback();
    }
  }, [activeTab, selectedSettingsTab]);

  // Refetch reports when filters change
  useEffect(() => {
    fetchReports();
  }, [filterSeverity, filterStatus, searchQuery]);

  // Fetch ongoing rescues when tab is active
  useEffect(() => {
    if (activeTab === "ongoing" || activeTab === "rescuers") {
      fetchOngoingRescues();
    }
  }, [activeTab]);

  // Calculate assigned alerts for each rescuer based on all reports
  useEffect(() => {
    if (dbRescuers.length > 0 && allReports.length > 0) {
      const enrichedRescuers = dbRescuers.map(rescuer => {
        // Count reports where this rescuer is assigned
        const assignedCount = allReports.filter(report => {
          // Check if rescuer is the primary assigned rescuer
          if (report.assignedRescuer?.rescuerId === rescuer._id || 
              report.assignedRescuer?.rescuerId?.toString() === rescuer._id?.toString()) {
            return true;
          }
          // Check if rescuer is member of the assigned team
          if (report.assignedTeam?.members?.some(m => 
            (m._id === rescuer._id || m.toString() === rescuer._id.toString())
          )) {
            return true;
          }
          return false;
        }).length;
        
        return {
          ...rescuer,
          alerts: assignedCount || "-"
        };
      });
      setDbRescuers(enrichedRescuers);
    }
  }, [allReports.length]); // Only recalculate when allReports changes

  // Initialize team members
  useEffect(() => {
    setTeamMembers({
      "TEAM-ALPHA": [
        { id: 1, name: "Carlos Sanchez", role: "Team Lead" },
        { id: 2, name: "Juan Dela Cruz", role: "Paramedic" },
        { id: 3, name: "Mark Fernandez", role: "Firefighter" },
        { id: 4, name: "Mang Toto", role: "Driver" },
        { id: 17, name: "Sam Rodriguez", role: "Paramedic" },
      ],
      "TEAM-BRAVO": [
        { id: 5, name: "Jose Ramos", role: "Team Lead" },
        { id: 6, name: "Roberto Santos", role: "Paramedic" },
        { id: 7, name: "Antonio Reyes", role: "Firefighter" },
        { id: 8, name: "Miguel Garcia", role: "Driver" },
        { id: 18, name: "Jhonex Martinez", role: "Firefighter" },
        { id: 21, name: "Sam Rey", role: "Paramedic" },
        { id: 22, name: "Butch", role: "Firefighter" },
      ],
      "TEAM-CHARLIE": [
        { id: 9, name: "Maria Cruz", role: "Team Lead" },
        { id: 10, name: "Rosa Mercado", role: "Paramedic" },
        { id: 11, name: "Anna Liza", role: "Firefighter" },
        { id: 12, name: "Joy Santos", role: "Driver" },
        { id: 19, name: "Sam Torres", role: "Paramedic" },
      ],
      "TEAM-DELTA": [
        { id: 13, name: "Angel Gonzales", role: "Team Lead" },
        { id: 14, name: "Luis Morales", role: "Paramedic" },
        { id: 15, name: "Pedro Flores", role: "Firefighter" },
        { id: 16, name: "Francisco Royo", role: "Driver" },
        { id: 20, name: "Jhonex Delosa", role: "Driver" },
      ],
    });
  }, []);

  // Fetch all reports for calculating alert counts
  const fetchAllReportsForCounts = async () => {
    try {
      // Fetch all reports without filters to get complete count
      const res = await API.get('/reports?limit=1000&page=1');
      
      if (res.data && res.data.data) {
        // Deduplicate by _id to prevent duplicates
        const allData = res.data.data;
        const uniqueData = Array.from(new Map(allData.map(r => [r._id, r])).values());
        const currentCount = uniqueData.length;
        const latestReport = uniqueData[0]; // First item is latest due to sort
        const latestReportId = latestReport?._id ? String(latestReport._id) : null;

        // First load: initialize refs only (no alert).
        if (!prevLatestReportIdRef.current && latestReportId) {
          prevLatestReportIdRef.current = latestReportId;
        }

        // Trigger alert whenever newest report ID changes.
        if (latestReportId && prevLatestReportIdRef.current && latestReportId !== prevLatestReportIdRef.current) {

          // Always play sound for new alerts, even if browser notifications are blocked.
          playAlertSound(latestReport?.severity || 'medium');
          
          // Add notification to the notification modal
          const newNotification = {
            _id: Date.now().toString(),
            type: 'alert',
            title: `🚨 ${latestReport?.disasterType || 'Emergency'}`,
            message: `${latestReport?.locationName || 'Unknown location'} • Severity: ${latestReport?.severity || 'Unknown'}`,
            createdAt: new Date(),
            isRead: false
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setIncomingAlert({
            id: newNotification._id,
            title: newNotification.title,
            message: newNotification.message,
            severity: String(latestReport?.severity || 'medium').toLowerCase(),
          });
          
          // Send browser notification
          sendBrowserNotification('🚨 New Emergency Alert!', {
            body: `${latestReport?.disasterType || 'Emergency'} at ${latestReport?.locationName || 'Unknown location'}`,
            severity: latestReport?.severity || 'medium',
          });
          
          // Show toast
          showToast(`New alert: ${latestReport?.disasterType || 'Emergency'}`, 'alert');

          prevLatestReportIdRef.current = latestReportId;
        }
        
        prevReportsCountRef.current = currentCount;
        setAllReports(uniqueData);
        console.log(`[API] ✓ Fetched ${uniqueData.length} unique reports for alert count (${allData.length} raw)`);
      }
    } catch (err) {
      console.error('[API] Failed to fetch all reports for counts:', err.message);
    }
  };

  const fetchReports = async (pageNum = 1) => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        severity: filterSeverity,
        status: filterStatus,
        search: searchQuery,
        page: pageNum,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      console.log(`[API] Fetching reports with filters:`, {
        severity: filterSeverity,
        status: filterStatus,
        search: searchQuery,
        page: pageNum
      });

      const res = await API.get(`/reports?${params}`);
      
      if (res.data && res.data.success) {
        const data = res.data.data || [];
        
        // Deduplicate by _id to prevent duplicate displays
        const uniqueReports = Array.from(new Map(data.map(r => [r._id, r])).values());
        
        setPagination(res.data.pagination || {
          total: uniqueReports.length,
          page: pageNum,
          pages: 1,
          limit: pagination.limit
        });
        setReports(uniqueReports);
        
        console.log(`[API] ✓ Fetched ${uniqueReports.length} unique reports (${data.length} raw)`);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      console.error("[API] ✗ Failed to fetch reports:", err.response?.data || err.message);
      setReportsError(err.response?.data?.message || err.message || "Failed to fetch reports");
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchOngoingRescues = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingOngoingRescues(true);
      setOngoingRescuesError(null);
    }
    try {
      const res = await API.get(`/reports/ongoing/list`);
      if (Array.isArray(res.data)) {
        setOngoingRescues(res.data);
        console.log(`[API] ✓ Fetched ${res.data.length} ongoing rescues`);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      console.error("[API] ✗ Failed to fetch ongoing rescues:", err.response?.data || err.message);
      if (!silent) {
        setOngoingRescuesError(err.response?.data?.message || err.message || "Failed to fetch ongoing rescues");
        setOngoingRescues([]);
      }
    } finally {
      if (!silent) {
        setLoadingOngoingRescues(false);
      }
    }
  };

  // Groq AI Priority Analysis
  const analyzeWithGroq = async (language = 'en') => {
    try {
      setLoadingGroqAnalysis(true);
      setGroqAnalysisError(null);

      // Get critical reports for analysis
      const criticalReports = reports.filter(r => r.severity === 'critical');
      
      if (criticalReports.length === 0) {
        showToast('No critical reports to analyze', 'warning');
        setLoadingGroqAnalysis(false);
        return;
      }

      console.log(`🤖 Calling Groq AI to prioritize ${criticalReports.length} critical reports...`);

      // Call backend API
      const response = await API.post('/alerts/analyze-priority', { 
        language: language,
        criticalCount: criticalReports.length 
      });

      if (response.data.success || response.data.analysis) {
        setGroqPriorities(response.data);
        console.log('✅ Groq analysis complete:', response.data);
        showToast(`✨ AI Analysis: ${criticalReports.length} critical reports prioritized`, 'success');
      } else {
        throw new Error(response.data.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('❌ Groq Analysis Error:', error);
      setGroqAnalysisError(error.message);
      showToast(`AI Analysis failed: ${error.message}`, 'error');
    } finally {
      setLoadingGroqAnalysis(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/rescue/notifications");
      const notifData = Array.isArray(res.data) ? res.data : res.data.data || [];
      setNotifications(notifData);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      // Use default mock notifications on error
    }
  };

  const markRescueAsResolved = async (rescueId) => {
    setResolvingRescueId(rescueId);
    try {
      // First mark the rescue as resolved
      const res = await API.post(`/reports/${rescueId}/resolve`, {
        actionNote: `Marked as resolved by admin`
      });
      
      console.log('✓ Rescue marked as resolved:', res.data);
      
      if (res.data.success) {
        // Remove from ongoing list immediately
        setOngoingRescues(prev => prev.filter(r => r._id !== rescueId));
        // Remove from report-driven views immediately (Alerts + Map + Dashboard charts)
        setReports(prev => prev.filter(r => r._id !== rescueId));
        setAllReports(prev => prev.filter(r => r._id !== rescueId));
        
        // Force refresh all dependent datasets
        console.log('🔄 Refreshing reports, teams, and rescues...');
        await Promise.all([
          fetchAllReportsForCounts(),
          fetchReports(),
          fetchRescuersAndTeams(),
          fetchOngoingRescues()
        ]);
        
        console.log('✅ All data refreshed');
        showToast('Rescue marked as resolved successfully! Teams status updated.', 'success');
      }
    } catch (err) {
      console.error("Error marking rescue as resolved:", err);
      showToast('Failed to mark rescue as resolved: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setResolvingRescueId(null);
    }
  };

  const markTeamAsAvailable = async (teamId, teamName) => {
    try {
      console.log('📍 Marking team as available:', teamName);
      const res = await API.post(`/teams/${teamId}/mark-available`);
      
      if (res.data) {
        // Refresh teams to show updated status
        await fetchRescuersAndTeams();
        showToast(`Team ${teamName} marked as available!`, 'success');
      }
    } catch (err) {
      console.error("Error marking team as available:", err);
      showToast('Failed to mark team as available: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getStatusVariant = (status) => {
    if (status === "Resolved" || status === "resolved") return "success";
    if (status === "Declined" || status === "declined") return "error";
    if (status === "Pending" || status === "pending") return "warning";
    return "default";
  };

  // Note: Reports are already filtered by server, so we use reports directly
  // This simplification improves performance for large datasets

  // Mock rescuers data
  // Use database rescuers if available, otherwise show fallback message
  const displayRescuers = dbRescuers.length > 0 ? dbRescuers : [];

    // Reuse global helpers that already handle fallback + severity patterns.
    const showNotification = (title, options = {}) => {
      sendBrowserNotification(title, options);
    };

  // Add rescuer handler
  const handleAddRescuer = async () => {
    if (!newRescuer.name || !newRescuer.email || !newRescuer.phone) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }
    try {
      const response = await API.post("/auth/create-rescuer", {
        name: newRescuer.name,
        email: newRescuer.email,
        password: newRescuer.phone, // Use phone as default password for rescuer
        role: "rescuer",
        specialty: newRescuer.specialty,
        team: newRescuer.team,
      });
      
      console.log("Rescuer added:", response.data);
      setNewRescuer({
        name: "",
        email: "",
        phone: "",
        specialty: "",
        team: "",
        status: "Available",
      });
      setShowAddRescuerModal(false);
      showToast('Rescuer added successfully!', 'success');
      // Optionally refresh data if needed
    } catch (err) {
      console.error("Error adding rescuer:", err);
      showToast('Failed to add rescuer: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleAddAdminAccount = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.username || !newAdmin.phone || !newAdmin.password) {
      showToast('Please fill in all admin fields', 'warning');
      return;
    }

    try {
      setCreatingAdmin(true);
      await API.post('/auth/admins', {
        name: newAdmin.name,
        email: newAdmin.email,
        username: newAdmin.username,
        phone: newAdmin.phone,
        password: newAdmin.password,
      });

      setNewAdmin({
        name: "",
        email: "",
        username: "",
        phone: "+63",
        password: "",
      });

      await fetchAllUsers();
      showToast('Admin account created successfully!', 'success');
    } catch (err) {
      console.error('Error adding admin account:', err);
      showToast('Failed to add admin account: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (id) => {
    try {
      await API.patch(`/rescue/notifications/${id}/read`);
      setNotifications(
        notifications.map((notif) =>
          notif._id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      await API.patch("/rescue/notifications/read-all");
      setNotifications([]);
      setShowNotificationsModal(false);
    } catch (err) {
      console.error("Error clearing notifications:", err);
      // Fallback to local clear
      setNotifications([]);
      setShowNotificationsModal(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Dispatch team implementation
  const dispatchTeam = async (teamId, reportId) => {
    try {
      const response = await API.post(`/teams/${teamId}/dispatch`, {
        reportId,
      });
      console.log("Team dispatched successfully:", response.data);
      
      // Check if response indicates success
      if (response.data.success || response.status === 200) {
        showToast('Team dispatched successfully!', 'success');
        
        // Close modal and reset states
        setShowDispatchModal(false);
        setSelectedAlertForDispatch(null);
        setSelectedTeamForDispatch(null);
        
        // Refresh all data (non-blocking - don't let refresh errors block the success message)
        try {
          const results = await Promise.allSettled([
            fetchNotifications(),
            fetchReports(),
            fetchAllReportsForCounts(),
            fetchRescuersAndTeams(),
            fetchOngoingRescues({ silent: true }) // Also refresh ongoing rescues
          ]);
          
          // Check if any failed and log for debugging
          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            console.warn(`${failures.length} data refresh operations failed:`, failures);
          }
        } catch (refreshErr) {
          console.warn("Warning: Error in refresh operations (non-critical):", refreshErr);
          // Don't throw - the dispatch succeeded, just some refreshes may have failed
        }
      }
    } catch (err) {
      console.error("Error dispatching team:", err.response?.data || err.message);
      showToast('Failed to dispatch team: ' + (err.response?.data?.message || err.message), 'error');
      // Still close the modal on error so user can retry
      setShowDispatchModal(false);
    }
  };

  // Fetch fresh team data and open location modal (to get real-time locations)
  const handleViewTeamLocation = async (team) => {
    try {
      // Fetch fresh team data from API (includes updated member locations)
      const response = await API.get(`/teams/${team._id}`);
      if (response.data) {
        console.log('✓ Fetched fresh team data with locations:', response.data);
        setSelectedDeployedTeam(response.data);
        setShowTeamLocationModal(true);
      }
    } catch (err) {
      console.error('Error fetching team location data:', err);
      showToast('Failed to fetch location data', 'error');
    }
  };

  // Team member management functions
  const handleViewTeamDetails = (team) => {
    setSelectedTeamDetails(team);
    setShowTeamDetailsModal(true);
    setNewMemberName("");
    setSelectedMemberId("");
  };

  const handleViewRescuerProfile = (rescuer) => {
    setSelectedRescuerProfile(rescuer);
    setShowRescuerProfileModal(true);
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedTeamDetails?._id) {
      showToast('Error: Team ID not found', 'error');
      return;
    }

    try {
      console.log(`Removing member ${memberId} from team ${selectedTeamDetails._id}`);
      const res = await API.delete(`/teams/${selectedTeamDetails._id}/members/${memberId}`);
      showToast('Member removed successfully!', 'success');
      // Refresh team details
      await fetchRescuersAndTeams();
      // Update selected team with fresh data
      const teamId = selectedTeamDetails._id;
      const updatedTeams = await API.get('/teams');
      const updatedTeam = updatedTeams.data.find(t => t._id === teamId);
      if (updatedTeam) {
        setSelectedTeamDetails(updatedTeam);
      }
    } catch (err) {
      console.error("Error removing member:", err);
      showToast('Failed to remove member: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleSetTeamLeader = async (memberId) => {
    if (!selectedTeamDetails?._id) {
      showToast("Error: Team ID not found", 'error');
      return;
    }

    try {
      console.log(`Setting ${memberId} as leader of team ${selectedTeamDetails._id}`);
      const res = await API.patch(`/teams/${selectedTeamDetails._id}`, { leader: memberId });
      showToast("Team leader updated successfully!", 'success');
      // Refresh team details
      const updatedTeam = res.data;
      setSelectedTeamDetails(updatedTeam);
      await fetchRescuersAndTeams();
    } catch (err) {
      console.error("Error setting team leader:", err);
      showToast('Failed to set team leader: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamDetails?._id) {
      showToast('Error: Team ID not found', 'error');
      return;
    }

    if (!newMemberName.trim()) {
      showToast('Please select a rescuer', 'warning');
      return;
    }

    let memberId = selectedMemberId;
    if (!memberId) {
      const matchedRescuer = dbRescuers.find(
        (rescuer) => rescuer.name?.toLowerCase() === newMemberName.trim().toLowerCase()
      );
      memberId = matchedRescuer?._id;
    }

    if (!memberId) {
      showToast('Please choose a rescuer from the dropdown list', 'warning');
      return;
    }

    try {
      await API.post(`/teams/${selectedTeamDetails._id}/members`, { userId: memberId });
      showToast('Member added successfully!', 'success');

      await fetchRescuersAndTeams();
      const updatedTeams = await API.get('/teams');
      const updatedTeam = updatedTeams.data.find((t) => t._id === selectedTeamDetails._id);
      if (updatedTeam) {
        setSelectedTeamDetails(updatedTeam);
      }

      setNewMemberName('');
      setSelectedMemberId('');
      setSelectedMemberRole('Team Member');
      setShowMemberDropdown(false);
    } catch (err) {
      console.error('Error adding member:', err);
      showToast('Failed to add member: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // Complete mission (ready for implementation)
  // const completeMission = async (teamId, reportId) => {
  //   try {
  //     const response = await API.post(`/teams/${teamId}/complete`, {
  //       reportId,
  //     });
  //     await fetchReports();
  //   } catch (err) {
  //     console.error("Error completing mission:", err);
  //   }
  // };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    try {
      const updateData = {
        name: profileData.name,
        email: profileData.email,
        username: profileData.username,
        phone: profileData.phone,
        jobTitle: profileData.jobTitle,
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      if (profilePicture) {
        updateData.picture = profilePicture;
      }

      const response = await API.patch("/auth/profile", updateData);
      console.log("Profile updated:", response.data);
      
      // Update user in localStorage
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      showToast('Profile updated successfully!', 'success');
      setProfileData({
        ...profileData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast('Failed to update profile: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // Socket.IO listener for real-time dispatch updates
  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log(`[Notifications] Permission: ${permission}`);
      });
    }

    const socketHost = window.location.hostname || 'localhost';
    const socketUrl = `http://${socketHost}:5000`;
    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"]
    });

    // Helper to show browser notification
    const showNotification = (title, options = {}) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            ...options
          });
        } catch (err) {
          console.warn('[Notifications] Failed to show notification:', err);
        }
      }
    };

    // Debounce multiple refreshes to prevent duplicate fetches
    let refreshTimeoutId = null;
    const processedReportIds = new Set(); // Track recently processed reports to prevent duplicates
    
    const queuedRefresh = async (includeOngoing = true) => {
      clearTimeout(refreshTimeoutId);
      refreshTimeoutId = setTimeout(async () => {
        try {
          if (includeOngoing) {
            await Promise.allSettled([
              fetchAllReportsForCounts(),
              fetchReports(),
              fetchOngoingRescues({ silent: true }),
              fetchRescuersAndTeams(),
            ]);
          } else {
            await Promise.allSettled([
              fetchAllReportsForCounts(),
              fetchReports(),
              fetchRescuersAndTeams(),
            ]);
          }
        } catch (err) {
          console.warn("[Realtime] Dashboard refresh failed:", err?.message || err);
        }
      }, 500); // Debounce: wait 500ms before refreshing to batch multiple events
    };

    const handleRealtimeChange = (eventName, data) => {
      // Skip duplicate processing for the same report within 2 seconds
      const reportId = data?._id || data?.id;
      if (reportId && processedReportIds.has(reportId)) {
        console.log(`[Realtime] SKIPPED duplicate event for report ${reportId}`, eventName);
        return;
      }
      
      // Mark this report as processed
      if (reportId) {
        processedReportIds.add(reportId);
        setTimeout(() => processedReportIds.delete(reportId), 2000); // Clear after 2 seconds
      }
      
      console.log(`[Realtime] ${eventName} received`, data || {});
      console.log(`[Realtime] Event Details:`, { eventName, severity: data?.severity, type: data?.type, disasterType: data?.disasterType });
      queuedRefresh(eventName !== 'rescuer_location_update');
      
      // Show notification and play sound for alerts and reports
      if (eventName === 'new_alert') {
        const severity = data?.severity || 'Unknown';
        const type = data?.disasterType || data?.type || 'Emergency';
        const location = data?.locationName || 'Unknown location';
        
        console.log('[Notifications] Triggering for new_alert - Severity:', severity, 'Type:', type, 'Location:', location);
        // Ensure browser audio context is active before playing sound.
        resumeAudioContext();
        playAlertSound(severity);
        setIncomingAlert({
          id: Date.now().toString(),
          title: `🚨 ${type} Alert`,
          message: `${location} • ${String(severity).toUpperCase()}`,
          severity: String(severity).toLowerCase(),
        });
        showToast(`New ${type} Alert • ${String(severity).toUpperCase()} • ${location}`, 'alert', 6000);
        showNotification(`New ${type} Alert - ${severity.toUpperCase()}`, {
          body: `Alert at ${location}`,
          tag: 'alert-notification',
          requireInteraction: true
        });
        console.log('[Notifications] New alert notification sent');
      } else if (eventName === 'new_report') {
        const severity = data?.severity || 'Unknown';
        const type = data?.disasterType || 'Report';
        const location = data?.locationName || 'Unknown location';
        
        // Ensure browser audio context is active before playing sound.
        resumeAudioContext();
        playAlertSound(severity);
        setIncomingAlert({
          id: Date.now().toString(),
          title: `📢 ${type} Report`,
          message: `${location} • ${String(severity).toUpperCase()}`,
          severity: String(severity).toLowerCase(),
        });
        showToast(`New ${type} Report • ${String(severity).toUpperCase()} • ${location}`, 'alert', 6000);
        showNotification(`New ${type} Report - ${severity.toUpperCase()}`, {
          body: `Report at ${location}`,
          tag: 'report-notification',
          requireInteraction: true
        });
        console.log('[Notifications] New report notification sent');
      } else if (eventName === 'report_ml_updated') {
        showToast('AI analysis updated for latest report', 'info', 3000);
      }
    };

    socket.on("connect", () => {
      console.log("✓ Connected to real-time updates");
      console.log("[Socket.IO] Admin client socket ID:", socket.id);
      setSocketConnected(true);
      socket.emit("join_admin");
      console.log("[Socket.IO] Emitted join_admin - waiting for admins room confirmation");
      // Immediate sync after reconnect to avoid stale UI.
      queuedRefresh(true);
      showToast('✓ Real-time connection established', 'success', 3000);
    });

    // Real-time events that should refresh admin data automatically.
    socket.on("team_dispatched", (data) => handleRealtimeChange("team_dispatched", data));
    socket.on("report_resolved", (data) => handleRealtimeChange("report_resolved", data));
    socket.on("new_report", (data) => {
      console.log("[Socket.IO] Received new_report on client:", data?.severity, data?.disasterType);
      console.log("[Socket.IO] Report senderPhone:", data?.senderPhone);
      console.log("[Socket.IO] Full report data:", data);
      handleRealtimeChange("new_report", data);
    });
    socket.on("new_alert", (data) => {
      console.log("[Socket.IO] Received new_alert on client:", data?.severity, data?.type);
      console.log("[Socket.IO] Alert senderPhone:", data?.senderPhone);
      console.log("[Socket.IO] Full alert data:", data);
      handleRealtimeChange("new_alert", data);
    });
    socket.on("report_ml_updated", (data) => {
      console.log("[Socket.IO] Received report_ml_updated on client:", data?._id);
      handleRealtimeChange("report_ml_updated", data);
    });
    socket.on("team_available", (data) => handleRealtimeChange("team_available", data));
    socket.on("rescuer_mission_status_updated", (data) => handleRealtimeChange("rescuer_mission_status_updated", data));
    socket.on("rescuer_location_update", (data) => {
      console.log("[Realtime] rescuer_location_update received", data || {});
      const reportKey = data?.reportId ? String(data.reportId) : null;
      const rescuerKey = data?.rescuerId ? String(data.rescuerId) : null;
      const teamKey = data?.teamId ? String(data.teamId) : null;

      setLiveRescuerLocations((prev) => {
        const next = { ...prev };
        const payload = { ...data, _eventTs: Date.now() };
        if (reportKey) next[reportKey] = payload;
        if (rescuerKey) next[rescuerKey] = payload;
        if (teamKey) next[teamKey] = payload;
        return next;
      });

      // Ongoing map uses this event stream directly; skip dashboard refetch to avoid UI flicker.
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from real-time updates - using polling fallback");
      setSocketConnected(false);
      showToast('⚠️ Lost real-time connection - using polling backup', 'warning', 5000);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket.IO] connect_error:", err?.message || err);
    });

    // Fallback polling ONLY when socket is disconnected (inactive otherwise)
    let pollingInterval = null;
    const startPolling = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = setInterval(() => {
        queuedRefresh(true);
      }, 15000); // 15 second polling as fallback only
    };

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    // Start polling until socket successfully connects.
    if (!socketConnected) {
      startPolling();
    }

    // Listen for connection changes to enable/disable polling.
    // Connected => stop fallback polling, Disconnected => start fallback polling.
    const onConnectHandler = () => stopPolling();
    const onDisconnectHandler = () => startPolling();

    socket.on("connect", onConnectHandler);
    socket.on("disconnect", onDisconnectHandler);

    return () => {
      stopPolling();
      socket.off("connect", onConnectHandler);
      socket.off("disconnect", onDisconnectHandler);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Safety-net polling: keeps reports fresh even if socket events are missed.
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      Promise.allSettled([
        fetchAllReportsForCounts(),
        fetchReports(),
        fetchOngoingRescues({ silent: true }),
        fetchRescuersAndTeams(),
      ]).catch(() => {});
    }, 8000);

    return () => clearInterval(intervalId);
  }, [filterSeverity, filterStatus, searchQuery]);

  const reportSource = (allReports && allReports.length > 0) ? allReports : reports;
  const normalizeStatus = (status) => String(status || '').toLowerCase();
  const isResolvedStatus = (status) => ['resolved', 'done', 'completed'].includes(normalizeStatus(status));
  const isRespondedStatus = (status) => ['responded', 'in_progress', 'in-progress', 'ongoing', 'active'].includes(normalizeStatus(status));
  const isPendingStatus = (status) => ['pending', 'new', 'acknowledged'].includes(normalizeStatus(status));

  const handledReports = (reportSource || []).filter(r => isResolvedStatus(r.status) || isRespondedStatus(r.status));
  const activeReports = (reportSource || []).filter(r => !isResolvedStatus(r.status));

  const severityCounts = activeReports.reduce((acc, report) => {
    const sev = String(report.severity || 'low').toLowerCase();
    if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') {
      acc[sev] += 1;
    } else {
      acc.low += 1;
    }
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0 });

  const respondedCount = reportSource.filter(r => isRespondedStatus(r.status)).length;
  const pendingCount = reportSource.filter(r => isPendingStatus(r.status)).length;
  const resolvedCount = reportSource.filter(r => isResolvedStatus(r.status)).length;
  const totalAlerts = reportSource.length;
  const responseRate = totalAlerts > 0 ? (((respondedCount + resolvedCount) / totalAlerts) * 100).toFixed(1) : '0.0';

  const getDurationMinutes = (report) => {
    const start = report?.createdAt ? new Date(report.createdAt).getTime() : null;
    const endCandidate = report?.resolvedAt || report?.updatedAt;
    const end = endCandidate ? new Date(endCandidate).getTime() : null;
    if (!start || !end || Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
    return Math.round((end - start) / 60000);
  };

  const responseDurations = handledReports
    .map(getDurationMinutes)
    .filter(v => Number.isFinite(v));

  const avgResponseTimeMinutes = responseDurations.length
    ? (responseDurations.reduce((s, v) => s + v, 0) / responseDurations.length)
    : 0;

  const activeRescuersCount = (dbRescuers || []).filter(r => r?.dutyStatus === 'on-duty' || r?.isOnline).length;

  const alertsByTimeData = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map(label => ({ time: label, count: 0 }));
  reportSource.forEach(report => {
    if (!report?.createdAt) return;
    const h = new Date(report.createdAt).getHours();
    if (Number.isNaN(h)) return;
    const bucket = Math.floor(h / 4);
    if (alertsByTimeData[bucket]) alertsByTimeData[bucket].count += 1;
  });

  const responseBySeverityData = ['critical', 'high', 'medium', 'low'].map(severity => {
    const sevReports = handledReports.filter(r => String(r.severity || '').toLowerCase() === severity);
    const mins = sevReports.map(getDurationMinutes).filter(v => Number.isFinite(v));
    const avg = mins.length ? (mins.reduce((s, v) => s + v, 0) / mins.length) : 0;
    return {
      type: toTitleCase(severity),
      time: Number(avg.toFixed(1)),
    };
  });

  const alertTypeMap = new Map();
  reportSource.forEach(report => {
    const key = report?.disasterType || 'Unknown';
    alertTypeMap.set(key, (alertTypeMap.get(key) || 0) + 1);
  });
  const alertTypeDistributionData = Array.from(alertTypeMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const alertsByLocationMap = new Map();
  reportSource.forEach(report => {
    const key = report?.locationName || report?.location || 'Unknown';
    alertsByLocationMap.set(key, (alertsByLocationMap.get(key) || 0) + 1);
  });
  const alertsByLocationData = Array.from(alertsByLocationMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const weeklySeverityTrendData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({
    day,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }));
  reportSource.forEach(report => {
    if (!report?.createdAt) return;
    const dt = new Date(report.createdAt);
    if (Number.isNaN(dt.getTime())) return;
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()];
    const row = weeklySeverityTrendData.find(d => d.day === dayName);
    const sev = String(report.severity || 'low').toLowerCase();
    if (row) row[sev] = (row[sev] || 0) + 1;
  });

  const responseTrendByMonthData = (() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: label, total: 0, count: 0 });
    }
    handledReports.forEach(report => {
      if (!report?.createdAt) return;
      const d = new Date(report.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const slot = months.find(m => m.key === key);
      const mins = getDurationMinutes(report);
      if (slot && Number.isFinite(mins)) {
        slot.total += mins;
        slot.count += 1;
      }
    });
    return months.map(m => ({ month: m.month, time: m.count ? Number((m.total / m.count).toFixed(1)) : 0 }));
  })();

  const teamPerformanceData = (() => {
    const teamMap = new Map();

    (dbTeams || []).forEach(team => {
      const key = String(team?._id || team?.name || 'unknown');
      teamMap.set(key, {
        team: team?.name || 'Unknown Team',
        resolved: 0,
        totalMinutes: 0,
        sampleCount: 0,
      });
    });

    (reportSource || []).forEach(report => {
      const assigned = report?.assignedTeam;
      if (!assigned) return;

      const teamId = typeof assigned === 'object' ? String(assigned._id || assigned.name || 'unknown') : String(assigned);
      const teamName = typeof assigned === 'object' ? (assigned.name || 'Unknown Team') : 'Unknown Team';

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, { team: teamName, resolved: 0, totalMinutes: 0, sampleCount: 0 });
      }

      const row = teamMap.get(teamId);
      if (isResolvedStatus(report.status)) {
        row.resolved += 1;
        const mins = getDurationMinutes(report);
        if (Number.isFinite(mins)) {
          row.totalMinutes += mins;
          row.sampleCount += 1;
        }
      }
    });

    const rows = Array.from(teamMap.values());
    const maxResolved = Math.max(1, ...rows.map(r => r.resolved));

    return rows
      .map(r => {
        const avg = r.sampleCount > 0 ? (r.totalMinutes / r.sampleCount) : 0;
        const performance = Math.round((r.resolved / maxResolved) * 100);
        const status = performance >= 85 ? 'Excellent' : performance >= 60 ? 'Good' : 'Needs Improvement';
        return {
          team: r.team,
          resolved: r.resolved,
          avgTime: `${avg.toFixed(1)} min`,
          performance,
          status,
        };
      })
      .sort((a, b) => b.resolved - a.resolved);
  })();

  // Filter rescuers based on status
  const filteredRescuers = displayRescuers.filter(rescuer => {
    if (filterRescuerStatus === 'All') return true;
    if (filterRescuerStatus === 'Active') return rescuer.dutyStatus === 'on-duty' || rescuer.isOnline;
    if (filterRescuerStatus === 'Responded') return rescuer.hasResponded === true;
    if (filterRescuerStatus === 'Pending') return rescuer.dutyStatus === 'on-duty' && !rescuer.hasResponded;
    if (filterRescuerStatus === 'Resolved') return rescuer.dutyStatus === 'off-duty';
    return true;
  });

  // Export reports handler
  const handleExport = async () => {
    try {
      setExporting(true);
      setExportMessage("");

      if (!Array.isArray(reportSource) || reportSource.length === 0) {
        showToast('No reports to export', 'warning');
        setExporting(false);
        return;
      }

      // Prepare CSV data
      const headers = ['ID', 'Type', 'Severity', 'Status', 'Location', 'Reporter', 'Date', 'ML Confidence'];
      const rows = reportSource.map(report => [
        report._id || 'N/A',
        report.type || 'Unknown',
        report.severity || 'Unknown',
        report.status || 'Pending',
        report.locationName || report.location || 'Unknown',
        report.reporterName || report.reporterEmail || 'Anonymous',
        report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A',
        report.mlPredictions?.overall?.confidence ? (report.mlPredictions.overall.confidence * 100).toFixed(1) + '%' : 'N/A'
      ]);

      // Create CSV string
      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Reports exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export reports: ' + error.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showTeamsPanel={false}
        setShowTeamsPanel={() => {}}
        teams={[]}
        handleCompleteMission={() => {}}
        setSelectedTeam={() => {}}
        setShowTeamModal={() => {}}
        getTeamBgColor={() => "bg-blue-500"}
        getTeamStatusColor={() => "text-green-500"}
        showNotifications={false}
        setShowNotifications={() => {}}
        notifications={[]}
        unreadCount={0}
        markNotificationRead={() => {}}
        clearAllNotifications={() => {}}
        showTeamHistory={false}
        setShowTeamHistory={() => {}}
        resolvedReports={[]}
        declinedReports={[]}
        exportMissionLogPDF={() => {}}
        getSenderFullName={() => "User"}
        user={user}
        setShowProfileModal={() => {}}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={
            activeTab === "dashboard" ? "Dashboard" :
            activeTab === "map" ? "Map View" :
            activeTab === "rescuers" ? "Rescuer Management" :
            activeTab === "ongoing" ? "Ongoing Rescues" :
            activeTab === "alerts" || activeTab === "reports" ? "Alerts & Reports" :
            activeTab === "settings" ? "Settings" :
            "Dashboard"
          } 
          user={user} 
          onLogout={handleLogout}
          notifications={notifications}
          showNotificationsModal={showNotificationsModal}
          setShowNotificationsModal={setShowNotificationsModal}
          markNotificationRead={markNotificationRead}
          clearAllNotifications={clearAllNotifications}
          unreadCount={unreadCount}
          onProfileClick={() => {
            setActiveTab("settings");
            setFilterStatus("profile");
          }}
          onSettingsClick={() => {
            setActiveTab("settings");
            setFilterStatus("profile");
          }}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
          {activeTab === "dashboard" && (
            <div className="p-6 space-y-6">
              {/* KPI Cards - Alert Severity */}
              <div>
                <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase">Active Alerts by Severity</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Critical */}
                  <Card className="border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Critical</p>
                          <p className="text-4xl font-bold text-red-600 dark:text-red-500 mt-2">{severityCounts.critical}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* High */}
                  <Card className="border-orange-200 dark:border-orange-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">High</p>
                          <p className="text-4xl font-bold text-orange-500 dark:text-orange-400 mt-2">{severityCounts.high}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-orange-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medium */}
                  <Card className="border-yellow-200 dark:border-yellow-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Medium</p>
                          <p className="text-4xl font-bold text-yellow-500 dark:text-yellow-400 mt-2">{severityCounts.medium}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-yellow-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Low */}
                  <Card className="border-green-200 dark:border-green-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Low</p>
                          <p className="text-4xl font-bold text-green-600 dark:text-green-500 mt-2">{severityCounts.low}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Response Summary Cards */}
              <div>
                <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 uppercase">Response Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Responded */}
                  <Card className="border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Responded</p>
                          <div className="flex items-baseline gap-2 mt-2">
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">{respondedCount}</p>
                          </div>
                        </div>
                        <Activity className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pending */}
                  <Card className="border-yellow-200 dark:border-yellow-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Pending</p>
                          <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{pendingCount}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resolved */}
                  <Card className="border-green-200 dark:border-green-900 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Resolved</p>
                          <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{resolvedCount}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alerts by Time */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Alerts by Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={alertsByTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} dot={{ fill: "#1d4ed8", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Average Response Time */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Avg Response Time (minutes)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={responseBySeverityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="type" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                        />
                        <Legend />
                        <Bar dataKey="time" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Alert Distribution */}
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Alert Distribution by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={alertTypeDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#dc2626" />
                        <Cell fill="#f97316" />
                        <Cell fill="#1d4ed8" />
                        <Cell fill="#16a34a" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Alerts Table */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Alerts</h2>
                <Card className="border-slate-200 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Severity</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {reports.filter(r => r.status !== 'Resolved' && r.status !== 'resolved').slice(0, 5).map((report, idx) => (
                          <tr key={report._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-600">{report.disasterType || "Emergency"}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{report.locationName || report.location || "Unknown"}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                report.severity === "critical" ? "bg-red-100 text-red-700" :
                                report.severity === "high" ? "bg-orange-100 text-orange-700" :
                                report.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                                "bg-green-100 text-green-700"
                              }`}>
                                {toTitleCase(report.severity || "Standard")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                report.status === "Active" ? "bg-red-100 text-red-700" :
                                report.status === "Responded" ? "bg-blue-100 text-blue-700" :
                                report.status === "Pending" ? "bg-slate-100 text-slate-700" :
                                "bg-green-100 text-green-700"
                              }`}>
                                {toTitleCase(report.status || "Pending")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {report.createdAt ? new Date(report.createdAt).toLocaleTimeString() : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <div className="flex h-full w-full bg-white relative">
              {/* Left Panel - Active Alerts */}
              <div className="w-96 flex flex-col border-r border-slate-200 overflow-hidden relative z-10">
                {/* Header with Groq AI Button */}
                <div className="p-6 border-b border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Active Alerts</h2>
                    {/* Groq AI Priority Analysis Button */}
                    {reports.filter(r => r.severity === 'critical').length > 0 && (
                      <button
                        onClick={() => analyzeWithGroq('en')}
                        disabled={loadingGroqAnalysis}
                        className="px-2 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Use Groq AI to prioritize critical reports"
                      >
                        {loadingGroqAnalysis ? (
                          <>
                            <span className="animate-spin">⊙</span>
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <span>AI Priority</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Groq AI Priority Results */}
                  {groqPriorities && groqPriorities.analysis?.priorityOrder && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs">
                      <div className="font-semibold text-purple-900 mb-2">🤖 AI Priorities:</div>
                      <div className="space-y-1.5">
                        {groqPriorities.analysis.priorityOrder.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="bg-white rounded px-2 py-1.5 border border-purple-100">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-xs min-w-fit">
                                #{item.priority}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-xs truncate">{item.recommendation}</p>
                                <p className="text-purple-600 text-xs mt-0.5">Score: {(item.urgencyScore || 0).toFixed(1)}/10</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-purple-600 text-xs mt-2 font-medium">
                        💡 {groqPriorities.analysis.overallRecommendation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Search and Filter Section */}
                <div className="p-4 border-b border-slate-200 space-y-3 relative z-20">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Severity Filter Dropdown */}
                  <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 relative z-20"
                  >
                    <option value="All">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Real Alert Cards from Database */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {reports && reports.length > 0 ? (
                    reports
                      .filter(alert => alert.status !== 'Resolved' && alert.status !== 'resolved') // Hide resolved reports
                      .filter(alert => {
                        // Filter by search query (location)
                        if (searchQuery && !((alert.locationName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (alert.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (alert.disasterType || '').toLowerCase().includes(searchQuery.toLowerCase()))) {
                          return false;
                        }
                        // Filter by severity
                        if (filterSeverity && filterSeverity !== 'All' && alert.severity !== filterSeverity.toLowerCase()) {
                          return false;
                        }
                        return true;
                      })
                      .map((alert) => {
                      const getSeverityColor = (status) => {
                        if (status === "Responded" || status === "resolved") return "bg-green-100 text-green-700";
                        if (status === "Pending" || status === "pending") return "bg-blue-100 text-blue-700";
                        return "bg-orange-100 text-orange-700";
                      };

                      const getSeverityBadgeColor = (severity) => {
                        if (severity === "critical") return "bg-red-100 text-red-700";
                        if (severity === "high") return "bg-orange-100 text-orange-700";
                        if (severity === "medium") return "bg-yellow-100 text-yellow-700";
                        return "bg-green-100 text-green-700";
                      };

                      const mlConfidence = getAlertConfidence(alert);
                      const legitimacyScore = Math.round(mlConfidence * 100);
                      const fakeAlarmRisk = 0; // Will be set after AI verification

                      return (
                        <div 
                          key={alert._id} 
                          className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            if (mapRef.current && alert.lat && alert.lng) {
                              mapRef.current.setView([alert.lat, alert.lng], 17);
                            }
                          }}
                          title={alert.message || alert.description || "No details available"}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{alert.disasterType || "Emergency"}</p>
                            </div>
                            <div className="flex gap-2 items-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadgeColor(alert.severity)}`}>
                                {toTitleCase(alert.severity || "Medium")}
                              </span>
                              
                              {/* Groq AI Priority Badge */}
                              {groqPriorities && groqPriorities.analysis?.priorityOrder && (
                                (() => {
                                  const priorityItem = groqPriorities.analysis.priorityOrder.find(
                                    p => p.reportId === alert._id || p.report?._id === alert._id
                                  );
                                  return priorityItem ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-purple-200 text-purple-800 border border-purple-300" title={priorityItem.recommendation}>
                                      <span>#{priorityItem.priority}</span>
                                    </span>
                                  ) : null;
                                })()
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{alert.locationName || alert.location || "Unknown location"}</p>
                          
                          {/* AI Legitimacy Score */}
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-2 rounded mb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">AI Detector:</span>
                              <div className="flex items-center gap-1 relative">
                                <span 
                                  className={`px-2 py-0.5 rounded text-xs font-bold cursor-help transition-all ${legitimacyScore >= 70 ? 'bg-green-200 text-green-800' : legitimacyScore >= 50 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}
                                  onMouseEnter={() => setHoveredAlertId(alert._id)}
                                  onMouseLeave={() => setHoveredAlertId(null)}
                                >
                                  {legitimacyScore}%
                                </span>
                                
                                {/* AI Summary Tooltip */}
                                {hoveredAlertId === alert._id && (
                                  <div className="fixed z-[9999] w-80 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 p-3 text-xs leading-relaxed" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -100%)', marginTop: '-12px' }}>
                                    {generateAISummary(alert, reportSource).split('\n').map((line, idx) => (
                                      <div key={idx} className="mb-1">
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {fakeAlarmRisk > 0 && (
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                                    {fakeAlarmRisk}% Fake
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.status)}`}>
                            {toTitleCase(alert.status || "Pending")}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-20 text-slate-500">
                      <p className="text-sm">No active reports</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Map */}
              <div className="flex-1 relative overflow-hidden">
                <MapContainer
                  ref={mapRef}
                  center={[8.1575, 125.1276]}
                  zoom={13}
                  className="w-full h-full"
                  style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0}}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {(() => {
                    const activeReports = reports?.filter(r => 
                      r.status === 'new' || 
                      r.status === 'acknowledged' || 
                      r.status === 'in_progress' || 
                      r.status === 'Pending' || 
                      r.status === 'Ongoing'
                    ) || [];
                    const getAlertKey = (alert) => alert?._id || alert?.id || `${alert?.lat || 0},${alert?.lng || 0}`;
                    const fireReportsWithCoordinates = activeReports.filter(alert =>
                      isFireIncident(alert?.disasterType) && Number.isFinite(alert?.lat) && Number.isFinite(alert?.lng)
                    );

                    const nearestHydrantByAlertKey = {};
                    fireReportsWithCoordinates.forEach((alert) => {
                      const nearest = findNearestHydrant(alert.lat, alert.lng);
                      if (nearest) {
                        nearestHydrantByAlertKey[getAlertKey(alert)] = nearest;
                      }
                    });

                    const nearestHydrantIds = new Set(
                      Object.values(nearestHydrantByAlertKey).map((entry) => entry.hydrant.id)
                    );

                    return (
                      <>
                        {activeReports.length > 0 && activeReports.map((alert) => {
                    const getSeverityIconColor = (severity) => {
                      if (severity === "critical") return "#DC2626";
                      if (severity === "high") return "#F97316";
                      if (severity === "medium") return "#FBBF24";
                      return "#10B981";
                    };

                    const mlConfidence = getAlertConfidence(alert);
                    const legitimacyScore = Math.round(mlConfidence * 100);
                    const fakeAlarmRisk = 0; // Will be set after AI verification
                    const alertKey = getAlertKey(alert);
                    const nearestHydrantInfo = nearestHydrantByAlertKey[alertKey];

                    const severityColor = getSeverityIconColor(alert.severity);

                    // Create location pin icon - colored by severity, small size
                    const severityIcon = L.icon({
                      iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${severityColor}" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12c0 7 10 13 10 13s10-6 10-13c0-5.52-4.48-10-10-10zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`)}`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 24],
                      popupAnchor: [0, -24],
                      className: 'severity-marker'
                    });

                    return (alert.lat && alert.lng) ? (
                      <React.Fragment key={alert._id}>
                        <Circle
                          center={[alert.lat, alert.lng]}
                          radius={200}
                          pathOptions={{
                            color: severityColor,
                            fillColor: severityColor,
                            fillOpacity: 0.1,
                            weight: 1,
                            opacity: 0.4,
                          }}
                        />
                        <Marker
                          key={alert._id}
                          position={[alert.lat, alert.lng]}
                          icon={severityIcon}
                          eventHandlers={{
                            click: () => {
                              if (mapRef.current) {
                                mapRef.current.setView([alert.lat, alert.lng], 17);
                              }
                            }
                          }}
                        >
                          <Popup>
                            <div className="w-56">
                              <h3 className="font-semibold text-slate-900">
                                {alert.disasterType || "Emergency"}
                              </h3>
                              <p className="text-xs text-slate-600 mt-2">
                                <strong>Location:</strong> {alert.locationName || alert.location || "Unknown"}
                              </p>
                              <p className="text-xs text-slate-600">
                                <strong>Status:</strong> {toTitleCase(alert.status || "Pending")}
                              </p>
                              <p className="text-xs text-slate-600">
                                <strong>Severity:</strong> <span className={`px-2 py-1 rounded text-xs font-medium ${alert.severity === "critical" ? "bg-red-100 text-red-700" : alert.severity === "high" ? "bg-orange-100 text-orange-700" : alert.severity === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{toTitleCase(alert.severity || "Medium")}</span>
                              </p>

                              {/* AI Detector Score in Popup */}
                              <div className="bg-blue-50 p-2 rounded mt-2">
                                <p className="text-xs font-semibold text-slate-700 mb-1">AI Detector:</p>
                                <div className="flex gap-1 relative">
                                  <span 
                                    className={`px-2 py-0.5 rounded text-xs font-bold cursor-help transition-all ${legitimacyScore >= 70 ? 'bg-green-200 text-green-800' : legitimacyScore >= 50 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}
                                    onMouseEnter={() => setHoveredAlertId(alert._id)}
                                    onMouseLeave={() => setHoveredAlertId(null)}
                                  >
                                    {legitimacyScore}%
                                  </span>
                                  
                                  {/* AI Summary Tooltip */}
                                  {hoveredAlertId === alert._id && (
                                    <div className="fixed z-[9999] w-80 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 p-3 text-xs leading-relaxed" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -100%)', marginTop: '-12px' }}>
                                      {generateAISummary(alert, reportSource).split('\n').map((line, idx) => (
                                        <div key={idx} className="mb-1">
                                          {line}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {fakeAlarmRisk > 0 && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                                      {fakeAlarmRisk}% Fake
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 mt-2">
                                Coordinates: {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                              </p>
                              {isFireIncident(alert.disasterType) && nearestHydrantInfo && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <p className="text-xs text-blue-800 font-semibold">Nearest Fire Hydrant</p>
                                  <p className="text-xs text-slate-700">{nearestHydrantInfo.hydrant.name}</p>
                                  <p className="text-xs text-slate-600">
                                    Distance: {nearestHydrantInfo.distanceMeters < 1000
                                      ? `${Math.round(nearestHydrantInfo.distanceMeters)} m`
                                      : `${(nearestHydrantInfo.distanceMeters / 1000).toFixed(2)} km`}
                                  </p>
                                </div>
                              )}
                              {alert.assignedTeam ? (
                                <button
                                  onClick={() => {
                                    setActiveTab("ongoing");
                                  }}
                                  className="w-full mt-4 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                                >
                                  Ongoing
                                </button>
                              ) : (
                                <div className="w-full mt-4 space-y-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        // Fetch full report details from backend
                                        const response = await fetch(`http://localhost:5000/api/reports`);
                                        const result = await response.json();
                                        const fullReport = result.data?.find(r => r._id === alert.id);
                                        if (fullReport) {
                                          console.log('[View Details] Full report fetched with senderPhone:', fullReport.senderPhone);
                                          setSelectedReportForDetails(fullReport);
                                        } else {
                                          console.warn('[View Details] Report not found in list, using alert data');
                                          setSelectedReportForDetails(alert);
                                        }
                                        setShowReportDetailsModal(true);
                                      } catch (err) {
                                        console.error('Error fetching report details:', err);
                                        setSelectedReportForDetails(alert);
                                        setShowReportDetailsModal(true);
                                      }
                                    }}
                                    className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded transition-colors"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAlertForDispatch(alert);
                                      setShowDispatchModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                                  >
                                    Dispatch Team
                                  </button>
                                </div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    ) : null;
                  })}

                        {fireReportsWithCoordinates.length > 0 && FIRE_HYDRANTS.map((hydrant) => (
                          <Marker
                            key={hydrant.id}
                            position={[hydrant.lat, hydrant.lng]}
                            icon={fireHydrantIcon}
                          >
                            <Popup>
                              <div className="w-52">
                                <h3 className="font-semibold text-blue-700">{hydrant.name}</h3>
                                <p className="text-xs text-slate-600 mt-1">Type: Fire Hydrant</p>
                                <p className="text-xs text-slate-500 mt-1">Coordinates: {hydrant.lat.toFixed(6)}, {hydrant.lng.toFixed(6)}</p>
                                {nearestHydrantIds.has(hydrant.id) && (
                                  <p className="text-xs text-blue-800 mt-2 font-semibold">Nearest to active fire alert</p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </>
                    );
                  })()}
                </MapContainer>

                {/* Map Legend - Bottom Right */}
                <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-slate-200" style={{zIndex: 9999, pointerEvents: 'auto'}}>
                  <h4 className="font-semibold text-slate-900 mb-3 text-sm">Alert Severity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-600"></div>
                      <span className="text-xs text-slate-700">Critical</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-slate-700">High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-400"></div>
                      <span className="text-xs text-slate-700">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-600"></div>
                      <span className="text-xs text-slate-700">Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">H</div>
                      <span className="text-xs text-slate-700">Nearest Fire Hydrant (fire alerts)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                    📍 Each pin shows alert location <br/> colored by severity level
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dispatch Modal */}
          {showDispatchModal && selectedAlertForDispatch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Dispatch Team</h2>
                
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600"><strong>Alert ID:</strong> ALT-{(selectedAlertForDispatch._id || selectedAlertForDispatch.id || "0000").substring(0, 12).toUpperCase()}</p>
                  <p className="text-sm text-slate-600"><strong>Type:</strong> {selectedAlertForDispatch.disasterType || selectedAlertForDispatch.type || "Emergency"}</p>
                  <p className="text-sm text-slate-600"><strong>Location:</strong> {selectedAlertForDispatch.locationName || selectedAlertForDispatch.location || "Unknown"}</p>
                  <p className="text-sm text-slate-600">
                    <strong>Severity:</strong> <span className={`px-2 py-1 rounded text-xs font-medium ${selectedAlertForDispatch.severity === "critical" ? "bg-red-100 text-red-700" : selectedAlertForDispatch.severity === "high" ? "bg-orange-100 text-orange-700" : selectedAlertForDispatch.severity === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{selectedAlertForDispatch.severity?.charAt(0).toUpperCase() + selectedAlertForDispatch.severity?.slice(1) || "Medium"}</span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Team to Dispatch:</label>
                  <select 
                    value={selectedTeamForDispatch?.id || selectedTeamForDispatch?._id || ""}
                    onChange={(e) => {
                      const team = dbTeams.find(r => r._id === e.target.value) || dbTeams.find(r => r.id === e.target.value);
                      setSelectedTeamForDispatch(team);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a Team --</option>
                    {(dbTeams || []).map((team) => (
                      <option key={team._id || team.id} value={team._id || team.id}>
                        Team {team.name || team.teamName} - {team.leader?.name || team.teamLeader || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTeamForDispatch && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-slate-700"><strong>Team Name:</strong> {selectedTeamForDispatch.name || selectedTeamForDispatch.teamName || "Unknown"}</p>
                    <p className="text-sm text-slate-700"><strong>Team Leader:</strong> {selectedTeamForDispatch.leader?.name || selectedTeamForDispatch.teamLeader || "Unknown"}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (selectedTeamForDispatch) {
                        dispatchTeam(selectedTeamForDispatch._id || selectedTeamForDispatch.id, selectedAlertForDispatch._id || selectedAlertForDispatch.id);
                      } else {
                        showToast('Please select a team', 'warning');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Dispatch
                  </button>
                  <button
                    onClick={() => {
                      setShowDispatchModal(false);
                      setSelectedAlertForDispatch(null);
                      setSelectedTeamForDispatch(null);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Team Details Modal */}
          {showTeamDetailsModal && selectedTeamDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Team {selectedTeamDetails.name || selectedTeamDetails.teamName}</h2>
                    <p className="text-sm text-slate-600 mt-1">Team Lead: {selectedTeamDetails.leader?.name || selectedTeamDetails.leader || selectedTeamDetails.teamLeader || "Unassigned"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTeamDetailsModal(false);
                      setSelectedTeamDetails(null);
                      setNewMemberName("");
                      setSelectedMemberId("");
                    }}
                    className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Team Members List */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Members ({selectedTeamDetails.members?.length || 0})</h3>
                  {selectedTeamDetails.members && selectedTeamDetails.members.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTeamDetails.members.map((member) => (
                        <div key={member._id || member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{member.name}</p>
                            <p className="text-sm text-slate-600">{member.email}</p>
                            <p className={`text-xs font-medium mt-1 ${selectedTeamDetails.leader && (selectedTeamDetails.leader._id === member._id || selectedTeamDetails.leader === member._id) ? "text-blue-600" : "text-slate-600"}`}>
                              {selectedTeamDetails.leader && (selectedTeamDetails.leader._id === member._id || selectedTeamDetails.leader === member._id) ? "👑 Team Leader" : "Team Member"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {(!selectedTeamDetails.leader || (selectedTeamDetails.leader._id !== member._id && selectedTeamDetails.leader !== member._id)) && (
                              <button
                                onClick={() => handleSetTeamLeader(member._id)}
                                className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-sm rounded-lg transition-colors"
                              >
                                Make Leader
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium text-sm rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No members in this team yet</p>
                  )}
                </div>

                {/* Add Member Section */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Member</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Select Rescuer:</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search or type rescuer name..."
                          value={newMemberName}
                          onChange={(e) => {
                            setNewMemberName(e.target.value);
                            setSelectedMemberId("");
                            setShowMemberDropdown(true);
                          }}
                          onFocus={() => setShowMemberDropdown(true)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && newMemberName.trim()) {
                              handleAddMember();
                            }
                          }}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showMemberDropdown && dbRescuers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-lg z-50">
                            {dbRescuers
                              .filter(
                                (rescuer) =>
                                  newMemberName === "" ||
                                  rescuer.name.toLowerCase().includes(newMemberName.toLowerCase()) ||
                                  (rescuer.username && rescuer.username.toLowerCase().includes(newMemberName.toLowerCase()))
                              )
                              .map((rescuer) => (
                                <button
                                  key={rescuer._id || rescuer.id}
                                  onClick={() => {
                                    setNewMemberName(rescuer.name);
                                    setSelectedMemberId(rescuer._id || rescuer.id);
                                    setShowMemberDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-900 border-b border-slate-200 last:border-b-0"
                                >
                                  <p className="font-medium">{rescuer.name}</p>
                                  <p className="text-xs text-slate-500">@{rescuer.username || rescuer.email?.split("@")[0]}</p>
                                </button>
                              ))}
                            {dbRescuers.filter(
                              (rescuer) =>
                                newMemberName === "" ||
                                rescuer.name.toLowerCase().includes(newMemberName.toLowerCase()) ||
                                (rescuer.username && rescuer.username.toLowerCase().includes(newMemberName.toLowerCase()))
                            ).length === 0 && (
                              <div className="px-4 py-3 text-center text-slate-500 text-sm">
                                No rescuers found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Role:</label>
                      <select
                        value={selectedMemberRole}
                        onChange={(e) => setSelectedMemberRole(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Team Lead">Team Lead</option>
                        <option value="Paramedic">Paramedic</option>
                        <option value="Firefighter">Firefighter</option>
                        <option value="Driver">Driver</option>
                        <option value="Team Member">Team Member</option>
                      </select>
                    </div>

                    <button
                      onClick={handleAddMember}
                      className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Add Member
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowTeamDetailsModal(false);
                      setSelectedTeamDetails(null);
                      setNewMemberName("");
                      setSelectedMemberId("");
                    }}
                    className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Team Location Modal */}
          {showTeamLocationModal && selectedDeployedTeam && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">Deploy Location - Team {selectedDeployedTeam.name}</h2>
                  <button
                    onClick={() => {
                      setShowTeamLocationModal(false);
                      setSelectedDeployedTeam(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Team Info */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-3">Team Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Team Name</p>
                      <p className="text-base font-semibold text-slate-900">{selectedDeployedTeam.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Team Leader</p>
                      <p className="text-base font-semibold text-slate-900">{selectedDeployedTeam.leader?.name || selectedDeployedTeam.leader || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Status</p>
                      <p className="text-base font-semibold text-orange-700">🚨 Deployed</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Members</p>
                      <p className="text-base font-semibold text-slate-900">{selectedDeployedTeam.members?.length || 0} members</p>
                    </div>
                  </div>
                  {selectedDeployedTeam.currentMission && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Mission</p>
                      <p className="text-sm text-slate-900">
                        <strong>{selectedDeployedTeam.currentMission?.disasterType || 'Emergency'}</strong> 
                        {selectedDeployedTeam.currentMission?.locationName && ` • ${selectedDeployedTeam.currentMission.locationName}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Team Members Locations */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-900 mb-3">Team Member Locations</h3>
                  {selectedDeployedTeam.members && selectedDeployedTeam.members.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedDeployedTeam.members.map((member) => (
                        <div key={member._id || member.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-slate-900">{member.name}</p>
                              <p className="text-xs text-slate-600">{member.email}</p>
                            </div>
                            {member.location && (
                              <span className="text-green-600 flex items-center gap-1">
                                <span className="text-lg">✓</span>
                              </span>
                            )}
                          </div>
                          {member.location ? (
                            <p className="text-sm text-slate-700">
                              <strong>📍 Location:</strong> {member.location}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-500 italic">📍 Location not available yet</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No team members found</p>
                  )}
                </div>

                {/* Close Button */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowTeamLocationModal(false);
                      setSelectedDeployedTeam(null);
                    }}
                    className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rescuer Profile Modal */}
          {showRescuerProfileModal && selectedRescuerProfile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {selectedRescuerProfile.name?.charAt(0) || "R"}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedRescuerProfile.name}</h2>
                      <p className="text-sm text-slate-600">@{selectedRescuerProfile.username || selectedRescuerProfile.email?.split("@")[0]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowRescuerProfileModal(false);
                      setSelectedRescuerProfile(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Profile Details */}
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Email</p>
                        <p className="text-sm font-medium text-slate-900">{selectedRescuerProfile.email || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Phone</p>
                        <p className="text-sm font-medium text-slate-900">{selectedRescuerProfile.phone || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status & Assignment */}
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Current Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          selectedRescuerProfile.role === "rescuer" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {selectedRescuerProfile.role === "rescuer" ? "Rescuer" : selectedRescuerProfile.status || "Active"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Location</p>
                        <p className="text-sm font-medium text-slate-900">
                          <span className="text-slate-400">●</span> {selectedRescuerProfile.location || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deployment & Alerts */}
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Deployment Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Assigned Alerts</p>
                        <p className="text-sm font-bold text-slate-900">{selectedRescuerProfile.alerts || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Last Updated</p>
                        <p className="text-sm text-slate-900">{selectedRescuerProfile.updated || "Just now"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {selectedRescuerProfile.specialty && (
                    <div className="border-b border-slate-200 pb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Specialization</h3>
                      <p className="text-sm text-slate-900">{selectedRescuerProfile.specialty}</p>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowRescuerProfileModal(false);
                      setSelectedRescuerProfile(null);
                    }}
                    className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Alerts & Reports</h1>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">Monitor and manage all emergency alerts</p>
                </div>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Critical Alert
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Alerts */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Total Alerts</p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">58</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">Today</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Active */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Active</p>
                        <p className="text-4xl font-bold text-red-600 dark:text-red-500 mt-2">23</p>
                      </div>
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">Urgent</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Responded */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Responded</p>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">28</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">In Progress</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolved */}
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">Resolved</p>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-500 mt-2">7</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">Completed</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter Section */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-xs">
                    <input
                      type="text"
                      placeholder="Search alerts by ID, type, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Responded">Responded</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <button className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" title="Settings">
                    <span className="text-slate-600 dark:text-slate-400">≡</span>
                  </button>
                  <button 
                    onClick={handleExport}
                    disabled={exporting || loadingReports}
                    className={`px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                      exporting || loadingReports
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {exporting ? '⏳ Exporting...' : '↓ Export'}
                  </button>
                </div>
                
                {/* Export Status Message */}
                {exportMessage && (
                  <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
                    exportMessage.includes('✓')
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {exportMessage}
                  </div>
                )}

                {/* Error Message */}
                {reportsError && (
                  <div className="mt-3 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm font-medium">
                    ✗ {reportsError}
                  </div>
                )}
              </div>

              {/* Loading State */}
              {loadingReports && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-3 text-slate-600 dark:text-slate-400">Loading reports...</p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loadingReports && reports.length === 0 && (
                <div className="flex items-center justify-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No reports found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting your filters or search query</p>
                  </div>
                </div>
              )}

              {/* Alerts Table */}
              {!loadingReports && reports.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {reports.slice(0, 50).map((report) => {
                        const getSeverityColor = (severity) => {
                          if (severity === "critical") return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
                          if (severity === "high") return "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300";
                          if (severity === "medium") return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300";
                          return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
                        };

                        const getStatusColor = (status) => {
                          const s = String(status || '').toLowerCase();
                          if (s === "resolved") return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
                          if (s === "declined") return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
                          if (s === "pending" || s === "new") return "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                          if (s === "on_the_way" || s === "in_progress") return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
                          if (s === "ongoing") return "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300";
                          return "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                        };

                        return (
                          <tr key={report._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{toTitleCase(report.disasterType)}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{toTitleCase(report.location)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity || "medium")}`}>
                                {toTitleCase(report.severity || "Standard")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status || "Pending")}`}>
                                {toTitleCase(report.status || "Pending")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{report.createdAt || "N/A"}</td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => {
                                  setSelectedReportForDetails(report);
                                  setShowReportDetailsModal(true);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm bg-none border-none cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              )}
            </div>
          )}

          {activeTab === "rescuers" && (
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Rescuer Management</h1>
                  <p className="text-slate-600 text-sm mt-2">Manage and coordinate rescue teams</p>
                </div>
                <button 
                  onClick={() => setShowAddRescuerModal(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                  <span>+</span> Add Rescuer
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Available */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Available</p>
                        <p className="text-4xl font-bold text-green-600 mt-2">{dbRescuers.length}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <AlertCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* On-Duty */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">On-Duty</p>
                        <p className="text-4xl font-bold text-blue-600 mt-2">{(dbRescuers || []).filter(r => r.dutyStatus === 'on-duty').length}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Activity className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Off-Duty */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Off-Duty</p>
                        <p className="text-4xl font-bold text-slate-600 mt-2">{(dbRescuers || []).filter(r => r.dutyStatus === 'off-duty').length}</p>
                      </div>
                      <div className="p-3 bg-slate-100 rounded-lg">
                        <Clock className="w-8 h-8 text-slate-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Responses */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Active Responses</p>
                        <p className="text-4xl font-bold text-orange-600 mt-2">{ongoingRescues.length}</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by name, team, specialty..."
                      value={searchRescuerQuery}
                      onChange={(e) => setSearchRescuerQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select 
                    value={filterRescuerStatus}
                    onChange={(e) => setFilterRescuerStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Status</option>
                    <option>Available</option>
                    <option>On-Duty</option>
                    <option>Off-Duty</option>
                  </select>
                </div>
              </div>

              {/* Rescuers Table */}
              <Card className="border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Assigned Alerts</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Last Updated</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRescuers.length > 0 ? (
                        filteredRescuers.map((rescuer) => (
                          <tr key={rescuer._id || rescuer.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                  {rescuer.name?.charAt(0) || "R"}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{rescuer.name || "N/A"}</p>
                                  <p className="text-xs text-slate-500">@{rescuer.username || rescuer.email?.split("@")[0] || "N/A"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700`}>
                                {rescuer.role === "rescuer" ? "Rescuer" : rescuer.status || "Active"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">●</span>
                                {rescuer.location || "Unassigned"}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{rescuer.alerts || "-"}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{rescuer.updated || "Just now"}</td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleViewRescuerProfile(rescuer)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm bg-none border-none cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                            <p>No rescuers found in the database.</p>
                            <p className="text-sm mt-2">Make sure rescuer accounts have the role "rescuer"</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Teams Section */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Active Teams</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dbTeams && dbTeams.length > 0 ? (
                    dbTeams.map((team) => (
                      <Card key={team._id} className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: team.color || '#10B981' }}
                              >
                                {team.name?.charAt(0) || 'T'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{team.name || 'Team'}</p>
                                <p className="text-xs text-slate-500">
                                  {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              team.status === 'deployed' 
                                ? 'bg-orange-100 text-orange-700' 
                                : team.status === 'standby'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {team.status ? team.status.charAt(0).toUpperCase() + team.status.slice(1) : 'Available'}
                            </span>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            {team.leader && (
                              <div className="text-sm">
                                <p className="text-slate-600 text-xs font-medium">Leader</p>
                                <p className="text-slate-900 font-medium">{team.leader?.name || 'Unassigned'}</p>
                              </div>
                            )}
                            {team.currentMission && (
                              <div className="text-sm">
                                <p className="text-slate-600 text-xs font-medium">Current Mission</p>
                                <p className="text-slate-900 font-medium">
                                  {team.currentMission?.disasterType || 'Emergency'} • {typeof team.currentMission === 'string' ? team.currentMission.substring(0, 8).toUpperCase() : team.currentMission?._id?.toString().substring(0, 8).toUpperCase()}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-slate-500 mb-4 pb-4 border-b border-slate-200">
                            {team.members && team.members.length > 0 ? (
                              <>
                                <p className="font-medium mb-2">Members:</p>
                                <div className="flex flex-wrap gap-1">
                                  {team.members.slice(0, 3).map((member) => (
                                    <span key={member._id} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                                      {member.name?.split(' ')[0] || 'Member'}
                                    </span>
                                  ))}
                                  {team.members.length > 3 && (
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                                      +{team.members.length - 3}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className="italic">No members assigned</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {team.status === 'deployed' && (
                              <>
                                <button
                                  onClick={() => handleViewTeamLocation(team)}
                                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1"
                                >
                                  📍 View Location
                                </button>
                                <button
                                  onClick={() => markTeamAsAvailable(team._id, team.name)}
                                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                                >
                                  ✓ Mark Available
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedTeamDetails(team);
                                setShowTeamDetailsModal(true);
                              }}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors"
                            >
                              Manage Team
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-slate-500">
                      <p>No teams found. Team Alpha, Bravo, Charlie, and Delta should be initialized automatically.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ongoing" && (
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Ongoing Rescues</h1>
                  <p className="text-slate-600 text-sm mt-2">Monitor active rescue operations</p>
                </div>
                <button 
                  onClick={() => fetchOngoingRescues()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                  <span>🔄</span> Refresh
                </button>
              </div>

              {/* Loading State */}
              {loadingOngoingRescues && (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-slate-600">Loading ongoing rescues...</p>
                </div>
              )}

              {/* Error State */}
              {ongoingRescuesError && !loadingOngoingRescues && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{ongoingRescuesError}</p>
                </div>
              )}

              {/* Empty State */}
              {!loadingOngoingRescues && ongoingRescues.length === 0 && !ongoingRescuesError && (
                <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
                  <p className="text-slate-600 text-lg">No ongoing rescues at the moment</p>
                </div>
              )}

              {/* Rescues List */}
              {!loadingOngoingRescues && ongoingRescues.length > 0 && (
                <div className="space-y-4">
                  {ongoingRescues.map((rescue) => (
                    <div 
                      key={rescue._id}
                      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Summary Section */}
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedRescue(expandedRescue === rescue._id ? null : rescue._id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Truck className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">
                                {rescue.mlPredictions?.disasterType || "Emergency Rescue"}
                              </h3>
                              <p className="text-sm text-slate-600">
                                Location: {rescue.locationName || `${rescue.lat.toFixed(4)}, ${rescue.lng.toFixed(4)}`}
                              </p>
                              <p className="text-sm text-slate-600">
                                Reported by: {rescue.userId?.name || rescue.senderName || "Unknown"}
                              </p>
                              {rescue.rescuerMissionStatus === 'on_the_way' && (
                                <p className="text-xs text-blue-700 font-semibold mt-1">Rescuer is on the way</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              Severity: <Badge className="bg-orange-100 text-orange-800 ml-2">{rescue.severity}</Badge>
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Started: {new Date(rescue.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <span className="text-slate-400">
                            {expandedRescue === rescue._id ? "▼" : "▶"}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details Section */}
                      {expandedRescue === rescue._id && (
                        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                          {/* Assigned Team Info */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Assigned Team</h4>
                            {rescue.assignedTeam ? (
                              <div className="bg-white rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{rescue.assignedTeam.name}</p>
                                    <p className="text-sm text-slate-600">
                                      {rescue.assignedTeam.members?.length || 0} members
                                    </p>
                                  </div>
                                </div>

                                {/* Team Members */}
                                {rescue.assignedTeam.members && rescue.assignedTeam.members.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Team Members:</p>
                                    <div className="space-y-2">
                                      {rescue.assignedTeam.members.map((member, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                          <div>
                                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                                            <p className="text-xs text-slate-600">{member.email}</p>
                                          </div>
                                          <div className="text-xs">
                                            <Badge className="bg-green-100 text-green-800">
                                              {member.status || "Available"}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                <p className="text-yellow-800 text-sm">No team assigned yet</p>
                              </div>
                            )}
                          </div>

                          {/* Assigned Rescuer Info */}
                          {rescue.assignedRescuer && rescue.assignedRescuer.rescuerName && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">Primary Rescuer</h4>
                              <div className="bg-white rounded-lg p-4 border border-slate-200">
                                <p className="font-semibold text-slate-900">{rescue.assignedRescuer.rescuerName}</p>
                                <p className="text-sm text-slate-600">
                                  Started at: {new Date(rescue.assignedRescuer.startedAt).toLocaleString()}
                                </p>
                                {rescue.rescuerMissionStatus && rescue.rescuerMissionStatus !== 'none' && (
                                  <p className="text-sm text-slate-600 mt-1">
                                    Rescuer update: <span className="font-semibold uppercase text-blue-700">{String(rescue.rescuerMissionStatus).replace(/_/g, ' ')}</span>
                                    {rescue.rescuerMissionUpdatedAt ? ` (${new Date(rescue.rescuerMissionUpdatedAt).toLocaleString()})` : ''}
                                  </p>
                                )}
                                {rescue.assignedRescuer.rescuerLat && rescue.assignedRescuer.rescuerLng && (
                                  <p className="text-xs text-slate-500 mt-2">
                                    Location: {rescue.assignedRescuer.rescuerLat.toFixed(4)}, {rescue.assignedRescuer.rescuerLng.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Real-Time Map */}
                          {(rescue.assignedRescuer?.rescuerName || rescue.assignedTeam?._id) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">Real-Time Location & Route</h4>
                              <RescueMap
                                rescue={rescue}
                                externalLocationUpdate={
                                  liveRescuerLocations[String(rescue?._id)] ||
                                  liveRescuerLocations[String(rescue?.id)] ||
                                  liveRescuerLocations[String(rescue?.assignedRescuer?.rescuerId)] ||
                                  liveRescuerLocations[String(rescue?.assignedTeam?._id)] ||
                                  null
                                }
                              />
                            </div>
                          )}

                          {/* Rescue Details */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Details</h4>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Status:</span>
                                <span className="font-medium text-orange-600">{getStatusDisplay(rescue.status)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Severity:</span>
                                <span className="font-medium capitalize">{rescue.severity}</span>
                              </div>
                              {rescue.disasterType && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Type:</span>
                                  <span className="font-medium">{rescue.disasterType}</span>
                                </div>
                              )}
                              {rescue.note && (
                                <div>
                                  <span className="text-slate-600 block mb-1">Notes:</span>
                                  <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{rescue.note}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* SITREP Button */}
                          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              📋 Situation Report (SITREP)
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">Open the detailed SITREP form to record casualties, damage assessment, and relief assistance.</p>
                            <button
                              onClick={() => navigate(`/sitrep/${rescue._id}`)}
                              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              📄 Open SITREP Form
                            </button>
                          </div>

                          {/* Action Button */}
                          <div className="pt-4 border-t border-slate-200">
                            {rescue.rescuerMissionStatus === 'resolved' && (
                              <div className="mb-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                                Rescuer marked this mission as resolved. Please verify before final confirmation.
                              </div>
                            )}
                            <button
                              onClick={() => markRescueAsResolved(rescue._id)}
                              disabled={resolvingRescueId === rescue._id}
                              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              {resolvingRescueId === rescue._id ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  Marking as Resolved...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5" />
                                  {rescue.rescuerMissionStatus === 'resolved' ? 'Verify and Mark as Resolved' : 'Mark as Resolved'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Alerts & Reports</h1>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">Monitor and manage all emergency alerts</p>
                </div>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Critical Alert
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Alerts */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Total Alerts</p>
                        <p className="text-4xl font-bold text-slate-900 mt-2">{pagination.total || 0}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Today</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Active */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Active</p>
                        <p className="text-4xl font-bold text-red-600 mt-2">{reports.filter(r => r.status === 'Active' || r.status === 'active').length}</p>
                      </div>
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Urgent</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Responded */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Responded</p>
                        <p className="text-4xl font-bold text-blue-600 mt-2">{reports.filter(r => r.status === 'Responded' || r.status === 'responded').length}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">In Progress</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolved */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">Resolved</p>
                        <p className="text-4xl font-bold text-green-600 mt-2">{reports.filter(r => r.status === 'Resolved' || r.status === 'resolved').length}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Completed</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-xs">
                    <input
                      type="text"
                      placeholder="Search alerts by ID, type, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Responded">Responded</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors" title="Settings">
                    <span className="text-slate-600">≡</span>
                  </button>
                  <button 
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 font-medium disabled:opacity-50"
                  >
                    {exporting ? "Exporting..." : "Export"}
                  </button>
                  {exportMessage && (
                    <span className={`text-xs font-medium ${exportMessage.includes("✓") ? "text-green-600" : "text-red-600"}`}>
                      {exportMessage}
                    </span>
                  )}
                </div>
              </div>

              {/* Alerts Table */}
              <Card className="border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">AI Detector</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(() => {
                        const activeReports = reports?.filter(r => 
                          r.status === 'new' || 
                          r.status === 'acknowledged' || 
                          r.status === 'in_progress' || 
                          r.status === 'on_the_way' ||
                          r.status === 'pending' || 
                          r.status === 'ongoing'
                        ) || [];
                        return activeReports.length > 0 ? (
                          activeReports.map((alert) => {
                          const getSeverityColor = (severity) => {
                            if (severity === "critical") return "bg-red-100 text-red-700";
                            if (severity === "high") return "bg-orange-100 text-orange-700";
                            if (severity === "medium") return "bg-yellow-100 text-yellow-700";
                            return "bg-green-100 text-green-700";
                          };

                          const getStatusColor = (status) => {
                            const s = String(status || '').toLowerCase();
                            if (s === "resolved") return "bg-green-100 text-green-700";
                            if (s === "declined") return "bg-red-100 text-red-700";
                            if (s === "pending" || s === "new") return "bg-slate-100 text-slate-700";
                            if (s === "on_the_way" || s === "in_progress") return "bg-blue-100 text-blue-700";
                            if (s === "ongoing") return "bg-orange-100 text-orange-700";
                            return "bg-slate-100 text-slate-700";
                          };

                          const mlConfidence = getAlertConfidence(alert);
                          const legitimacyScore = Math.round(mlConfidence * 100);
                          const fakeAlarmRisk = 0; // Will be set after AI verification

                          return (
                            <tr key={alert._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-700">{alert.disasterType || "Emergency"}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{alert.locationName || alert.location || "Unknown"}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                  {toTitleCase(alert.severity || "Medium")}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1 relative">
                                  <span 
                                    className={`px-2 py-1 rounded text-xs font-bold cursor-help transition-all ${legitimacyScore >= 70 ? 'bg-green-200 text-green-800' : legitimacyScore >= 50 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}
                                    onMouseEnter={() => setHoveredAlertId(alert._id)}
                                    onMouseLeave={() => setHoveredAlertId(null)}
                                  >
                                    {legitimacyScore}%
                                  </span>
                                  
                                  {/* AI Summary Tooltip */}
                                  {hoveredAlertId === alert._id && (
                                    <div className="fixed z-[9999] w-80 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 p-4 text-xs leading-relaxed" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -100%)', marginTop: '-12px' }}>
                                      {generateAISummary(alert, reportSource).split('\n').map((line, idx) => (
                                        <div key={idx} className="mb-1">
                                          {line}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {fakeAlarmRisk > 0 && (
                                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                                      {fakeAlarmRisk}% Fake
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                                  {getStatusDisplay(alert.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "N/A"}</td>
                              <td className="px-6 py-4">
                                <button 
                                  onClick={() => {
                                    setActiveTab("map");
                                    if (mapRef.current && alert.lat && alert.lng) {
                                      setTimeout(() => {
                                        mapRef.current.setView([alert.lat, alert.lng], 19);
                                      }, 100);
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm bg-none border-none cursor-pointer"
                                >
                                  View on Map
                                </button>
                              </td>
                            </tr>
                          );
                          })
                        ) : (
                          <tr>
                            <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                              <p>No active alerts found</p>
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="p-6 space-y-6">
              {/* Header Section */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Analytics Overview</h1>
                  <p className="text-slate-600 text-sm mt-2">Performance metrics and insights inside Dashboard</p>
                </div>
                <div className="flex items-center gap-3">
                  <select className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                    <option>Last Year</option>
                  </select>
                  <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 font-medium">
                    Export Report
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Alerts */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-600 text-sm font-medium">Total Alerts</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-900 mb-3">{totalAlerts}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">live from reports</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Response Rate */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-600 text-sm font-medium">Response Rate</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-900 mb-3">{responseRate}%</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">(responded + resolved) / total</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Avg Response Time */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-600 text-sm font-medium">Avg Response Time</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-900 mb-3">{avgResponseTimeMinutes.toFixed(1)} min</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">from handled alerts</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Rescuers */}
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-600 text-sm font-medium">Active Rescuers</p>
                    </div>
                    <p className="text-4xl font-bold text-slate-900 mb-3">{activeRescuersCount}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">on-duty or online</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alert Trends by Severity */}
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Alert Trends by Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklySeverityTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                        <Legend />
                        <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} />
                        <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} />
                        <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} />
                        <Line type="monotone" dataKey="low" stroke="#16a34a" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Alerts by Location */}
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Alerts by Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={alertsByLocationData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" />
                        <YAxis dataKey="location" type="category" stroke="#64748b" width={80} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                        <Bar dataKey="count" fill="#1d4ed8" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alert Type Distribution */}
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Alert Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={alertTypeDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#dc2626" />
                          <Cell fill="#f97316" />
                          <Cell fill="#1d4ed8" />
                          <Cell fill="#eab308" />
                          <Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Average Response Time Trend */}
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Average Response Time Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={responseTrendByMonthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                        <Legend />
                        <Line type="monotone" dataKey="time" stroke="#1d4ed8" strokeWidth={2} dot={{ fill: "#1d4ed8", r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Rescuer Team Performance Table */}
              <Card className="border-slate-200 bg-white overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-900">Rescuer Team Performance</CardTitle>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Last 30 Days</span>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Team</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Alerts Resolved</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Avg Response Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {teamPerformanceData.length > 0 ? teamPerformanceData.map((team) => (
                        <tr key={team.team} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{team.team}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{team.resolved}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{team.avgTime}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full ${team.status === "Excellent" ? "bg-green-500" : "bg-blue-500"}`}
                                  style={{ width: `${team.performance}%` }}
                                />
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                team.status === "Excellent" 
                                  ? "bg-green-100 text-green-700" 
                                  : team.status === "Good"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {team.status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No team performance data yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-600 mt-1">Manage your account and system preferences</p>
              </div>

              <div className="flex gap-6">
                {/* Left Sidebar - Settings Navigation */}
                <div className="w-56 flex-shrink-0">
                  <Card className="border-slate-200 bg-white overflow-hidden">
                    <div className="p-4 space-y-2">
                      {[
                        { id: 'profile', label: 'Profile Settings' },
                        { id: 'users', label: 'User Management' },
                        { id: 'feedback', label: 'User Feedback' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSettingsTab(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                            selectedSettingsTab === item.id
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Right Content Area */}
                <div className="flex-1">
                  {/* Profile Settings */}
                  {selectedSettingsTab === 'profile' && (
                    <Card className="border-slate-200 bg-white">
                      <CardHeader>
                        <CardTitle className="text-slate-900">Profile</CardTitle>
                        <p className="text-slate-600 text-sm mt-1">Update your photo and personal details here.</p>
                      </CardHeader>
                      <CardContent className="p-8 space-y-8">
                        {/* Profile Picture Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 mb-4">Profile Picture</h3>
                          <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden">
                              {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                user?.name?.charAt(0)?.toUpperCase() || 'A'
                              )}
                            </div>
                            <div>
                              <label htmlFor="photo-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer">
                                <span>⬆ Upload Image</span>
                              </label>
                              <button
                                onClick={() => {
                                  setProfilePicture(null);
                                  showToast('Profile picture removed', 'success');
                                }}
                                className="ml-2 inline-flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                              >
                                ⊗ Remove
                              </button>
                              <input 
                                id="photo-upload"
                                type="file" 
                                accept="image/png,image/jpeg,image/gif" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file && file.size <= 10 * 1024 * 1024) {
                                    try {
                                      const compressedImage = await compressImage(file);
                                      setProfilePicture(compressedImage);
                                      showToast('Photo selected. Click Save Changes to upload.', 'info');
                                    } catch (err) {
                                      console.error('Failed to process photo:', err);
                                      showToast('Failed to process photo', 'error');
                                    }
                                  } else {
                                    showToast('File must be less than 10MB', 'warning');
                                  }
                                }}
                                className="hidden"
                              />
                              <p className="text-xs text-slate-500 mt-2">We support PNGs, JPEGs, and GIFs under 10MB</p>
                            </div>
                          </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                          {/* Full Name and Username */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                              <input 
                                type="text" 
                                value={profileData.name}
                                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="Enter your full name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                              <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                                <span className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium border-r border-slate-300">grovia.xyz/</span>
                                <input 
                                  type="text" 
                                  value={profileData.username}
                                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                                  className="flex-1 px-4 py-2 bg-white text-slate-900 focus:outline-none"
                                  placeholder="username"
                                />
                              </div>
                              <p className="text-xs text-slate-500 mt-1">This is your login username</p>
                            </div>
                          </div>

                          {/* Phone Number and Email */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white overflow-hidden">
                                <select className="px-3 py-2 bg-white border-r border-slate-300 focus:outline-none cursor-pointer text-sm">
                                  <option value="PH">🇵🇭 +63</option>
                                  <option value="US">🇺🇸 +1</option>
                                  <option value="IN">🇮🇳 +91</option>
                                  <option value="CN">🇨🇳 +86</option>
                                </select>
                                <input 
                                  type="tel" 
                                  value={profileData.phone}
                                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                  className="flex-1 px-4 py-2 bg-white text-slate-900 focus:outline-none"
                                  placeholder="9123456789"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                              <input 
                                type="email" 
                                value={profileData.email}
                                disabled
                                className="w-full px-4 py-2 border border-slate-300 bg-slate-100 text-slate-600 rounded-lg cursor-not-allowed"
                              />
                              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                            </div>
                          </div>

                          {/* Job Title */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Job Title</label>
                            <input 
                              type="text" 
                              value={profileData.jobTitle}
                              onChange={(e) => setProfileData({...profileData, jobTitle: e.target.value})}
                              className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g. Emergency Coordinator"
                            />
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-200"></div>

                        {/* Change Password Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                              <div className="relative">
                                <input 
                                  type={showPasswords.current ? "text" : "password"}
                                  value={profileData.currentPassword}
                                  onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                                  className="w-full px-4 py-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                >
                                  {showPasswords.current ? '🙈' : '👁️'}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                              <div className="relative">
                                <input 
                                  type={showPasswords.new ? "text" : "password"}
                                  value={profileData.newPassword}
                                  onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                                  className="w-full px-4 py-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                >
                                  {showPasswords.new ? '🙈' : '👁️'}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                              <div className="relative">
                                <input 
                                  type={showPasswords.confirm ? "text" : "password"}
                                  value={profileData.confirmPassword}
                                  onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                                  className="w-full px-4 py-2 pr-10 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                >
                                  {showPasswords.confirm ? '🙈' : '👁️'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-4">
                          <button 
                            onClick={handleSaveProfile}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Save Changes
                          </button>
                          <button 
                            onClick={() => setProfileData({
                              name: user?.name || "",
                              email: user?.email || "",
                              username: user?.username || "",
                              phone: user?.phone || "+63",
                              jobTitle: user?.jobTitle || "",
                              currentPassword: "",
                              newPassword: "",
                              confirmPassword: "",
                            })}
                            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notifications */}
                  {filterStatus === 'notifications' && (
                    <Card className="border-slate-200 bg-white">
                      <CardHeader>
                        <CardTitle className="text-slate-900">Notification Preferences</CardTitle>
                        <p className="text-slate-600 text-sm mt-1">Configure how you receive alerts and updates</p>
                      </CardHeader>
                      <CardContent className="p-6 space-y-8">
                        {/* Alert Notifications */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 mb-4">Alert Notifications</h3>
                          <div className="space-y-3">
                            {[
                              { label: 'Critical Alerts', desc: 'Receive immediate notifications for critical emergencies' },
                              { label: 'High Priority Alerts', desc: 'Get notified about high priority incidents' },
                              { label: 'Medium Priority Alerts', desc: 'Receive updates on medium priority events', disabled: true },
                              { label: 'Low Priority Alerts', desc: 'Get notified about low priority alerts', disabled: true },
                            ].map((notif) => (
                              <div key={notif.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-slate-900">{notif.label}</p>
                                  <p className="text-xs text-slate-600">{notif.desc}</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full transition-colors ${!notif.disabled ? 'bg-blue-600' : 'bg-slate-300'}`} />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notification Channels */}
                        <div className="border-t border-slate-200 pt-6">
                          <h3 className="text-sm font-semibold text-slate-900 mb-4">Notification Channels</h3>
                          <div className="space-y-3">
                            {[
                              { label: 'Email Notifications', enabled: true },
                              { label: 'SMS Alerts', enabled: true },
                              { label: 'Push Notifications', enabled: false },
                              { label: 'Desktop Notifications', enabled: true },
                            ].map((channel) => (
                              <div key={channel.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <p className="font-medium text-slate-900">{channel.label}</p>
                                <div className={`w-12 h-6 rounded-full transition-colors ${channel.enabled ? 'bg-blue-600' : 'bg-slate-300'}`} />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-200">
                          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Save Preferences</button>
                          <button className="px-6 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Reset to Default</button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* API Keys */}
                  {filterStatus === 'api' && (
                    <Card className="border-slate-200 bg-white">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-slate-900">API Keys</CardTitle>
                            <p className="text-slate-600 text-sm mt-1">Manage API keys for integrations</p>
                          </div>
                          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                            <span>+</span> Generate New Key
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {[
                          { name: 'Production API Key', created: '2024-01-15', status: 'Active', key: 'sk_live_****************************abc123', used: '2 hours ago' },
                          { name: 'Development API Key', created: '2024-02-20', status: 'Active', key: 'sk_test_****************************def456', used: '1 day ago' },
                        ].map((api) => (
                          <div key={api.name} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-slate-900">{api.name}</p>
                                <p className="text-xs text-slate-500">Created on {api.created}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${api.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                {api.status}
                              </span>
                            </div>
                            <p className="font-mono text-sm text-slate-600 mb-3 break-all">{api.key}</p>
                            <p className="text-xs text-slate-500 mb-3">Last used: {api.used}</p>
                            <div className="flex gap-2">
                              <button className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors">👁️</button>
                              <button className="p-2 text-slate-600 hover:bg-slate-200 rounded transition-colors">📋</button>
                              <button className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Integrations */}
                  {filterStatus === 'integrations' && (
                    <Card className="border-slate-200 bg-white">
                      <CardHeader>
                        <CardTitle className="text-slate-900">Integrations</CardTitle>
                        <p className="text-slate-600 text-sm mt-1">Connect external services and tools</p>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {[
                          { name: 'Google Maps', desc: 'Map visualization and geocoding', connected: true },
                          { name: 'Twilio SMS', desc: 'Send SMS alerts to rescuers and citizens', connected: true },
                          { name: 'SendGrid Email', desc: 'Email notifications and reports', connected: true },
                          { name: 'Slack', desc: 'Team communication and alerts', connected: false },
                          { name: 'Emergency Services API', desc: 'Direct integration with 911 dispatch', connected: true },
                        ].map((integration) => (
                          <div key={integration.name} className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="font-semibold text-slate-900">{integration.name}</p>
                              <p className="text-sm text-slate-600">{integration.desc}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${integration.connected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                {integration.connected ? 'Connected' : 'Not Connected'}
                              </span>
                              <button className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                                integration.connected 
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}>
                                {integration.connected ? 'Configure' : 'Connect'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {selectedSettingsTab === 'feedback' && (
                    <Card className="border-slate-200 bg-white">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-slate-900">User Feedback Inbox</CardTitle>
                            <p className="text-slate-600 text-sm mt-1">Review feedback submitted by users, including sender identity details.</p>
                          </div>
                          <button
                            onClick={fetchUserFeedback}
                            disabled={loadingUserFeedback}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-60"
                          >
                            {loadingUserFeedback ? 'Refreshing...' : 'Refresh'}
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loadingUserFeedback ? (
                          <p className="text-sm text-slate-500">Loading feedback...</p>
                        ) : userFeedbackError ? (
                          <p className="text-sm text-red-600">{userFeedbackError}</p>
                        ) : userFeedbackList.length === 0 ? (
                          <p className="text-sm text-slate-500">No user feedback received yet.</p>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Sender</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Phone</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Category</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Message</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Submitted</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {userFeedbackList.map((entry) => (
                                  <tr key={entry._id} className="hover:bg-slate-50 transition-colors align-top">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.senderName || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{entry.senderEmail || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{entry.senderPhone || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 capitalize">{entry.category || 'general'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 max-w-xs whitespace-pre-wrap">{entry.message}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        entry.isReadByAdmin ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {entry.isReadByAdmin ? 'Read' : 'Unread'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {!entry.isReadByAdmin ? (
                                        <button
                                          onClick={() => handleMarkFeedbackRead(entry._id)}
                                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                                        >
                                          Mark Read
                                        </button>
                                      ) : (
                                        <span className="text-xs text-slate-500">Completed</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* User Management */}
                  {selectedSettingsTab === 'users' && (
                    <div className="space-y-6">
                      {/* ADMIN ACCOUNTS */}
                      <Card className="border-slate-200 bg-white">
                        <CardHeader>
                          <CardTitle className="text-slate-900">🛡️ Admin Accounts</CardTitle>
                          <p className="text-slate-600 text-sm mt-1">Create and manage administrator accounts. Admins can log in using either username or email.</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                              <input
                                type="text"
                                value={newAdmin.name}
                                onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="Admin full name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                              <input
                                type="text"
                                value={newAdmin.username}
                                onChange={(e) => setNewAdmin((prev) => ({ ...prev, username: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="Unique username"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Email (Required for Forgot Password)</label>
                              <input
                                type="email"
                                value={newAdmin.email}
                                onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="admin@example.com"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Number</label>
                              <input
                                type="text"
                                value={newAdmin.phone}
                                onChange={(e) => setNewAdmin((prev) => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="+63XXXXXXXXXX"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                              <input
                                type="password"
                                value={newAdmin.password}
                                onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="Set initial password"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={handleAddAdminAccount}
                              disabled={creatingAdmin}
                              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                              {creatingAdmin ? 'Creating...' : 'Add Admin Account'}
                            </button>
                          </div>

                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Username</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Number</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {allUsers && allUsers.filter((r) => String(r?.role || '').toLowerCase() === 'admin').length > 0 ? (
                                  allUsers
                                    .filter((r) => String(r?.role || '').toLowerCase() === 'admin')
                                    .map((admin) => (
                                      <tr key={admin._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{admin.name || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{admin.username || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{admin.email || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{admin.phone || '-'}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            admin.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                          }`}>
                                            {admin.blocked ? 'Blocked' : 'Active'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
                                ) : (
                                  <tr>
                                    <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">No admin accounts found</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>

                      {/* REGULAR USERS */}
                      <Card className="border-slate-200 bg-white">
                        <CardHeader>
                          <CardTitle className="text-slate-900">👥 Regular Users</CardTitle>
                          <p className="text-slate-600 text-sm mt-1">Manage regular app users and prevent spam alerts</p>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Alerts Submitted</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {allUsers && allUsers.filter((r) => {
                                const role = String(r?.role || '').toLowerCase();
                                return role === 'user' || role === 'citizen' || role === '';
                              }).length > 0 ? (
                                allUsers
                                  .filter((r) => {
                                    const role = String(r?.role || '').toLowerCase();
                                    return role === 'user' || role === 'citizen' || role === '';
                                  })
                                  .map((user) => (
                                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                          {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <p className="font-medium text-slate-900">{user.name}</p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        user.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                      }`}>
                                        {user.blocked ? 'Blocked' : 'Active'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">-</td>
                                    <td className="px-6 py-4 flex gap-2">
                                      <button
                                        onClick={async () => {
                                          setSelectedUserForDetails(user);
                                          try {
                                            const res = await API.get(`/reports`);
                                            // Filter reports to only show ones from this specific user
                                            const userReports = (res.data?.data || []).filter(report => {
                                              // Handle both ObjectId and string comparisons
                                              const reportUserId = typeof report.userId === 'object' ? report.userId?._id : report.userId;
                                              return reportUserId?.toString() === user._id?.toString();
                                            });
                                            console.log(`Found ${userReports.length} reports for user ${user.name} (${user._id})`);
                                            setUserReportHistory(userReports);
                                            setShowUserDetailsModal(true);
                                          } catch (err) {
                                            console.error('Error fetching user reports:', err);
                                            setUserReportHistory([]);
                                            setShowUserDetailsModal(true);
                                          }
                                        }}
                                        className="font-medium text-sm px-3 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                                      >
                                        View Details
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          try {
                                            const res = await API.patch(`/auth/${user._id}/block-status`, { blocked: !user.blocked });
                                            await Promise.all([fetchRescuersAndTeams(), fetchAllUsers()]);
                                            showToast(`User ${user.blocked ? 'unblocked' : 'blocked'} successfully!`, 'success');
                                          } catch (err) {
                                            showToast('Failed to update user status', 'error');
                                          }
                                        }}
                                        className={`font-medium text-sm px-3 py-1 rounded-lg transition-colors ${
                                          user.blocked 
                                            ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                            : 'bg-red-100 hover:bg-red-200 text-red-700'
                                        }`}
                                      >
                                        {user.blocked ? 'Unblock' : 'Block'}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No regular users found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>

                      {/* RESCUERS */}
                      <Card className="border-slate-200 bg-white">
                        <CardHeader>
                          <CardTitle className="text-slate-900">🚨 Rescuers Account</CardTitle>
                          <p className="text-slate-600 text-sm mt-1">Manage rescuer accounts and prevent unauthorized access</p>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Account Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Duty Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Team</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {allUsers && allUsers.filter((r) => String(r?.role || '').toLowerCase() === 'rescuer').length > 0 ? (
                                allUsers
                                  .filter((r) => String(r?.role || '').toLowerCase() === 'rescuer')
                                  .map((rescuer) => (
                                  <tr key={rescuer._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                          {rescuer.name?.charAt(0) || 'R'}
                                        </div>
                                        <p className="font-medium text-slate-900">{rescuer.name}</p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{rescuer.email}</td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        rescuer.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                      }`}>
                                        {rescuer.blocked ? 'Blocked' : 'Active'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <select
                                        value={rescuer.dutyStatus || 'off-duty'}
                                        onChange={async (e) => {
                                          const newStatus = e.target.value;
                                          try {
                                            await API.patch(`/auth/${rescuer._id}/duty-status`, { dutyStatus: newStatus });
                                            await Promise.all([fetchRescuersAndTeams(), fetchAllUsers()]);
                                            showToast(`Rescuer ${rescuer.name} duty status updated to ${newStatus === 'on-duty' ? 'On-Duty' : 'Off-Duty'}!`, 'success');
                                          } catch (err) {
                                            console.error('Error updating duty status:', err);
                                            showToast('Failed to update duty status', 'error');
                                          }
                                        }}
                                        className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                          rescuer.dutyStatus === 'on-duty'
                                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-700'
                                        }`}
                                      >
                                        <option value="on-duty">On-Duty</option>
                                        <option value="off-duty">Off-Duty</option>
                                      </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">-</td>
                                    <td className="px-6 py-4 flex gap-2">
                                      <button
                                        onClick={async () => {
                                          setSelectedRescuerForDetails(rescuer);
                                          try {
                                            const res = await API.get(`/rescue`);
                                            // Filter rescues to only show ones where this rescuer was assigned
                                            const rescuerRescues = (res.data || []).filter(r => {
                                              // Handle string and ObjectId comparisons
                                              const rescuerIdStr = rescuer._id?.toString();
                                              const assignedIds = (r.assignedRescuers || []).map(id => id?.toString());
                                              return assignedIds.includes(rescuerIdStr) || r.rescuerId?.toString() === rescuerIdStr;
                                            });
                                            console.log(`Found ${rescuerRescues.length} rescues for rescuer ${rescuer.name} (${rescuer._id})`);
                                            setRescuerRescueHistory(rescuerRescues);
                                            setShowRescuerDetailsModal(true);
                                          } catch (err) {
                                            console.error('Error fetching rescuer rescues:', err);
                                            setRescuerRescueHistory([]);
                                            setShowRescuerDetailsModal(true);
                                          }
                                        }}
                                        className="font-medium text-sm px-3 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                                      >
                                        View Details
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          try {
                                            const res = await API.patch(`/auth/${rescuer._id}/block-status`, { blocked: !rescuer.blocked });
                                            await Promise.all([fetchRescuersAndTeams(), fetchAllUsers()]);
                                            showToast(`Rescuer ${rescuer.blocked ? 'unblocked' : 'blocked'} successfully!`, 'success');
                                          } catch (err) {
                                            showToast('Failed to update rescuer status', 'error');
                                          }
                                        }}
                                        className={`font-medium text-sm px-3 py-1 rounded-lg transition-colors ${
                                          rescuer.blocked 
                                            ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                            : 'bg-red-100 hover:bg-red-200 text-red-700'
                                        }`}
                                      >
                                        {rescuer.blocked ? 'Unblock' : 'Block'}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No rescuers found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Rescuer Modal */}
      {showAddRescuerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Rescuer</h2>
              <button 
                onClick={() => setShowAddRescuerModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Full Name *</label>
                <input
                  type="text"
                  value={newRescuer.name}
                  onChange={(e) => setNewRescuer({ ...newRescuer, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Email *</label>
                <input
                  type="email"
                  value={newRescuer.email}
                  onChange={(e) => setNewRescuer({ ...newRescuer, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Phone *</label>
                <input
                  type="tel"
                  value={newRescuer.phone}
                  onChange={(e) => setNewRescuer({ ...newRescuer, phone: e.target.value })}
                  placeholder="+63 9123456789"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Specialty</label>
                <input
                  type="text"
                  value={newRescuer.specialty}
                  onChange={(e) => setNewRescuer({ ...newRescuer, specialty: e.target.value })}
                  placeholder="Fire Safety, Medical, etc."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">Team</label>
                <select
                  value={newRescuer.team}
                  onChange={(e) => setNewRescuer({ ...newRescuer, team: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a team</option>
                  <option value="Fire Department">Fire Department</option>
                  <option value="Medical">Medical Response</option>
                  <option value="Rescue">Rescue Operations</option>
                  <option value="Disaster">Disaster Management</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
                <select
                  value={newRescuer.status}
                  onChange={(e) => setNewRescuer({ ...newRescuer, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Available">Available</option>
                  <option value="On-Duty">On-Duty</option>
                  <option value="Off-Duty">Off-Duty</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowAddRescuerModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRescuer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Rescuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
          <div className="bg-white shadow-xl w-full max-w-sm h-screen max-h-screen flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-600">No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notif.isRead ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      // Mark as read
                      setNotifications(prev => 
                        prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
                      );
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        notif.type === "alert" ? "bg-red-600" :
                        notif.type === "rescuer" ? "bg-blue-600" :
                        notif.type === "system" ? "bg-green-600" :
                        "bg-slate-600"
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{notif.title || notif.message}</p>
                        {notif.message && notif.title !== notif.message && (
                          <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : notif.time || 'Just now'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="w-full py-3 text-center text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-200 transition-colors"
              >
                Clear All Notifications
              </button>
            )}
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetailsModal && selectedReportForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">Alert Details</h2>
              <button 
                onClick={() => setShowReportDetailsModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Alert ID and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Alert ID</p>
                  <p className="text-lg font-bold text-slate-900">{selectedReportForDetails._id?.substring(0, 12).toUpperCase() || "N/A"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedReportForDetails.status === "resolved" ? "bg-green-100 text-green-700" :
                    selectedReportForDetails.status === "declined" ? "bg-red-100 text-red-700" :
                    selectedReportForDetails.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {toTitleCase(selectedReportForDetails.status || "Pending")}
                  </span>
                </div>
              </div>

              {/* Alert Information */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Alert Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Disaster Type</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">{selectedReportForDetails.disasterType || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Severity</p>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedReportForDetails.severity === "critical" ? "bg-red-100 text-red-700" :
                        selectedReportForDetails.severity === "high" ? "bg-orange-100 text-orange-700" :
                        selectedReportForDetails.severity === "moderate" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {toTitleCase(selectedReportForDetails.severity || "Low")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Location</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">{selectedReportForDetails.locationName || selectedReportForDetails.location || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Coordinates</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">{selectedReportForDetails.lat?.toFixed(4)}, {selectedReportForDetails.lng?.toFixed(4)}</p>
                  </div>
                </div>
                {selectedReportForDetails.note && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 font-medium">Details/Notes</p>
                    <p className="text-base text-slate-800 mt-2 bg-slate-50 p-3 rounded">{selectedReportForDetails.note}</p>
                  </div>
                )}
              </div>

              {/* Sender Information */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Alert Sender</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedReportForDetails.senderName?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 font-medium">Sender Name</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedReportForDetails.senderName || "Anonymous"}</p>
                    {selectedReportForDetails.senderPhone && (
                      <p className="text-sm text-slate-700 mt-2">📞 {selectedReportForDetails.senderPhone}</p>
                    )}
                    {selectedReportForDetails.userId && (
                      <p className="text-xs text-slate-500 mt-1">User ID: {typeof selectedReportForDetails.userId === 'string' ? selectedReportForDetails.userId : selectedReportForDetails.userId?._id || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Response Information */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Response Information</h3>
                {selectedReportForDetails.assignedTeam ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600 font-medium">Assigned Team</p>
                      <p className="text-base font-semibold text-slate-900 mt-1">
                        {typeof selectedReportForDetails.assignedTeam === 'string' 
                          ? selectedReportForDetails.assignedTeam 
                          : selectedReportForDetails.assignedTeam?.name || "Unknown Team"}
                      </p>
                    </div>
                    {selectedReportForDetails.assignedRescuer?.rescuerName && (
                      <div>
                        <p className="text-sm text-slate-600 font-medium">Lead Rescuer</p>
                        <p className="text-base font-semibold text-slate-900 mt-1">{selectedReportForDetails.assignedRescuer.rescuerName}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-600 italic">No team assigned yet</p>
                )}
              </div>

              {/* AI Detection Information */}
              <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Detection Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Legitimacy Score</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-full rounded-full ${
                            getAlertConfidence(selectedReportForDetails) >= 0.7 ? "bg-green-500" :
                            getAlertConfidence(selectedReportForDetails) >= 0.5 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${getAlertConfidence(selectedReportForDetails) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{Math.round(getAlertConfidence(selectedReportForDetails) * 100)}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Prediction Confidence</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(selectedReportForDetails.mlPredictions?.overall?.confidence || 0.75) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{Math.round((selectedReportForDetails.mlPredictions?.overall?.confidence || 0.75) * 100)}%</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-md border border-blue-100 bg-white text-sm text-slate-700 whitespace-pre-line">
                  {generateAISummary(selectedReportForDetails, reportSource)}
                </div>
              </div>

              {/* Timeline Information */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-slate-600 font-medium">Created</p>
                      <p className="text-sm text-slate-900 mt-1">{selectedReportForDetails.createdAt ? new Date(selectedReportForDetails.createdAt).toLocaleString() : "N/A"}</p>
                    </div>
                  </div>
                  {selectedReportForDetails.resolvedAt && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-600 font-medium">Resolved</p>
                        <p className="text-sm text-slate-900 mt-1">{new Date(selectedReportForDetails.resolvedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowReportDetailsModal(false);
                    setSelectedAlertForDispatch(selectedReportForDetails);
                    setShowDispatchModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign Team
                </button>
                <button
                  onClick={() => setShowReportDetailsModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUserForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedUserForDetails.name} - Report History
                </h2>
                <p className="text-slate-600 text-sm mt-1">{selectedUserForDetails.email}</p>
              </div>
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {userReportHistory && userReportHistory.length > 0 ? (
                <div className="space-y-3">
                  {userReportHistory.map((report) => (
                    <div key={report._id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900">{report.title || report.locationName}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          report.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{report.description}</p>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>📍 {report.locationName}</span>
                        <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No report history found for this user</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rescuer Details Modal */}
      {showRescuerDetailsModal && selectedRescuerForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedRescuerForDetails.name} - Rescue History
                </h2>
                <p className="text-slate-600 text-sm mt-1">{selectedRescuerForDetails.email}</p>
              </div>
              <button
                onClick={() => setShowRescuerDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {rescuerRescueHistory && rescuerRescueHistory.length > 0 ? (
                <div className="space-y-3">
                  {rescuerRescueHistory.map((rescue) => (
                    <div key={rescue._id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900">{rescue.title || rescue.description}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rescue.status === 'completed' ? 'bg-green-100 text-green-700' :
                          rescue.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          rescue.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {rescue.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{rescue.description}</p>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>📍 {rescue.location || rescue.locationName}</span>
                        <span>📅 {new Date(rescue.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No rescue history found for this rescuer</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowRescuerDetailsModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-right-96 fade-in ${
              toast.type === 'success'
                ? 'bg-green-100 border border-green-300 text-green-800'
                : toast.type === 'error'
                ? 'bg-red-100 border border-red-300 text-red-800'
                : toast.type === 'warning'
                ? 'bg-yellow-100 border border-yellow-300 text-yellow-800'
                : 'bg-blue-100 border border-blue-300 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'info' && <Clock size={18} className="flex-shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Always-visible in-app emergency popup fallback */}
      {incomingAlert && (
        <div className="fixed bottom-4 right-4 z-[60] w-[360px] bg-white border-2 border-red-300 shadow-2xl rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-red-700">Incoming Emergency</p>
              <p className="text-base font-semibold text-slate-900 mt-1">{incomingAlert.title}</p>
              <p className="text-sm text-slate-700 mt-1">{incomingAlert.message}</p>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Audio unlock helper for strict browser autoplay policies */}
      {!soundEnabled && (
        <button
          onClick={resumeAudioContext}
          className="fixed bottom-4 left-4 z-[60] px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-lg hover:bg-indigo-700"
        >
          Enable Alert Sound
        </button>
      )}
    </div>
  );
}

export default AdminDashboard;
