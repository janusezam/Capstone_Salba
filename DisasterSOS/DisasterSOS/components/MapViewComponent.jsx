import React from "react";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { StyleSheet, View, Text } from "react-native";

export default function MapViewComponent({ latitude, longitude }) {
  // Safety check: ensure valid coordinates exist
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return (
      <View style={styles.container}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text>Invalid location coordinates</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />
        <Marker coordinate={{ latitude: parseFloat(latitude), longitude: parseFloat(longitude) }} title="Your Location" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
