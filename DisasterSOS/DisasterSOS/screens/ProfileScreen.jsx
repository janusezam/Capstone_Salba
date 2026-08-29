import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config/api";

export default function ProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState("");
  const [authProvider, setAuthProvider] = useState("local");

  // Change password
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const getToken = async () => {
    return await AsyncStorage.getItem("userToken");
  };

  const fetchProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setBirthday(data.birthday ? data.birthday.split("T")[0] : "");
        setLocation(data.location || "");
        setAuthProvider(data.authProvider || "local");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          birthday: birthday || null,
          location,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update stored user data
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordSection(false);
      } else {
        Alert.alert("Error", data.message || "Failed to change password");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c62828" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Avatar Card */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={54} color="#fff" />
          </View>
          <Text style={styles.userName}>{name || 'Emergency User'}</Text>
          <Text style={styles.userEmail}>{email ? email : phone}</Text>
        </View>

        {/* Profile Info Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: "#9CA3AF" }]}
                value={phone}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address (Gmail)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. yourname@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Birthday (YYYY-MM-DD)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={birthday}
                onChangeText={setBirthday}
                placeholder="e.g. 2000-01-15"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Malaybalay City, Bukidnon"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Change Password Section */}
        {authProvider === "local" && (
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              activeOpacity={0.8}
            >
              <Ionicons name="key-outline" size={20} color="#C53030" />
              <Text style={styles.passwordToggleText}>
                {showPasswordSection ? "Hide Password Fields" : "Change Password"}
              </Text>
              <Ionicons
                name={showPasswordSection ? "chevron-up" : "chevron-down"}
                size={18}
                color="#C53030"
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordSection}>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-open-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  activeOpacity={0.8}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.changePasswordText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB" },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  avatarContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  userEmail: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  passwordToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  passwordToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#C53030",
    marginLeft: 10,
  },
  passwordSection: {
    marginTop: 10,
    marginBottom: 10,
    gap: 12,
  },
  changePasswordButton: {
    backgroundColor: "#1F2937",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  changePasswordText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#DC2626",
    backgroundColor: "transparent",
    marginTop: 16,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
