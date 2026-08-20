import React, { useState, useEffect } from 'react';
import { Polyline } from 'react-leaflet';
import API from '../api';

const ReportRoutePolyline = ({ startLat, startLng, endLat, endLng, reportId }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!startLat || !startLng || !endLat || !endLng) return;

    // Reset state when coordinates change
    setRouteCoordinates([]);
    setError(false);

    const fetchRoute = async () => {
      try {
        const response = await API.get(`/route?start=${startLat},${startLng}&end=${endLat},${endLng}`);
        if (response.data && response.data.geometry && response.data.geometry.coordinates) {
          const coordinates = response.data.geometry.coordinates.map((coord) => ({
            lat: coord[1],
            lng: coord[0],
          }));
          setRouteCoordinates(coordinates);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(`Route fetch error for report ${reportId}:`, err);
        setError(true);
      }
    };

    fetchRoute();
  }, [startLat, startLng, endLat, endLng, reportId]);

  if (routeCoordinates.length === 0 || error) {
    // Fallback to straight dashed line if loading or error
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

  // Draw the actual road route
  return (
    <Polyline
      key={`real-route-${reportId}`}
      positions={routeCoordinates.map(c => [c.lat, c.lng])}
      color="#0284c7"
      weight={4}
      opacity={0.8}
    />
  );
};

export default ReportRoutePolyline;
