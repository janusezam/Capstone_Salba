import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AlertCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.message}</Text>
      <Text style={styles.subtitle}>
        📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
      </Text>
      <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  title: { fontWeight: "bold", fontSize: 16 },
  subtitle: { color: "#555", marginTop: 4 },
  date: { color: "#888", marginTop: 6, fontSize: 12 },
});
