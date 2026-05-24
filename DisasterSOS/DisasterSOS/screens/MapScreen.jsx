import React from "react";
import MapView, { Marker } from "react-native-maps";
import { useLocation } from "../hooks/useLocation";
import { View, StyleSheet, Text } from "react-native";

export default function MapScreen() {
  const coords = useLocation();

  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude))
    return (
      <View style={styles.center}>
        <Text>Loading map...</Text>
      </View>
    );

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={{ latitude: coords.latitude, longitude: coords.longitude }} title="Your Location" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
