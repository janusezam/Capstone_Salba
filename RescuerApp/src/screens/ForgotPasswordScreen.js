import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devResetCode, setDevResetCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setDevResetCode(data.devResetCode || '');
      setStep('verify');
      Alert.alert('Success', 'If this email exists, a reset code has been sent.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please complete all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      Alert.alert('Success', 'Password reset successful. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
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
          <Text style={styles.subtitle}>Reset Password</Text>
          <Text style={styles.description}>
            Enter your rescuer account email to verify and reset your credentials.
          </Text>
        </View>

        {/* Form Card Section */}
        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>
            {step === 'request' ? 'Request Reset Code' : 'Set New Password'}
          </Text>
          
          <Text style={styles.formInstruction}>
            {step === 'request'
              ? 'Provide your registered email address to receive a secure 6-digit verification code.'
              : 'Enter the verification code sent to your email and choose a strong new password.'}
          </Text>

          <View style={[styles.inputContainer, step !== 'request' && styles.inputDisabled]}>
            <Ionicons name="mail-outline" size={20} color="#991B1B" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, step !== 'request' && { color: '#9CA3AF' }]}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={step === 'request'}
            />
          </View>

          {step === 'verify' && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#991B1B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit reset code"
                  placeholderTextColor="#9CA3AF"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#991B1B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#991B1B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              {devResetCode ? (
                <View style={styles.devCodeContainer}>
                  <Text style={styles.devCodeLabel}>Development Helper Code:</Text>
                  <Text style={styles.devCodeVal}>{devResetCode}</Text>
                </View>
              ) : null}
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={step === 'request' ? handleSendCode : handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  {step === 'request' ? 'Send Reset Code' : 'Update Password'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.backContainer}>
            <TouchableOpacity 
              onPress={() => step === 'verify' ? setStep('request') : navigation.navigate('Login')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color="#991B1B" />
              <Text style={styles.backLinkText}>
                {step === 'verify' ? 'Use another email' : 'Back to Log In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Malaybalay City CDRRMO SALBA App
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
    paddingHorizontal: 20,
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
    marginBottom: 8,
  },
  formInstruction: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
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
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
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
  actionButton: {
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
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backLinkText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
  },
  devCodeContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  devCodeLabel: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  devCodeVal: {
    fontSize: 18,
    color: '#B45309',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 2,
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
