import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Email
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Step 2: Code
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');

  // Step 3: Passwords
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const isPasswordSecure = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasLetter && hasNumber && hasSymbol;
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    setEmailError('');
    setEmailSuccess('');
  };

  const handlePasswordChange = (val) => {
    setNewPassword(val);
    if (!val) {
      setPasswordError('');
    } else if (!isPasswordSecure(val)) {
      setPasswordError('Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)');
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
    } else if (val !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleSendCode = async () => {
    setEmailError('');
    setEmailSuccess('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('Please enter your registered email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        setEmailError(data.message || 'No registered rescuer found with this email address.');
        return;
      }

      setEmailSuccess('Verification code sent to your email. The code will expire in 10 minutes.');
      setCode('');
      setStep(2);
    } catch (error) {
      console.error(error);
      setEmailError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setCodeError('');
    setCodeSuccess('');

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setCodeError('Please enter the 6-digit verification code');
      return;
    }

    if (trimmedCode.length < 6) {
      setCodeError('Verification code must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: trimmedCode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setCodeError(data.message || 'Invalid or expired verification code');
        return;
      }

      setCodeSuccess('Code verified! Set your new password below.');
      setStep(3);
    } catch (error) {
      console.error(error);
      setCodeError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError('');
    setConfirmPasswordError('');
    setResetSuccess('');

    if (!isPasswordSecure(newPassword)) {
      setPasswordError('Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
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
        setPasswordError(data.message || 'Failed to reset password');
        return;
      }

      setResetSuccess('Password reset complete! Redirecting to login...');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error) {
      console.error(error);
      setPasswordError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitle =
    step === 1 ? 'Enter Rescuer Email' : step === 2 ? 'Enter 6-Digit Code' : 'Set New Secure Password';

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
          <Text style={styles.appTitle}>SALBA RESCUER</Text>
          <Text style={styles.subtitle}>Reset Password</Text>
          <Text style={styles.description}>{stepTitle}</Text>
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

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* STEP 1: Email Input */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.inputLabel}>Registered Rescuer Email</Text>
            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputError : null,
                emailSuccess ? styles.inputVerified : null,
                step > 1 && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailError ? '#DC2626' : emailSuccess ? '#16A34A' : '#991B1B'}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, step > 1 && { color: '#6B7280' }]}
                placeholder="rescuer@gmail.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={handleEmailChange}
                autoCapitalize="none"
                keyboardType="email-address"
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
              style={[styles.actionButton, loading && styles.actionButtonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionButtonText}>Send Reset Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}

          {/* STEP 2: Code Verification */}
          {step >= 2 && (
            <View style={styles.fieldWrapper}>
              <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
              <View
                style={[
                  styles.inputContainer,
                  codeError ? styles.inputError : null,
                  codeSuccess ? styles.inputVerified : null,
                  step > 2 && styles.inputDisabled,
                ]}
              >
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={codeError ? '#DC2626' : codeSuccess ? '#16A34A' : '#991B1B'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { letterSpacing: 4, fontWeight: '700' }, step > 2 && { color: '#6B7280' }]}
                  placeholder="000000"
                  placeholderTextColor="#9CA3AF"
                  value={code}
                  onChangeText={(val) => {
                    setCode(val);
                    setCodeError('');
                    setCodeSuccess('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading && step === 2}
                />
              </View>

              {codeError ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>{codeError}</Text>
                </View>
              ) : null}

              {codeSuccess ? (
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#166534" style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedText}>{codeSuccess}</Text>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Check your rescuer inbox or spam folder for the 6-digit code.
                </Text>
              )}

              {step === 2 && (
                <View style={{ marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionButton, loading && styles.actionButtonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.actionButtonText}>Verify Code</Text>
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleSendCode}
                    disabled={loading}
                  >
                    <Text style={styles.resendText}>Didn't receive code? Resend Code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* STEP 3: Password Reset */}
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
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={passwordError ? '#DC2626' : newPassword && !passwordError ? '#16A34A' : '#991B1B'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    value={newPassword}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ paddingHorizontal: 4 }}>
                    <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
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
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={confirmPasswordError ? '#DC2626' : confirmPassword && !confirmPasswordError ? '#16A34A' : '#991B1B'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 4 }}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
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
                    styles.actionButtonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={!isPasswordSecure(newPassword) || newPassword !== confirmPassword || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>Update Password</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.backContainer}>
            <TouchableOpacity
              onPress={() => (step > 1 ? setStep(1) : navigation.navigate('Login'))}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color="#991B1B" />
              <Text style={styles.backLinkText}>
                {step > 1 ? 'Start Over with Another Email' : 'Back to Log In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Malaybalay City CDRRMO SALBA App</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 90,
    height: 90,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
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
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    width: '70%',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#991B1B',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepLineActive: {
    backgroundColor: '#991B1B',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  fieldWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inputVerified: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 5,
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  inlineSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  inlineSuccessText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  resendText: {
    color: '#1565C0',
    fontSize: 13,
    fontWeight: '600',
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
