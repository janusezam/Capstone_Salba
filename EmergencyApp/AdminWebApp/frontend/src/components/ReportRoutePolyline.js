import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Polyline } from 'react-leaflet';
import API from '../api';

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

const ReportRoutePolyline = ({ startLat, startLng, endLat, endLng, reportId }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [error, setError] = useState(false);

  const lastFetchRef = useRef({ lat: null, lng: null, endLat: null, endLng: null, time: 0 });
  const requestIdRef = useRef(0);
  const cachedRouteRef = useRef([]);

  useEffect(() => {
    if (!startLat || !startLng || !endLat || !endLng) return;

    const now = Date.now();
    const last = lastFetchRef.current;
    const movedMeters =
      Number.isFinite(last.lat) && Number.isFinite(last.lng)
        ? haversineDistanceMeters(last.lat, last.lng, startLat, startLng)
        : Number.POSITIVE_INFINITY;
    const endMovedMeters =
      Number.isFinite(last.endLat) && Number.isFinite(last.endLng)
        ? haversineDistanceMeters(last.endLat, last.endLng, endLat, endLng)
        : Number.POSITIVE_INFINITY;
    const elapsedMs = now - (last.time || 0);

    // If we already have a road route and rescuer hasn't moved >= 25m and < 15s elapsed, skip refetch
    if (cachedRouteRef.current.length > 0 && movedMeters < 25 && endMovedMeters < 10 && elapsedMs < 15000) {
      return;
    }

    lastFetchRef.current = {
      lat: startLat,
      lng: startLng,
      endLat,
      endLng,
      time: now,
    };

    const currentRequestId = ++requestIdRef.current;

    const fetchRoute = async () => {
      try {
        const response = await API.get(`/route?start=${startLat},${startLng}&end=${endLat},${endLng}`);
        
        // Ignore stale response if a newer request was dispatched
        if (currentRequestId !== requestIdRef.current) return;

        if (response.data && response.data.geometry && response.data.geometry.coordinates) {
          const coordinates = response.data.geometry.coordinates.map((coord) => ({
            lat: coord[1],
            lng: coord[0],
          }));
          cachedRouteRef.current = coordinates;
          setRouteCoordinates(coordinates);
          setError(false);
        } else {
          // If we don't have existing cached road coordinates, mark error
          if (cachedRouteRef.current.length === 0) {
            setError(true);
          }
        }
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        console.warn(`[ReportRoutePolyline] Route fetch error for report ${reportId}:`, err?.message || err);
        // Only set error fallback if we don't already have a valid road route cached
        if (cachedRouteRef.current.length === 0) {
          setError(true);
        }
      }
    };

    fetchRoute();
  }, [startLat, startLng, endLat, endLng, reportId]);

  // Connect live rescuer position smoothly to the road route
  const displayPositions = useMemo(() => {
    if (routeCoordinates.length === 0) return [];
    const points = routeCoordinates.map(c => [c.lat, c.lng]);
    // Prepend moving rescuer coordinates so line stays attached to rescuer icon in real time
    if (Number.isFinite(startLat) && Number.isFinite(startLng)) {
      return [[startLat, startLng], ...points];
    }
    return points;
  }, [routeCoordinates, startLat, startLng]);

  if (displayPositions.length === 0 || (error && displayPositions.length === 0)) {
    // Fallback to straight dashed line ONLY if no road route is loaded yet or completely unavailable
    return (
      <Polyline
        key={`fallback-route-${reportId}`}
        positions={[
          [startLat, startLng],
          [endLat, endLng]
        ]}
        color="#0284c7"
        weight={3}
        dashArray="5, 10"
        opacity={0.7}
      />
    );
  }

  // Draw the smooth actual road route
  return (
    <Polyline
      key={`real-route-${reportId}`}
      positions={displayPositions}
      color="#0284c7"
      weight={4}
      opacity={0.85}
    />
  );
};

export default ReportRoutePolyline;
