import React from "react";
import { LogBox } from "react-native";
import AppNavigator from "./navigation/AppNavigator";

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'InteractionManager has been deprecated',
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  return <AppNavigator />;
}
