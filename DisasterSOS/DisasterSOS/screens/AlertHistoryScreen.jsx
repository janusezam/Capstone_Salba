import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export default function AlertHistoryScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const normalizeStatus = (report) => {
    const adminStatusRaw = report?.reportStatus || report?._reportStatus || report?.status;
    const adminStatus = String(adminStatusRaw || "").trim().toLowerCase().replace(/\s+/g, '_');

    // Admin decision is final: once resolved/declined, show that to the user.
    if (adminStatus === 'resolved' || adminStatus === 'declined') return adminStatus;

    const rescuer = report?.rescuerMissionStatus || report?._rescuerMissionStatus;
    if (rescuer && rescuer !== 'none') return String(rescuer).toLowerCase();

    const rawStatus = report?.status || report?.reportStatus || report?._reportStatus || 'new';
    const statusText = String(rawStatus).trim().toLowerCase();

    if (statusText === 'on the way') return 'on_the_way';
    if (statusText === 'in progress') return 'in_progress';
    return statusText.replace(/\s+/g, '_');
  };

  const normalizeReport = (report) => {
    const timestamp = report?.timestamp || report?.createdAt || report?.updatedAt || null;
    const normalizedStatus = normalizeStatus(report);

    return {
      _id: report?._id,
      type: report?.type || report?.disasterType || 'Not Specified',
      status: normalizedStatus,
      location: report?.location || report?.locationName || 'Location not specified',
      timestamp,
      date: report?.date || (timestamp ? new Date(timestamp).toLocaleDateString() : 'Date Unavailable'),
      time: report?.time || (timestamp ? new Date(timestamp).toLocaleTimeString() : 'Time Unavailable'),
      severity: report?.severity || 'moderate',
      message: report?.message || report?.note || '',
      senderName: report?.senderName || 'Anonymous',
      photoUrl: report?.photoUrl || null,
      assignedRescuer: report?.assignedRescuer || null,
    };
  };

  const fetchAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      
      // Try to fetch user's own reports first
      try {
        console.log('📱 Fetching my reports with token:', token ? '✓ Present' : '✗ Missing');
        const res = await axios.get(`${BASE_URL}/api/alerts/my-reports`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✓ Fetched user reports:', res.data.count);
        const normalizedReports = (res.data.reports || []).map(normalizeReport);
        console.log('📊 First report structure:', res.data.reports?.[0] ? {
          _id: normalizedReports[0]?._id,
          type: normalizedReports[0]?.type,
          status: normalizedReports[0]?.status,
          timestamp: normalizedReports[0]?.timestamp,
          date: normalizedReports[0]?.date,
          time: normalizedReports[0]?.time
        } : 'No reports');
        setAlerts(normalizedReports);
      } catch (err) {
        // Fallback to all alerts if user endpoint not available
        console.warn('⚠️ User-specific endpoint failed:', err.response?.status, err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          Alert.alert("Authorization", "Please log in again to view your reports");
          setAlerts([]);
        } else if (err.code === 'ECONNREFUSED') {
          Alert.alert("Connection Error", "Cannot reach server. Please check your connection.");
          setAlerts([]);
        } else {
          // Try fallback to all alerts
          console.log('📱 Trying fallback endpoint...');
          const res = await axios.get(`${BASE_URL}/api/alerts`);
          setAlerts((res.data || []).map(normalizeReport));
        }
      }
    } catch (err) {
      console.error('❌ Fetch alerts error:', err);
      Alert.alert("Error", "Failed to load your reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const clearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to permanently delete all your alerts? This action cannot be undone.",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete All",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem("userToken");
              const res = await axios.delete(`${BASE_URL}/api/alerts/my-reports`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              setAlerts([]);
              Alert.alert("Success", `Deleted ${res.data.deletedCount} alert(s) from your history.`);
            } catch (err) {
              console.error("❌ Clear history error:", err);
              Alert.alert("Error", err.response?.data?.message || "Failed to clear history");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Helper status/icon methods moved to global scope

  const showAlertDetails = (alert) => {
    console.log('📋 Alert Details:', {
      type: alert.type,
      timestamp: alert.timestamp,
      status: alert.status,
      location: alert.location,
      severity: alert.severity,
    });
    setSelectedAlert(alert);
    setDetailsVisible(true);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/CDRRMO_LOGO.png')} style={styles.logo} />
        <Text style={styles.title}>My Reports</Text>
        {alerts.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearHistory}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No reports sent yet</Text>
          <Text style={styles.emptySubtext}>Your reports will appear here after submission</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {alerts.map((a) => {
            const disasterTheme = getDisasterIconAndColor(a.type);
            const statusInfo = getReportStatusLabelAndColor(a.status);
            
            return (
              <TouchableOpacity 
                key={a._id} 
                style={styles.historyCardPremium}
                onPress={() => showAlertDetails(a)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBadgePremium, { backgroundColor: disasterTheme.color + '15' }]}>
                  <Ionicons name={disasterTheme.name} size={24} color={disasterTheme.color} />
                </View>
                
                <View style={styles.cardContentPremium}>
                  <View style={styles.cardHeaderPremium}>
                    <Text style={styles.cardTypePremium}>{a.type || 'Emergency'}</Text>
                    <View style={[styles.statusBadgePremium, { backgroundColor: statusInfo.bgColor }]}>
                      <Text style={[styles.statusTextPremium, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardLocationRow}>
                    <Ionicons name="location-outline" size={13} color="#4B5563" />
                    <Text style={styles.cardLocationPremium} numberOfLines={1}>
                      {a.location}
                    </Text>
                  </View>

                  <View style={styles.cardFooterPremium}>
                    <Text style={styles.cardTimePremium}>
                      {a.timestamp ? new Date(a.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No date'}
                    </Text>
                    
                    <View style={styles.cardRightBadges}>
                      {a.severity && (
                        <View style={[
                          styles.severityBadgePremium,
                          {
                            backgroundColor: a.severity === 'critical' ? '#FEE2E2' :
                                           a.severity === 'high' ? '#FEF3C7' :
                                           a.severity === 'moderate' ? '#DBEAFE' : '#DCFCE7'
                          }
                        ]}>
                          <Text style={[
                            styles.severityTextPremium,
                            {
                              color: a.severity === 'critical' ? '#DC2626' :
                                    a.severity === 'high' ? '#D97706' :
                                    a.severity === 'moderate' ? '#2563EB' : '#16A34A'
                            }
                          ]}>{a.severity}</Text>
                        </View>
                      )}
                      
                      <View style={styles.arrowIconBadge}>
                        <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Redesigned Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.notificationModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setDetailsVisible(false)}
          />
          <View style={styles.notificationModalContainerLarge}>
            <View style={styles.notificationModalHeader}>
              <Text style={styles.notificationModalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedAlert && (
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
                        name={getDisasterIconAndColor(selectedAlert.type).name} 
                        size={24} 
                        color={getDisasterIconAndColor(selectedAlert.type).color} 
                      />
                      <Text style={styles.disasterBadgeText}>
                        {(selectedAlert.type || 'Emergency')} Alert
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadgeLarge, 
                      { backgroundColor: getReportStatusLabelAndColor(selectedAlert.status).bgColor }
                    ]}>
                      <Text style={[
                        styles.statusTextLarge, 
                        { color: getReportStatusLabelAndColor(selectedAlert.status).color }
                      ]}>
                        {getReportStatusLabelAndColor(selectedAlert.status).label}
                      </Text>
                    </View>
                  </View>

                  {/* Timeline */}
                  {renderTimeline(selectedAlert.status)}
                </View>

                {/* Rescuer Card if Assigned */}
                {selectedAlert.assignedRescuer?.rescuerName && (
                  <View style={styles.rescuerCard}>
                    <Text style={styles.cardSectionTitle}>Assigned Responder</Text>
                    <View style={styles.rescuerInfoRow}>
                      <View style={styles.rescuerAvatar}>
                        <Ionicons name="person" size={28} color="#007AFF" />
                      </View>
                      <View style={styles.rescuerNameCol}>
                        <Text style={styles.rescuerName}>
                          {selectedAlert.assignedRescuer.rescuerName}
                        </Text>
                        <Text style={styles.rescuerRole}>CDRRMO Responder Team</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Report Details Card */}
                <View style={styles.detailsCard}>
                  <Text style={styles.cardSectionTitle}>Incident Details</Text>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={18} color="#666" style={styles.detailItemIcon} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Incident Location</Text>
                      <Text style={styles.detailItemVal}>{selectedAlert.location || 'Location Pinned'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="alert-circle-outline" size={18} color="#666" style={styles.detailItemIcon} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Severity Level</Text>
                      <Text style={[
                        styles.detailItemVal, 
                        { 
                          color: selectedAlert.severity === 'critical' ? '#DC2626' :
                                selectedAlert.severity === 'high' ? '#D97706' :
                                selectedAlert.severity === 'moderate' ? '#2563EB' : '#16A34A',
                          fontWeight: '700',
                          textTransform: 'capitalize'
                        }
                      ]}>
                        {selectedAlert.severity || 'Moderate'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={18} color="#666" style={styles.detailItemIcon} />
                    <View style={styles.detailItemContent}>
                      <Text style={styles.detailItemLabel}>Reported Time</Text>
                      <Text style={styles.detailItemVal}>
                        {selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : 'Date Unavailable'}
                      </Text>
                    </View>
                  </View>

                  {selectedAlert.message ? (
                    <View style={styles.detailItem}>
                      <Ionicons name="document-text-outline" size={18} color="#666" style={styles.detailItemIcon} />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Incident Note</Text>
                        <Text style={styles.detailItemVal}>{selectedAlert.message}</Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedAlert.photoUrl ? (
                    <View style={styles.detailItem}>
                      <Ionicons name="image-outline" size={18} color="#666" style={styles.detailItemIcon} />
                      <View style={styles.detailItemContent}>
                        <Text style={styles.detailItemLabel}>Uploaded Photo</Text>
                        <Image 
                          source={{ uri: selectedAlert.photoUrl }} 
                          style={styles.uploadedPhotoPreview} 
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Status Help Banner */}
                <View style={styles.safetyCard}>
                  <Ionicons name="information-circle-outline" size={24} color="#1E40AF" />
                  <View style={styles.safetyTextContainer}>
                    <Text style={[styles.safetyTitle, { color: '#1E40AF' }]}>Status Update</Text>
                    <Text style={[styles.safetyDesc, { color: '#1E40AF' }]}>
                      {selectedAlert.status?.toLowerCase() === 'resolved' 
                        ? 'This report has been resolved and handled by the rescue team.'
                        : selectedAlert.status?.toLowerCase() === 'on_the_way'
                        ? 'Rescue team is currently on the way to your location.'
                        : selectedAlert.status?.toLowerCase() === 'ongoing'
                        ? 'Rescue team has arrived and is responding.'
                        : selectedAlert.status?.toLowerCase() === 'declined'
                        ? 'This report could not be processed.'
                        : 'Your report is currently pending review by CDRRMO dispatchers.'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 15,
    marginTop: 10,
    position: "relative",
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  clearButton: {
    backgroundColor: "#FF6B6B",
    padding: 8,
    borderRadius: 6,
    position: "absolute",
    right: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#aaa",
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#bbb",
    marginTop: 5,
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
  },
  historyCardPremium: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBadgePremium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardContentPremium: {
    flex: 1,
  },
  cardHeaderPremium: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTypePremium: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadgePremium: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTextPremium: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  cardLocationPremium: {
    fontSize: 13,
    color: "#4B5563",
    flex: 1,
  },
  cardFooterPremium: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTimePremium: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  cardRightBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  severityBadgePremium: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityTextPremium: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  arrowIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Container Styles (match HomeScreen exactly)
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

  // Safety card (Safety / Status instructions)
  safetyCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 20,
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 4,
  },
  safetyDesc: {
    fontSize: 12,
    color: "#1E3A8A",
    lineHeight: 16,
  },
});
