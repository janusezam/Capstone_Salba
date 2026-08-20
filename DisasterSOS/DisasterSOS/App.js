import React from "react";
import { LogBox } from "react-native";
import AppNavigator from "./navigation/AppNavigator";

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
]);

export default function App() {
  return <AppNavigator />;
}
