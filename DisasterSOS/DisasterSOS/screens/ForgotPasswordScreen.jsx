import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const isPasswordSecure = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasLetter && hasNumber && hasSymbol;
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    setEmailError("");
    setEmailSuccess("");
  };

  const handlePasswordChange = (val) => {
    setNewPassword(val);
    if (!val) {
      setPasswordError("");
    } else if (!isPasswordSecure(val)) {
      setPasswordError("Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)");
    } else {
      setPasswordError("");
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
    if (!val) {
      setConfirmPasswordError("");
    } else if (val !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const requestOtp = async () => {
    setEmailError("");
    setEmailSuccess("");

    if (!email.trim()) {
      setEmailError("Please enter your registered email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.message || "No registered account found with this email address.");
        return;
      }

      // Successful: clear errors, display inline success message, and advance to OTP entry
      setEmailSuccess("Verification code sent to your email. Valid for 10 minutes.");
      setOtp("");
      setStep(2);
    } catch (err) {
      console.error(err);
      setEmailError("Unable to connect to server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setOtpError("");
    setOtpSuccess("");

    if (!otp.trim()) {
      setOtpError("Please enter the 6-digit verification code");
      return;
    }

    if (otp.trim().length < 6) {
      setOtpError("Verification code must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.message || "Invalid or expired verification code");
        return;
      }

      setResetToken(data.resetToken);
      setOtpSuccess("Code verified! Set your new password below.");
      setStep(3);
    } catch (err) {
      console.error(err);
      setOtpError("Unable to connect to server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setPasswordError("");
    setConfirmPasswordError("");
    setResetSuccess("");

    if (!isPasswordSecure(newPassword)) {
      setPasswordError("Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          newPassword,
          resetToken,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || "Unable to reset password");
        return;
      }

      setResetSuccess("Password reset complete! Redirecting to login...");
      setTimeout(() => {
        navigation.navigate("Login");
      }, 2000);
    } catch (err) {
      console.error(err);
      setPasswordError("Unable to connect to server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitle =
    step === 1 ? "Enter Registered Email" : step === 2 ? "Enter Verification Code" : "Set New Secure Password";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Logo / Header */}
          <View style={styles.logoContainer}>
            <Image source={require("../assets/CDRRMO_LOGO.png")} style={styles.logoImage} />
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>{stepTitle}</Text>
          </View>

          {/* Stepper Progress Indicator */}
          <View style={styles.stepperContainer}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
            </View>
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
            </View>
            <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
            </View>
          </View>

          {/* STEP 1: Email Input */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.inputLabel}>Registered Email Address</Text>
            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputError : null,
                emailSuccess ? styles.inputVerified : null,
                step > 1 && styles.inputDisabled,
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={emailError ? "#DC2626" : "#6B7280"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. yourname@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={handleEmailChange}
                value={email}
                editable={!loading && step === 1}
              />
            </View>

            {emailError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            {emailSuccess ? (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedText}>{emailSuccess}</Text>
              </View>
            ) : null}
          </View>

          {step === 1 && (
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.buttonDisabled]}
              onPress={requestOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.actionButtonText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* STEP 2: OTP Verification Code */}
          {step >= 2 && (
            <View style={styles.fieldWrapper}>
              <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
              <View
                style={[
                  styles.inputContainer,
                  otpError ? styles.inputError : null,
                  otpSuccess ? styles.inputVerified : null,
                  step > 2 && styles.inputDisabled,
                ]}
              >
                <Ionicons name="key-outline" size={20} color={otpError ? "#DC2626" : "#6B7280"} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { letterSpacing: 4, fontWeight: "700" }]}
                  placeholder="000000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(val) => {
                    setOtp(val);
                    setOtpError("");
                    setOtpSuccess("");
                  }}
                  value={otp}
                  editable={!loading && step === 2}
                />
              </View>

              {otpError ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>{otpError}</Text>
                </View>
              ) : null}

              {otpSuccess ? (
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedText}>{otpSuccess}</Text>
                </View>
              ) : (
                <Text style={styles.helperText}>Check your Gmail inbox or spam folder for the 6-digit code.</Text>
              )}

              {step === 2 && (
                <View style={{ marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionButton, loading && styles.buttonDisabled]}
                    onPress={verifyOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={styles.buttonInner}>
                        <Text style={styles.actionButtonText}>Verify Code</Text>
                        <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginLeft: 6 }} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={requestOtp}
                    disabled={loading}
                  >
                    <Text style={styles.resendText}>Didn't receive code? Resend Code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* STEP 3: New Password and Confirm Password */}
          {step === 3 && (
            <>
              {resetSuccess ? (
                <View style={styles.inlineSuccessBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#166534" style={{ marginRight: 8 }} />
                  <Text style={styles.inlineSuccessText}>{resetSuccess}</Text>
                </View>
              ) : null}

              <View style={styles.fieldWrapper}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    passwordError ? styles.inputError : null,
                    newPassword && !passwordError ? styles.inputVerified : null,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={passwordError ? "#DC2626" : "#6B7280"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showNewPassword}
                    onChangeText={handlePasswordChange}
                    value={newPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ paddingHorizontal: 4 }}>
                    <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {passwordError ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.errorText}>{passwordError}</Text>
                  </View>
                ) : newPassword ? (
                  <View style={styles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                    <Text style={styles.verifiedText}>Strong password meets requirements</Text>
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)
                  </Text>
                )}
              </View>

              <View style={styles.fieldWrapper}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    confirmPasswordError ? styles.inputError : null,
                    confirmPassword && !confirmPasswordError ? styles.inputVerified : null,
                  ]}
                >
                  <Ionicons name="shield-checkmark-outline" size={20} color={confirmPasswordError ? "#DC2626" : "#6B7280"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    value={confirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 4 }}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
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
                  styles.actionButton,
                  (!isPasswordSecure(newPassword) || newPassword !== confirmPassword || loading) &&
                    styles.buttonDisabled,
                ]}
                onPress={resetPassword}
                disabled={!isPasswordSecure(newPassword) || newPassword !== confirmPassword || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("Login")}>
            <Ionicons name="arrow-back" size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 36,
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    width: "70%",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#DC2626",
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  stepDotTextActive: {
    color: "#fff",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
  },
  stepLineActive: {
    backgroundColor: "#DC2626",
  },
  fieldWrapper: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 9,
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
    flex: 1,
    lineHeight: 16,
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 5,
    paddingHorizontal: 4,
    lineHeight: 15,
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
    width: "100%",
  },
  inlineSuccessText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  actionButton: {
    width: "100%",
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 6,
  },
  resendText: {
    color: "#1565C0",
    fontSize: 13,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  linkText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});
