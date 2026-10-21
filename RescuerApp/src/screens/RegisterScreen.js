import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const isPasswordSecure = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasLetter && hasNumber && hasSymbol;
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (!val) {
      setPasswordError('');
    } else if (!isPasswordSecure(val)) {
      setPasswordError('Password does not meet security requirements');
    } else {
      setPasswordError('');
    }

    if (confirmPassword) {
      if (val !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  const handleConfirmPasswordChange = (val) => {
    setConfirmPassword(val);
    if (!val) {
      setConfirmPasswordError('');
    } else if (val !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleRegister = async () => {
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim() || !email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!isPasswordSecure(password)) {
      setPasswordError('Password does not meet security requirements');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(name.trim(), email.trim().toLowerCase(), username.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/CDRRMO_LOGO.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>SALBA</Text>
          <Text style={styles.subtitle}>Rescuer Registration</Text>
          <Text style={styles.description}>
            Create a rescuer account to coordinate emergency responses.
          </Text>
        </View>

        {/* Form Card Section */}
        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>Create Account</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#991B1B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#991B1B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-circle-outline" size={20} color="#991B1B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={[styles.inputContainer, !!passwordError && styles.inputContainerError]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={passwordError ? "#DC2626" : "#991B1B"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, !!passwordError && styles.inputErrorText]}
              placeholder="Password"
              placeholderTextColor={passwordError ? "#F87171" : "#9CA3AF"}
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={passwordError ? "#DC2626" : "#9CA3AF"} 
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
              color={confirmPasswordError ? "#DC2626" : "#991B1B"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, !!confirmPasswordError && styles.inputErrorText]}
              placeholder="Confirm Password"
              placeholderTextColor={confirmPasswordError ? "#F87171" : "#9CA3AF"}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={confirmPasswordError ? "#DC2626" : "#9CA3AF"} 
              />
            </TouchableOpacity>
          </View>

          {confirmPasswordError ? (
            <View style={styles.fieldErrorContainer}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={styles.fieldErrorIcon} />
              <View style={styles.fieldErrorTextWrapper}>
                <Text style={styles.fieldErrorTitle}>{confirmPasswordError}</Text>
                <Text style={styles.fieldErrorDescription}>
                  Please make sure both passwords match.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#B45309" />
            <Text style={styles.infoText}>
              Your account will register as a Rescuer. CDRRMO admin will review and assign your team division before you can start missions.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Register Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SALBA Rescuer Portal
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  inputContainerError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#111827',
  },
  inputErrorText: {
    color: '#991B1B',
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontWeight: '700',
    color: '#DC2626',
    lineHeight: 18,
  },
  fieldErrorDescription: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
    marginTop: 2,
  },
  fieldHelperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: -10,
    marginBottom: 14,
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#991B1B',
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
