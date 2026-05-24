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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={50} color="#fff" />
          </View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{phone}</Text>
        </View>

        {/* Profile Fields */}
        <Text style={styles.sectionTitle}>Profile Information</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#aaa"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={[styles.inputContainer, styles.inputDisabled]}>
            <Ionicons name="call-outline" size={18} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: "#aaa" }]}
              value={phone}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Birthday (YYYY-MM-DD)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="e.g. 2000-01-15"
              placeholderTextColor="#aaa"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Location</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={18} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Malaybalay City, Bukidnon"
              placeholderTextColor="#aaa"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>

        {/* Change Password Section */}
        {authProvider === "local" && (
          <>
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
            >
              <Ionicons name="key-outline" size={20} color="#c62828" />
              <Text style={styles.passwordToggleText}>
                {showPasswordSection ? "Hide" : "Change Password"}
              </Text>
              <Ionicons
                name={showPasswordSection ? "chevron-up" : "chevron-down"}
                size={18}
                color="#c62828"
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordSection}>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-open-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.changePasswordText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#c62828" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#c62828",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
  },
  inputDisabled: {
    backgroundColor: "#f0f0f0",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#c62828",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  passwordToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  passwordToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#c62828",
    marginLeft: 8,
  },
  passwordSection: {
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  changePasswordButton: {
    backgroundColor: "#333",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
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
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c62828",
    marginTop: 15,
  },
  logoutText: {
    color: "#c62828",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
