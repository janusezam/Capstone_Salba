import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function Header({ title }) {
  return (
    <View style={styles.header}>
      <Image source={require('../assets/CDRRMO_LOGO.png')} style={styles.logo} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#c62828",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
});
