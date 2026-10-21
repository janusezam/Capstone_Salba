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
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Form edit fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState("");
  const [authProvider, setAuthProvider] = useState("local");

  // Saved profile display fields (upper card only changes when profile is saved)
  const [savedName, setSavedName] = useState("");
  const [savedEmail, setSavedEmail] = useState("");

  // Change password states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingCurrent, setVerifyingCurrent] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const getToken = async () => {
    return await AsyncStorage.getItem("userToken");
  };

  const isPasswordSecure = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasLetter && hasNumber && hasSymbol;
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
        setSavedName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setSavedEmail(data.email || "");
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
    setProfileSuccessMsg("");
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
          name: name.trim(),
          email: email.trim(),
          birthday: birthday || null,
          location: location.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        // Update upper profile header only after save succeeds
        setSavedName(name.trim());
        setSavedEmail(email.trim());
        setProfileSuccessMsg("Profile updated successfully!");
        setTimeout(() => setProfileSuccessMsg(""), 4000);
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

  const handleVerifyCurrentPassword = async () => {
    setCurrentPasswordError("");
    setPasswordSuccessMsg("");
    if (!currentPassword) {
      setCurrentPasswordError("Please enter your current password");
      return;
    }

    setVerifyingCurrent(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/users/verify-current-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentPasswordVerified(true);
        setCurrentPasswordError("");
      } else {
        setCurrentPasswordVerified(false);
        setCurrentPasswordError(data.message || "Current password is incorrect");
      }
    } catch (err) {
      console.error(err);
      setCurrentPasswordError("Unable to verify password. Please check your connection.");
    } finally {
      setVerifyingCurrent(false);
    }
  };

  const handleNewPasswordChange = (val) => {
    setNewPassword(val);
    setPasswordSuccessMsg("");
    if (!val) {
      setNewPasswordError("");
    } else if (!isPasswordSecure(val)) {
      setNewPasswordError("Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)");
    } else {
      setNewPasswordError("");
    }

    if (confirmPassword) {
      if (val !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  const handleConfirmPasswordChange = (val) => {
    setConfirmPassword(val);
    setPasswordSuccessMsg("");
    if (!val) {
      setConfirmPasswordError("");
    } else if (val !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleChangePassword = async () => {
    setPasswordSuccessMsg("");
    if (!isPasswordSecure(newPassword)) {
      setNewPasswordError("Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
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
        setPasswordSuccessMsg("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPasswordVerified(false);
        setNewPasswordError("");
        setConfirmPasswordError("");
        setTimeout(() => {
          setShowPasswordSection(false);
          setPasswordSuccessMsg("");
        }, 2500);
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
        {/* Avatar Card (Upper profile only changes on save) */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={54} color="#fff" />
          </View>
          <Text style={styles.userName}>{savedName || "Emergency User"}</Text>
          <Text style={styles.userEmail}>{savedEmail ? savedEmail : phone}</Text>
        </View>

        {/* Profile Info Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          {profileSuccessMsg ? (
            <View style={styles.inlineSuccessBox}>
              <Ionicons name="checkmark-circle" size={16} color="#166534" style={{ marginRight: 6 }} />
              <Text style={styles.inlineSuccessText}>{profileSuccessMsg}</Text>
            </View>
          ) : null}

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
              onPress={() => {
                setShowPasswordSection(!showPasswordSection);
                setCurrentPassword("");
                setCurrentPasswordVerified(false);
                setCurrentPasswordError("");
                setNewPassword("");
                setNewPasswordError("");
                setConfirmPassword("");
                setConfirmPasswordError("");
                setPasswordSuccessMsg("");
              }}
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
                {passwordSuccessMsg ? (
                  <View style={styles.inlineSuccessBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#166534" style={{ marginRight: 6 }} />
                    <Text style={styles.inlineSuccessText}>{passwordSuccessMsg}</Text>
                  </View>
                ) : null}

                {/* Step 1: Current Password */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Current Password</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      currentPasswordError ? styles.inputError : null,
                      currentPasswordVerified ? styles.inputVerified : null,
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={(val) => {
                        setCurrentPassword(val);
                        setCurrentPasswordError("");
                        if (currentPasswordVerified) setCurrentPasswordVerified(false);
                      }}
                      placeholder="Enter current password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showCurrentPassword}
                      editable={!currentPasswordVerified}
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ paddingHorizontal: 4 }}>
                      <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  {currentPasswordError ? (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.errorText}>{currentPasswordError}</Text>
                    </View>
                  ) : null}

                  {currentPasswordVerified ? (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                      <Text style={styles.verifiedText}>Current password verified</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.verifyButton}
                      onPress={handleVerifyCurrentPassword}
                      disabled={verifyingCurrent || !currentPassword}
                      activeOpacity={0.8}
                    >
                      {verifyingCurrent ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.verifyButtonText}>Verify Current Password</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Step 2: Show New & Confirm Password only when Current Password is verified */}
                {currentPasswordVerified && (
                  <>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>New Password</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          newPasswordError ? styles.inputError : null,
                          newPassword && !newPasswordError ? styles.inputVerified : null,
                        ]}
                      >
                        <Ionicons name="lock-open-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={newPassword}
                          onChangeText={handleNewPasswordChange}
                          placeholder="Enter new secure password"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showNewPassword}
                        />
                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ paddingHorizontal: 4 }}>
                          <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      {newPasswordError ? (
                        <View style={styles.errorRow}>
                          <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.errorText}>{newPasswordError}</Text>
                        </View>
                      ) : newPassword ? (
                        <View style={styles.verifiedRow}>
                          <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                          <Text style={styles.verifiedText}>Strong password</Text>
                        </View>
                      ) : (
                        <Text style={styles.helperText}>
                          Must be at least 8 characters with letters, numbers, and symbols (!, @, #, etc.)
                        </Text>
                      )}
                    </View>

                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Confirm New Password</Text>
                      <View
                        style={[
                          styles.inputContainer,
                          confirmPasswordError ? styles.inputError : null,
                          confirmPassword && !confirmPasswordError ? styles.inputVerified : null,
                        ]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={confirmPassword}
                          onChangeText={handleConfirmPasswordChange}
                          placeholder="Re-enter new password"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showConfirmPassword}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 4 }}>
                          <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      {confirmPasswordError ? (
                        <View style={styles.errorRow}>
                          <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.errorText}>{confirmPasswordError}</Text>
                        </View>
                      ) : confirmPassword ? (
                        <View style={styles.verifiedRow}>
                          <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                          <Text style={styles.verifiedText}>Passwords match</Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.changePasswordButton,
                        (!isPasswordSecure(newPassword) || newPassword !== confirmPassword || changingPassword) &&
                          styles.buttonDisabled,
                      ]}
                      onPress={handleChangePassword}
                      disabled={!isPasswordSecure(newPassword) || newPassword !== confirmPassword || changingPassword}
                      activeOpacity={0.8}
                    >
                      {changingPassword ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.changePasswordText}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
  },
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
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  inputError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  inputVerified: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
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
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600",
    lineHeight: 16,
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 5,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  inlineSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  inlineSuccessText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  saveButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 15,
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
  verifyButton: {
    backgroundColor: "#1F2937",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 14,
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
    marginTop: 4,
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
  },
  changePasswordButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
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
    marginTop: 10,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
