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
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "resolved":
        return { backgroundColor: "#10B981", textColor: "#fff", label: "Resolved" };
      case "on_the_way":
        return { backgroundColor: "#8B5CF6", textColor: "#fff", label: "On The Way" };
      case "ongoing":
      case "in_progress":
        return { backgroundColor: "#3B82F6", textColor: "#fff", label: "Ongoing" };
      case "pending":
      case "new":
      case "acknowledged":
        return { backgroundColor: "#F59E0B", textColor: "#fff", label: "Pending" };
      case "declined":
        return { backgroundColor: "#EF4444", textColor: "#fff", label: "Declined" };
      default:
        return { backgroundColor: "#9CA3AF", textColor: "#fff", label: status || "Unknown" };
    }
  };

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "flood": return { name: "water", color: "#2196F3" };
      case "fire": return { name: "flame", color: "#F44336" };
      case "earthquake": return { name: "pulse", color: "#FF9800" };
      case "landslide": return { name: "terrain", color: "#795548" };
      case "typhoon": return { name: "thunderstorm", color: "#607D8B" };
      default: return { name: "alert-circle", color: "#9E9E9E" };
    }
  };

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
            console.log('📱 Alert card data:', { type: a.type, status: a.status, timestamp: a.timestamp });
            const icon = getIcon(a.type);
            const statusInfo = getStatusColor(a.status);
            return (
              <TouchableOpacity 
                key={a._id} 
                style={styles.card}
                onPress={() => showAlertDetails(a)}
              >
                <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
                  <Ionicons name={icon.name} size={22} color="#fff" />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardType}>{a.type || 'Emergency'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}>
                      <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>
                  {a.location ? (
                    <Text style={styles.cardLocation}>{a.location}</Text>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardTime}>
                      {a.timestamp 
                        ? new Date(a.timestamp).toLocaleString() 
                        : 'No date'}
                    </Text>
                    {a.severity && (
                      <View style={[
                        styles.severityBadge,
                        {
                          backgroundColor: a.severity === 'critical' ? '#FEE2E2' :
                                         a.severity === 'high' ? '#FEF3C7' :
                                         a.severity === 'moderate' ? '#DBEAFE' : '#DCFCE7'
                        }
                      ]}>
                        <Text style={[
                          styles.severityText,
                          {
                            color: a.severity === 'critical' ? '#DC2626' :
                                  a.severity === 'high' ? '#D97706' :
                                  a.severity === 'moderate' ? '#2563EB' : '#16A34A'
                          }
                        ]}>{a.severity}</Text>
                      </View>
                    )}
                  </View>
                  {a.message ? (
                    <Text style={styles.cardNote} numberOfLines={2}>{a.message}</Text>
                  ) : null}
                  <Text style={styles.tapHint}>Tap for details</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedAlert && (
              <ScrollView style={styles.modalBody}>
                {/* Disaster Type */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Disaster Type</Text>
                  <Text style={styles.detailValue}>{selectedAlert.type || 'Not specified'}</Text>
                </View>

                {/* Status - Large Badge */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[
                    styles.statusBadgeLarge,
                    { backgroundColor: getStatusColor(selectedAlert.status).backgroundColor }
                  ]}>
                    <Text style={[
                      styles.statusTextLarge,
                      { color: getStatusColor(selectedAlert.status).textColor }
                    ]}>
                      {getStatusColor(selectedAlert.status).label}
                    </Text>
                  </View>
                </View>

                {/* Severity */}
                {selectedAlert.severity && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Severity</Text>
                    <Text style={styles.detailValue}>{selectedAlert.severity}</Text>
                  </View>
                )}

                {/* Location */}
                {selectedAlert.location && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedAlert.location}</Text>
                  </View>
                )}

                {/* Timestamp */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted</Text>
                  <Text style={styles.detailValue}>
                    {selectedAlert.timestamp 
                      ? new Date(selectedAlert.timestamp).toLocaleString() 
                      : 'Date unavailable'}
                  </Text>
                </View>

                {/* Sender Info */}
                {selectedAlert.senderName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reporter</Text>
                    <Text style={styles.detailValue}>{selectedAlert.senderName}</Text>
                  </View>
                )}

                {/* Note/Description */}
                {selectedAlert.message && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Your Description</Text>
                    <View style={styles.messageBox}>
                      <Text style={styles.messageText}>{selectedAlert.message}</Text>
                    </View>
                  </View>
                )}

                {/* Status Timeline Info */}
                <View style={styles.statusInfo}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.statusInfoText}>
                    {selectedAlert.status?.toLowerCase() === 'resolved' 
                      ? '✓ Your report has been resolved and handled by our rescue team.'
                      : selectedAlert.status?.toLowerCase() === 'on_the_way'
                      ? '🚗 Rescue team is on the way to your location!'
                      : selectedAlert.status?.toLowerCase() === 'ongoing'
                      ? '→ Your report is currently being handled. Rescue team is responding.'
                      : selectedAlert.status?.toLowerCase() === 'declined'
                      ? '✗ Your report could not be processed at this time.'
                      : '⏳ Your report is pending. We will process it soon.'}
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
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
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 70,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  cardLocation: {
    fontSize: 13,
    color: "#007AFF",
    marginTop: 2,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  cardTime: {
    fontSize: 12,
    color: "#888",
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  cardNote: {
    fontSize: 12,
    color: "#555",
    marginTop: 6,
    fontStyle: "italic",
  },
  tapHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    fontStyle: "italic",
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: "700",
  },
  messageBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  messageText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  statusInfo: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  statusInfoText: {
    fontSize: 13,
    color: "#1E40AF",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: "#007AFF",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
