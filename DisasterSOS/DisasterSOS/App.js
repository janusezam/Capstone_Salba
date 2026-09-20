import React from "react";
import { View, StyleSheet, LogBox } from "react-native";
import AppNavigator from "./navigation/AppNavigator";
import IOSInstallBanner from "./components/IOSInstallBanner";

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'InteractionManager has been deprecated',
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  return (
    <View style={styles.container}>
      <IOSInstallBanner />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
