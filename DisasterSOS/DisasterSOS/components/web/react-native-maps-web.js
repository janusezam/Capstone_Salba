import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text } from 'react-native';

const MapView = forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    fitToCoordinates: () => {},
    fitToSuppliedMarkers: () => {},
  }));

  const lat = props.initialRegion?.latitude || props.region?.latitude;
  const lng = props.initialRegion?.longitude || props.region?.longitude;

  return (
    <View style={[styles.container, props.style]}>
      {/* If iframe or Leaflet not embedded, show clean web map container */}
      <iframe
        title="OpenStreetMap"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 8,
          pointerEvents: 'auto',
        }}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng || 125.127) - 0.01}%2C${Number(lat || 8.157) - 0.01}%2C${Number(lng || 125.127) + 0.01}%2C${Number(lat || 8.157) + 0.01}&layer=mapnik&marker=${lat || 8.157}%2C${lng || 125.127}`}
      />
      {props.children}
    </View>
  );
});

export const Marker = ({ coordinate, title, description, children, style }) => {
  if (children) return <View style={style}>{children}</View>;
  return null;
};

export const Polyline = () => null;
export const Polygon = () => null;
export const Circle = () => null;
export const Callout = ({ children }) => <View>{children}</View>;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f3f4f6',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
  },
});

export default MapView;
