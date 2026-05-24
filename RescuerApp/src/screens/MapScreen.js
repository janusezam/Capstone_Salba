import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL, getAuthHeaders } from '../config/api';

const { width, height } = Dimensions.get('window');

const FIRE_HYDRANTS = [
  { id: 'FH-001', name: 'Fire Hydrant 1', latitude: 8.158771, longitude: 125.123458 },
  { id: 'FH-002', name: 'Fire Hydrant 2', latitude: 8.155131, longitude: 125.127794 },
];

const isFireIncident = (disasterType, note) => {
  const text = `${disasterType || ''} ${note || ''}`.toLowerCase();
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

export default function MapScreen() {
  const { token } = useAuth();
  const { dispatchAlert, sendLocationUpdate, connected } = useSocket();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [watchingLocation, setWatchingLocation] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [missionStatusUpdating, setMissionStatusUpdating] = useState(false);
  const locationSubscription = useRef(null);

  // Malaybalay City center as default
  const defaultRegion = {
    latitude: 8.1575,
    longitude: 125.1276,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    initializeLocation();
    fetchMission();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (dispatchAlert) {
      // Refresh mission data when dispatch alert is received
      fetchMission();
    }
  }, [dispatchAlert]);

  const fetchRoute = async (startLoc, endLoc) => {
    try {
      setRouteLoading(true);
      const start = `${startLoc.latitude},${startLoc.longitude}`; // lat,lng
      const end = `${endLoc.latitude},${endLoc.longitude}`;
      const routeUrl = `${API_URL}/route?start=${start}&end=${end}`;
      
      console.log('\n========== [ROUTE FETCH] START ==========');
      console.log('URL:', routeUrl);
      console.log('Start coords (lat,lng):', start);
      console.log('End coords (lat,lng):', end);
      
      const response = await fetch(routeUrl, { timeout: 10000 });

      console.log('Response status:', response.status, response.ok);

      let data;
      let rawText = '';
      try {
        rawText = await response.text();
        console.log('Raw response length:', rawText.length, 'bytes');
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('❌ JSON Parse Error:', parseErr.message);
        console.error('❌ Raw response:', rawText.substring(0, 200));
        console.log('⚠️ Using straight line fallback due to parse error');
        setRouteCoordinates([
          { latitude: startLoc.latitude, longitude: startLoc.longitude },
          { latitude: endLoc.latitude, longitude: endLoc.longitude }
        ]);
        return;
      }

      if (!response.ok) {
        console.error('❌ API Error Status:', response.status);
        console.error('❌ Error Message:', data.message || data.error || 'Unknown error');
        console.error('❌ Full error response:', JSON.stringify(data));
        console.log('⚠️ Route service error - using straight line fallback');
        setRouteCoordinates([
          { latitude: startLoc.latitude, longitude: startLoc.longitude },
          { latitude: endLoc.latitude, longitude: endLoc.longitude }
        ]);
        return;
      }

      console.log('Response keys:', Object.keys(data));
      
      if (!data.geometry) {
        console.error('❌ No geometry in response');
        console.log('Full response:', JSON.stringify(data, null, 2));
        console.log('⚠️ Using straight line fallback');
        setRouteCoordinates([
          { latitude: startLoc.latitude, longitude: startLoc.longitude },
          { latitude: endLoc.latitude, longitude: endLoc.longitude }
        ]);
        return;
      }

      if (!data.geometry.coordinates) {
        console.error('❌ No coordinates in geometry');
        console.log('⚠️ Using straight line fallback');
        setRouteCoordinates([
          { latitude: startLoc.latitude, longitude: startLoc.longitude },
          { latitude: endLoc.latitude, longitude: endLoc.longitude }
        ]);
        return;
      }

      const coordCount = data.geometry.coordinates.length;
      console.log('Route coordinates count:', coordCount);

      if (coordCount === 0) {
        console.error('❌ Empty coordinates array');
        console.log('⚠️ Using straight line fallback');
        setRouteCoordinates([
          { latitude: startLoc.latitude, longitude: startLoc.longitude },
          { latitude: endLoc.latitude, longitude: endLoc.longitude }
        ]);
        return;
      }

      if (coordCount === 2) {
        console.warn('⚠️ Route has only 2 points - straight line returned');
      }

      // Convert [lng, lat] format to [lat, lng] for react-native-maps
      const coordinates = data.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      
      console.log('✅ Route successfully processed!');
      console.log('Waypoints:', coordinates.length);
      console.log('First point:', JSON.stringify(coordinates[0]));
      console.log('Last point:', JSON.stringify(coordinates[coordinates.length - 1]));
      console.log('========== [ROUTE FETCH] SUCCESS ==========\n');
      
      setRouteCoordinates(coordinates);
    } catch (error) {
      console.error('\n========== [ROUTE FETCH] ERROR ==========');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('========== [ROUTE FETCH] END ERROR ==========\n');
      
      // Fallback to straight line on any error
      console.log('⚠️ Using straight line fallback due to network error');
      setRouteCoordinates([
        { latitude: startLoc.latitude, longitude: startLoc.longitude },
        { latitude: endLoc.latitude, longitude: endLoc.longitude }
      ]);
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (location && mission?.report) {
      console.log('\n🟡 AUTO-FETCH TRIGGERED');
      console.log('Location:', JSON.stringify(location));
      console.log('Mission report:', JSON.stringify({
        lat: mission.report.lat,
        lng: mission.report.lng,
        severity: mission.report.severity
      }));
      fetchRoute(location, { latitude: mission.report.lat, longitude: mission.report.lng });
    } else {
      console.log('⚫ AUTO-FETCH BLOCKED - location:', !!location, 'mission:', !!mission?.report);
    }
  }, [location, mission]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      setLoading(false);
      startLocationTracking();
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Failed to get location');
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('🟡 Starting location tracking for map display...');
      // Note: Background location tracking is now handled globally in SocketContext
      // This just updates the map UI with the current location
      locationSubscription.current = await Location.watchPositionAsync(
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
          
          console.log(`📍 [MAP] Location update: (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`);
          setLocation(coords);
          // Socket.IO emission now handled by SocketContext background tracking
        }
      );
      setWatchingLocation(true);
      console.log('✅ Map location tracking started');
    } catch (error) {
      console.error('❌ Watch position error:', error);
      setLocationError('Failed to start location tracking: ' + error.message);
    }
  };

  const fetchMission = async () => {
    try {
      console.log('\n📡 Fetching mission...');
      console.log('URL:', `${API_URL}/rescue/my-mission`);
      console.log('Token available:', !!token);
      
      const response = await fetch(`${API_URL}/rescue/my-mission`, {
        headers: getAuthHeaders(token),
      });

      console.log('Response status:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Mission fetched');
        console.log('Mission data keys:', Object.keys(data));
        console.log('Has report:', !!data?.report);
        if (data?.report) {
          console.log('Report coords:', { lat: data.report.lat, lng: data.report.lng });
        }
        setMission(data);

        // If there's a mission with coordinates, center the map
        if (data?.report?.lat && data?.report?.lng && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: data.report.lat,
            longitude: data.report.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      } else {
        console.warn('❌ Mission fetch failed, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Mission fetch error:', error.message);
    }
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const centerOnMission = () => {
    if (mission?.report && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: mission.report.lat,
        longitude: mission.report.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const fitBothMarkers = () => {
    if (location && mission?.report && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: mission.report.lat, longitude: mission.report.lng }
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        }
      );
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#F97316';
      case 'moderate': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const updateMissionStatus = async (status) => {
    if (!mission?.report || missionStatusUpdating) return;
    try {
      setMissionStatusUpdating(true);
      const response = await fetch(`${API_URL}/rescue/my-mission/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update mission status');
      }

      Alert.alert('Success', `Mission marked as ${String(status).replace(/_/g, ' ').toUpperCase()}.`);
      await fetchMission();
    } catch (error) {
      console.error('Mission status update error:', error);
      Alert.alert('Error', error.message || 'Failed to update mission status');
    } finally {
      setMissionStatusUpdating(false);
    }
  };

  const handleMissionStatusPress = (status) => {
    if (status !== 'resolved') {
      updateMissionStatus(status);
      return;
    }

    Alert.alert(
      'Confirm Resolution',
      'Mark mission as RESOLVED? Admin will still verify this before final closure.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'default', onPress: () => updateMissionStatus('resolved') },
      ]
    );
  };

  const showHydrants = mission?.report && isFireIncident(mission.report.disasterType, mission.report.note);
  const nearestHydrant = showHydrants
    ? FIRE_HYDRANTS
        .map((hydrant) => ({
          ...hydrant,
          distanceMeters: haversineDistanceMeters(
            mission.report.lat,
            mission.report.lng,
            hydrant.latitude,
            hydrant.longitude
          ),
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters)[0]
    : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : null}
        initialRegion={location ? {
          ...location,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        } : defaultRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
      >
        {/* Your location marker */}
        {location && (
          <Marker
            coordinate={location}
            title="Your Location"
            description="You are here"
          >
            <View style={styles.myLocationMarker}>
              <View style={styles.myLocationInner}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            </View>
          </Marker>
        )}

        {/* Mission/Emergency location marker */}
        {mission?.report && (
          <Marker
            coordinate={{
              latitude: mission.report.lat,
              longitude: mission.report.lng,
            }}
            title="Emergency Location"
            description={mission.report.note || 'Assigned mission location'}
          >
            <View style={[
              styles.emergencyMarker,
              { backgroundColor: getSeverityColor(mission.report.severity) }
            ]}>
              <Ionicons name="alert-circle" size={24} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Fire hydrant markers for fire incidents */}
        {showHydrants && FIRE_HYDRANTS.map((hydrant) => {
          const isNearest = nearestHydrant?.id === hydrant.id;
          return (
            <Marker
              key={hydrant.id}
              coordinate={{
                latitude: hydrant.latitude,
                longitude: hydrant.longitude,
              }}
              title={hydrant.name}
              description={isNearest ? 'Nearest fire hydrant' : 'Fire hydrant'}
            >
              <View style={[
                styles.hydrantMarker,
                isNearest ? styles.hydrantMarkerNearest : null,
              ]}>
                <Text style={styles.hydrantMarkerText}>H</Text>
              </View>
            </Marker>
          );
        })}

        {/* Line connecting your location to mission */}
        {location && mission?.report && (
          <>
            {routeCoordinates && routeCoordinates.length > 0 ? (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#DC2626"
                strokeWidth={4}
              />
            ) : (
              <Polyline
                coordinates={[
                  location,
                  { latitude: mission.report.lat, longitude: mission.report.lng }
                ]}
                strokeColor="#DC2626"
                strokeWidth={3}
                lineDashPattern={[10, 5]}
              />
            )}
          </>
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerOnLocation}>
          <Ionicons name="locate" size={24} color="#DC2626" />
        </TouchableOpacity>
        
        {mission?.report && (
          <>
            <TouchableOpacity style={styles.controlButton} onPress={centerOnMission}>
              <Ionicons name="flag" size={24} color="#DC2626" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={fitBothMarkers}>
              <Ionicons name="expand" size={24} color="#DC2626" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Route Status Debug */}
      {mission?.report && (
        <View style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          backgroundColor: routeCoordinates && routeCoordinates.length > 2 ? '#10B981' : '#EF4444',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 6,
          zIndex: 100,
        }}>
          {routeLoading && (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
              ⏳ Fetching route...
            </Text>
          )}
          {!routeLoading && routeCoordinates && routeCoordinates.length > 2 && (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
              ✅ Route loaded ({routeCoordinates.length} points)
            </Text>
          )}
          {!routeLoading && (!routeCoordinates || routeCoordinates.length <= 2) && (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
              ❌ Route failed (showing straight line)
            </Text>
          )}
        </View>
      )}

      {/* Mission Info Card */}
      {mission?.report ? (
        <View style={styles.missionCard}>
          <View style={styles.missionHeader}>
            <View style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(mission.report.severity) }
            ]}>
              <Text style={styles.severityText}>
                {mission.report.severity?.toUpperCase() || 'N/A'}
              </Text>
            </View>
            <View style={[styles.teamBadge, { backgroundColor: mission.team?.color || '#6B7280' }]}>
              <Text style={styles.teamText}>
                TEAM {mission.team?.name?.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.missionTitle}>Active Emergency</Text>
          
          <View style={styles.missionInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText}>
                {mission.report.lat?.toFixed(6)}, {mission.report.lng?.toFixed(6)}
              </Text>
            </View>
            
            {mission.report.note && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={16} color="#666" />
                <Text style={styles.infoText} numberOfLines={2}>
                  {mission.report.note}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.infoText}>
                Reported: {new Date(mission.report.createdAt).toLocaleString()}
              </Text>
            </View>

            {mission.report.rescuerMissionStatus && mission.report.rescuerMissionStatus !== 'none' && (
              <View style={styles.infoRow}>
                <Ionicons name="flag" size={16} color="#2563EB" />
                <Text style={styles.infoText}>
                  Your mission status: {String(mission.report.rescuerMissionStatus).replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            )}

            {showHydrants && nearestHydrant && (
              <View style={styles.infoRow}>
                <Ionicons name="water" size={16} color="#2563EB" />
                <Text style={styles.infoText}>
                  Nearest hydrant: {nearestHydrant.name} ({nearestHydrant.distanceMeters < 1000
                    ? `${Math.round(nearestHydrant.distanceMeters)} m`
                    : `${(nearestHydrant.distanceMeters / 1000).toFixed(2)} km`})
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.directionsButton} onPress={fitBothMarkers}>
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.directionsText}>Show Route</Text>
          </TouchableOpacity>

          <Text style={styles.statusSectionTitle}>Mission Update</Text>
          <View style={styles.missionStatusActions}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                styles.onTheWayButton,
                mission.report.rescuerMissionStatus === 'on_the_way' && styles.statusButtonActive,
              ]}
              disabled={missionStatusUpdating}
              onPress={() => handleMissionStatusPress('on_the_way')}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.statusButtonText}>On the way</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                styles.ongoingButton,
                mission.report.rescuerMissionStatus === 'ongoing' && styles.statusButtonActive,
              ]}
              disabled={missionStatusUpdating}
              onPress={() => handleMissionStatusPress('ongoing')}
            >
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={styles.statusButtonText}>Ongoing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                styles.resolvedButton,
                mission.report.rescuerMissionStatus === 'resolved' && styles.statusButtonActive,
              ]}
              disabled={missionStatusUpdating}
              onPress={() => handleMissionStatusPress('resolved')}
            >
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.statusButtonText}>Resolved</Text>
            </TouchableOpacity>
          </View>

          {missionStatusUpdating && (
            <Text style={styles.statusUpdatingText}>Updating mission status...</Text>
          )}
        </View>
      ) : (
        <View style={styles.noMissionCard}>
          <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          <Text style={styles.noMissionTitle}>No Active Mission</Text>
          <Text style={styles.noMissionText}>
            You will be notified when a mission is assigned to your team.
          </Text>
        </View>
      )}

      {/* Location Error */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {/* Connection Status */}
      <View style={[
        styles.connectionIndicator,
        { backgroundColor: connected ? '#10B981' : '#EF4444' }
      ]}>
        <View style={styles.connectionDot} />
        <Text style={styles.connectionText}>
          {connected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      {/* Debug Route Test Button - Always Visible */}
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: mission?.report ? 240 : 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#3B82F6',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
          zIndex: 1000,
        }}
        onPress={async () => {
          console.log('\n🔵 ROUTE ENDPOINT DIAGNOSTICS');
          console.log('API_URL:', API_URL);
          console.log(`Testing: ${API_URL}/route`);
          
          // Test with hardcoded coordinates
          const testStart = '125.1050,8.1575';
          const testEnd = '125.1200,8.1650';
          const testUrl = `${API_URL}/route?start=${testStart}&end=${testEnd}`;
          
          console.log('Test URL:', testUrl);
          
          try {
            const response = await fetch(testUrl);
            console.log('Status:', response.status);
            const data = await response.json();
            console.log('Response keys:', Object.keys(data));
            console.log('Geometry type:', data.geometry?.type);
            console.log('Coordinates count:', data.geometry?.coordinates?.length);
            
            if (data.geometry?.coordinates?.length > 0) {
              console.log('✅ ENDPOINT WORKING - Got', data.geometry.coordinates.length, 'points');
              Alert.alert('✅ Route Endpoint Works!', `Got ${data.geometry.coordinates.length} route points`);
            } else {
              console.log('❌ ENDPOINT ISSUE - No coordinates');
              Alert.alert('❌ Route Error', 'Endpoint returned no coordinates');
            }
          } catch (err) {
            console.error('❌ NETWORK ERROR:', err.message);
            Alert.alert('❌ Network Error', err.message);
          }
          
          // Now test with current mission
          if (location && mission?.report) {
            console.log('\n🟡 Retrying with current mission coordinates');
            fetchRoute(location, { latitude: mission.report.lat, longitude: mission.report.lng });
          }
        }}
      >
        <Ionicons name="bug" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  myLocationMarker: {
    padding: 5,
  },
  myLocationInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emergencyMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  hydrantMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  hydrantMarkerNearest: {
    backgroundColor: '#1D4ED8',
    borderColor: '#93C5FD',
  },
  hydrantMarkerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 15,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  missionCard: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  teamBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teamText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  missionInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  directionsButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  directionsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  missionStatusActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusSectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  statusButton: {
    width: '32%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  onTheWayButton: {
    backgroundColor: '#0EA5E9',
  },
  ongoingButton: {
    backgroundColor: '#2563EB',
  },
  resolvedButton: {
    backgroundColor: '#059669',
  },
  statusButtonActive: {
    opacity: 0.85,
    borderWidth: 2,
    borderColor: '#111827',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  statusUpdatingText: {
    marginTop: 8,
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
  },
  noMissionCard: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  noMissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  noMissionText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  errorBanner: {
    position: 'absolute',
    top: 20,
    left: 15,
    right: 70,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
  },
  connectionIndicator: {
    position: 'absolute',
    top: 20,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
