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
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import RecaptchaV3 from "../components/RecaptchaV3";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const recaptchaRef = React.useRef(null);

  const handleRegister = () => {
    if (!name || !email || !phone || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert("Terms Required", "You must agree to the Terms and Conditions before registering.");
      return;
    }

    if (!hasViewedTerms) {
      Alert.alert("Terms Required", "Please read the Terms and Conditions before registering.");
      return;
    }

    setLoading(true);
    if (recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else {
      setLoading(false);
      Alert.alert("Error", "Recaptcha component not loaded.");
    }
  };

  const onReceiveToken = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, recaptchaToken: token }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        Alert.alert("Success", "Account created! Please log in.");
        navigation.navigate("Login");
      } else {
        Alert.alert("Error", data.message || "Registration failed");
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
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#aaa"
              onChangeText={setName}
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
              onChangeText={setEmail}
              value={email}
            />
          </View>

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

          <TouchableOpacity
            style={[styles.registerButton, (!acceptedTerms || !hasViewedTerms) && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading || !acceptedTerms || !hasViewedTerms}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>

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
              I agree to the
              <Text style={styles.termsLink} onPress={() => setTermsVisible(true)}> Terms and Conditions</Text>
            </Text>
          </TouchableOpacity>

          {!hasViewedTerms ? (
            <Text style={styles.termsHint}>Please view the Terms and Conditions before checking the agreement.</Text>
          ) : null}

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
          <Text style={{color: "#bbb", fontSize: 11, marginTop: 20}}>Protected by reCAPTCHA v3</Text>
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
                  setTermsVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>I Have Read and Understand</Text>
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
