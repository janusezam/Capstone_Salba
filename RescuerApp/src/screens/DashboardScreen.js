import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { API_URL, getAuthHeaders, fetchWithTimeout } from '../config/api';

export default function DashboardScreen({ navigation }) {
  const { user, token } = useAuth();
  const { connected, dispatchAlert, socket } = useSocket();
  const { unreadCount, scheduleLocalNotification } = useNotifications();
  const [team, setTeam] = useState(null);
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch only essential endpoints with timeout
      const [teamResponse, missionResponse] = await Promise.all([
        fetchWithTimeout(`${API_URL}/rescue/my-team`, {
          headers: getAuthHeaders(token),
        }),
        fetchWithTimeout(`${API_URL}/rescue/my-mission`, {
          headers: getAuthHeaders(token),
        }),
      ]);

      console.log('Team response:', teamResponse.status);
      console.log('Mission response:', missionResponse.status);

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        console.log('Team data received:', teamData);
        setTeam(teamData);
      } else {
        console.warn('Team response not ok:', teamResponse.status);
      }

      if (missionResponse.ok) {
        const missionData = await missionResponse.json();
        console.log('Mission data received:', missionData);
        setMission(missionData);
      } else {
        console.warn('Mission response not ok:', missionResponse.status);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Loading Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      
      // Fetch on app focus instead of constant polling to avoid blinking
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      
      // Periodic refresh every 30 seconds to catch status changes
      const pollInterval = setInterval(() => {
        console.log('Periodic refresh: checking for mission status updates...');
        fetchData();
      }, 30000);
      
      return () => {
        if (subscription && subscription.remove) {
          subscription.remove();
        }
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, [token]);

  // Direct socket listener for mission completion
  useEffect(() => {
    if (!socket) return;

    const handleMissionComplete = (data) => {
      console.log('🎯 Mission complete event received:', data);
      
      // Show local notification
      scheduleLocalNotification(
        '✅ Mission Complete',
        'Your current mission has been marked as resolved by the admin.'
      );
      
      // Immediately refresh data to get latest team/mission status
      fetchData();
      
      // Show alert
      Alert.alert(
        '✅ MISSION COMPLETE',
        'Your current mission has been marked as resolved by the admin. You are now available for new assignments.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    };

    // Listen to mission_complete event directly from socket
    socket.on('mission_complete', handleMissionComplete);
    
    console.log('✓ Mission complete listener attached');

    return () => {
      if (socket) {
        socket.off('mission_complete', handleMissionComplete);
      }
    };
  }, [socket, scheduleLocalNotification]);

  // Handle app state changes (when app comes to foreground)
  const handleAppStateChange = (state) => {
    if (state === 'active') {
      console.log('App resumed, refreshing dashboard...');
      fetchData();
    }
  };

  // Handle dispatch alerts
  useEffect(() => {
    if (dispatchAlert) {
      console.log('Dispatch alert triggered:', dispatchAlert);
      
      // Show local notification
      scheduleLocalNotification(
        '🚨 Emergency Dispatch Alert',
        `Team ${dispatchAlert.team?.name} has been deployed! Check the map for your assigned location.`
      );
      
      // Wait a moment for backend to update, then refresh data
      setTimeout(() => {
        console.log('Refreshing dashboard data after deployment...');
        fetchData();
      }, 500);
      
      // Show alert
      Alert.alert(
        '🚨 DISPATCH ALERT',
        `You have been deployed!\n\nTeam: ${dispatchAlert.team?.name}\nLocation: ${dispatchAlert.address || 'Check map for details'}`,
        [
          { text: 'View Map', onPress: () => navigation.navigate('Map') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  }, [dispatchAlert]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const getStatusColor = () => {
    if (!team) return '#6B7280';
    switch (team.status) {
      case 'deployed': return '#DC2626';
      case 'standby': return '#F59E0B';
      case 'available': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusText = () => {
    if (!team) return 'Not Assigned';
    switch (team.status) {
      case 'deployed': return 'DEPLOYED';
      case 'standby': return 'STANDBY';
      case 'available': return 'AVAILABLE';
      default: return team.status.toUpperCase();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />
      }
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Rescuer'}</Text>
          </View>
          <View style={[styles.connectionStatus, { backgroundColor: connected ? '#10B981' : '#EF4444' }]}>
            <View style={[styles.statusDot, { backgroundColor: connected ? '#fff' : '#fff' }]} />
            <Text style={styles.connectionText}>{connected ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      {/* Team Status Card */}
      <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={[styles.statusValue, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>
          <View style={[styles.teamBadge, { backgroundColor: team?.color || '#6B7280' }]}>
            <Text style={styles.teamBadgeText}>
              {team ? `TEAM ${team.name.toUpperCase()}` : 'UNASSIGNED'}
            </Text>
          </View>
        </View>
        
        {team && (
          <View style={styles.teamInfo}>
            <View style={styles.teamInfoRow}>
              <Ionicons name="people" size={18} color="#666" />
              <Text style={styles.teamInfoText}>
                {team.members?.length || 0} Members
              </Text>
            </View>
            {team.leader && (
              <View style={styles.teamInfoRow}>
                <Ionicons name="person" size={18} color="#666" />
                <Text style={styles.teamInfoText}>
                  Leader: {team.leader.name}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Active Mission Card */}
      {mission && (
        <TouchableOpacity 
          style={styles.missionCard}
          onPress={() => navigation.navigate('Map')}
        >
          <View style={styles.missionHeader}>
            <View style={styles.missionIconContainer}>
              <Ionicons name="alert-circle" size={30} color="#fff" />
            </View>
            <View style={styles.missionInfo}>
              <Text style={styles.missionLabel}>ACTIVE MISSION</Text>
              <Text style={styles.missionTitle}>Emergency Response</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#DC2626" />
          </View>
          
          <View style={styles.missionDetails}>
            <View style={styles.missionDetailRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.missionDetailText}>
                {mission.report?.lat?.toFixed(4)}, {mission.report?.lng?.toFixed(4)}
              </Text>
            </View>
            <View style={styles.missionDetailRow}>
              <Ionicons name="warning" size={16} color="#666" />
              <Text style={styles.missionDetailText}>
                Severity: {mission.report?.severity?.toUpperCase() || 'N/A'}
              </Text>
            </View>
            {mission.report?.note && (
              <View style={styles.missionDetailRow}>
                <Ionicons name="document-text" size={16} color="#666" />
                <Text style={styles.missionDetailText} numberOfLines={2}>
                  {mission.report.note}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.missionAction}>
            <Text style={styles.missionActionText}>Tap to view on map</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Map')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="map" size={28} color="#4F46E5" />
          </View>
          <Text style={styles.actionTitle}>Mission Map</Text>
          <Text style={styles.actionSubtitle}>View location</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="notifications" size={28} color="#D97706" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.actionTitle}>Alerts</Text>
          <Text style={styles.actionSubtitle}>{unreadCount} unread</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="person" size={28} color="#059669" />
          </View>
          <Text style={styles.actionTitle}>Profile</Text>
          <Text style={styles.actionSubtitle}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={onRefresh}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="refresh" size={28} color="#DC2626" />
          </View>
          <Text style={styles.actionTitle}>Refresh</Text>
          <Text style={styles.actionSubtitle}>Update data</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      {!team && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#DC2626" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Not Assigned to a Team</Text>
            <Text style={styles.infoText}>
              Please wait for an admin to assign you to a rescue team 
              (Alpha, Bravo, Charlie, or Delta).
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  welcomeCard: {
    backgroundColor: '#DC2626',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  teamBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  teamBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  teamInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  teamInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamInfoText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  missionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  missionLabel: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
  missionTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  missionDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  missionDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  missionDetailText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  missionAction: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  missionActionText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
});
