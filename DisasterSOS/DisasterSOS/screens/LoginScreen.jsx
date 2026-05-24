import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Missing Fields", "Please enter phone number and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        // Store phone separately for quick access
        await AsyncStorage.setItem("userPhone", data.user.phone || "");
        console.log('✓ [LoginScreen] User stored in AsyncStorage:', {
          id: data.user._id,
          name: data.user.name,
          phone: data.user.phone,
          email: data.user.email,
        });
        Alert.alert("Success", "Logged in successfully!");
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess();
        } else {
          navigation.navigate("Home");
        }
      } else {
        Alert.alert("Login Failed", data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Logo / Icon */}
          <View style={styles.logoContainer}>
            <Image source={require('../assets/CDRRMO_LOGO.png')} style={styles.logoImage} />
            <Text style={styles.appName}>DisasterSOS</Text>
            <Text style={styles.tagline}>Emergency Alert System</Text>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              autoCapitalize="none"
              onChangeText={setPhone}
              value={phone}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Register</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setTermsVisible(true)}>
            <Text style={styles.legalText}>View Terms and Conditions</Text>
          </TouchableOpacity>

          {/* reCAPTCHA notice */}
          <Text style={styles.recaptchaText}>
            Protected by reCAPTCHA v3
          </Text>
        </View>

        <Modal
          visible={termsVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setTermsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Terms and Conditions</Text>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalText}>
                  This app processes personal data in line with Republic Act No. 10173 (Data Privacy Act of 2012) for emergency reporting, response coordination, and account security.
                </Text>
                <Text style={styles.modalText}>
                  Submitting false disaster reports may lead to account penalties and legal liability under applicable Philippine laws, including Republic Act No. 10175 (Cybercrime Prevention Act of 2012) and relevant penal provisions.
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setTermsVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
  },
  tagline: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: "#f9f9f9",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#c62828",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
    shadowColor: "#c62828",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  linkText: {
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
  forgotText: {
    color: "#1565c0",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "700",
  },
  linkBold: {
    color: "#c62828",
    fontWeight: "700",
  },
  legalText: {
    marginTop: 10,
    color: "#1565c0",
    fontSize: 13,
    fontWeight: "700",
  },
  recaptchaText: {
    color: "#bbb",
    fontSize: 11,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
    marginBottom: 10,
  },
  modalBody: {
    marginBottom: 12,
  },
  modalText: {
    color: "#444",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: "#c62828",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
