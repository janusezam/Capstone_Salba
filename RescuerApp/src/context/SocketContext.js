import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config/api';

const SocketContext = createContext({});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const [dispatchAlert, setDispatchAlert] = useState(null);
  const locationSubscriptionRef = useRef(null);

  // Start background location tracking immediately when user is authenticated
  useEffect(() => {
    if (user && token) {
      startBackgroundLocationTracking();
    }
    
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, [user, token]);

  const startBackgroundLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('⚠️ Location permission not granted');
        return;
      }

      console.log('🟡 Starting background location tracking...');
      
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,      // Update every 5 seconds
          distanceInterval: 10,    // Or every 10 meters
        },
        (newLocation) => {
          const coords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          
          console.log(`\n📍 [BG] Location received: (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}) - Socket: ${socketRef.current?.connected ? '✅' : '❌'}`);
          
          // Send location update if socket is connected
          if (socketRef.current?.connected) {
            sendLocationUpdate({
              lat: coords.latitude,
              lng: coords.longitude,
              accuracy: newLocation.coords.accuracy,
              timestamp: newLocation.timestamp,
            });
          } else {
            console.warn('⚠️ [BG] Socket not connected yet, queuing location update...');
          }
        }
      );
      console.log('✅ Background location tracking started');
    } catch (error) {
      console.error('❌ Background location tracking error:', error);
    }
  };

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected! Ready to send location updates');
        setConnected(true);
        
        // Join rescuer room for targeted notifications
        console.log('Joining rescuer room with ID:', user._id);
        socketRef.current.emit('join_rescuer', user._id);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      // Listen for dispatch alerts (sent to specific rescuer room)
      socketRef.current.on('dispatch_alert', (data) => {
        console.log('✅ Dispatch alert received:', data);
        setDispatchAlert(data);
      });

      // Listen for mission complete
      socketRef.current.on('mission_complete', (data) => {
        console.log('Mission complete:', data);
        setDispatchAlert(null);
      });

      // Broadcast events (backup in case direct room doesn't work)
      socketRef.current.on('team_dispatched', (data) => {
        console.log('Team dispatched broadcast:', data);
        // Check if this matches our team
        if (data.team && data.team.members && data.team.members.some(m => m._id === user._id)) {
          console.log('This dispatch is for our team! Setting dispatch alert...');
          setDispatchAlert(data);
        }
      });

      // Listen for team assignment
      socketRef.current.on('team_assigned', (data) => {
        console.log('Team assigned:', data);
        setDispatchAlert(data);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user, token]);

  const sendLocationUpdate = (location) => {
    if (socketRef.current?.connected) {
      console.log('🔌 Emitting rescuer_location:', {
        rescuerId: user._id,
        rescuerName: user.name,
        lat: parseFloat(location.lat.toFixed(6)),
        lng: parseFloat(location.lng.toFixed(6)),
        accuracy: location.accuracy?.toFixed(1),
      });
      socketRef.current.emit('rescuer_location', {
        rescuerId: user._id,
        rescuerName: user.name,
        ...location,
      });
    } else {
      console.warn('⚠️ Cannot send location - socket not connected');
    }
  };

  const clearDispatchAlert = () => {
    setDispatchAlert(null);
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      dispatchAlert,
      clearDispatchAlert,
      sendLocationUpdate,
    }}>
      {children}
    </SocketContext.Provider>
  );
};
