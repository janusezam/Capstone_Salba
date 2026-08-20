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
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

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
  const [selectedLocation, setSelectedLocation] = useState(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [activeReport, setActiveReport] = useState(null);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const navigation = useNavigation();
  const { logout } = useAuth();

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

  const getDistanceText = () => {
    if (!activeReport || activeReport.status !== 'on_the_way') return null;
    const rescuerLat = activeReport.assignedRescuer?.rescuerLat;
    const rescuerLng = activeReport.assignedRescuer?.rescuerLng;
    if (!rescuerLat || !rescuerLng) return "Calculating...";
    
    const victimLat = activeReport.lat;
    const victimLng = activeReport.lng;
    
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

      // Use selected location if available, otherwise fetch GPS
      let coords = selectedLocation;
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

  if (isMapExpanded) {
    return (
      <View style={styles.expandedMapContainer}>
        <MapView
          style={styles.expandedMap}
          initialRegion={{
            latitude: selectedLocation?.latitude || location?.latitude || 8.1574,
            longitude: selectedLocation?.longitude || location?.longitude || 125.1246,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
        >
          {(selectedLocation || location) && (
            <Marker coordinate={selectedLocation || location}>
              <View style={styles.emergencyMarker}>
                <Ionicons name="warning" size={24} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
        <TouchableOpacity
          style={styles.closeMapButton}
          onPress={() => setIsMapExpanded(false)}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.pinInfoCard}>
          <Text style={styles.pinInfoTitle}>Pinpoint Location</Text>
          <Text style={styles.expandedMapHint}>Tap on the map to set the exact emergency location.</Text>
          <TouchableOpacity
            style={styles.pinDoneButton}
            onPress={() => setIsMapExpanded(false)}
          >
            <Text style={styles.pinDoneText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Header with notification bell and burger menu */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setNotificationModalVisible(true)}
          >
            <Ionicons name="notifications" size={28} color="#333" />
            {activeReport && (
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

        {/* Notification Modal */}
        <Modal
          visible={notificationModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setNotificationModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setNotificationModalVisible(false)}
          >
            <View style={styles.notificationModalContainer}>
              <View style={styles.notificationModalHeader}>
                <Text style={styles.notificationModalTitle}>Emergency Report Status</Text>
                <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {!activeReport ? (
                <View style={styles.notificationModalContent}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
                  <Text style={styles.notificationModalEmpty}>No active reports at the moment.</Text>
                </View>
              ) : (
                <View style={styles.notificationModalContent}>
                  <Text style={styles.reportStatusType}>{activeReport.type || 'Emergency'} Alert</Text>
                  
                  <View style={styles.statusBadgeContainer}>
                    <Text style={styles.statusBadgeText}>
                      {activeReport.status === 'pending' && "Pending Review"}
                      {activeReport.status === 'acknowledged' && "Acknowledged"}
                      {activeReport.status === 'on_the_way' && "Rescuer On The Way"}
                      {activeReport.status === 'ongoing' && "Rescuer Arrived"}
                    </Text>
                  </View>

                  {activeReport.status === 'on_the_way' && (
                    <View style={styles.distanceContainer}>
                      <Ionicons name="bicycle" size={32} color="#0284c7" />
                      <Text style={styles.distanceText}>{getDistanceText()}</Text>
                      <Text style={styles.distanceSubtext}>
                        {activeReport.assignedRescuer?.rescuerName ? `${activeReport.assignedRescuer.rescuerName} is moving towards your location.` : "A rescuer is moving towards your location."}
                      </Text>
                    </View>
                  )}

                  {activeReport.status === 'ongoing' && (
                    <View style={styles.distanceContainer}>
                      <Ionicons name="location" size={32} color="#10b981" />
                      <Text style={styles.distanceText}>Arrived at Scene</Text>
                      <Text style={styles.distanceSubtext}>
                        {activeReport.assignedRescuer?.rescuerName ? `${activeReport.assignedRescuer.rescuerName} has arrived at your location.` : "A rescuer has arrived at your location."}
                      </Text>
                    </View>
                  )}
                  
                  <Text style={styles.reportTimeText}>
                    Reported on {new Date(activeReport.createdAt).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
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

        <Text style={styles.sectionTitle}>Location (Testing)</Text>
        <View style={styles.mapContainer}>
          {location ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: selectedLocation?.latitude || location?.latitude || 8.1574,
                longitude: selectedLocation?.longitude || location?.longitude || 125.1246,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              onPress={() => setIsMapExpanded(true)}
            >
              <Marker coordinate={selectedLocation || location}>
                <View style={styles.emergencyMarker}>
                  <Ionicons name="warning" size={20} color="#fff" />
                </View>
              </Marker>
            </MapView>
          ) : (
            <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}} />
          )}
          <TouchableOpacity
            style={styles.mapOverlayButton}
            onPress={() => setIsMapExpanded(true)}
          >
            <Ionicons name="expand" size={16} color="#fff" />
            <Text style={styles.mapOverlayText}>Change Pin</Text>
          </TouchableOpacity>
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
  sectionTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginLeft: "8%",
  },
  mapContainer: {
    width: "85%",
    height: 180,
    marginTop: 10,
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
    top: 20,
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
  },
  mapControls: {
    position: "absolute",
    top: 20,
    right: 15,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  myLocationMarker: {
    padding: 5,
  },
  myLocationInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
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
  emergencyMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  pinInfoCard: {
    position: "absolute",
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  pinInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  expandedMapHint: {
    fontSize: 14,
    color: "#666",
  },
  expandedCoords: {
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    fontWeight: "600",
  },
  pinDoneButton: {
    marginTop: 10,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  pinDoneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  notificationModalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationModalContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  notificationModalEmpty: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  reportStatusType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 10,
  },
  statusBadgeContainer: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusBadgeText: {
    color: '#d97706',
    fontWeight: '700',
    fontSize: 14,
  },
  distanceContainer: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 15,
    width: '100%',
    marginBottom: 15,
  },
  distanceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0284c7',
    marginVertical: 5,
  },
  distanceSubtext: {
    fontSize: 13,
    color: '#0369a1',
    textAlign: 'center',
  },
  reportTimeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
});
