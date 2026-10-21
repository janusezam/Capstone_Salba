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
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import RecaptchaV3 from "../components/RecaptchaV3";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const recaptchaRef = React.useRef(null);

  const isPasswordSecure = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasLetter && hasNumber && hasSymbol;
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (errorMessage) setErrorMessage("");
    if (!val) {
      setPasswordError("");
    } else if (!isPasswordSecure(val)) {
      setPasswordError("Password does not meet security requirements");
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
    if (errorMessage) setErrorMessage("");
    if (!val) {
      setConfirmPasswordError("");
    } else if (val !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const normalizePhoneInput = (val) => {
    if (!val) return "";
    let clean = val.replace(/[^0-9+]/g, "").trim();
    // Normalize 9XXXXXXXXX (10 digits starting with 9) to 09XXXXXXXXX
    if (/^9\d{9}$/.test(clean)) {
      clean = "0" + clean;
    }
    return clean;
  };

  const showAlert = (title, message, isError = true) => {
    if (isError) {
      setErrorMessage(message);
      setSuccessMessage("");
    } else {
      setSuccessMessage(message);
      setErrorMessage("");
    }

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.alert) {
        try {
          window.alert(`${title}: ${message}`);
        } catch (e) {
          // ignore alert suppression
        }
      }
    } else {
      Alert.alert(title, message);
    }
  };

  const handleRegister = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setPasswordError("");
    setConfirmPasswordError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = normalizePhoneInput(phone);

    if (!trimmedName || !trimmedEmail || !cleanPhone || !password || !confirmPassword) {
      showAlert("Missing Fields", "Please fill in all fields.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      showAlert("Invalid Email", "Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      showAlert("Invalid Phone", "Please enter a valid Philippine mobile number (e.g. 09123456789 or +639123456789).");
      return;
    }

    if (!isPasswordSecure(password)) {
      setPasswordError("Password does not meet security requirements");
      showAlert(
        "Security Requirements",
        "Password does not meet security requirements. It must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)."
      );
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      showAlert("Password Mismatch", "Passwords do not match. Please re-enter to confirm.");
      return;
    }

    if (!acceptedTerms || !hasViewedTerms) {
      setTermsVisible(true);
      return;
    }

    setLoading(true);
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.execute();
      } catch (err) {
        console.warn("Recaptcha execute failed, calling onReceiveToken with fallback:", err);
        onReceiveToken("web-recaptcha-bypass-token");
      }
    } else {
      onReceiveToken("web-recaptcha-bypass-token");
    }
  };

  const onReceiveToken = async (token) => {
    try {
      setErrorMessage("");
      const cleanPhone = normalizePhoneInput(phone);
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      const res = await fetch(`${BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: cleanPhone,
          password,
          recaptchaToken: token || "web-recaptcha-bypass-token",
          role: "user",
          termsAccepted: true,
          termsVersion: "2026-04-09",
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Unable to parse server response");
      }

      if (res.ok && (data.user || data.token)) {
        // Store session so victim user is immediately logged in
        if (data.token) {
          await AsyncStorage.setItem("userToken", data.token);
        }
        if (data.user) {
          await AsyncStorage.setItem("userData", JSON.stringify(data.user));
          await AsyncStorage.setItem("userPhone", data.user.phone || cleanPhone);
        }

        showAlert("Account Created", "Your account has been registered successfully! Taking you to the emergency dashboard...", false);

        setTimeout(() => {
          if (navigation.reset) {
            navigation.reset({
              index: 0,
              routes: [{ name: "Home" }],
            });
          } else {
            navigation.navigate("Home");
          }
        }, 1200);
      } else {
        const msg = data.message || "Registration failed. Please check your information.";
        showAlert("Registration Failed", msg);
      }
    } catch (err) {
      console.error("Register error:", err);
      showAlert("Connection Error", "Unable to connect to server. Please verify your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to access CDRRMO emergency assistance</Text>
          </View>

          {/* Inline Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#b71c1c" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setErrorMessage("")} style={{ padding: 4 }}>
                <Ionicons name="close" size={18} color="#b71c1c" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Inline Success Banner */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#1b5e20" style={{ marginRight: 8 }} />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#aaa"
              onChangeText={(text) => {
                setName(text);
                if (errorMessage) setErrorMessage("");
              }}
              value={name}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage("");
              }}
              value={email}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g., 09123456789)"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              autoCapitalize="none"
              onChangeText={(text) => {
                setPhone(text);
                if (errorMessage) setErrorMessage("");
              }}
              value={phone}
            />
          </View>

          {/* Password Input */}
          <View style={[styles.inputContainer, !!passwordError && styles.inputContainerError]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={passwordError ? "#DC2626" : "#888"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, !!passwordError && styles.inputErrorText]}
              placeholder="Password"
              placeholderTextColor={passwordError ? "#F87171" : "#aaa"}
              secureTextEntry={!showPassword}
              onChangeText={handlePasswordChange}
              value={password}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={passwordError ? "#DC2626" : "#888"}
              />
            </TouchableOpacity>
          </View>

          {passwordError ? (
            <View style={styles.fieldErrorContainer}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={styles.fieldErrorIcon} />
              <View style={styles.fieldErrorTextWrapper}>
                <Text style={styles.fieldErrorTitle}>Password does not meet security requirements</Text>
                <Text style={styles.fieldErrorDescription}>
                  Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #).
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.fieldHelperText}>
              Must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #).
            </Text>
          )}

          {/* Confirm Password Input */}
          <View style={[styles.inputContainer, !!confirmPasswordError && styles.inputContainerError]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={confirmPasswordError ? "#DC2626" : "#888"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, !!confirmPasswordError && styles.inputErrorText]}
              placeholder="Confirm Password"
              placeholderTextColor={confirmPasswordError ? "#F87171" : "#aaa"}
              secureTextEntry={!showConfirmPassword}
              onChangeText={handleConfirmPasswordChange}
              value={confirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={confirmPasswordError ? "#DC2626" : "#888"}
              />
            </TouchableOpacity>
          </View>

          {confirmPasswordError ? (
            <View style={styles.fieldErrorContainer}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={styles.fieldErrorIcon} />
              <View style={styles.fieldErrorTextWrapper}>
                <Text style={styles.fieldErrorTitle}>{confirmPasswordError}</Text>
                <Text style={styles.fieldErrorDescription}>
                  Please ensure both passwords match.
                </Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => {
              if (!hasViewedTerms) {
                setTermsVisible(true);
                return;
              }
              setAcceptedTerms((prev) => !prev);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={acceptedTerms ? "checkbox" : "square-outline"}
              size={22}
              color={acceptedTerms ? "#2e7d32" : "#888"}
            />
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                style={styles.termsLink}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setTermsVisible(true);
                }}
              >
                Terms and Conditions
              </Text>
            </Text>
          </TouchableOpacity>

          {!acceptedTerms ? (
            <Text style={styles.termsHint}>Tap to view and agree to the Terms & Conditions.</Text>
          ) : null}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
          <Text style={{ color: "#bbb", fontSize: 11, marginTop: 20 }}>Protected by reCAPTCHA v3</Text>
          <RecaptchaV3 ref={recaptchaRef} onReceiveToken={onReceiveToken} />
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
                  By creating an account, you consent to the collection and processing of personal data under Republic Act No. 10173 (Data Privacy Act of 2012) strictly for emergency response operations, account security, and lawful system administration.
                </Text>
                <Text style={styles.modalText}>
                  You confirm that reports submitted in this platform are true and made in good faith. False reporting, fabricated incidents, and malicious misuse may result in account suspension and legal action under applicable Philippine laws, including Republic Act No. 10175 (Cybercrime Prevention Act of 2012) and relevant penal provisions.
                </Text>
                <Text style={styles.modalText}>
                  You are responsible for safeguarding your login credentials and for all activity under your account.
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setHasViewedTerms(true);
                  setAcceptedTerms(true);
                  setTermsVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>I Have Read, Understand & Agree</Text>
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
  headerContainer: {
    alignItems: "center",
    marginBottom: 35,
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
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    borderColor: "#ef9a9a",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: "100%",
  },
  errorBannerText: {
    flex: 1,
    color: "#b71c1c",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderColor: "#a5d6a7",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: "100%",
  },
  successBannerText: {
    flex: 1,
    color: "#1b5e20",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
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
  inputContainerError: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
    marginBottom: 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  inputErrorText: {
    color: "#991B1B",
  },
  fieldErrorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginTop: -2,
    marginBottom: 14,
    paddingHorizontal: 4,
    gap: 6,
  },
  fieldErrorIcon: {
    marginTop: 2,
  },
  fieldErrorTextWrapper: {
    flex: 1,
  },
  fieldErrorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    lineHeight: 18,
  },
  fieldErrorDescription: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 16,
    marginTop: 2,
  },
  fieldHelperText: {
    width: "100%",
    fontSize: 11,
    color: "#6B7280",
    marginTop: -8,
    marginBottom: 14,
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  termsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  termsText: {
    marginLeft: 10,
    color: "#666",
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    color: "#1565c0",
    fontWeight: "700",
  },
  registerButton: {
    width: "100%",
    backgroundColor: "#c62828",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#c62828",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  registerButtonDisabled: {
    backgroundColor: "#d7d7d7",
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  termsHint: {
    width: "100%",
    color: "#9c6f00",
    fontSize: 12,
    marginBottom: 4,
  },
  linkText: {
    color: "#888",
    fontSize: 14,
    marginTop: 20,
  },
  linkBold: {
    color: "#c62828",
    fontWeight: "700",
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
