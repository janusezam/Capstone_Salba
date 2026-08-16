import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationsScreen({ navigation }) {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    await fetchNotifications();
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'dispatch':
        return { name: 'alert-circle', color: '#DC2626', bg: '#FEE2E2' };
      case 'mission_complete':
        return { name: 'checkmark-circle', color: '#10B981', bg: '#D1FAE5' };
      case 'team_update':
        return { name: 'people', color: '#3B82F6', bg: '#DBEAFE' };
      case 'alert':
        return { name: 'warning', color: '#F59E0B', bg: '#FEF3C7' };
      default:
        return { name: 'notifications', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }) => {
    const icon = getIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.footerRow}>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            {item.data?.address && (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color="#666" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.data.address}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off" size={60} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You'll receive alerts here when you get dispatched or when there are team updates.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      {notifications.length > 0 && unreadCount > 0 && (
        <View style={styles.headerActions}>
          <Text style={styles.unreadCountText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#DC2626']}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      {/* Notification Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedNotification(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotification && (() => {
              const icon = getIcon(selectedNotification.type);
              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={[styles.modalIconContainer, { backgroundColor: icon.bg }]}>
                      <Ionicons name={icon.name} size={32} color={icon.color} />
                    </View>
                    <Text style={styles.modalType}>
                      {String(selectedNotification.type || 'Alert').toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>

                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                    <Text style={styles.modalTime}>
                      {new Date(selectedNotification.createdAt).toLocaleString()}
                    </Text>
                    
                    <Text style={styles.modalMessage}>{selectedNotification.message}</Text>

                    {selectedNotification.data?.address && (
                      <View style={styles.modalMetadataContainer}>
                        <Text style={styles.modalMetadataLabel}>Location / Address:</Text>
                        <View style={styles.modalMetadataValueRow}>
                          <Ionicons name="location" size={16} color="#DC2626" />
                          <Text style={styles.modalMetadataValue}>
                            {selectedNotification.data.address}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedNotification.data?.reportId && (
                      <View style={styles.modalMetadataContainer}>
                        <Text style={styles.modalMetadataLabel}>Report ID:</Text>
                        <Text style={styles.modalMetadataValueCode}>
                          {typeof selectedNotification.data.reportId === 'object'
                            ? selectedNotification.data.reportId._id
                            : selectedNotification.data.reportId}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => {
                        setModalVisible(false);
                        setSelectedNotification(null);
                      }}
                    >
                      <Text style={styles.modalCloseButtonText}>Close</Text>
                    </TouchableOpacity>

                    {selectedNotification.type === 'dispatch' && selectedNotification.data?.lat && (
                      <TouchableOpacity
                        style={styles.modalMapButton}
                        onPress={() => {
                          setModalVisible(false);
                          setSelectedNotification(null);
                          navigation.navigate('Map');
                        }}
                      >
                        <Ionicons name="map" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalMapButtonText}>View Map</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  unreadCountText: {
    color: '#666',
    fontSize: 14,
  },
  markAllRead: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#111',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: '60%',
  },
  locationText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1.5,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 15,
  },
  modalMetadataContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  modalMetadataLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginBottom: 4,
  },
  modalMetadataValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalMetadataValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  modalMetadataValueCode: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#555',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 15,
  },
  modalMapButton: {
    flex: 1.5,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
