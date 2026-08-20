import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import MapScreen from "../screens/MapScreen";
import AdminDashboard from "../screens/AdminDashboard";
import AlertHistoryScreen from "../screens/AlertHistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CameraScreen from "../screens/CameraScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState("Login");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          setInitialRoute("Home");
        }
      } catch (err) {
        console.log("Auth check error", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Dashboard" component={AdminDashboard} />
        <Stack.Screen name="History" component={AlertHistoryScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile Settings" }} />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
