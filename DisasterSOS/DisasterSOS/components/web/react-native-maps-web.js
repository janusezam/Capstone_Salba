import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';

export const Marker = () => null;
Marker.displayName = 'Marker';

export const Polyline = () => null;
Polyline.displayName = 'Polyline';

export const Polygon = () => null;
export const Circle = () => null;
export const Callout = ({ children }) => <View>{children}</View>;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const MapView = forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    fitToCoordinates: () => {},
    fitToSuppliedMarkers: () => {},
  }));

  const lat = Number(props.region?.latitude ?? props.initialRegion?.latitude ?? 8.1574);
  const lng = Number(props.region?.longitude ?? props.initialRegion?.longitude ?? 125.1246);

  const markers = [];
  const polylines = [];

  React.Children.forEach(props.children, (child) => {
    if (!child || !child.props) return;
    if (child.props.coordinate && child.props.coordinate.latitude != null && child.props.coordinate.longitude != null) {
      markers.push({
        lat: Number(child.props.coordinate.latitude),
        lng: Number(child.props.coordinate.longitude),
        title: String(child.props.title || ''),
      });
    } else if (Array.isArray(child.props.coordinates) && child.props.coordinates.length > 0) {
      polylines.push({
        coords: child.props.coordinates
          .filter((c) => c && c.latitude != null && c.longitude != null)
          .map((c) => [Number(c.latitude), Number(c.longitude)]),
        color: child.props.strokeColor || '#0284C7',
        weight: child.props.strokeWidth || 4,
      });
    }
  });

  const interactive = props.scrollEnabled !== false && props.zoomEnabled !== false;
  const payloadJson = JSON.stringify({ lat, lng, markers, polylines, interactive });

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f3f4f6; }
  .pin-victim {
    width: 30px; height: 30px; border-radius: 50%; background: #DC2626;
    border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 15px;
  }
  .pin-rescuer {
    width: 34px; height: 34px; border-radius: 50%; background: #0284C7;
    border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 14px; font-family: sans-serif;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const data = ${payloadJson};
  const map = L.map('map', {
    zoomControl: data.interactive,
    dragging: data.interactive,
    scrollWheelZoom: data.interactive,
    doubleClickZoom: data.interactive,
    touchZoom: data.interactive,
    attributionControl: false
  }).setView([data.lat, data.lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  const bounds = [];
  data.polylines.forEach((p) => {
    if (p.coords.length > 1) {
      L.polyline(p.coords, { color: p.color, weight: p.weight, opacity: 0.9 }).addTo(map);
      p.coords.forEach((pt) => bounds.push(pt));
    }
  });

  data.markers.forEach((m, idx) => {
    const isVictim = idx === 0 || /your location|incident/i.test(m.title);
    const label = isVictim ? '!' : (m.title ? m.title.charAt(0).toUpperCase() : 'R');
    const icon = L.divIcon({
      className: '',
      html: '<div class="' + (isVictim ? 'pin-victim' : 'pin-rescuer') + '">' + label + '</div>',
      iconSize: isVictim ? [30, 30] : [34, 34],
      iconAnchor: isVictim ? [15, 15] : [17, 17]
    });
    const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
    if (m.title) marker.bindPopup(m.title);
    bounds.push([m.lat, m.lng]);
  });

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 16);
  }
</script>
</body>
</html>`;

  return (
    <View style={[styles.container, props.style]}>
      <iframe
        title="Live Rescue Map"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 8,
          pointerEvents: interactive ? 'auto' : 'none',
        }}
        srcDoc={srcDoc}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f3f4f6',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
  },
});

export default MapView;
