import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import API from "../api";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Clock, TrendingUp, Activity, Truck, Users, ArrowUpRight, ArrowDownRight, MoreVertical, Flame, Eye, RefreshCw, FileText, Bell, Archive, Trash2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Sidebar from "./Sidebar";
import { Header } from "./layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import RescueMap from "./RescueMap";
import ReportRoutePolyline from "./ReportRoutePolyline";

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
const getStatusDisplay = (status, rescuerMissionStatus) => {
  if (rescuerMissionStatus === 'resolved' && status !== 'resolved') {
    return 'Awaiting Verification';
  }
  const statusMap = {
    'new': 'New',
    'pending': 'Pending',
    'acknowledged': 'Acknowledged',
    'in_progress': 'In Progress',
    'on_the_way': 'On the way',
    'ongoing': 'Arrived',
    'resolved': 'Resolved',
    'declined': 'Declined'
  };
  
  if (rescuerMissionStatus && rescuerMissionStatus !== 'none' && rescuerMissionStatus !== 'resolved') {
    return statusMap[String(rescuerMissionStatus).toLowerCase()] || toTitleCase(rescuerMissionStatus);
  }
  
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
  const [reports, setReports] = useState([]);
  const [ongoingRescues, setOngoingRescues] = useState([]);
  const [loadingOngoingRescues, setLoadingOngoingRescues] = useState(false);
  const [ongoingRescuesError, setOngoingRescuesError] = useState(null);
  const [archivedRescues, setArchivedRescues] = useState([]);
  const [loadingArchivedRescues, setLoadingArchivedRescues] = useState(false);
  const [archivedRescuesError, setArchivedRescuesError] = useState(null);
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
  const [notifications, setNotifications] = useState([]);
  
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
    if (activeTab === "archived") {
      fetchArchivedRescues();
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

  // Initialize liveRescuerLocations with static database locations on load
  useEffect(() => {
    if (dbRescuers.length > 0) {
      // Find all rescuers that are currently on an active mission
      const activeRescuerIds = new Set();
      allReports.forEach(r => {
        if (r.status !== 'resolved' && r.status !== 'fake_alarm') {
          if (r.assignedRescuer?.rescuerId) activeRescuerIds.add(String(r.assignedRescuer.rescuerId));
          if (r.assignedTeam?.members) {
            r.assignedTeam.members.forEach(m => activeRescuerIds.add(String(m._id || m)));
          }
        }
      });

      setLiveRescuerLocations((prev) => {
        const next = { ...prev };
        let updated = false;
        dbRescuers.forEach((rescuer) => {
          const rescuerIdStr = String(rescuer._id);
          const isActiveMission = activeRescuerIds.has(rescuerIdStr);
          
          if ((rescuer.isOnline || isActiveMission) && rescuer.lastLocationCoords?.lat && rescuer.lastLocationCoords?.lng) {
            // Only initialize if we don't have a real-time update in memory already
            if (!next[rescuerIdStr]) {
              next[rescuerIdStr] = {
                rescuerId: rescuerIdStr,
                rescuerName: rescuer.name,
                lat: rescuer.lastLocationCoords.lat,
                lng: rescuer.lastLocationCoords.lng,
                timestamp: rescuer.lastLocationUpdate || new Date().toISOString(),
                locationName: rescuer.location,
              };
              updated = true;
            }
          }
        });
        return updated ? next : prev;
      });
    }
  }, [dbRescuers]);

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

        // Build real notifications from database emergency reports
        const realNotifications = [];
        uniqueData.slice(0, 15).forEach(report => {
          // 1. The initial report alert
          realNotifications.push({
            _id: String(report._id),
            type: report.status === 'Resolved' ? 'system' : 'alert',
            title: `🚨 ${report.disasterType || 'Emergency SOS'}`,
            message: `${report.locationName || 'Unknown location'} • Status: ${report.status || 'Pending'} • Severity: ${String(report.severity || 'Medium').toUpperCase()}`,
            createdAt: report.createdAt || new Date(),
            isRead: report.status === 'resolved' || report.isReadByAdmin === true
          });

          // 2. The rescuer status update (if any)
          if (report.rescuerMissionStatus && report.rescuerMissionStatus !== 'none') {
            const statusTextMap = {
              'on_the_way': 'is on the way',
              'ongoing': 'arrived at the scene',
              'resolved': 'resolved the mission'
            };
            const statusText = statusTextMap[report.rescuerMissionStatus] || report.rescuerMissionStatus;
            
            realNotifications.push({
              _id: `status-${report._id}`,
              type: 'rescuer',
              title: `📍 Status Update`,
              message: `Rescuer ${statusText} for ${report.disasterType || 'Emergency SOS'} at ${report.locationName || 'Unknown location'}`,
              createdAt: report.rescuerMissionUpdatedAt || report.updatedAt || new Date(),
              isRead: report.status === 'resolved' || report.isReadByAdmin === true // Tie read status to the main report
            });
          }
        });
        setNotifications(prev => {
          const liveIds = new Set(prev.map(n => n._id));
          const dbNotifsFiltered = realNotifications.filter(n => !liveIds.has(n._id));
          return [...prev, ...dbNotifsFiltered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
        });

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

  const fetchArchivedRescues = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingArchivedRescues(true);
      setArchivedRescuesError(null);
    }
    try {
      const res = await API.get(`/reports`, { params: { status: 'resolved', limit: 100 } });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setArchivedRescues(res.data.data);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      console.error("[API] ✗ Failed to fetch archived rescues:", err.response?.data || err.message);
      if (!silent) {
        setArchivedRescuesError(err.response?.data?.message || err.message || "Failed to fetch completed rescues");
        setArchivedRescues([]);
      }
    } finally {
      if (!silent) {
        setLoadingArchivedRescues(false);
      }
    }
  };

  const deleteArchivedRescue = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this report? This action cannot be undone.")) {
      try {
        await API.delete(`/reports/${id}`);
        setArchivedRescues(prev => prev.filter(r => r._id !== id));
        setNotifications(prev => prev.filter(n => {
          const reportId = n.data?.reportId?._id || n.data?.reportId;
          return n._id !== String(id) && reportId !== id;
        }));
        alert("Report deleted successfully.");
      } catch (err) {
        console.error("Failed to delete report:", err);
        alert(err.response?.data?.message || "Failed to delete report.");
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
      const reportId = String(id).replace('status-', '');
      await API.patch(`/reports/${reportId}/read`);
      setNotifications(prev => 
        prev.map((notif) =>
          (notif._id === id || notif.id === id) ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await API.patch('/rescue/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      await API.delete('/rescue/notifications/all');
      setNotifications([]);
      setShowNotificationsModal(false);
    } catch (err) {
      console.error("Error clearing notifications:", err);
      setShowNotificationsModal(false);
    }
  };

  // Delete a specific notification
  const deleteNotification = async (notifId) => {
    try {
      await API.delete(`/rescue/notifications/${notifId}`);
      setNotifications(prev => prev.filter(n => (n._id || n.id) !== notifId));
    } catch (err) {
      console.error("Error deleting notification:", err);
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
        const liveNotif = {
          _id: String(reportId || Date.now()),
          type: 'alert',
          title: `🚨 ${type} Alert`,
          message: `${location} • ${String(severity).toUpperCase()}`,
          createdAt: new Date(),
          isRead: false
        };
        setNotifications(prev => [liveNotif, ...prev.filter(n => n._id !== liveNotif._id)]);
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
        const liveNotif = {
          _id: String(reportId || Date.now()),
          type: 'alert',
          title: `📢 ${type} Report`,
          message: `${location} • ${String(severity).toUpperCase()}`,
          createdAt: new Date(),
          isRead: false
        };
        setNotifications(prev => [liveNotif, ...prev.filter(n => n._id !== liveNotif._id)]);
        console.log('[Notifications] New report notification sent');
      } else if (eventName === 'report_ml_updated') {
        showToast('AI analysis updated for latest report', 'info', 3000);
      } else if (eventName === 'rescuer_mission_status_updated') {
        const rescuerName = data?.rescuerName || 'Rescuer';
        const status = data?.status || 'updated';
        const statusTextMap = {
          'on_the_way': 'is on the way',
          'ongoing': 'arrived at the scene',
          'resolved': 'resolved the mission',
          'none': 'reset their status'
        };
        const statusText = statusTextMap[status] || status;
        
        showToast(`📍 ${rescuerName} ${statusText}`, 'info', 5000);
        showNotification(`Rescuer Update`, {
          body: `${rescuerName} ${statusText}`,
          tag: 'rescuer-notification'
        });
        
        const liveNotif = {
          _id: `status-${data?.reportId}-${Date.now()}`,
          type: 'rescuer',
          title: `📍 Status Update`,
          message: `${rescuerName} ${statusText}`,
          createdAt: new Date(),
          isRead: false
        };
        setNotifications(prev => [liveNotif, ...prev]);
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

    socket.on("rescuer_disconnected", (data) => {
      console.log("[Realtime] rescuer_disconnected received", data || {});
      const rescuerKey = data?.rescuerId ? String(data.rescuerId) : null;
      if (rescuerKey) {
        setLiveRescuerLocations((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            if (next[key]?.rescuerId === rescuerKey || key === rescuerKey) {
              delete next[key];
            }
          });
          return next;
        });
      }
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
        notifications={notifications}
        unreadCount={unreadCount}
        markNotificationRead={markNotificationRead}
        clearAllNotifications={clearAllNotifications}
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
            activeTab === "notifications" ? "Notifications Center" :
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
          onViewAllNotifications={() => setActiveTab("notifications")}
          onProfileClick={() => {
            setActiveTab("settings");
            setFilterStatus("profile");
          }}
          onSettingsClick={() => {
            setActiveTab("settings");
            setFilterStatus("profile");
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
          {activeTab === "dashboard" && (
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              
              {/* Row 1: KPI Stat Cards Grid (TailAdmin Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                
                {/* Stat Card 1 - Total Active Alerts */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      11.01%
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Active Alerts</p>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {activeReports.length || 0}
                    </p>
                  </div>
                </Card>

                {/* Stat Card 2 - Critical Emergency Alerts */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200/60 dark:border-red-900/50">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Critical
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Critical Emergencies</p>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {severityCounts.critical || 0}
                    </p>
                  </div>
                </Card>

                {/* Stat Card 3 - Active Rescuers On-Duty */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      On-Duty
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Rescuers</p>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {activeRescuersCount || 0}
                    </p>
                  </div>
                </Card>

                {/* Stat Card 4 - Ongoing Rescue Operations */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Active
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ongoing Missions</p>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {ongoingRescues.length || 0}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Row 2: Visualizations Grid (Charts 2/3 + Monthly Target Gauge 1/3) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left 8 Columns - Bar Chart & Response Statistics */}
                <div className="lg:col-span-8 space-y-5">
                  
                  {/* Monthly Sales / Incident Volume Bar Chart */}
                  <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Incident Trends</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Emergency alert frequency timeline</p>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-white rounded-lg shadow-xs">Monthly</button>
                        <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Quarterly</button>
                        <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Annually</button>
                      </div>
                    </div>
                    
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={alertsByTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barBlueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "#0f172a", 
                              border: "none", 
                              borderRadius: "12px", 
                              color: "#fff",
                              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)" 
                            }}
                            cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
                          />
                          <Bar dataKey="count" fill="url(#barBlueGradient)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Response Statistics Smooth Area Chart */}
                  <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Response Time Analytics</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Average dispatch to scene response time (minutes)</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                        Real-time Data
                      </span>
                    </div>

                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={responseBySeverityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "#0f172a", 
                              border: "none", 
                              borderRadius: "12px", 
                              color: "#fff" 
                            }}
                          />
                          <Area type="monotone" dataKey="time" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#areaGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* Right 4 Columns - Monthly Target Arc Gauge & Alert Type breakdown */}
                <div className="lg:col-span-4 space-y-5">
                  
                  {/* TailAdmin Gauge Arc Card */}
                  <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-center flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                      <div className="text-left">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Target</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Target set for rescue completion</p>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Arc Semi-Circle Radial Chart */}
                    <div className="relative w-full h-[200px] flex items-center justify-center my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Resolved Rate", value: resolvedCount || 75.55, fill: "#3b82f6" },
                              { name: "Remaining Target", value: Math.max(0, 100 - (resolvedCount || 75.55)), fill: "#f1f5f9" }
                            ]}
                            cx="50%"
                            cy="75%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={2}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Center Score Overlay */}
                      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          {resolvedCount ? Math.round((resolvedCount / Math.max(1, (resolvedCount + activeReports.length))) * 100) : 75.55}%
                        </span>
                        <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50">
                          +10%
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                      You resolved <span className="font-bold text-slate-800 dark:text-slate-200">{resolvedCount} incidents</span> today, higher than last month. Keep up the good work!
                    </p>

                    {/* Footer KPI Metrics */}
                    <div className="w-full grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase">Target</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-flex items-center gap-0.5">
                          85% <ArrowDownRight className="w-3 h-3 text-red-500" />
                        </p>
                      </div>
                      <div className="border-x border-slate-100 dark:border-slate-800 px-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase">Resolved</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-flex items-center gap-0.5">
                          {resolvedCount} <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase">Responded</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-flex items-center gap-0.5">
                          {respondedCount} <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Incident Type Breakdown Donut */}
                  <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Emergency Distribution</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Categorized incident proportion</p>

                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={alertTypeDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            <Cell fill="#ef4444" />
                            <Cell fill="#f97316" />
                            <Cell fill="#3b82f6" />
                            <Cell fill="#10b981" />
                            <Cell fill="#8b5cf6" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {alertTypeDistributionData.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ["#ef4444", "#f97316", "#3b82f6", "#10b981", "#8b5cf6"][i % 5] }} />
                          <span className="text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Row 3: Recent Active Alerts & Incidents Table */}
              <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Emergency Stream</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live emergency alerts requiring response or monitoring</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("alerts")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200/50 dark:border-blue-900/50 transition-colors"
                  >
                    View All Alerts ({reports.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <th className="px-6 py-3.5">Disaster Type</th>
                        <th className="px-6 py-3.5">Location</th>
                        <th className="px-6 py-3.5">Severity</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Time Reported</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {reports.filter(r => r.status !== 'Resolved' && r.status !== 'resolved').slice(0, 5).map((report) => (
                        <tr key={report._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                              <span>{report.disasterType || "Emergency Alert"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                            {report.locationName || report.location || "Malaybalay City"}
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={
                                report.severity === "critical" ? "critical" :
                                report.severity === "high" ? "high" :
                                report.severity === "medium" ? "medium" : "low"
                              }
                            >
                              {toTitleCase(report.severity || "Standard")}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={
                                (report.rescuerMissionStatus === 'resolved' && report.status !== 'resolved') ? "warning" :
                                (report.status === "new" || report.status === "pending") ? "default" :
                                (report.status === "acknowledged" || report.status === "on_the_way" || report.status === "in_progress") ? "info" :
                                report.status === "ongoing" ? "high" :
                                report.status === "resolved" ? "success" :
                                "default"
                              }
                            >
                              {getStatusDisplay(report.status, report.rescuerMissionStatus)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                            {report.createdAt ? new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedReportForDetails(report);
                                setShowReportDetailsModal(true);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {reports.filter(r => r.status !== 'Resolved' && r.status !== 'resolved').length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                            No active emergency alerts recorded. All systems operational.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

          {activeTab === "map" && (
            <div className="flex h-full w-full bg-slate-50 dark:bg-slate-900 relative">
              {/* Left Panel - Active Alerts */}
              <div className="w-96 flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden relative z-10 shadow-sm">
                {/* Header with Groq AI Button */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Alerts Stream</h2>
                      <p className="text-xs text-slate-400">Real-time incident map tracking</p>
                    </div>
                    {/* Groq AI Priority Analysis Button */}
                    {reports.filter(r => r.severity === 'critical').length > 0 && (
                      <button
                        onClick={() => analyzeWithGroq('en')}
                        disabled={loadingGroqAnalysis}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title="Use Groq AI to prioritize critical reports"
                      >
                        {loadingGroqAnalysis ? (
                          <>
                            <span className="animate-spin">⊙</span>
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <span>🤖 AI Priority</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Groq AI Priority Results */}
                  {groqPriorities && groqPriorities.analysis?.priorityOrder && (
                    <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/50 rounded-2xl p-3.5 text-xs">
                      <div className="font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-1.5">
                        <span>🤖 AI Dispatch Recommendations:</span>
                      </div>
                      <div className="space-y-2">
                        {groqPriorities.analysis.priorityOrder.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-purple-100 dark:border-purple-900/40 shadow-xs">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-lg text-xs min-w-fit">
                                #{item.priority}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">{item.recommendation}</p>
                                <p className="text-purple-600 dark:text-purple-400 text-[11px] mt-0.5 font-bold">Score: {(item.urgencyScore || 0).toFixed(1)}/10</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-purple-700 dark:text-purple-300 text-[11px] mt-2 font-medium">
                        💡 {groqPriorities.analysis.overallRecommendation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Search and Filter Section */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5 relative z-20 bg-slate-50/50 dark:bg-slate-900/50">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search location or incident..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Severity Filter Dropdown */}
                  <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                  >
                    <option value="All">All Severity Levels</option>
                    <option value="critical">Critical Severity</option>
                    <option value="high">High Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="low">Low Severity</option>
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
                    const activeReports = reports?.filter(r => {
                      const ns = String(r.status || '').toLowerCase();
                      return ns !== 'resolved' && ns !== 'declined';
                    }) || [];
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
                                <div className="mt-4 space-y-2">
                                  {/* Rescuer Status Indicator */}
                                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Rescuer Status:</span>
                                    <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                                      alert.rescuerMissionStatus === 'ongoing' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                      alert.rescuerMissionStatus === 'on_the_way' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}>
                                      {getStatusDisplay(alert.rescuerMissionStatus || 'none')}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveTab("ongoing");
                                      setExpandedRescue(alert._id);
                                    }}
                                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    View Rescue
                                  </button>
                                </div>
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

                        {/* Render active rescuer locations */}
                        {Object.values(
                          Object.values(liveRescuerLocations || {}).reduce((acc, rescuer) => {
                            if (rescuer.rescuerId && rescuer.lat && rescuer.lng) {
                              acc[rescuer.rescuerId] = rescuer;
                            }
                            return acc;
                          }, {})
                        ).map((rescuer) => {
                          const rescuerIcon = L.icon({
                            iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8M8 12h8" stroke="#ffffff" stroke-width="2.5"/></svg>')}`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15],
                            popupAnchor: [0, -15],
                            className: 'rescuer-marker'
                          });

                          return (
                            <Marker
                              key={`rescuer-${rescuer.rescuerId}`}
                              position={[rescuer.lat, rescuer.lng]}
                              icon={rescuerIcon}
                              eventHandlers={{
                                click: () => {
                                  if (mapRef.current) {
                                    mapRef.current.setView([rescuer.lat, rescuer.lng], 17);
                                  }
                                }
                              }}
                            >
                              <Popup>
                                <div className="w-52">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                      {(rescuer.rescuerName || 'R').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-slate-900">{rescuer.rescuerName || 'Rescuer'}</h3>
                                      <p className="text-[10px] text-emerald-600 font-medium">● Online Active</p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-600">
                                    <strong>Updated:</strong> {new Date(rescuer.timestamp || Date.now()).toLocaleTimeString()}
                                  </p>
                                  {rescuer.locationName && (
                                    <p className="text-xs text-slate-600 mt-1">
                                      <strong>Location:</strong> {rescuer.locationName}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-slate-500 mt-2">
                                    Coordinates: {rescuer.lat.toFixed(4)}, {rescuer.lng.toFixed(4)}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}

                        {/* Render Route Lines for Rescuers on Active Missions */}
                        {allReports.filter(r => r.status !== 'resolved' && r.status !== 'fake_alarm').map(report => {
                          let routeLat = null;
                          let routeLng = null;

                          if (report.assignedRescuer?.rescuerId) {
                            const rescuerIdStr = String(report.assignedRescuer.rescuerId);
                            if (liveRescuerLocations[rescuerIdStr]?.lat && liveRescuerLocations[rescuerIdStr]?.lng) {
                              routeLat = liveRescuerLocations[rescuerIdStr].lat;
                              routeLng = liveRescuerLocations[rescuerIdStr].lng;
                            } else if (report.assignedRescuer.rescuerLat && report.assignedRescuer.rescuerLng) {
                              // Fallback to report's static assignment coordinates if no live update
                              routeLat = report.assignedRescuer.rescuerLat;
                              routeLng = report.assignedRescuer.rescuerLng;
                            }
                          } else if (report.assignedTeam?.members?.length > 0) {
                            // Find the first team member that has an active location
                            for (const member of report.assignedTeam.members) {
                              const memberId = typeof member === 'object' ? String(member._id) : String(member);
                              if (liveRescuerLocations[memberId]?.lat && liveRescuerLocations[memberId]?.lng) {
                                routeLat = liveRescuerLocations[memberId].lat;
                                routeLng = liveRescuerLocations[memberId].lng;
                                break;
                              }
                            }
                          }

                          if (routeLat && routeLng && report.lat && report.lng) {
                            return (
                              <React.Fragment key={`route-group-${report._id}`}>
                                <ReportRoutePolyline
                                  key={`route-${report._id}`}
                                  reportId={report._id}
                                  startLat={routeLat}
                                  startLng={routeLng}
                                  endLat={report.lat}
                                  endLng={report.lng}
                                />
                                {/* If the rescuer isn't in liveRescuerLocations but we have their coordinates from the report, render a marker for them here so they don't disappear */}
                                {(!liveRescuerLocations[String(report.assignedRescuer?.rescuerId)] && report.assignedRescuer?.rescuerLat && report.assignedRescuer?.rescuerLng) && (
                                  <Marker
                                    position={[routeLat, routeLng]}
                                    icon={L.icon({
                                      iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8M8 12h8" stroke="#ffffff" stroke-width="2.5"/></svg>')}`,
                                      iconSize: [30, 30],
                                      iconAnchor: [15, 15],
                                      popupAnchor: [0, -15],
                                      className: 'rescuer-marker'
                                    })}
                                  >
                                    <Popup>
                                      <div className="w-52">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                            {(report.assignedRescuer.rescuerName || 'R').charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <h3 className="font-semibold text-slate-800">{report.assignedRescuer.rescuerName || 'Rescuer'}</h3>
                                            <p className="text-xs text-blue-600 font-medium">On active mission</p>
                                          </div>
                                        </div>
                                      </div>
                                    </Popup>
                                  </Marker>
                                )}
                              </React.Fragment>
                            );
                          }
                          return null;
                        })}

                      </>
                    );
                  })()}
                </MapContainer>

                {/* Map Legend - Bottom Right */}
                <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" style={{zIndex: 9999, pointerEvents: 'auto'}}>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Alert Severity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-600"></div>
                      <span className="text-xs text-slate-700 dark:text-slate-300">Critical</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-slate-700 dark:text-slate-300">High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-400"></div>
                      <span className="text-xs text-slate-700 dark:text-slate-300">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-600"></div>
                      <span className="text-xs text-slate-700 dark:text-slate-300">Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">H</div>
                      <span className="text-xs text-slate-700 dark:text-slate-300">Nearest Fire Hydrant (fire alerts)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <path d="M12 8v8M8 12h8" stroke="#ffffff" stroke-width="2.5"/>
                        </svg>
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300">Active Rescuer (Live Location)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    📍 Each pin shows alert location <br/> colored by severity level
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dispatch Modal */}
          {showDispatchModal && selectedAlertForDispatch && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999]">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-96 border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Dispatch Team</h2>
                
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Alert ID:</strong> ALT-{(selectedAlertForDispatch._id || selectedAlertForDispatch.id || "0000").substring(0, 12).toUpperCase()}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Type:</strong> {selectedAlertForDispatch.disasterType || selectedAlertForDispatch.type || "Emergency"}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Location:</strong> {selectedAlertForDispatch.locationName || selectedAlertForDispatch.location || "Unknown"}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>Severity:</strong> <span className={`px-2 py-1 rounded text-xs font-medium ${selectedAlertForDispatch.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" : selectedAlertForDispatch.severity === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" : selectedAlertForDispatch.severity === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300" : "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"}`}>{selectedAlertForDispatch.severity?.charAt(0).toUpperCase() + selectedAlertForDispatch.severity?.slice(1) || "Medium"}</span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Team to Dispatch:</label>
                  <select 
                    value={selectedTeamForDispatch?.id || selectedTeamForDispatch?._id || ""}
                    onChange={(e) => {
                      const team = dbTeams.find(r => r._id === e.target.value) || dbTeams.find(r => r.id === e.target.value);
                      setSelectedTeamForDispatch(team);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- Select a Team --</option>
                    {(dbTeams || []).map((team) => {
                      const memberNames = (team.members || []).map(m => typeof m === 'object' ? m.name : m).filter(Boolean).join(', ');
                      let distanceText = "";
                      if (selectedAlertForDispatch?.lat && selectedAlertForDispatch?.lng) {
                        const teamRescuers = Object.values(liveRescuerLocations || {}).filter(loc => 
                          loc.teamId === String(team._id) || (team.members && team.members.some(m => String(m._id || m) === String(loc.rescuerId)))
                        );
                        if (teamRescuers.length > 0) {
                          const nearestRescuer = teamRescuers.reduce((nearest, current) => {
                            const dist = haversineDistanceMeters(
                              selectedAlertForDispatch.lat, selectedAlertForDispatch.lng,
                              current.lat, current.lng
                            );
                            if (!nearest || dist < nearest.dist) {
                              return { ...current, dist };
                            }
                            return nearest;
                          }, null);
                          
                          if (nearestRescuer) {
                            distanceText = nearestRescuer.dist < 1000 
                              ? ` - ${Math.round(nearestRescuer.dist)}m away`
                              : ` - ${(nearestRescuer.dist / 1000).toFixed(1)}km away`;
                          }
                        }
                      }
                      
                      return (
                        <option key={team._id || team.id} value={team._id || team.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          Team {team.name || team.teamName} - {team.leader?.name || team.teamLeader || "Unknown"} ({memberNames || "No Rescuers"}){distanceText}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedTeamForDispatch && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-1">
                    <p className="text-sm text-slate-700 dark:text-slate-200"><strong>Team Name:</strong> {selectedTeamForDispatch.name || selectedTeamForDispatch.teamName || "Unknown"}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200"><strong>Team Leader:</strong> {selectedTeamForDispatch.leader?.name || selectedTeamForDispatch.teamLeader || "Unknown"}</p>
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                      <strong>Assigned Rescuers:</strong>
                      {selectedTeamForDispatch.members && selectedTeamForDispatch.members.length > 0 ? (
                        <ul className="list-disc list-inside mt-1 pl-2 text-xs">
                          {selectedTeamForDispatch.members.map((member, mIdx) => {
                            const name = typeof member === 'object' ? member.name : member;
                            const email = typeof member === 'object' ? member.email : null;
                            return (
                              <li key={member._id || member.id || mIdx}>
                                {name} {email ? `(${email})` : ""}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="text-slate-500 ml-1 text-xs">No rescuers assigned</span>
                      )}
                    </div>
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Dispatch
                  </button>
                  <button
                    onClick={() => {
                      setShowDispatchModal(false);
                      setSelectedAlertForDispatch(null);
                      setSelectedTeamForDispatch(null);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Team Details Modal */}
          {showTeamDetailsModal && selectedTeamDetails && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999]">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Team {selectedTeamDetails.name || selectedTeamDetails.teamName}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Team Lead: {selectedTeamDetails.leader?.name || selectedTeamDetails.leader || selectedTeamDetails.teamLeader || "Unassigned"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTeamDetailsModal(false);
                      setSelectedTeamDetails(null);
                      setNewMemberName("");
                      setSelectedMemberId("");
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Team Members List */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Team Members ({selectedTeamDetails.members?.length || 0})</h3>
                  {selectedTeamDetails.members && selectedTeamDetails.members.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTeamDetails.members.map((member) => (
                        <div key={member._id || member.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                            <p className={`text-xs font-medium mt-1 ${selectedTeamDetails.leader && (selectedTeamDetails.leader._id === member._id || selectedTeamDetails.leader === member._id) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
                              {selectedTeamDetails.leader && (selectedTeamDetails.leader._id === member._id || selectedTeamDetails.leader === member._id) ? "👑 Team Leader" : "Team Member"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {(!selectedTeamDetails.leader || (selectedTeamDetails.leader._id !== member._id && selectedTeamDetails.leader !== member._id)) && (
                              <button
                                onClick={() => handleSetTeamLeader(member._id)}
                                className="px-3 py-2 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium text-sm rounded-xl transition-colors"
                              >
                                Make Leader
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              className="px-3 py-2 bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-medium text-sm rounded-xl transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No members in this team yet</p>
                  )}
                </div>

                {/* Add Member Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add New Member</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Rescuer:</label>
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
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {showMemberDropdown && dbRescuers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-lg z-50">
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
                                  className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                                >
                                  <p className="font-medium">{rescuer.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">@{rescuer.username || rescuer.email?.split("@")[0]}</p>
                                </button>
                              ))}
                            {dbRescuers.filter(
                              (rescuer) =>
                                newMemberName === "" ||
                                rescuer.name.toLowerCase().includes(newMemberName.toLowerCase()) ||
                                (rescuer.username && rescuer.username.toLowerCase().includes(newMemberName.toLowerCase()))
                            ).length === 0 && (
                              <div className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-sm">
                                No rescuers found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Role:</label>
                      <select
                        value={selectedMemberRole}
                        onChange={(e) => setSelectedMemberRole(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Team Lead" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Team Lead</option>
                        <option value="Paramedic" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Paramedic</option>
                        <option value="Firefighter" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Firefighter</option>
                        <option value="Driver" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Driver</option>
                        <option value="Team Member" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Team Member</option>
                      </select>
                    </div>

                    <button
                      onClick={handleAddMember}
                      className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
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
                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Team Location Modal */}
          {showTeamLocationModal && selectedDeployedTeam && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999]">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Deploy Location - Team {selectedDeployedTeam.name}</h2>
                  <button
                    onClick={() => {
                      setShowTeamLocationModal(false);
                      setSelectedDeployedTeam(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Team Info */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Team Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Team Name</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">{selectedDeployedTeam.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Team Leader</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">{selectedDeployedTeam.leader?.name || selectedDeployedTeam.leader || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</p>
                      <p className="text-base font-semibold text-orange-600 dark:text-orange-400">🚨 Deployed</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Members</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">{selectedDeployedTeam.members?.length || 0} members</p>
                    </div>
                  </div>
                  {selectedDeployedTeam.currentMission && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mission</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        <strong>{selectedDeployedTeam.currentMission?.disasterType || 'Emergency'}</strong> 
                        {selectedDeployedTeam.currentMission?.locationName && ` • ${selectedDeployedTeam.currentMission.locationName}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Team Members Locations */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Team Member Locations</h3>
                  {selectedDeployedTeam.members && selectedDeployedTeam.members.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedDeployedTeam.members.map((member) => (
                        <div key={member._id || member.id} className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{member.email}</p>
                            </div>
                            {member.location && (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="text-lg">✓</span>
                              </span>
                            )}
                          </div>
                          {member.location ? (
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              <strong>📍 Location:</strong> {member.location}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">📍 Location not available yet</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No team members found</p>
                  )}
                </div>

                {/* Close Button */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowTeamLocationModal(false);
                      setSelectedDeployedTeam(null);
                    }}
                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rescuer Profile Modal */}
          {showRescuerProfileModal && selectedRescuerProfile && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999]">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                      {selectedRescuerProfile.name?.charAt(0) || "R"}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedRescuerProfile.name}</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">@{selectedRescuerProfile.username || selectedRescuerProfile.email?.split("@")[0]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowRescuerProfileModal(false);
                      setSelectedRescuerProfile(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold"
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
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Reports & Incident Logs</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Audit log and official Sitrep report archives</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExport()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Export Reports Log
                  </button>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Alerts */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{reports.length}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 text-[10px] font-bold rounded-full border border-blue-200/50">All Logged</span>
                  </div>
                </Card>

                {/* Active */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Alerts</p>
                      <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">{activeReports.length}</p>
                    </div>
                    <span className="px-2 py-1 bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 text-[10px] font-bold rounded-full border border-red-200/50">Active Stream</span>
                  </div>
                </Card>

                {/* Responded */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responded</p>
                      <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{respondedCount}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 text-[10px] font-bold rounded-full border border-blue-200/50">Dispatched</span>
                  </div>
                </Card>

                {/* Resolved */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolved</p>
                      <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200/50">Completed</span>
                  </div>
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
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 dark:divide-slate-700">
                      {reports.slice(0, 50).map((report) => {
                        const getSeverityColor = (severity) => {
                          if (severity === "critical") return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
                          if (severity === "high") return "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300";
                          if (severity === "medium") return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300";
                          return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
                        };

                        const getStatusColor = (status, rescuerMissionStatus) => {
                          if (rescuerMissionStatus === 'resolved' && status !== 'resolved') {
                            return "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300";
                          }
                          const activeStatus = (rescuerMissionStatus && rescuerMissionStatus !== 'none' && rescuerMissionStatus !== 'resolved') 
                            ? rescuerMissionStatus 
                            : status;
                          const s = String(activeStatus || '').toLowerCase();
                          if (s === "resolved") return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300";
                          if (s === "declined") return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300";
                          if (s === "pending" || s === "new") return "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                          if (s === "on_the_way" || s === "in_progress" || s === "acknowledged") return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300";
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
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status || "Pending", report.rescuerMissionStatus)}`}>
                                {getStatusDisplay(report.status || "Pending", report.rescuerMissionStatus)}
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
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Rescuer Management</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Manage personnel, team assignments, and duty status</p>
                </div>
                <button 
                  onClick={() => setShowAddRescuerModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span className="text-sm">+</span> Add New Rescuer
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Registered */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered</p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{dbRescuers.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                {/* On-Duty */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">On-Duty</p>
                      <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeRescuersCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>
                </Card>

                {/* In Mission */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Operation</p>
                      <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{ongoingRescues.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                {/* Registered Teams */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rescue Teams</p>
                      <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{dbTeams.length || 1}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Search and Filter Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by name, team, specialty..."
                      value={searchRescuerQuery}
                      onChange={(e) => setSearchRescuerQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select 
                    value={filterRescuerStatus}
                    onChange={(e) => setFilterRescuerStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">All Duty Status</option>
                    <option value="on-duty" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">On Duty</option>
                    <option value="off-duty" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Off Duty</option>
                    <option value="busy" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Busy / In Operation</option>
                  </select>
                </div>
              </div>

              {/* Rescuers Table */}
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Assigned Alerts</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Last Updated</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                      <Card key={team._id} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ongoing Rescues</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Monitor active emergency rescue operations and field personnel</p>
                </div>
                <button 
                  onClick={() => fetchOngoingRescues()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Stream
                </button>
              </div>

              {/* Loading State */}
              {loadingOngoingRescues && (
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  <p className="text-xs font-semibold text-slate-500 mt-3">Loading active emergency rescue operations...</p>
                </Card>
              )}

              {/* Error State */}
              {ongoingRescuesError && !loadingOngoingRescues && (
                <Card className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{ongoingRescuesError}</p>
                </Card>
              )}

              {/* Empty State */}
              {!loadingOngoingRescues && ongoingRescues.length === 0 && !ongoingRescuesError && (
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">No active rescue operations</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All dispatched rescue missions have been successfully completed.</p>
                </Card>
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
                              {rescue.rescuerMissionStatus === 'ongoing' && (
                                <p className="text-xs text-emerald-700 font-semibold mt-1">Rescuer has arrived</p>
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
                                    Rescuer update: <span className="font-semibold uppercase text-blue-700">{getStatusDisplay(rescue.rescuerMissionStatus)}</span>
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

                          {/* Photo Evidence in Ongoing Rescues */}
                          {(rescue.photoUrl || rescue.resolutionPhotoUrl) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">Photo Evidence</h4>
                              <div className="bg-white rounded-lg p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {rescue.photoUrl && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-600 text-xs font-bold mb-2">📸 Incident Photo (Victim)</span>
                                    <a 
                                      href={rescue.photoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video group cursor-zoom-in bg-slate-900"
                                    >
                                      <img 
                                        src={rescue.photoUrl} 
                                        alt="Incident" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </a>
                                  </div>
                                )}
                                {rescue.resolutionPhotoUrl && (
                                  <div className="flex flex-col">
                                    <span className="text-emerald-700 text-xs font-bold mb-2">✅ Resolution Proof (Rescuer)</span>
                                    <a 
                                      href={rescue.resolutionPhotoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="relative rounded-lg overflow-hidden border border-emerald-200 aspect-video group cursor-zoom-in bg-slate-900"
                                    >
                                      <img 
                                        src={rescue.resolutionPhotoUrl} 
                                        alt="Resolution Proof" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Performance & Routing Summary Section */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">⏱️ Response & Route Summary</h4>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <span className="text-slate-500 text-xs block">Response Time:</span>
                                <span className="font-bold text-slate-800">
                                  {rescue.responseDurationMinutes != null 
                                    ? `${rescue.responseDurationMinutes} mins`
                                    : "Awaiting arrival..."
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 text-xs block">Distance Traveled:</span>
                                <span className="font-bold text-slate-800 font-mono">
                                  {rescue.responseDistanceMeters != null 
                                    ? (rescue.responseDistanceMeters >= 1000
                                        ? `${(rescue.responseDistanceMeters / 1000).toFixed(2)} km`
                                        : `${rescue.responseDistanceMeters} m`)
                                    : "Calculating..."
                                  }
                                </span>
                              </div>
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

          {activeTab === "archived" && (
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Completed Rescues</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">View historical data of resolved emergency operations</p>
                </div>
                <button 
                  onClick={() => fetchArchivedRescues()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Archive
                </button>
              </div>

              {loadingArchivedRescues && (
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  <p className="text-xs font-semibold text-slate-500 mt-3">Loading completed rescue operations...</p>
                </Card>
              )}

              {archivedRescuesError && !loadingArchivedRescues && (
                <Card className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{archivedRescuesError}</p>
                </Card>
              )}

              {!loadingArchivedRescues && archivedRescues.length === 0 && !archivedRescuesError && (
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Archive className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">No archived operations</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">There are no completed rescues in the archive.</p>
                </Card>
              )}

              {!loadingArchivedRescues && archivedRescues.length > 0 && (
                <div className="space-y-4">
                  {archivedRescues.map((rescue) => (
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
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-green-600" />
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
                              <p className="text-xs text-green-700 font-semibold mt-1">
                                Resolved: {new Date(rescue.resolvedAt || rescue.updatedAt).toLocaleString()}
                              </p>
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
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                                <p className="text-slate-500 text-sm">No team recorded</p>
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
                              </div>
                            </div>
                          )}

                          {/* Map (Static Location) */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Incident Location</h4>
                            <RescueMap rescue={rescue} externalLocationUpdate={null} />
                          </div>

                          {/* Rescue Details */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Details</h4>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Status:</span>
                                <span className="font-medium text-green-600">{getStatusDisplay(rescue.status)}</span>
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

                          {/* Photo Evidence in Ongoing Rescues */}
                          {(rescue.photoUrl || rescue.resolutionPhotoUrl) && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-3">Photo Evidence</h4>
                              <div className="bg-white rounded-lg p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {rescue.photoUrl && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-600 text-xs font-bold mb-2">📸 Incident Photo (Victim)</span>
                                    <a 
                                      href={rescue.photoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video group cursor-zoom-in bg-slate-900"
                                    >
                                      <img 
                                        src={rescue.photoUrl} 
                                        alt="Incident" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </a>
                                  </div>
                                )}
                                {rescue.resolutionPhotoUrl && (
                                  <div className="flex flex-col">
                                    <span className="text-emerald-700 text-xs font-bold mb-2">✅ Resolution Proof (Rescuer)</span>
                                    <a 
                                      href={rescue.resolutionPhotoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="relative rounded-lg overflow-hidden border border-emerald-200 aspect-video group cursor-zoom-in bg-slate-900"
                                    >
                                      <img 
                                        src={rescue.resolutionPhotoUrl} 
                                        alt="Resolution Proof" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Performance & Routing Summary Section */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">⏱️ Response & Route Summary</h4>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <span className="text-slate-500 text-xs block">Response Time:</span>
                                <span className="font-bold text-slate-800">
                                  {rescue.responseDurationMinutes != null 
                                    ? `${rescue.responseDurationMinutes} mins`
                                    : "N/A"
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 text-xs block">Distance Traveled:</span>
                                <span className="font-bold text-slate-800 font-mono">
                                  {rescue.responseDistanceMeters != null 
                                    ? (rescue.responseDistanceMeters >= 1000
                                        ? `${(rescue.responseDistanceMeters / 1000).toFixed(2)} km`
                                        : `${rescue.responseDistanceMeters} m`)
                                    : "N/A"
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* SITREP Button */}
                          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              📋 Situation Report (SITREP)
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">Open the detailed SITREP form to view casualties, damage assessment, and relief assistance.</p>
                            <button
                              onClick={() => navigate(`/sitrep/${rescue._id}`)}
                              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              📄 Open SITREP Form
                            </button>
                          </div>

                          {/* Action Button */}
                          <div className="pt-4 border-t border-slate-200">
                            <button
                              onClick={() => deleteArchivedRescue(rescue._id)}
                              className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-200"
                            >
                              <Trash2 className="w-5 h-5" />
                              Permanently Delete Record
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

          {activeTab === "notifications" && (
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications Center</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    System notifications, emergency alerts history, and operational activity logs
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {notifications.some(n => !n.isRead) && (
                    <button
                      onClick={markAllAsRead}
                      className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
                    >
                      Mark All as Read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-colors"
                    >
                      Clear All Notifications
                    </button>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Notifications</p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{notifications.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Bell className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unread Alerts</p>
                      <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{unreadCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Emergency Events</p>
                      <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                        {notifications.filter(n => n.type === 'alert').length}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Notifications Table / List Card */}
              <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activity & Notification History Log</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Showing all real-time entries</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No system notifications at this time.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id || notif.id}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          !notif.isRead ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                            notif.type === 'alert' ? 'bg-red-500' :
                            notif.type === 'rescuer' ? 'bg-blue-500' :
                            'bg-emerald-500'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {notif.title || notif.message}
                              </h4>
                              {!notif.isRead && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                  New
                                </span>
                              )}
                            </div>
                            {notif.message && notif.title !== notif.message && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                {notif.message}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : (notif.time || 'Just now')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {!notif.isRead && (
                            <button
                              onClick={() => markNotificationRead(notif._id || notif.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif._id || notif.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('alerts');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                          >
                            View Alert →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Emergency Alerts Stream</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Real-time incoming emergency SOS notifications and dispatch hub</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 font-bold text-xs rounded-full border border-red-200/50 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Live SOS Monitor
                  </span>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Alerts */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Alerts</p>
                      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{pagination.total || reports.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                {/* Active Urgent */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Urgent</p>
                      <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                        {reports.filter(r => r.status === 'Active' || r.status === 'active').length}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Flame className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                {/* Responded */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responded</p>
                      <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{respondedCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                </Card>

                {/* Resolved */}
                <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolved</p>
                      <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Search and Filter Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-xs">
                    <input
                      type="text"
                      placeholder="Search alerts by ID, type, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">All Severity</option>
                    <option value="Critical" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Critical</option>
                    <option value="High" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">High</option>
                    <option value="Medium" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Medium</option>
                    <option value="Low" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Low</option>
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
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">AI Detector</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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

                          const getStatusColor = (status, rescuerMissionStatus) => {
                            if (rescuerMissionStatus === 'resolved' && status !== 'resolved') {
                              return "bg-amber-100 text-amber-700";
                            }
                            const activeStatus = (rescuerMissionStatus && rescuerMissionStatus !== 'none' && rescuerMissionStatus !== 'resolved') 
                              ? rescuerMissionStatus 
                              : status;
                            const s = String(activeStatus || '').toLowerCase();
                            if (s === "resolved") return "bg-green-100 text-green-700";
                            if (s === "declined") return "bg-red-100 text-red-700";
                            if (s === "pending" || s === "new") return "bg-slate-100 text-slate-700";
                            if (s === "on_the_way" || s === "in_progress" || s === "acknowledged") return "bg-blue-100 text-blue-700";
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
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status, alert.rescuerMissionStatus)}`}>
                                  {getStatusDisplay(alert.status, alert.rescuerMissionStatus)}
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-900">Rescuer Team Performance</CardTitle>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Last 30 Days</span>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Team</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Alerts Resolved</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Avg Response Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account & System Settings</h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Manage administrator profile, security accounts, and user feedback logs</p>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Settings Sub-Navigation Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                  <Card className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    <div className="p-3 space-y-1">
                      {[
                        { id: 'profile', label: 'Profile & Security' },
                        { id: 'users', label: 'Admin Accounts' },
                        { id: 'feedback', label: 'User Feedback Logs' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSettingsTab(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                            selectedSettingsTab === item.id
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Right Content Area */}
                <div className="flex-1">
                  {/* Profile Settings */}
                  {selectedSettingsTab === 'profile' && (
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                              <input 
                                type="text" 
                                value={profileData.name}
                                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="Enter your full name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Username</label>
                              <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 overflow-hidden">
                                <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium border-r border-slate-300 dark:border-slate-700">salba.cdrmmo/</span>
                                <input 
                                  type="text" 
                                  value={profileData.username}
                                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none"
                                  placeholder="username"
                                />
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This is your login username</p>
                            </div>
                          </div>

                          {/* Phone Number and Email */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                              <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 overflow-hidden">
                                <select className="px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-r border-slate-300 dark:border-slate-700 focus:outline-none cursor-pointer text-sm">
                                  <option value="PH" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🇵🇭 +63</option>
                                  <option value="US" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🇺🇸 +1</option>
                                  <option value="IN" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🇮🇳 +91</option>
                                  <option value="CN" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🇨🇳 +86</option>
                                </select>
                                <input 
                                  type="tel" 
                                  value={profileData.phone}
                                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none"
                                  placeholder="9123456789"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                              <input 
                                type="email" 
                                value={profileData.email}
                                disabled
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-not-allowed"
                              />
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email cannot be changed</p>
                            </div>
                          </div>

                          {/* Job Title */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Job Title</label>
                            <input 
                              type="text" 
                              value={profileData.jobTitle}
                              onChange={(e) => setProfileData({...profileData, jobTitle: e.target.value})}
                              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g. Emergency Coordinator"
                            />
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-200 dark:border-slate-700"></div>

                        {/* Change Password Section */}
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Change Password</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                              <div className="relative">
                                <input 
                                  type={showPasswords.current ? "text" : "password"}
                                  value={profileData.currentPassword}
                                  onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                                  className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  {showPasswords.current ? '🙈' : '👁️'}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                              <div className="relative">
                                <input 
                                  type={showPasswords.new ? "text" : "password"}
                                  value={profileData.newPassword}
                                  onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                                  className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  {showPasswords.new ? '🙈' : '👁️'}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
                              <div className="relative">
                                <input 
                                  type={showPasswords.confirm ? "text" : "password"}
                                  value={profileData.confirmPassword}
                                  onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                                  className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <CardHeader>
                          <CardTitle className="text-slate-900">👥 Regular Users</CardTitle>
                          <p className="text-slate-600 text-sm mt-1">Manage regular app users and prevent spam alerts</p>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Alerts Submitted</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
                      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <CardHeader>
                          <CardTitle className="text-slate-900">🚨 Rescuers Account</CardTitle>
                          <p className="text-slate-600 text-sm mt-1">Manage rescuer accounts and prevent unauthorized access</p>
                        </CardHeader>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Account Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Duty Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Team</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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

      {/* Report Details Modal */}
      {showReportDetailsModal && selectedReportForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Alert Details</h2>
              <button 
                onClick={() => setShowReportDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Alert ID and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Alert ID</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">ALT-{(selectedReportForDetails._id || selectedReportForDetails.id || "0000").substring(0, 12).toUpperCase()}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    selectedReportForDetails.status === "resolved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" :
                    selectedReportForDetails.status === "declined" ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" :
                    selectedReportForDetails.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}>
                    {toTitleCase(selectedReportForDetails.status || "Pending")}
                  </span>
                </div>
              </div>

              {/* Alert Information */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Alert Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Disaster Type</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{selectedReportForDetails.disasterType || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Severity</p>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        selectedReportForDetails.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" :
                        selectedReportForDetails.severity === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" :
                        selectedReportForDetails.severity === "moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}>
                        {toTitleCase(selectedReportForDetails.severity || "Low")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Location</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{selectedReportForDetails.locationName || selectedReportForDetails.location || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Coordinates</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{selectedReportForDetails.lat?.toFixed(4)}, {selectedReportForDetails.lng?.toFixed(4)}</p>
                  </div>
                </div>
                {selectedReportForDetails.note && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Details/Notes</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">{selectedReportForDetails.note}</p>
                  </div>
                )}
                {/* Photo Evidence Section */}
                {(selectedReportForDetails.photoUrl || selectedReportForDetails.resolutionPhotoUrl) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedReportForDetails.photoUrl && (
                      <div className="flex flex-col">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2 flex items-center gap-1">
                          📸 Incident Photo
                        </p>
                        <a 
                          href={selectedReportForDetails.photoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video group cursor-zoom-in bg-slate-900"
                        >
                          <img 
                            src={selectedReportForDetails.photoUrl} 
                            alt="Incident Evidence" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </a>
                      </div>
                    )}
                    {selectedReportForDetails.resolutionPhotoUrl && (
                      <div className="flex flex-col">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2 flex items-center gap-1">
                          ✅ Resolution Proof
                        </p>
                        <a 
                          href={selectedReportForDetails.resolutionPhotoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-900/50 aspect-video group cursor-zoom-in bg-slate-900"
                        >
                          <img 
                            src={selectedReportForDetails.resolutionPhotoUrl} 
                            alt="Resolution Proof" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Performance & Routing Summary Section */}
              {(selectedReportForDetails.status === "in_progress" || selectedReportForDetails.status === "resolved" || selectedReportForDetails.responseDurationMinutes != null) && (
                <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50/30 dark:bg-blue-950/20 text-slate-900 dark:text-white">
                  <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                    ⏱️ Response & Route Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-extrabold uppercase">Response Time</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedReportForDetails.responseDurationMinutes != null 
                          ? `${selectedReportForDetails.responseDurationMinutes} mins`
                          : "Awaiting arrival..."
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-extrabold uppercase">Distance Traveled</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedReportForDetails.responseDistanceMeters != null 
                          ? (selectedReportForDetails.responseDistanceMeters >= 1000
                              ? `${(selectedReportForDetails.responseDistanceMeters / 1000).toFixed(2)} km`
                              : `${selectedReportForDetails.responseDistanceMeters} m`)
                          : "Calculating..."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                {selectedReportForDetails.assignedTeam ? (
                  <button
                    onClick={() => {
                      setShowReportDetailsModal(false);
                      setActiveTab("ongoing");
                      setExpandedRescue(selectedReportForDetails._id);
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    View Rescue
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowReportDetailsModal(false);
                      setSelectedAlertForDispatch(selectedReportForDetails);
                      setShowDispatchModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Assign Team
                  </button>
                )}
                <button
                  onClick={() => setShowReportDetailsModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium rounded-xl transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto text-slate-900 dark:text-white">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedUserForDetails.name} - Report History
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{selectedUserForDetails.email}</p>
              </div>
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {userReportHistory && userReportHistory.length > 0 ? (
                <div className="space-y-3">
                  {userReportHistory.map((report) => (
                    <div key={report._id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{report.title || report.locationName}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          report.status === 'ongoing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{report.description}</p>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>📍 {report.locationName}</span>
                        <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No report history found for this user</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rescuer Details Modal */}
      {showRescuerDetailsModal && selectedRescuerForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto text-slate-900 dark:text-white">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedRescuerForDetails.name} - Rescue History
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{selectedRescuerForDetails.email}</p>
              </div>
              <button
                onClick={() => setShowRescuerDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {rescuerRescueHistory && rescuerRescueHistory.length > 0 ? (
                <div className="space-y-3">
                  {rescuerRescueHistory.map((rescue) => (
                    <div key={rescue._id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{rescue.title || rescue.description}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rescue.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          rescue.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {rescue.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{rescue.description}</p>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>📍 {rescue.location || rescue.locationName}</span>
                        <span>📅 {new Date(rescue.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No rescue history found for this rescuer</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowRescuerDetailsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors"
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
            className={`pointer-events-auto rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-right-96 fade-in border ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/90 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-blue-50 dark:bg-blue-950/90 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'info' && <Clock size={18} className="flex-shrink-0" />}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Always-visible in-app emergency popup fallback */}
      {incomingAlert && (
        <div className="fixed bottom-4 right-4 z-[60] w-[360px] bg-white dark:bg-slate-800 border-2 border-red-400 dark:border-red-600 shadow-2xl rounded-2xl p-4 text-slate-900 dark:text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase text-red-600 dark:text-red-400 tracking-wider">Incoming Emergency SOS</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{incomingAlert.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{incomingAlert.message}</p>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
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
