import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { API_URL, getAuthHeaders } from '../config/api';

// Configure notification handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (handlerErr) {
  console.warn('[NotificationContext] setNotificationHandler note:', handlerErr?.message);
}

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (user && token) {
      registerForPushNotifications();
      fetchNotifications();

      // Listen for incoming notifications
      try {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notification received:', notification);
          fetchNotifications(); // Refresh notifications
        });
      } catch (e) {
        console.warn('[NotificationContext] Listener error:', e?.message);
      }

      // Listen for notification taps
      try {
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification tapped:', response);
          const data = response.notification.request.content.data;
          // Handle navigation based on notification type
          handleNotificationTap(data);
        });
      } catch (e) {
        console.warn('[NotificationContext] Response listener error:', e?.message);
      }

      return () => {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    }
  }, [user, token]);

  const registerForPushNotifications = async () => {
    try {
      const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

      if (isExpoGo) {
        console.log('[NotificationContext] Running in Expo Go. Remote push notifications via expo-notifications are not supported in Expo Go (Expo SDK 53+). Local/Socket notifications will still function.');
      }

      let pushToken;

      if (Device.isDevice && !isExpoGo) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        try {
          const easProjectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
          if (easProjectId) {
            pushToken = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data;
            console.log('Push token:', pushToken);
          } else {
            console.log('[NotificationContext] Skipping push token fetch (EAS projectId not configured)');
          }
        } catch (pushErr) {
          console.warn('[NotificationContext] Remote push token note:', pushErr.message);
        }
      } else if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
      }

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#DC2626',
            sound: 'default',
          });

          await Notifications.setNotificationChannelAsync('dispatch', {
            name: 'Dispatch Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#DC2626',
            sound: 'default',
          });
        } catch (channelErr) {
          console.warn('[NotificationContext] Notification channel note:', channelErr.message);
        }
      }

      if (pushToken) {
        setExpoPushToken(pushToken);
        // Send push token to backend
        await savePushTokenToServer(pushToken);
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to register push notifications:', err.message);
    }
  };

  const savePushTokenToServer = async (pushToken) => {
    try {
      await fetch(`${API_URL}/rescue/push-token`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ pushToken }),
      });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/rescue/notifications`, {
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/rescue/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
      });

      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/rescue/notifications/read-all`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationTap = (data) => {
    // This will be handled by navigation - you can pass a callback
    console.log('Handle notification tap:', data);
  };

  // Schedule a local notification (for testing)
  const scheduleLocalNotification = async (title, body, data = {}) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Immediately
    });
  };

  return (
    <NotificationContext.Provider value={{
      expoPushToken,
      notifications,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      scheduleLocalNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
