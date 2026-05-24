import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Image, TouchableOpacity, TextInput, Alert, Modal } from "react-native";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import { BASE_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { io } from "socket.io-client";
import { getAdminFeedbackList, markFeedbackAsRead } from "../services/feedbackService";

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rescueTeamInput, setRescueTeamInput] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // "active" or "history"
  const [feedbackList, setFeedbackList] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    loadAdminData();
    fetchAlerts();
    fetchHistory();
    fetchFeedback();
  }, []);

  useEffect(() => {
    const socket = io(BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      socket.emit("join_admin");
    });

    const handleRealtime = () => {
      fetchAlerts();
      fetchHistory();
    };

    const handleFeedbackRealtime = () => {
      fetchFeedback();
    };

    socket.on("new_alert", handleRealtime);
    socket.on("new_report", handleRealtime);
    socket.on("alert_updated", handleRealtime);
    socket.on("feedback_submitted", handleFeedbackRealtime);

    return () => {
      socket.off("new_alert", handleRealtime);
      socket.off("new_report", handleRealtime);
      socket.off("alert_updated", handleRealtime);
      socket.off("feedback_submitted", handleFeedbackRealtime);
      socket.disconnect();
    };
  }, []);

  const fetchFeedback = async () => {
    try {
      const data = await getAdminFeedbackList();
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching feedback:", err);
    }
  };

  const markAsRead = async (feedbackId) => {
    try {
      await markFeedbackAsRead(feedbackId);
      setFeedbackList((prev) =>
        prev.map((item) =>
          item._id === feedbackId
            ? { ...item, isReadByAdmin: true, readAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      console.error("Error marking feedback as read:", err);
      Alert.alert("Error", "Failed to mark feedback as read.");
    }
  };

  const loadAdminData = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        setAdminData(JSON.parse(userData));
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/alerts`);
      // Backend now returns only non-resolved alerts
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.get(`${BASE_URL}/api/alerts/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistoryAlerts(res.data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
    fetchHistory();
    fetchFeedback();
  };

  const assignRescueTeam = async (alertId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.put(`${BASE_URL}/api/alerts/${alertId}`, {
        assignedTeam: rescueTeamInput,
        status: 'assigned'
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(alerts.map(a => a._id === alertId ? res.data : a));
      setEditingId(null);
      setRescueTeamInput("");
      Alert.alert("Success", "Rescue team assigned successfully");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to assign rescue team");
    }
  };

  const openResolveModal = (alert) => {
    setSelectedAlert(alert);
    setResolveModalVisible(true);
  };

  const resolveAlert = async () => {
    if (!selectedAlert) return;
    
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.put(`${BASE_URL}/api/alerts/${selectedAlert._id}`, {
        status: 'Resolved',
        resolvedBy: adminData?._id,
        resolvedByName: adminData?.name || 'Unknown Admin'
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Remove from active and add to history
      setAlerts(alerts.filter(a => a._id !== selectedAlert._id));
      setHistoryAlerts([res.data, ...historyAlerts]);
      
      setResolveModalVisible(false);
      setSelectedAlert(null);
      Alert.alert("Success", "Case marked as resolved!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to resolve case");
    }
  };

  const generatePDF = async (report) => {
    const disasterType = report.disasterType || report.type || 'Unknown';
    const senderName = report.userId?.name || (report.senderName && report.senderName !== 'Anonymous Reporter' ? report.senderName : 'Anonymous');
    const senderPhone = report.userId?.phone || 'Not provided';
    const resolvedByName = report.resolvedBy?.name || report.resolvedByName || 'Unknown Admin';
    const resolvedAt = report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : new Date(report.updatedAt).toLocaleString();
    const createdAt = new Date(report.createdAt).toLocaleString();
    const teamName = report.assignedTeam?.name || report.assignedTeam || 'Not assigned';

    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #007AFF; }
            .title { font-size: 20px; margin-top: 10px; }
            .badge { display: inline-block; background-color: #28a745; color: white; padding: 5px 15px; border-radius: 5px; font-size: 14px; }
            .section { margin: 20px 0; }
            .section-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .row { display: flex; margin: 10px 0; }
            .label { font-weight: bold; width: 180px; color: #555; }
            .value { flex: 1; color: #333; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
            .resolved-box { background-color: #f8f9fa; border: 1px solid #28a745; border-radius: 8px; padding: 15px; margin-top: 20px; }
            .resolved-title { color: #28a745; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">DisasterSOS</div>
            <div class="title">DISASTER CASE REPORT</div>
            <span class="badge">RESOLVED</span>
          </div>

          <div class="section">
            <div class="section-title">Case Information</div>
            <div class="row">
              <span class="label">Case ID:</span>
              <span class="value">${report._id}</span>
            </div>
            <div class="row">
              <span class="label">Disaster Type:</span>
              <span class="value">${disasterType}</span>
            </div>
            <div class="row">
              <span class="label">Severity:</span>
              <span class="value">${report.severity || 'moderate'}</span>
            </div>
            <div class="row">
              <span class="label">Location:</span>
              <span class="value">${report.locationName || 'Unknown Location'}</span>
            </div>
            <div class="row">
              <span class="label">Coordinates:</span>
              <span class="value">Lat: ${report.lat}, Lng: ${report.lng}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Reporter Information</div>
            <div class="row">
              <span class="label">Reported By:</span>
              <span class="value">${senderName}</span>
            </div>
            <div class="row">
              <span class="label">Phone Number:</span>
              <span class="value">${senderPhone}</span>
            </div>
            <div class="row">
              <span class="label">Reported At:</span>
              <span class="value">${createdAt}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Response Details</div>
            <div class="row">
              <span class="label">Assigned Rescue Team:</span>
              <span class="value">${teamName}</span>
            </div>
          </div>

          <div class="resolved-box">
            <div class="resolved-title">RESOLUTION DETAILS</div>
            <div class="row">
              <span class="label">Approved/Resolved By:</span>
              <span class="value"><strong>${resolvedByName}</strong></span>
            </div>
            <div class="row">
              <span class="label">Resolution Date:</span>
              <span class="value">${resolvedAt}</span>
            </div>
          </div>

          <div class="footer">
            <p>This document serves as official proof that the disaster case has been resolved.</p>
            <p>Generated by DisasterSOS Emergency Alert System</p>
            <p>Document generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else {
        Alert.alert("PDF Generated", "File saved at: " + uri);
      }
    } catch (err) {
      console.error("Error generating PDF:", err);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  const currentAlerts = activeTab === "active" ? alerts : historyAlerts;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/CDRRMO_LOGO.png')} style={styles.logo} />
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.activeTabText]}>
            Active Cases ({alerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={[styles.tabText, activeTab === "history" && styles.activeTabText]}>
            History/Solved ({historyAlerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "feedback" && styles.activeTab]}
          onPress={() => setActiveTab("feedback")}
        >
          <Text style={[styles.tabText, activeTab === "feedback" && styles.activeTabText]}>
            Feedback ({feedbackList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map View - only show for active tab */}
      {activeTab === "active" && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 8.1565,
            longitude: 125.1237,
            latitudeDelta: 1,
            longitudeDelta: 1,
          }}
        >
          {alerts.map((alert) => {
            const disasterType = alert.disasterType || alert.type || (alert.note ? alert.note.split(' - ')[0] : 'Unknown');
            return (
              <Marker
                key={alert._id}
                coordinate={{
                  latitude: alert.lat || alert.latitude,
                  longitude: alert.lng || alert.longitude,
                }}
                title={disasterType}
                description={`${alert.locationName ? alert.locationName + " — " : ""}${new Date(alert.createdAt || alert.timestamp).toLocaleString()}`}
                pinColor={
                  disasterType === "Flood" ? "blue" :
                  disasterType === "Fire" ? "red" :
                  disasterType === "Earthquake" ? "orange" :
                  disasterType === "Landslide" ? "brown" :
                  "green"
                }
              />
            );
          })}
        </MapView>
      )}

      {/* List of alerts / feedback */}
      <ScrollView 
        style={styles.alertList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "feedback" ? (
          feedbackList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No feedback submitted yet</Text>
            </View>
          ) : (
            feedbackList.map((feedback) => (
              <View key={feedback._id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <Text style={styles.feedbackSenderName}>
                    {feedback.userId?.name || feedback.senderName || "Unknown User"}
                  </Text>
                  <View style={[styles.feedbackStatusBadge, feedback.isReadByAdmin ? styles.feedbackRead : styles.feedbackUnread]}>
                    <Text style={styles.feedbackStatusText}>{feedback.isReadByAdmin ? "Read" : "Unread"}</Text>
                  </View>
                </View>

                <Text style={styles.feedbackMeta}>Phone: {feedback.userId?.phone || feedback.senderPhone || "Not provided"}</Text>
                <Text style={styles.feedbackMeta}>Category: {feedback.category || "general"}</Text>
                <Text style={styles.feedbackMessage}>{feedback.message}</Text>
                <Text style={styles.feedbackMeta}>Submitted: {new Date(feedback.createdAt).toLocaleString()}</Text>

                {!feedback.isReadByAdmin ? (
                  <TouchableOpacity
                    style={styles.feedbackReadButton}
                    onPress={() => markAsRead(feedback._id)}
                  >
                    <Text style={styles.feedbackReadButtonText}>Mark as Read</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )
        ) : currentAlerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === "active" ? "No active cases" : "No resolved cases yet"}
            </Text>
          </View>
        ) : (
          currentAlerts.map((a) => (
            <View key={a._id} style={[styles.alertCard, activeTab === "history" && styles.historyCard]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>
                  {a.disasterType || a.type || (a.note ? a.note.split(' - ')[0] : 'Unknown Disaster')}
                </Text>
                <Text style={[styles.alertStatus, { color: a.status === 'Resolved' ? '#28a745' : a.status === 'assigned' ? '#007AFF' : '#dc3545' }]}>
                  {a.status || 'new'}
                </Text>
              </View>
              <Text style={styles.alertUser}>
                Reported by: {a.userId?.name || (a.senderName && a.senderName !== 'Anonymous Reporter' ? a.senderName : "Anonymous")}
              </Text>
              <Text style={styles.alertUser}>
                Phone: {a.userId?.phone || "Not provided"}
              </Text>
              {(a.locationName || (a.note && a.note.includes(' - '))) ? (
                <Text style={styles.alertLocation}>
                  {a.locationName || (a.note ? a.note.split(' - ')[1] : '')}
                </Text>
              ) : null}

              {/* Show rescue team assignment only for active tab */}
              {activeTab === "active" && (
                <View style={styles.rescueTeamContainer}>
                  <Text style={styles.rescueTeamLabel}>Rescue Team:</Text>
                  {editingId === a._id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.rescueTeamInput}
                        value={rescueTeamInput}
                        onChangeText={setRescueTeamInput}
                        placeholder="Enter team name"
                      />
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => assignRescueTeam(a._id)}
                      >
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setEditingId(null);
                          setRescueTeamInput("");
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.rescueTeamDisplay}>
                      <Text style={styles.rescueTeamText}>
                        {a.assignedTeam?.name || a.assignedTeam || "Not assigned"}
                      </Text>
                      <TouchableOpacity
                        style={styles.assignButton}
                        onPress={() => {
                          setEditingId(a._id);
                          setRescueTeamInput(a.assignedTeam?.name || a.assignedTeam || "");
                        }}
                      >
                        <Text style={styles.assignButtonText}>
                          {a.assignedTeam ? "Change" : "Assign"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* History info for resolved cases */}
              {activeTab === "history" && (
                <View style={styles.resolvedInfo}>
                  <Text style={styles.resolvedByText}>
                    Resolved by: {a.resolvedBy?.name || a.resolvedByName || "Unknown Admin"}
                  </Text>
                  {a.resolvedAt && (
                    <Text style={styles.resolvedAtText}>
                      Resolved: {new Date(a.resolvedAt).toLocaleString()}
                    </Text>
                  )}
                  {a.assignedTeam && (
                    <Text style={styles.teamText}>
                      Team: {a.assignedTeam?.name || a.assignedTeam}
                    </Text>
                  )}
                </View>
              )}

              <Text style={styles.alertTime}>
                Reported: {new Date(a.createdAt || a.timestamp).toLocaleString()}
              </Text>

              {/* Action buttons */}
              <View style={styles.actionContainer}>
                {activeTab === "active" && a.status !== 'Resolved' && (
                  <TouchableOpacity
                    style={styles.resolveButton}
                    onPress={() => openResolveModal(a)}
                  >
                    <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                )}
                {activeTab === "history" && (
                  <TouchableOpacity
                    style={styles.pdfButton}
                    onPress={() => generatePDF(a)}
                  >
                    <Text style={styles.pdfButtonText}>Download PDF</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Resolve Confirmation Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Case</Text>
            <Text style={styles.modalText}>
              Are you sure you want to mark this case as resolved?
            </Text>
            {selectedAlert && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetailText}>
                  Type: {selectedAlert.disasterType || selectedAlert.type || 'Unknown'}
                </Text>
                <Text style={styles.modalDetailText}>
                  Location: {selectedAlert.locationName || 'Unknown'}
                </Text>
              </View>
            )}
            <Text style={styles.modalApprover}>
              Will be approved by: {adminData?.name || 'Admin'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setResolveModalVisible(false);
                  setSelectedAlert(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={resolveAlert}
              >
                <Text style={styles.modalConfirmText}>Confirm Resolve</Text>
              </TouchableOpacity>
            </View>
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
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 10,
  },
  title: { fontSize: 22, fontWeight: "700" },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
  },
  map: { height: 250 },
  alertList: { flex: 1, paddingHorizontal: 15, marginTop: 10 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  alertCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  feedbackCard: {
    backgroundColor: "#f8f9ff",
    borderWidth: 1,
    borderColor: "#d9e1ff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  feedbackSenderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  feedbackStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  feedbackRead: {
    backgroundColor: "#dcfce7",
  },
  feedbackUnread: {
    backgroundColor: "#fee2e2",
  },
  feedbackStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  feedbackMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  feedbackMessage: {
    fontSize: 14,
    color: "#111827",
    marginVertical: 6,
    lineHeight: 20,
  },
  feedbackReadButton: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  feedbackReadButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  historyCard: {
    backgroundColor: "#f0fff0",
    borderColor: "#28a745",
  },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertType: { fontSize: 16, fontWeight: "600" },
  alertStatus: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  alertUser: { fontSize: 14, color: "#333", marginTop: 4 },
  alertLocation: { fontSize: 14, color: "#007AFF", marginTop: 2 },
  rescueTeamContainer: { marginTop: 8 },
  rescueTeamLabel: { fontSize: 14, fontWeight: "500", color: "#333" },
  rescueTeamDisplay: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  rescueTeamText: { fontSize: 14, color: "#666", flex: 1 },
  assignButton: { backgroundColor: "#007AFF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  assignButtonText: { color: "#fff", fontSize: 12 },
  editContainer: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  rescueTeamInput: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14 },
  saveButton: { backgroundColor: "#28a745", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginLeft: 5 },
  saveButtonText: { color: "#fff", fontSize: 12 },
  cancelButton: { backgroundColor: "#dc3545", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginLeft: 5 },
  cancelButtonText: { color: "#fff", fontSize: 12 },
  alertTime: { fontSize: 13, color: "#666", marginTop: 4 },
  resolvedInfo: {
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  resolvedByText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#28a745",
  },
  resolvedAtText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  teamText: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  actionContainer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  resolveButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  pdfButton: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pdfButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  modalDetails: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  modalDetailText: {
    fontSize: 13,
    color: "#333",
    marginBottom: 2,
  },
  modalApprover: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  modalCancelText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#666",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 6,
  },
  modalConfirmText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#fff",
  },
});
