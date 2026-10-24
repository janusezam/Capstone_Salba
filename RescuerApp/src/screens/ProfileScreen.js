import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL, getAuthHeaders } from '../config/api';

export default function ProfileScreen() {
  const { user, token, logout, updateProfile } = useAuth();
  const { connected } = useSocket();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const extract10Digits = (phoneVal) => {
    if (!phoneVal) return '';
    let digits = String(phoneVal).replace(/\D/g, '');
    if (digits.startsWith('63')) digits = digits.slice(2);
    while (digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, 10);
  };

  // Edit fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(extract10Digits(user?.phone));
  const [phoneError, setPhoneError] = useState('');

  // Saved profile fields (upper card only changes when profile is saved)
  const [savedName, setSavedName] = useState(user?.name || '');
  const [savedEmail, setSavedEmail] = useState(user?.email || '');
  const [savedPhone, setSavedPhone] = useState(user?.phone || '');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Password fields and verification states
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingCurrent, setVerifyingCurrent] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  useEffect(() => {
    fetchTeamInfo();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSavedName(user.name || '');
      setEmail(user.email || '');
      setSavedEmail(user.email || '');
      setPhone(extract10Digits(user.phone));
      setSavedPhone(user.phone || '');
    }
  }, [user]);

  const isPasswordSecure = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);
    return hasLetter && hasNumber && hasSymbol;
  };

  const fetchTeamInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/rescue/my-team`, {
        headers: getAuthHeaders(token),
      });
      if (response.ok) {
        const data = await response.json();
        setTeam(data);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCurrentPassword = async () => {
    setCurrentPasswordError('');
    setPasswordSuccessMsg('');
    if (!currentPassword) {
      setCurrentPasswordError('Please enter your current password');
      return;
    }

    setVerifyingCurrent(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-current-password`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ currentPassword }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentPasswordVerified(true);
        setCurrentPasswordError('');
      } else {
        setCurrentPasswordVerified(false);
        setCurrentPasswordError(data.message || 'Current password is incorrect');
      }
    } catch (error) {
      console.error('Error verifying current password:', error);
      setCurrentPasswordError('Unable to verify password. Please check your connection.');
    } finally {
      setVerifyingCurrent(false);
    }
  };

  const handleNewPasswordChange = (val) => {
    setNewPassword(val);
    setPasswordSuccessMsg('');
    if (!val) {
      setNewPasswordError('');
    } else if (currentPassword && val === currentPassword) {
      setNewPasswordError('New password cannot be the same as your current password');
    } else if (!isPasswordSecure(val)) {
      setNewPasswordError('Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)');
    } else {
      setNewPasswordError('');
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
    setPasswordSuccessMsg('');
    if (!val) {
      setConfirmPasswordError('');
    } else if (val !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handlePhoneChange = (val) => {
    if (phoneError) setPhoneError('');

    let digits = val.replace(/\D/g, '');

    // Strip pasted 63 or +63
    if (digits.startsWith('63')) {
      digits = digits.slice(2);
    }

    // Automatically strip leading zeros (cannot type 0)
    while (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Only allow starting with 9
    if (digits.length > 0 && !digits.startsWith('9')) {
      setPhoneError('Mobile number must start with 9');
      digits = '';
    }

    // Cap at exactly 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }

    setPhone(digits);
  };

  const handleSaveProfile = async () => {
    setProfileSuccessMsg('');
    setPhoneError('');
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (phone && (phone.length !== 10 || !/^9\d{9}$/.test(phone))) {
      setPhoneError('Phone number must be exactly 10 digits starting with 9 (e.g. 9123456789)');
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number starting with 9 (e.g. 9123456789).');
      return;
    }

    if (newPassword) {
      if (currentPassword && newPassword === currentPassword) {
        setNewPasswordError('New password cannot be the same as your current password');
        return;
      }
      if (!isPasswordSecure(newPassword)) {
        setNewPasswordError('Password must be at least 8 characters long and include a mix of letters, numbers, and symbols (e.g., !, @, #)');
        return;
      }
      if (newPassword !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        return;
      }
      if (!currentPassword || !currentPasswordVerified) {
        setCurrentPasswordError('Please verify your current password first');
        return;
      }
    }

    setSaving(true);

    const fullPhone = phone ? '0' + phone : '';
    const updates = { name: name.trim(), email: email.trim(), phone: fullPhone };
    if (newPassword) {
      updates.currentPassword = currentPassword;
      updates.newPassword = newPassword;
    }

    const result = await updateProfile(updates);
    setSaving(false);

    if (result.success) {
      setSavedName(name.trim());
      setSavedEmail(email.trim());
      setSavedPhone(fullPhone);
      setProfileSuccessMsg('Profile updated successfully');
      setEditing(false);
      setCurrentPassword('');
      setCurrentPasswordVerified(false);
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordError('');
      setConfirmPasswordError('');
      setPhoneError('');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const cancelEdit = () => {
    setEditing(false);
    setName(savedName);
    setEmail(savedEmail);
    setPhone(extract10Digits(savedPhone || user?.phone));
    setPhoneError('');
    setCurrentPassword('');
    setCurrentPasswordVerified(false);
    setCurrentPasswordError('');
    setNewPassword('');
    setNewPasswordError('');
    setConfirmPassword('');
    setConfirmPasswordError('');
    setPasswordSuccessMsg('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header (upper card only changes when profile is saved) */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {savedName?.charAt(0)?.toUpperCase() || 'R'}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
        </View>
        <Text style={styles.userName}>{savedName}</Text>
        <Text style={styles.userEmail}>{savedEmail}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#991B1B" />
          <Text style={styles.roleBadgeText}>RESCUER</Text>
        </View>
      </View>

      {/* Team Assignment Card */}
      {team && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={20} color="#DC2626" />
            <Text style={styles.cardTitle}>Assigned Team</Text>
          </View>
          <View style={styles.teamInfo}>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel}>Team Name</Text>
              <Text style={styles.teamValue}>{team.name || 'Not Assigned'}</Text>
            </View>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel}>Division</Text>
              <Text style={styles.teamValue}>{team.division || 'General'}</Text>
            </View>
            <View style={styles.teamRow}>
              <Text style={styles.teamLabel}>Vehicle / Unit</Text>
              <Text style={styles.teamValue}>{team.vehicle || 'Standard Unit'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Profile Information / Edit Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle" size={20} color="#DC2626" />
          <Text style={styles.cardTitle}>Profile Information</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={18} color="#DC2626" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {profileSuccessMsg ? (
          <View style={styles.inlineSuccessBox}>
            <Ionicons name="checkmark-circle" size={16} color="#166534" style={{ marginRight: 6 }} />
            <Text style={styles.inlineSuccessText}>{profileSuccessMsg}</Text>
          </View>
        ) : null}

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputContainer, phoneError ? styles.inputError : null]}>
                <Ionicons name="call-outline" size={18} color={phoneError ? "#DC2626" : "#6B7280"} style={styles.inputIcon} />
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+63</Text>
                  <View style={styles.countryCodeDivider} />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="9XX XXX XXXX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {phoneError ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* Changed Title: Removed (Optional) */}
            <Text style={styles.sectionSubtitle}>Change Password</Text>

            {/* Step 1: Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
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
                    setCurrentPasswordError('');
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
              ) : currentPassword ? (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={handleVerifyCurrentPassword}
                  disabled={verifyingCurrent}
                  activeOpacity={0.8}
                >
                  {verifyingCurrent ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Current Password</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Step 2: Show New Password and Confirm Password only when verified */}
            {currentPasswordVerified && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
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
                      placeholder="Confirm new password"
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
              </>
            )}

            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{savedName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{savedEmail}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{savedPhone || user?.phone || 'Not provided'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* App Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Information</Text>
        <View style={styles.appInfo}>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>App Name</Text>
            <Text style={styles.appInfoValue}>SALBA Rescuer</Text>
          </View>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Version</Text>
            <Text style={styles.appInfoValue}>1.0.0</Text>
          </View>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Connection</Text>
            <View style={styles.connectionBadge}>
              <View style={[styles.connectionDot, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.appInfoValue}>{connected ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SALBA - Emergency Reporting & Rescue Coordination
        </Text>
        <Text style={styles.footerText}>
          CDRRMO Malaybalay City
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#991B1B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
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
    marginBottom: 14,
  },
  inlineSuccessText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  teamInfo: {
    gap: 10,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  teamLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  teamValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  profileInfo: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
  editForm: {
    gap: 14,
  },
  inputGroup: {
    marginBottom: 2,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  countryCodeDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#D1D5DB',
    marginLeft: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    letterSpacing: 0.5,
    paddingVertical: 0,
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inputVerified: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
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
    marginTop: 5,
  },
  verifiedText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 16,
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 15,
  },
  verifyButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  appInfo: {
    gap: 10,
    marginTop: 6,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  appInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
