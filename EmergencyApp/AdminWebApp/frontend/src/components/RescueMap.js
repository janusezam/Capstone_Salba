import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import io from "socket.io-client";
import { AlertCircle } from "lucide-react";
import API from "../api";

// Define custom icons
const DefaultIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const RescuerIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "rescuer-marker",
});

const IncidentIcon = L.icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='red'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E",
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const FIRE_HYDRANTS = [
  { id: 'FH-001', name: 'Fire Hydrant 1', lat: 8.158771, lng: 125.123458 },
  { id: 'FH-002', name: 'Fire Hydrant 2', lat: 8.155131, lng: 125.127794 },
];

const FireHydrantIcon = L.icon({
  iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="#2563eb" stroke="#ffffff" stroke-width="2"/><text x="13" y="17" text-anchor="middle" font-size="12" font-family="Arial" font-weight="700" fill="#ffffff">H</text></svg>')}`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -12],
  className: 'hydrant-marker',
});

const isFireIncident = (rescue) => {
  const text = `${rescue?.disasterType || ''} ${rescue?.type || ''} ${rescue?.note || ''}`.toLowerCase();
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

function MapSync({ isFullscreen, rescuerLocation }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => clearTimeout(timer);
  }, [isFullscreen, map]);

  useEffect(() => {
    if (!rescuerLocation) return;

    const timer = setTimeout(() => {
      map.panTo([rescuerLocation.lat, rescuerLocation.lng], {
        animate: true,
        duration: 0.35,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [rescuerLocation?.lat, rescuerLocation?.lng, map]);

  return null;
}

function RescueMap({ rescue, onRealTimeUpdate, externalLocationUpdate }) {
  const socketRef = useRef(null);
  const lastSocketUpdateRef = useRef(0);
  const lastRouteFetchRef = useRef({ lat: null, lng: null, time: 0 });
  const activeRescueIdRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rescuerLocation, setRescuerLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeStatus, setRouteStatus] = useState("idle"); // idle, loading, success, error
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);

  const incidentLocation = useMemo(() => ({
    lat: rescue.lat,
    lng: rescue.lng,
    name: rescue.locationName || `${rescue.lat.toFixed(4)}, ${rescue.lng.toFixed(4)}`,
  }), [rescue.lat, rescue.lng, rescue.locationName]);

  const showHydrants = isFireIncident(rescue);
  const nearestHydrant = showHydrants
    ? FIRE_HYDRANTS
        .map((hydrant) => ({
          ...hydrant,
          distanceMeters: haversineDistanceMeters(incidentLocation.lat, incidentLocation.lng, hydrant.lat, hydrant.lng),
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters)[0]
    : null;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize rescuer location only when a different rescue is selected.
  useEffect(() => {
    const rescueId = rescue?._id || rescue?.id || null;
    const rescueChanged = activeRescueIdRef.current !== rescueId;
    activeRescueIdRef.current = rescueId;
    const initialLat = Number(rescue.assignedRescuer?.rescuerLat);
    const initialLng = Number(rescue.assignedRescuer?.rescuerLng);
    const hasInitialCoords = Number.isFinite(initialLat) && Number.isFinite(initialLng);

    if (rescueChanged && hasInitialCoords) {
      setRescuerLocation({
        lat: initialLat,
        lng: initialLng,
        name: rescue.assignedRescuer.rescuerName || "Rescuer",
      });
      return;
    }

    if (rescueChanged && !hasInitialCoords) {
      setRescuerLocation(null);
      return;
    }

    if (!rescuerLocation && hasInitialCoords) {
      setRescuerLocation({
        lat: initialLat,
        lng: initialLng,
        name: rescue.assignedRescuer.rescuerName || "Rescuer",
      });
    } else {
      // Fallback to incident location while waiting for rescuer to connect
      console.log("⏳ Waiting for rescuer location from real-time update...");
      // Don't set a location yet - let Socket.IO provide actual rescuer position
    }
  }, [rescue, rescuerLocation]);

  // Fallback polling only when socket updates are stale.
  useEffect(() => {
    const rescueId = rescue?._id || rescue?.id;
    if (!rescueId) return;

    let cancelled = false;

    const syncLiveCoordinates = async () => {
      const msSinceSocket = Date.now() - (lastSocketUpdateRef.current || 0);
      if (lastSocketUpdateRef.current && msSinceSocket < 10000) {
        return;
      }

      try {
        const response = await API.get('/reports/ongoing/list');
        if (cancelled) return;

        const latestRescue = (response.data || []).find((item) => String(item._id) === String(rescueId));
        const liveLat = Number(latestRescue?.assignedRescuer?.rescuerLat);
        const liveLng = Number(latestRescue?.assignedRescuer?.rescuerLng);
        const liveName = latestRescue?.assignedRescuer?.rescuerName || 'Rescuer';

        if (Number.isFinite(liveLat) && Number.isFinite(liveLng)) {
          setRescuerLocation((current) => {
            if (!current) {
              return { lat: liveLat, lng: liveLng, name: liveName };
            }

            const movedMeters = haversineDistanceMeters(current.lat, current.lng, liveLat, liveLng);
            if (movedMeters < 3 && current.name === liveName) {
              return current;
            }

            return {
              lat: liveLat,
              lng: liveLng,
              name: liveName,
            };
          });
        }
      } catch (error) {
        console.warn('Live coordinate sync failed:', error?.message || error);
      }
    };

    syncLiveCoordinates();
    const intervalId = setInterval(syncLiveCoordinates, 7000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [rescue?._id, rescue?.id]);

  // Apply location updates coming from AdminDashboard's socket stream.
  useEffect(() => {
    if (!externalLocationUpdate) return;

    const data = externalLocationUpdate;
    const currentRescueId = String(rescue?._id || rescue?.id || '');
    const incomingReportId = data.reportId ? String(data.reportId) : null;
    const incomingTeamId = data.teamId ? String(data.teamId) : null;
    const currentTeamId = rescue?.assignedTeam?._id ? String(rescue.assignedTeam._id) : null;
    const assignedRescuerId = rescue.assignedRescuer?.rescuerId;
    const assignedRescuerName = rescue.assignedRescuer?.rescuerName;
    const incomingRescuerId = data.rescuerId ? String(data.rescuerId) : null;
    const currentAssignedRescuerId = assignedRescuerId ? String(assignedRescuerId) : null;
    const matchesByReport = incomingReportId && currentRescueId && incomingReportId === currentRescueId;
    const matchesByTeam = incomingTeamId && currentTeamId && incomingTeamId === currentTeamId;

    const isMatchingRescuer =
      matchesByReport ||
      matchesByTeam ||
      (incomingRescuerId && currentAssignedRescuerId && incomingRescuerId === currentAssignedRescuerId) ||
      (data.rescuerName && assignedRescuerName && data.rescuerName === assignedRescuerName) ||
      !assignedRescuerId;

    if (!isMatchingRescuer) return;

    const nextLat = Number(data.lat);
    const nextLng = Number(data.lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;

    lastSocketUpdateRef.current = Date.now();
    setRescuerLocation({
      lat: nextLat,
      lng: nextLng,
      name: data.rescuerName || rescue.assignedRescuer?.rescuerName || 'Rescuer',
      accuracy: data.accuracy,
      timestamp: data.timestamp || data._eventTs,
    });
  }, [externalLocationUpdate, rescue]);

  // Fetch route from rescuer to incident
  useEffect(() => {
    if (!rescuerLocation) return;

    const now = Date.now();
    const last = lastRouteFetchRef.current;
    const movedMeters =
      Number.isFinite(last.lat) && Number.isFinite(last.lng)
        ? haversineDistanceMeters(last.lat, last.lng, rescuerLocation.lat, rescuerLocation.lng)
        : Number.POSITIVE_INFINITY;
    const elapsedMs = now - (last.time || 0);

    // Avoid route refetching on tiny movement / frequent GPS pings.
    if (movedMeters < 25 && elapsedMs < 15000) {
      return;
    }

    lastRouteFetchRef.current = {
      lat: rescuerLocation.lat,
      lng: rescuerLocation.lng,
      time: now,
    };

    const fetchRoute = async () => {
      setRouteStatus("loading");
      setError(null);
      try {
        const response = await fetch(
          `http://localhost:5000/api/route?start=${rescuerLocation.lat},${rescuerLocation.lng}&end=${incidentLocation.lat},${incidentLocation.lng}`
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Convert OpenRouteService format [lng,lat] to Leaflet format [{lat, lng}]
        const coordinates = data.geometry.coordinates.map((coord) => ({
          lat: coord[1],
          lng: coord[0],
        }));

        setRouteCoordinates(coordinates);
        setRouteStatus("success");

        // Extract distance and duration if available
        if (data.properties) {
          setRouteDistance(
            data.properties.summary?.distance
              ? ((data.properties.summary.distance / 1000).toFixed(2) + " km")
              : null
          );
          setRouteDuration(
            data.properties.summary?.duration
              ? ((data.properties.summary.duration / 60).toFixed(0) + " min")
              : null
          );
        }
      } catch (err) {
        console.error("Route fetch error:", err);
        console.log("⚠️ Route service unavailable, will use straight line fallback");
        setRouteCoordinates([]); // Clear any partial data
        setRouteStatus("error");
        setError("Route service unavailable. Showing direct path instead.");
      }
    };

    fetchRoute();
  }, [rescuerLocation?.lat, rescuerLocation?.lng, incidentLocation.lat, incidentLocation.lng]);

  // WebSocket for real-time location updates
  useEffect(() => {
    const socketHost = window.location.hostname || 'localhost';
    const SOCKET_URL = `http://${socketHost}:5000`;

    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      console.log("✓ Connected to real-time location updates");
      // Backend listens to join_admin and emits rescuer_location_update to admins room.
      socketRef.current.emit("join_admin");
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected from real-time updates");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - only connect once

  // Separate effect to handle location updates when rescue changes
  useEffect(() => {
    if (!socketRef.current) return;

    const handleLocationUpdate = (data) => {
      console.log("📍 Real-time rescuer location update:", data);
      console.log("📍 Current rescue assigned rescuer:", rescue.assignedRescuer);
      
      // Prefer report-scoped matching; fallback to rescuer identity checks.
      const currentRescueId = String(rescue?._id || rescue?.id || '');
      const incomingReportId = data.reportId ? String(data.reportId) : null;
      const assignedRescuerId = rescue.assignedRescuer?.rescuerId;
      const assignedRescuerName = rescue.assignedRescuer?.rescuerName;
      const incomingRescuerId = data.rescuerId ? String(data.rescuerId) : null;
      const currentAssignedRescuerId = assignedRescuerId ? String(assignedRescuerId) : null;
      const matchesByReport = incomingReportId && currentRescueId && incomingReportId === currentRescueId;
      
      const isMatchingRescuer = 
        matchesByReport ||
        (incomingRescuerId && currentAssignedRescuerId && incomingRescuerId === currentAssignedRescuerId) ||
        (data.rescuerName && assignedRescuerName && data.rescuerName === assignedRescuerName) ||
        !assignedRescuerId;
      
      console.log(`✓ Rescuer match check: report=${incomingReportId}===${currentRescueId}? ${matchesByReport}, rescuerId=${incomingRescuerId}===${currentAssignedRescuerId}? ${incomingRescuerId === currentAssignedRescuerId}, name=${data.rescuerName}===${assignedRescuerName}? ${data.rescuerName === assignedRescuerName}, noAssignedId=${!assignedRescuerId}`);
      
      if (isMatchingRescuer) {
        const nextLat = Number(data.lat);
        const nextLng = Number(data.lng);
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
          console.warn('⏭️ Skipping invalid coordinate payload:', data);
          return;
        }

        console.log(`✅ Updating rescuer location to: ${nextLat}, ${nextLng}`);
        lastSocketUpdateRef.current = Date.now();
        setRescuerLocation({
          lat: nextLat,
          lng: nextLng,
          name: data.rescuerName || "Rescuer",
          accuracy: data.accuracy,
          timestamp: data.timestamp,
        });

        if (onRealTimeUpdate) {
          onRealTimeUpdate(data);
        }
      } else {
        console.log(`⏭️ Skipping location update - doesn't match assigned rescuer`);
      }
    };

    // Register the listener
    socketRef.current.on("rescuer_location_update", handleLocationUpdate);

    // Cleanup - remove listener when rescue changes
    return () => {
      if (socketRef.current) {
        socketRef.current.off("rescuer_location_update", handleLocationUpdate);
      }
    };
  }, [rescue, onRealTimeUpdate]); // Re-register listener when rescue changes

  const DefaultMapCenter = [incidentLocation.lat, incidentLocation.lng];
  const DefaultZoom = 15;

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[10000] bg-slate-950 p-2 sm:p-4" : "space-y-4"}>
      {/* Map Container */}
      <div className={isFullscreen ? "h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xl" : "bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm"}>
        <div className="relative" style={{ height: isFullscreen ? "calc(100vh - 1rem)" : "400px", width: "100%" }}>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="absolute top-3 right-3 z-[1001] rounded-lg bg-slate-900/90 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <MapContainer
            center={DefaultMapCenter}
            zoom={DefaultZoom}
            style={{ height: "100%", width: "100%" }}
          >
            <MapSync isFullscreen={isFullscreen} rescuerLocation={rescuerLocation} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Incident Marker (Red) */}
            <Marker position={[incidentLocation.lat, incidentLocation.lng]} icon={IncidentIcon}>
              <Popup>
                <div className="font-semibold">
                  {incidentLocation.name}
                  <br />
                  <span className="text-sm text-slate-600">Incident Location</span>
                  <br />
                  <span className="text-xs text-slate-500">
                    {incidentLocation.lat.toFixed(4)}, {incidentLocation.lng.toFixed(4)}
                  </span>
                  {nearestHydrant && (
                    <>
                      <br />
                      <span className="text-xs text-blue-700">
                        Nearest Hydrant: {nearestHydrant.name} ({nearestHydrant.distanceMeters < 1000
                          ? `${Math.round(nearestHydrant.distanceMeters)} m`
                          : `${(nearestHydrant.distanceMeters / 1000).toFixed(2)} km`})
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Fire hydrant markers (for fire incidents) */}
            {showHydrants && FIRE_HYDRANTS.map((hydrant) => {
              const isNearest = nearestHydrant?.id === hydrant.id;
              return (
                <Marker key={hydrant.id} position={[hydrant.lat, hydrant.lng]} icon={FireHydrantIcon}>
                  <Popup>
                    <div className="font-semibold">
                      {hydrant.name}
                      <br />
                      <span className="text-sm text-slate-600">Fire Hydrant</span>
                      <br />
                      <span className="text-xs text-slate-500">
                        {hydrant.lat.toFixed(6)}, {hydrant.lng.toFixed(6)}
                      </span>
                      {isNearest && (
                        <>
                          <br />
                          <span className="text-xs text-blue-700">Nearest to incident</span>
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Rescuer Location Marker (Blue) */}
            {rescuerLocation && (
              <>
                <Marker
                  position={[rescuerLocation.lat, rescuerLocation.lng]}
                  icon={RescuerIcon}
                >
                  <Popup>
                    <div className="font-semibold">
                      {rescuerLocation.name}
                      <br />
                      <span className="text-sm text-slate-600">Current Location</span>
                      <br />
                      <span className="text-xs text-slate-500">
                        {rescuerLocation.lat.toFixed(4)}, {rescuerLocation.lng.toFixed(4)}
                      </span>
                      {rescuerLocation.accuracy && (
                        <>
                          <br />
                          <span className="text-xs text-slate-500">
                            Accuracy: ±{rescuerLocation.accuracy.toFixed(0)}m
                          </span>
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Accuracy Circle */}
                {rescuerLocation.accuracy && (
                  <Circle
                    center={[rescuerLocation.lat, rescuerLocation.lng]}
                    radius={Math.max(rescuerLocation.accuracy, 10)}
                    fillColor="blue"
                    color="blue"
                    weight={1}
                    opacity={0.2}
                    fillOpacity={0.1}
                  />
                )}
              </>
            )}

            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates.map((coord) => [coord.lat, coord.lng])}
                color={routeStatus === "success" ? "#3b82f6" : "#ef4444"}
                weight={3}
                opacity={0.8}
                dashArray={routeStatus === "error" ? "5, 5" : undefined}
              />
            )}

            {/* Fallback: Straight line if route fails */}
            {routeStatus === "error" && rescuerLocation && (
              <Polyline
                positions={[
                  [rescuerLocation.lat, rescuerLocation.lng],
                  [incidentLocation.lat, incidentLocation.lng],
                ]}
                color="#ef4444"
                weight={2}
                opacity={0.6}
                dashArray="10, 5"
              />
            )}
          </MapContainer>
        </div>

        {/* Map Status Bar */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rescuerLocation ? (
              <>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-slate-600">Live tracking active</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span className="text-slate-600">Awaiting rescuer location...</span>
              </>
            )}
          </div>
          <div className="text-slate-500">
            {routeStatus === "loading" && "⏳ Loading route..."}
            {routeStatus === "success" && "✓ Route loaded"}
            {routeStatus === "error" && "⚠ Route unavailable"}
          </div>
        </div>
      </div>

      {/* Route Information */}
      {rescuerLocation && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-900 mb-3">Route Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600 text-xs">Rescuer Location</p>
              <p className="font-medium text-slate-900">
                {rescuerLocation.lat.toFixed(4)}, {rescuerLocation.lng.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs">Incident Location</p>
              <p className="font-medium text-slate-900">
                {incidentLocation.lat.toFixed(4)}, {incidentLocation.lng.toFixed(4)}
              </p>
            </div>
            {routeDistance && (
              <div>
                <p className="text-slate-600 text-xs">Distance</p>
                <p className="font-medium text-slate-900">{routeDistance}</p>
              </div>
            )}
            {routeDuration && (
              <div>
                <p className="text-slate-600 text-xs">Estimated Time</p>
                <p className="font-medium text-slate-900">{routeDuration}</p>
              </div>
            )}
            {nearestHydrant && (
              <div>
                <p className="text-slate-600 text-xs">Nearest Fire Hydrant</p>
                <p className="font-medium text-slate-900">
                  {nearestHydrant.name} ({nearestHydrant.distanceMeters < 1000
                    ? `${Math.round(nearestHydrant.distanceMeters)} m`
                    : `${(nearestHydrant.distanceMeters / 1000).toFixed(2)} km`})
                </p>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const areRescueMapPropsEqual = (prevProps, nextProps) => {
  const prevRescue = prevProps.rescue || {};
  const nextRescue = nextProps.rescue || {};

  if ((prevRescue._id || prevRescue.id) !== (nextRescue._id || nextRescue.id)) {
    return false;
  }

  const prevAssigned = prevRescue.assignedRescuer || {};
  const nextAssigned = nextRescue.assignedRescuer || {};

  return (
    prevRescue.lat === nextRescue.lat &&
    prevRescue.lng === nextRescue.lng &&
    prevRescue.status === nextRescue.status &&
    prevRescue.rescuerMissionStatus === nextRescue.rescuerMissionStatus &&
    prevAssigned.rescuerId === nextAssigned.rescuerId &&
    prevAssigned.rescuerName === nextAssigned.rescuerName &&
    prevAssigned.rescuerLat === nextAssigned.rescuerLat &&
    prevAssigned.rescuerLng === nextAssigned.rescuerLng &&
    prevAssigned.startedAt === nextAssigned.startedAt &&
    prevProps.externalLocationUpdate?._eventTs === nextProps.externalLocationUpdate?._eventTs &&
    prevProps.onRealTimeUpdate === nextProps.onRealTimeUpdate
  );
};

export default React.memo(RescueMap, areRescueMapPropsEqual);
