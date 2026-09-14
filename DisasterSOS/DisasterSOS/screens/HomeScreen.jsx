import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Animated,
  Image,
  Platform,
  TextInput,
  Pressable,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";

import { sendAlert, getMyReports } from "../services/alertService";

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const R = 6371e3; // metres
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
};
import { submitFeedback } from "../services/feedbackService";
import { Ionicons } from "@expo/vector-icons";
import { Dropdown } from "react-native-element-dropdown";
import { useNavigation } from "@react-navigation/native";
import { getNearestBarangay } from "../utils/locationHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";

const getReportStatusLabelAndColor = (status) => {
  const normStatus = String(status || '').trim().toLowerCase();
  switch (normStatus) {
    case 'new':
    case 'pending':
      return { label: "Pending Review", color: "#B45309", bgColor: "#FEF3C7" };
    case 'assigned':
    case 'acknowledged':
      return { label: "Rescuer Assigned", color: "#1D4ED8", bgColor: "#DBEAFE" };
    case 'on_the_way':
      return { label: "Rescuer On The Way", color: "#6D28D9", bgColor: "#EDE9FE" };
    case 'ongoing':
    case 'in_progress':
      return { label: "Rescuer Arrived (Ongoing)", color: "#047857", bgColor: "#D1FAE5" };
    case 'resolved':
      return { label: "Resolved", color: "#065F46", bgColor: "#D1FAE5" };
    case 'declined':
      return { label: "Declined", color: "#B91C1C", bgColor: "#FEE2E2" };
    default:
      return { label: status || "Sent", color: "#374151", bgColor: "#F3F4F6" };
  }
};

const getDisasterIconAndColor = (type) => {
  const normType = String(type || '').trim().toLowerCase();
  switch (normType) {
    case 'flood':
      return { name: "water", color: "#3B82F6", label: "Flood" };
    case 'fire':
      return { name: "flame", color: "#EF4444", label: "Fire" };
    case 'earthquake':
      return { name: "pulse", color: "#F59E0B", label: "Earthquake" };
    case 'landslide':
      return { name: "warning", color: "#78350F", label: "Landslide" };
    case 'typhoon':
      return { name: "thunderstorm", color: "#1E3A8A", label: "Typhoon" };
    default:
      return { name: "alert-circle", color: "#DC2626", label: type || "Emergency" };
  }
};

const renderTimeline = (status) => {
  const steps = [
    { label: "Reported", statuses: ['new', 'pending'] },
    { label: "Assigned", statuses: ['assigned', 'acknowledged'] },
    { label: "En Route", statuses: ['on_the_way'] },
    { label: "Arrived", statuses: ['ongoing', 'in_progress', 'resolved'] }
  ];

  const normStatus = String(status || '').trim().toLowerCase();
  
  let activeIndex = 0;
  if (steps[1].statuses.includes(normStatus)) activeIndex = 1;
  else if (steps[2].statuses.includes(normStatus)) activeIndex = 2;
  else if (steps[3].statuses.includes(normStatus) || normStatus === 'resolved') activeIndex = 3;

  return (
    <View style={styles.timelineContainer}>
      {steps.map((step, idx) => {
        const isCompleted = idx < activeIndex;
        const isActive = idx === activeIndex;
        
        return (
          <React.Fragment key={idx}>
            <View style={styles.timelineStep}>
              <View style={[
                styles.timelineDot,
                isCompleted && styles.timelineDotCompleted,
                isActive && styles.timelineDotActive
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[
                    styles.timelineDotText,
                    isActive && styles.timelineDotTextActive
                  ]}>{idx + 1}</Text>
                )}
              </View>
              <Text style={[
                styles.timelineLabel,
                isActive && styles.timelineLabelActive,
                isCompleted && styles.timelineLabelCompleted
              ]}>
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={[
                styles.timelineConnector,
                isCompleted && styles.timelineConnectorCompleted
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default function HomeScreen() {
  const ALERT_COOLDOWN_SECONDS = 60;
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [disasterType, setDisasterType] = useState(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Success overlay
  const [showSuccess, setShowSuccess] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [activeReport, setActiveReport] = useState(null);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [lastViewedReportUpdatedAt, setLastViewedReportUpdatedAt] = useState(null);
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  // Load last viewed report timestamp from AsyncStorage on user change
  useEffect(() => {
    const loadLastViewed = async () => {
      try {
        if (user && (user._id || user.phone)) {
          const userId = user._id || user.phone;
          const val = await AsyncStorage.getItem(`lastViewedReport_${userId}`);
          setLastViewedReportUpdatedAt(val);
        }
      } catch (err) {
        console.log("Error loading last viewed report:", err);
      }
    };
    loadLastViewed();
  }, [user]);

  // Mark report as read/viewed when opening the notifications modal
  const handleOpenNotifications = async () => {
    setNotificationModalVisible(true);
    if (activeReport && user && (user._id || user.phone)) {
      const userId = user._id || user.phone;
      const currentUpdatedAt = activeReport.updatedAt;
      setLastViewedReportUpdatedAt(currentUpdatedAt);
      try {
        await AsyncStorage.setItem(`lastViewedReport_${userId}`, currentUpdatedAt);
      } catch (err) {
        console.log("Error saving last viewed report:", err);
      }
    }
  };

  // Poll for active reports
  useEffect(() => {
    let interval;
    const fetchActiveReport = async () => {
      try {
        const data = await getMyReports();
        if (data && data.reports && data.reports.length > 0) {
          const active = data.reports.find(r => 
            r.status === 'new' || r.status === 'pending' || r.status === 'acknowledged' || r.status === 'on_the_way' || r.status === 'ongoing'
          );
          setActiveReport(active || null);
        } else {
          setActiveReport(null);
        }
      } catch (err) {
        console.log("Error fetching reports:", err);
        if (err.message && err.message.includes("401")) {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
      }
    };
    
    fetchActiveReport();
    interval = setInterval(fetchActiveReport, 5000);
    return () => clearInterval(interval);
  }, []);

  const lastRouteFetchRef = useRef({ rescuerLat: null, rescuerLng: null, victimLat: null, victimLng: null, time: 0 });

  // Fetch road route from OSRM when rescuer and victim locations are available
  useEffect(() => {
    let isCancelled = false;
    const updateRoadRoute = async () => {
      if (!activeReport) {
        setRouteCoordinates([]);
        return;
      }

      const victimLat = Number(activeReport.latitude || activeReport.lat);
      const victimLng = Number(activeReport.longitude || activeReport.lng);
      const rescuerLat = Number(activeReport.assignedRescuer?.rescuerLat);
      const rescuerLng = Number(activeReport.assignedRescuer?.rescuerLng);

      const hasVictimLoc = !isNaN(victimLat) && !isNaN(victimLng) && victimLat !== 0;
      const hasRescuerLoc = !isNaN(rescuerLat) && !isNaN(rescuerLng) && rescuerLat !== 0;
      const isEnRoute = activeReport.status === 'on_the_way' || activeReport.status === 'ongoing' || activeReport.status === 'in_progress';

      if (hasVictimLoc && hasRescuerLoc && isEnRoute) {
        const now = Date.now();
        const last = lastRouteFetchRef.current;
        const movedMeters = (last.rescuerLat !== null && last.rescuerLng !== null)
          ? calculateDistanceMeters(last.rescuerLat, last.rescuerLng, rescuerLat, rescuerLng)
          : Infinity;
        const targetMovedMeters = (last.victimLat !== null && last.victimLng !== null)
          ? calculateDistanceMeters(last.victimLat, last.victimLng, victimLat, victimLng)
          : Infinity;
        const elapsedMs = now - (last.time || 0);

        // Avoid re-fetching if movement is minimal
        if (routeCoordinates && routeCoordinates.length > 2 && movedMeters < 25 && targetMovedMeters < 10 && elapsedMs < 20000) {
          return;
        }

        lastRouteFetchRef.current = { rescuerLat, rescuerLng, victimLat, victimLng, time: now };

        const endpoints = [
          `https://router.project-osrm.org/route/v1/driving/${rescuerLng},${rescuerLat};${victimLng},${victimLat}?overview=full&geometries=geojson`,
          `https://routing.openstreetmap.de/routed-car/route/v1/driving/${rescuerLng},${rescuerLat};${victimLng},${victimLat}?overview=full&geometries=geojson`,
        ];

        let loadedCoords = null;
        for (const url of endpoints) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
                loadedCoords = data.routes[0].geometry.coordinates.map(pt => ({
                  latitude: pt[1],
                  longitude: pt[0],
                }));
                break;
              }
            }
          } catch (err) {
            // Try next mirror
          }
        }

        if (!isCancelled) {
          if (loadedCoords && loadedCoords.length > 0) {
            setRouteCoordinates(loadedCoords);
          } else {
            // Keep previous valid route if available
            setRouteCoordinates(prev => {
              if (prev && prev.length > 2) return prev;
              return [
                { latitude: rescuerLat, longitude: rescuerLng },
                { latitude: victimLat, longitude: victimLng },
              ];
            });
          }
        }
      } else {
        setRouteCoordinates([]);
      }
    };

    updateRoadRoute();
    return () => { isCancelled = true; };
  }, [
    activeReport?._id,
    activeReport?.status,
    activeReport?.latitude,
    activeReport?.lat,
    activeReport?.longitude,
    activeReport?.lng,
    activeReport?.assignedRescuer?.rescuerLat,
    activeReport?.assignedRescuer?.rescuerLng,
  ]);

  const getDistanceText = () => {
    if (!activeReport || activeReport.status !== 'on_the_way') return null;
    const rescuerLat = activeReport.assignedRescuer?.rescuerLat;
    const rescuerLng = activeReport.assignedRescuer?.rescuerLng;
    if (!rescuerLat || !rescuerLng) return "Calculating...";
    
    const victimLat = activeReport.lat || activeReport.latitude;
    const victimLng = activeReport.lng || activeReport.longitude;
    
    const distMeters = calculateDistanceMeters(victimLat, victimLng, rescuerLat, rescuerLng);
    if (distMeters === null) return "Calculating...";
    if (distMeters < 1000) return `${Math.round(distMeters)}m away`;
    return `${(distMeters / 1000).toFixed(1)}km away`;
  };

  const disasterOptions = [
    { label: "Flood", value: "Flood", icon: "water" },
    { label: "Fire", value: "Fire", icon: "flame" },
    { label: "Earthquake", value: "Earthquake", icon: "pulse" },
    { label: "Landslide", value: "Landslide", icon: "warning" },
    { label: "Typhoon", value: "Typhoon", icon: "thunderstorm" },
  ];

  // Fetch user's current location on mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setLocation(coords);
        }
      } catch (error) {
        console.log("Unable to fetch location:", error);
      }
    };
    fetchUserLocation();
  }, []);

  // Countdown lock after sending a report
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      setSent(false);
      return;
    }

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleAlert = async () => {
    if (cooldownRemaining > 0) {
      Alert.alert("Please wait", `You can send another report in ${cooldownRemaining}s.`);
      return;
    }

    if (!disasterType) {
      Alert.alert("Select Disaster Type", "Please choose a disaster type first.");
      return;
    }

    // Show warning confirmation — then open camera to capture incident photo
    Alert.alert(
      "⚠️ Warning",
      "Sending a false or fake report can mislead emergency responders and waste critical resources. Only submit genuine disaster reports.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: () => openCamera(),
        },
      ]
    );
  };

  const openCamera = async () => {
    // Retrieve auth token so CameraScreen can authenticate the upload
    const token = await AsyncStorage.getItem("userToken");
    navigation.navigate("Camera", {
      token,
      onPhotoUploaded: (photoUrl) => proceedWithAlert(photoUrl),
      onSkip: () => proceedWithAlert(null),
    });
  };

  const proceedWithAlert = async (photoUrl = null) => {
    setLoading(true);
    try {
      // Get user data
      const userData = await AsyncStorage.getItem("userData");
      const user = userData ? JSON.parse(userData) : null;
      
      // Try to get phone from separate key first, then fallback to userData
      let userPhone = await AsyncStorage.getItem("userPhone");
      if (!userPhone && user?.phone) {
        userPhone = user.phone;
      }
      
      console.log('📱 [proceedWithAlert] userPhone from AsyncStorage:', userPhone);
      console.log('👤 [proceedWithAlert] User data:', user?.name, user?.email);
      console.log('📷 [proceedWithAlert] photoUrl:', photoUrl ? '✅ included' : '⏭ skipped');

      // Use current location if available, otherwise fetch GPS
      let coords = location;
      if (!coords) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is needed to send alerts.");
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setLocation(coords);
      }

      // Get the nearest barangay/purok for the current GPS location
      const nearestLocation = getNearestBarangay(coords.latitude, coords.longitude);

      const data = {
        type: disasterType,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: nearestLocation.fullName,
        note: note.trim(),
        userId: user?._id,
        userName: user?.name || "Anonymous",
        userPhone: userPhone || "",
        photoUrl: photoUrl || null,
      };

      // Log the location for debugging
      console.log(`📍 Nearest barangay: ${nearestLocation.fullName} (${nearestLocation.distance}m away)`);

      await sendAlert(data);
      setSent(true);
      setCooldownRemaining(ALERT_COOLDOWN_SECONDS);

      // Show success overlay notification
      setShowSuccess(true);
      successOpacity.setValue(0);
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-reset after 3 seconds
      setTimeout(() => {
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccess(false);
          // Reset form for next report (button remains locked until cooldown ends)
          setDisasterType(null);
          setNote("");
        });
      }, 3000);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to send alert. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      Alert.alert("Feedback", "Please enter your feedback message first.");
      return;
    }

    try {
      setSendingFeedback(true);
      const response = await submitFeedback({ message: feedbackMessage.trim(), category: "general" });
      setFeedbackModalVisible(false);
      setFeedbackMessage("");
      setFeedbackNotice(response?.notification || "Your feedback has been sent to admin.");
      Alert.alert("Feedback Sent", response?.notification || "Your feedback has been sent to admin.");
      setTimeout(() => setFeedbackNotice(""), 5000);
    } catch (error) {
      Alert.alert("Feedback Error", error.message || "Failed to send feedback.");
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Header with notification bell and burger menu */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={handleOpenNotifications}
          >
            <Ionicons name="notifications" size={28} color="#333" />
            {activeReport && (!lastViewedReportUpdatedAt || new Date(activeReport.updatedAt) > new Date(lastViewedReportUpdatedAt)) && (
              <View style={styles.notificationBadge} />
            )}
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Image source={require('../assets/CDRRMO_LOGO.png')} style={styles.centerLogo} />
            <Text style={styles.title}>SALBA</Text>
            <Text style={styles.headerSubtitle}>Malaybalay City CDDRMO One Tap Rescue</Text>
          </View>

          <TouchableOpacity
            style={styles.burgerButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="menu" size={30} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Mode indicator */}
        <View style={styles.modeIndicator}>
          <Ionicons
            name="location"
            size={18}
            color="#fff"
          />
          <Text style={styles.modeText}>
            Victim Mode
          </Text>
        </View>

        {feedbackNotice ? (
          <View style={styles.feedbackNoticeBox}>
            <Ionicons name="notifications-circle" size={18} color="#065f46" />
            <Text style={styles.feedbackNoticeText}>{feedbackNotice}</Text>
          </View>
        ) : null}


        {/* Redesigned Notification Modal */}
        <Modal
          visible={notificationModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setNotificationModalVisible(false)}
        >
          <View style={styles.notificationModalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setNotificationModalVisible(false)}
            />
            <View 
              style={styles.notificationModalContainerLarge}
            >
              <View style={styles.notificationModalHeader}>
                <Text style={styles.notificationModalTitle}>Rescue Tracking</Text>
                <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              {!activeReport ? (
                <View style={styles.notificationModalContentEmpty}>
                  <Ionicons name="checkmark-circle" size={60} color="#10b981" />
                  <Text style={styles.notificationModalEmpty}>No active rescue missions.</Text>
                  <Text style={styles.notificationModalEmptyDesc}>Any alerts you submit will show real-time tracking here.</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.modalScrollBody}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Status Card */}
                  <View style={styles.modalStatusCard}>
                    <View style={styles.modalStatusHeader}>
                      <View style={styles.disasterBadge}>
                        <Ionicons 
                          name={getDisasterIconAndColor(activeReport.disasterType || activeReport.type).name} 
                          size={24} 
                          color={getDisasterIconAndColor(activeReport.disasterType || activeReport.type).color} 
                        />
                        <Text style={styles.disasterBadgeText}>
                          {(activeReport.disasterType || activeReport.type || 'Emergency')} Alert
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadgeLarge, 
                        { backgroundColor: getReportStatusLabelAndColor(activeReport.status).bgColor }
                      ]}>
                        <Text style={[
                          styles.statusTextLarge, 
                          { color: getReportStatusLabelAndColor(activeReport.status).color }
                        ]}>
                          {getReportStatusLabelAndColor(activeReport.status).label}
                        </Text>
                      </View>
                    </View>

                    {/* Timeline */}
                    {renderTimeline(activeReport.status)}
                  </View>

                  {/* Rescuer Card if Assigned */}
                  {(activeReport.status === 'on_the_way' || activeReport.status === 'ongoing' || activeReport.status === 'in_progress') && (
                    <View style={styles.rescuerCard}>
                      <Text style={styles.cardSectionTitle}>Assigned Responder</Text>
                      <View style={styles.rescuerInfoRow}>
                        <View style={styles.rescuerAvatar}>
                          <Ionicons name="person" size={28} color="#007AFF" />
                        </View>
                        <View style={styles.rescuerNameCol}>
                          <Text style={styles.rescuerName}>
                            {activeReport.assignedRescuer?.rescuerName || 'CDRRMO Rescue Team'}
                          </Text>
                          <Text style={styles.rescuerRole}>Field Emergency Responder</Text>
                        </View>
                      </View>

                      {activeReport.status === 'on_the_way' && (
                        <View style={styles.modalDistanceContainer}>
                          <View style={styles.distanceBadgeLarge}>
                            <Ionicons name="bicycle" size={20} color="#0284c7" />
                            <Text style={styles.modalDistanceText}>{getDistanceText()}</Text>
                          </View>
                          <Text style={styles.modalDistanceSubtext}>
                            {activeReport.assignedRescuer?.rescuerName ? `${activeReport.assignedRescuer.rescuerName} is moving towards your location.` : "A rescuer is moving towards your location."}
                          </Text>
                        </View>
                      )}

                      {activeReport.status === 'ongoing' && (
                        <View style={styles.modalDistanceContainerSuccess}>
                          <View style={styles.distanceBadgeLargeSuccess}>
                            <Ionicons name="location" size={20} color="#10b981" />
                            <Text style={styles.modalDistanceTextSuccess}>Arrived at Scene</Text>
                          </View>
                          <Text style={styles.modalDistanceSubtextSuccess}>
                            {activeReport.assignedRescuer?.rescuerName ? `${activeReport.assignedRescuer.rescuerName} is currently on-scene assisting you.` : "The rescue team has arrived at your location."}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Report Details Card */}
                  <View style={styles.detailsCard}>
                    <Text style={styles.cardSectionTitle}>Incident Details</Text>
                    
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={18} color="#666" style={styles.detailItemIcon} />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Incident Location</Text>
                        <Text style={styles.detailItemVal}>{activeReport.locationName || activeReport.location || 'Location Pinned'}</Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={18} color="#666" style={styles.detailItemIcon} />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Reported Time</Text>
                        <Text style={styles.detailItemVal}>
                          {activeReport.createdAt || activeReport.timestamp 
                            ? new Date(activeReport.createdAt || activeReport.timestamp).toLocaleString() 
                            : 'Just now'}
                        </Text>
                      </View>
                    </View>

                    {activeReport.note ? (
                      <View style={styles.detailItem}>
                        <Ionicons name="document-text-outline" size={18} color="#666" style={styles.detailItemIcon} />
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailItemLabel}>Incident Note</Text>
                          <Text style={styles.detailItemVal}>{activeReport.note}</Text>
                        </View>
                      </View>
                    ) : null}

                    {activeReport.photoUrl ? (
                      <View style={styles.detailItem}>
                        <Ionicons name="image-outline" size={18} color="#666" style={styles.detailItemIcon} />
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailItemLabel}>Uploaded Photo</Text>
                          <Image 
                            source={{ uri: activeReport.photoUrl }} 
                            style={styles.uploadedPhotoPreview} 
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.safetyCard}>
                    <Ionicons name="shield-checkmark" size={24} color="#059669" />
                    <View style={styles.safetyTextContainer}>
                      <Text style={styles.safetyTitle}>Safety Instructions</Text>
                      <Text style={styles.safetyDesc}>
                        Stay calm. If safe, remain at your pinned location so the rescue team can find you easily. If you must move, keep your phone with you.
                      </Text>
                    </View>
                  </View>

                  {/* Live Tracking Map (Same simple interface as previous Location map) */}
                  {(() => {
                    const victimLat = Number(activeReport.latitude || activeReport.lat);
                    const victimLng = Number(activeReport.longitude || activeReport.lng);
                    const hasVictimLoc = !isNaN(victimLat) && !isNaN(victimLng) && victimLat !== 0;

                    const rescuerLat = Number(activeReport.assignedRescuer?.rescuerLat);
                    const rescuerLng = Number(activeReport.assignedRescuer?.rescuerLng);
                    const hasRescuerLoc = !isNaN(rescuerLat) && !isNaN(rescuerLng) && rescuerLat !== 0;

                    if (!hasVictimLoc) return null;

                    const isEnRoute = activeReport.status === 'on_the_way' || activeReport.status === 'ongoing' || activeReport.status === 'in_progress';

                    let region = {
                      latitude: victimLat,
                      longitude: victimLng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    };

                    if (hasRescuerLoc && isEnRoute) {
                      const midLat = (victimLat + rescuerLat) / 2;
                      const midLng = (victimLng + rescuerLng) / 2;
                      const latDelta = Math.max(Math.abs(victimLat - rescuerLat) * 1.6, 0.01);
                      const lngDelta = Math.max(Math.abs(victimLng - rescuerLng) * 1.6, 0.01);
                      region = {
                        latitude: midLat,
                        longitude: midLng,
                        latitudeDelta: latDelta,
                        longitudeDelta: lngDelta,
                      };
                    }

                    const displayRoute = routeCoordinates && routeCoordinates.length > 0 
                      ? routeCoordinates 
                      : (hasRescuerLoc && isEnRoute ? [{ latitude: rescuerLat, longitude: rescuerLng }, { latitude: victimLat, longitude: victimLng }] : []);

                    return (
                      <View style={styles.mapContainer}>
                        <MapView
                          style={styles.map}
                          region={region}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          pitchEnabled={false}
                          rotateEnabled={false}
                          onPress={() => setIsMapExpanded(true)}
                        >
                          <Marker coordinate={{ latitude: victimLat, longitude: victimLng }} title="Your Location">
                            <View style={styles.emergencyMarker}>
                              <Ionicons name="warning" size={20} color="#fff" />
                            </View>
                          </Marker>

                          {hasRescuerLoc && isEnRoute && (
                            <Marker coordinate={{ latitude: rescuerLat, longitude: rescuerLng }} title={activeReport.assignedRescuer?.rescuerName || "Rescuer"}>
                              <View style={styles.rescuerMarkerContainer}>
                                <Ionicons name="shield" size={38} color="#0284c7" />
                                <View style={styles.rescuerMarkerTextWrapper}>
                                  <Text style={styles.rescuerMarkerText}>
                                    {activeReport.assignedRescuer?.rescuerName ? activeReport.assignedRescuer.rescuerName.charAt(0).toUpperCase() : 'R'}
                                  </Text>
                                </View>
                              </View>
                            </Marker>
                          )}

                          {hasRescuerLoc && isEnRoute && displayRoute.length > 0 && (
                            <Polyline
                              key={`mini-route-${displayRoute.length}-${displayRoute[0]?.latitude?.toFixed(4)}`}
                              coordinates={displayRoute}
                              strokeColor="#0284C7"
                              strokeWidth={4}
                            />
                          )}
                        </MapView>

                        <TouchableOpacity
                          style={styles.mapOverlayButton}
                          onPress={() => setIsMapExpanded(true)}
                        >
                          <Ionicons name="expand" size={16} color="#fff" />
                          <Text style={styles.mapOverlayText}>Expand Map</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Fullscreen Expanded Map Modal */}
        <Modal
          visible={isMapExpanded}
          animationType="slide"
          onRequestClose={() => setIsMapExpanded(false)}
        >
          {activeReport && (() => {
            const victimLat = Number(activeReport.latitude || activeReport.lat);
            const victimLng = Number(activeReport.longitude || activeReport.lng);
            const rescuerLat = Number(activeReport.assignedRescuer?.rescuerLat);
            const rescuerLng = Number(activeReport.assignedRescuer?.rescuerLng);
            const hasRescuerLoc = !isNaN(rescuerLat) && !isNaN(rescuerLng) && rescuerLat !== 0;
            const isEnRoute = activeReport.status === 'on_the_way' || activeReport.status === 'ongoing' || activeReport.status === 'in_progress';

            let region = {
              latitude: victimLat || 8.1574,
              longitude: victimLng || 125.1246,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };

            if (hasRescuerLoc && isEnRoute && victimLat && victimLng) {
              const midLat = (victimLat + rescuerLat) / 2;
              const midLng = (victimLng + rescuerLng) / 2;
              const latDelta = Math.max(Math.abs(victimLat - rescuerLat) * 1.6, 0.02);
              const lngDelta = Math.max(Math.abs(victimLng - rescuerLng) * 1.6, 0.02);
              region = {
                latitude: midLat,
                longitude: midLng,
                latitudeDelta: latDelta,
                longitudeDelta: lngDelta,
              };
            }

            const displayRoute = routeCoordinates && routeCoordinates.length > 0 
              ? routeCoordinates 
              : (hasRescuerLoc && isEnRoute && victimLat && victimLng ? [{ latitude: rescuerLat, longitude: rescuerLng }, { latitude: victimLat, longitude: victimLng }] : []);

            return (
              <View style={styles.expandedMapContainer}>
                <MapView
                  style={styles.expandedMap}
                  initialRegion={region}
                >
                  {victimLat && victimLng && (
                    <Marker coordinate={{ latitude: victimLat, longitude: victimLng }} title="Incident Location">
                      <View style={styles.emergencyMarker}>
                        <Ionicons name="warning" size={24} color="#fff" />
                      </View>
                    </Marker>
                  )}

                  {hasRescuerLoc && isEnRoute && (
                    <Marker coordinate={{ latitude: rescuerLat, longitude: rescuerLng }} title={activeReport.assignedRescuer?.rescuerName || "Rescuer"}>
                      <View style={styles.rescuerMarkerContainer}>
                        <Ionicons name="shield" size={44} color="#0284c7" />
                        <View style={styles.rescuerMarkerTextWrapper}>
                          <Text style={styles.rescuerMarkerText}>
                            {activeReport.assignedRescuer?.rescuerName ? activeReport.assignedRescuer.rescuerName.charAt(0).toUpperCase() : 'R'}
                          </Text>
                        </View>
                      </View>
                    </Marker>
                  )}

                  {hasRescuerLoc && isEnRoute && displayRoute.length > 0 && (
                    <Polyline
                      key={`expanded-route-${displayRoute.length}-${displayRoute[0]?.latitude?.toFixed(4)}`}
                      coordinates={displayRoute}
                      strokeColor="#0284C7"
                      strokeWidth={5}
                    />
                  )}
                </MapView>

                <TouchableOpacity
                  style={styles.closeMapButton}
                  onPress={() => setIsMapExpanded(false)}
                >
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            );
          })()}
        </Modal>

        {/* Burger Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Menu</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setFeedbackModalVisible(true);
                }}
              >
                <Ionicons name="chatbox-ellipses-outline" size={22} color="#333" />
                <View style={styles.menuItemTextContainer}>
                  <Text style={styles.menuItemLabel}>Send Feedback</Text>
                  <Text style={styles.menuItemDesc}>Share your feedback with admin</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate("History");
                }}
              >
                <Ionicons name="time" size={22} color="#333" />
                <View style={styles.menuItemTextContainer}>
                  <Text style={styles.menuItemLabel}>My Report History</Text>
                  <Text style={styles.menuItemDesc}>View your sent reports</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate("Profile");
                }}
              >
                <Ionicons name="person-circle-outline" size={22} color="#333" />
                <View style={styles.menuItemTextContainer}>
                  <Text style={styles.menuItemLabel}>Profile Settings</Text>
                  <Text style={styles.menuItemDesc}>Edit your profile & password</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  Alert.alert(
                    "Logout",
                    "Are you sure you want to logout?",
                    [
                      { text: "Cancel", onPress: () => {}, style: "cancel" },
                      {
                        text: "Logout",
                        onPress: async () => {
                          await logout();
                          navigation.replace("Login");
                        },
                        style: "destructive",
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="log-out-outline" size={22} color="#d32f2f" />
                <View style={styles.menuItemTextContainer}>
                  <Text style={[styles.menuItemLabel, { color: "#d32f2f" }]}>Logout</Text>
                  <Text style={styles.menuItemDesc}>Sign out of your account</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={feedbackModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFeedbackModalVisible(false)}
        >
          <View style={styles.feedbackModalOverlay}>
            <View style={styles.feedbackModalContainer}>
              <Text style={styles.feedbackModalTitle}>Send Feedback to Admin</Text>
              <Text style={styles.feedbackModalSubtitle}>Your message will be sent directly to admin for review.</Text>

              <TextInput
                style={styles.feedbackInput}
                value={feedbackMessage}
                onChangeText={setFeedbackMessage}
                placeholder="Write your feedback here..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <View style={styles.feedbackModalButtons}>
                <TouchableOpacity
                  style={styles.feedbackCancelButton}
                  onPress={() => setFeedbackModalVisible(false)}
                  disabled={sendingFeedback}
                >
                  <Text style={styles.feedbackCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.feedbackSendButton}
                  onPress={handleSubmitFeedback}
                  disabled={sendingFeedback}
                >
                  {sendingFeedback ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.feedbackSendButtonText}>Send to Admin</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* SOS Icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: cooldownRemaining > 0 ? "green" : "red" },
          ]}
        >
          <Ionicons name="alert" size={64} color="white" />
        </View>

        <Text style={styles.subtitle}>Emergency Alert</Text>

        {/* Alert Button */}
        <TouchableOpacity
          style={[
            styles.alertButton,
            { backgroundColor: cooldownRemaining > 0 ? "#9CA3AF" : "red" },
          ]}
          onPress={handleAlert}
          disabled={loading || cooldownRemaining > 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.alertButtonText}>
              {cooldownRemaining > 0
                ? `Report sent. Retry in ${cooldownRemaining}s`
                : "Tap to Alert"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.disasterGrid}>
          {disasterOptions.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.disasterCard,
                disasterType === item.value && styles.disasterCardSelected
              ]}
              onPress={() => setDisasterType(item.value)}
            >
              <Ionicons 
                name={item.icon} 
                size={32} 
                color={disasterType === item.value ? "#fff" : "#d32f2f"} 
              />
              <Text style={[
                styles.disasterCardText,
                disasterType === item.value && styles.disasterCardTextSelected
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Optional Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add extra details (optional)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />
        </View>

      </View>

      {/* Success Notification Overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Alert Sent!</Text>
            <Text style={styles.successMessage}>
              Your {disasterType} alert has been successfully submitted.
            </Text>
            <Text style={styles.successSubtext}>Resetting in a moment...</Text>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 10,
    position: "relative",
  },
  notificationButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: '#fff',
  },
  centerLogo: {
    width: 45,
    height: 45,
    resizeMode: "contain",
    marginBottom: 5,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#555",
    marginTop: 2,
  },
  burgerButton: {
    position: "absolute",
    right: 20,
    padding: 5,
  },
  modeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 15,
  },
  modeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  feedbackNoticeBox: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  feedbackNoticeText: {
    color: "#065f46",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  feedbackModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackModalContainer: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  feedbackModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  feedbackModalSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    minHeight: 110,
    padding: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  feedbackModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  feedbackCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  feedbackCancelButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  feedbackSendButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    minWidth: 110,
    alignItems: "center",
  },
  feedbackSendButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  menuContainer: {
    backgroundColor: "#fff",
    marginTop: 80,
    marginRight: 15,
    borderRadius: 12,
    padding: 15,
    width: 280,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  menuItemActive: {
    backgroundColor: "#007AFF",
  },
  menuItemTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  menuItemLabelActive: {
    color: "#fff",
  },
  menuItemDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  menuItemDescActive: {
    color: "#dce9ff",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 6,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 20,
  },
  alertButton: {
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 10,
    width: "85%",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 55,
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  disasterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    width: '90%',
  },
  disasterCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  disasterCardSelected: {
    backgroundColor: '#d32f2f',
    borderColor: '#d32f2f',
  },
  disasterCardText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  disasterCardTextSelected: {
    color: '#fff',
  },
  noteContainer: {
    width: "85%",
    marginTop: 12,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
    color: "#333",
    textAlignVertical: "top",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  successBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#333",
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 6,
  },
  successSubtext: {
    fontSize: 12,
    color: "#aaa",
  },
  // Active Rescue Banner on Home Screen
  activeReportBanner: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bannerTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerTypeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  bannerStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bannerDesc: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  bannerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  bannerTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  bannerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bannerActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },

  // Redesigned Modal Containers
  notificationModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  notificationModalContainerLarge: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: "100%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationModalContentEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  notificationModalEmpty: {
    marginTop: 10,
    fontSize: 18,
    color: '#333',
    fontWeight: '700',
    textAlign: 'center',
  },
  notificationModalEmptyDesc: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  modalScrollBody: {
    marginVertical: 10,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalStatusCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  modalStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  disasterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disasterBadgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextLarge: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Timeline styling
  timelineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  timelineStep: {
    alignItems: "center",
    flex: 1,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineDotCompleted: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  timelineDotActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#DBEAFE",
    transform: [{ scale: 1.15 }],
  },
  timelineDotText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  timelineDotTextActive: {
    color: "#fff",
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
    textAlign: "center",
  },
  timelineLabelActive: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  timelineLabelCompleted: {
    color: "#4B5563",
    fontWeight: "600",
  },
  timelineConnector: {
    height: 3,
    backgroundColor: "#E5E7EB",
    flex: 1,
    alignSelf: "center",
    marginBottom: 16,
  },
  timelineConnectorCompleted: {
    backgroundColor: "#10B981",
  },

  // Rescuer styling
  rescuerCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  rescuerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  rescuerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  rescuerNameCol: {
    flex: 1,
  },
  rescuerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  rescuerRole: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  modalDistanceContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  modalDistanceContainerSuccess: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  distanceBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 6,
  },
  distanceBadgeLargeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 6,
  },
  modalDistanceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0369a1",
  },
  modalDistanceTextSuccess: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065f46",
  },
  modalDistanceSubtext: {
    fontSize: 12,
    color: "#0284c7",
    textAlign: "center",
    lineHeight: 16,
  },
  modalDistanceSubtextSuccess: {
    fontSize: 12,
    color: "#047857",
    textAlign: "center",
    lineHeight: 16,
  },

  // Details card styling
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  detailItemIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailItemVal: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    marginTop: 2,
  },
  uploadedPhotoPreview: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Safety card
  safetyCard: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 4,
  },
  safetyDesc: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 16,
  },
  mapContainer: {
    width: "100%",
    height: 180,
    marginTop: 14,
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  mapOverlayButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  mapOverlayText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  expandedMapContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  expandedMap: {
    flex: 1,
  },
  closeMapButton: {
    position: "absolute",
    top: 40,
    left: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  emergencyMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rescuerMarkerContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  rescuerMarkerTextWrapper: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescuerMarkerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif',
  },
});
