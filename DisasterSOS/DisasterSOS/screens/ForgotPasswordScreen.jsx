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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const requestOtp = async () => {
    if (!email) {
      Alert.alert("Missing Field", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Request Failed", data.message || "Unable to request OTP.");
        return;
      }

      if (data.devOtp) {
        setOtp(data.devOtp);
        Alert.alert("OTP (Dev Mode)", `Use this OTP: ${data.devOtp}`);
      } else {
        Alert.alert("OTP Sent", data.message || "OTP sent to your email address.");
      }

      setStep(2);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!email || !otp) {
      Alert.alert("Missing Field", "Please enter your email and OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Verification Failed", data.message || "Invalid OTP.");
        return;
      }

      setResetToken(data.resetToken);
      setStep(3);
      Alert.alert("Success", "OTP verified. Set your new password.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email || !newPassword || !resetToken) {
      Alert.alert("Missing Field", "Please complete all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, resetToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Reset Failed", data.message || "Unable to reset password.");
        return;
      }

      Alert.alert("Success", "Password reset complete. Please log in.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = step === 1 ? "Request OTP" : step === 2 ? "Verify OTP" : "Set New Password";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>{stepTitle}</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
              value={email}
              editable={!loading}
            />
          </View>

          {step >= 2 && (
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="OTP Code"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                onChangeText={setOtp}
                value={otp}
                editable={!loading && step === 2}
              />
            </View>
          )}

          {step === 3 && (
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPassword}
                onChangeText={setNewPassword}
                value={newPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={step === 1 ? requestOtp : step === 2 ? verifyOtp : resetPassword}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>{step === 1 ? "Send OTP" : step === 2 ? "Verify OTP" : "Reset Password"}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 6,
    marginBottom: 30,
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
  actionButton: {
    width: "100%",
    backgroundColor: "#c62828",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  linkText: {
    color: "#1565c0",
    fontSize: 14,
    marginTop: 18,
    fontWeight: "700",
  },
});
