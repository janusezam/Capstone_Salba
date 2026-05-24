import { useState, useEffect } from "react";
import { loginUser, registerUser } from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored user data on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("userToken");
        const storedUserData = await AsyncStorage.getItem("userData");
        
        if (storedToken && storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUser(userData);
          console.log("✓ [useAuth] Session restored from AsyncStorage");
        }
      } catch (error) {
        console.error("❌ [useAuth] Error restoring session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (phone, password) => {
    const res = await loginUser({ phone, password });
    setUser(res.user);
    // Token is already saved by LoginScreen, but ensure it's in sync
    await AsyncStorage.setItem("userToken", res.token);
    await AsyncStorage.setItem("userData", JSON.stringify(res.user));
    return res;
  };

  const register = async (name, phone, password) => {
    const res = await registerUser({ name, phone, password });
    setUser(res.user);
    // Token is already saved by RegisterScreen, but ensure it's in sync
    if (res.token) {
      await AsyncStorage.setItem("userToken", res.token);
      await AsyncStorage.setItem("userData", JSON.stringify(res.user));
    }
    return res;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      await AsyncStorage.removeItem("userPhone");
      setUser(null);
      console.log("✓ [useAuth] Logged out and cleared AsyncStorage");
    } catch (error) {
      console.error("❌ [useAuth] Error during logout:", error);
    }
  };

  return { user, login, register, logout, isLoading };
};
