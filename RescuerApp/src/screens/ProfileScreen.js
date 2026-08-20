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
  Switch,
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
  
  // Edit fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchTeamInfo();
  }, []);

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

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword && !currentPassword) {
      Alert.alert('Error', 'Current password is required to set a new password');
      return;
    }

    setSaving(true);

    const updates = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    if (newPassword) {
      updates.currentPassword = currentPassword;
      updates.newPassword = newPassword;
    }

    const result = await updateProfile(updates);
    setSaving(false);

    if (result.success) {
      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'R'}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#DC2626" />
          <Text style={styles.roleText}>RESCUER</Text>
        </View>
      </View>

      {/* Team Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Team Assignment</Text>
        {team ? (
          <View style={styles.teamInfo}>
            <View style={[styles.teamBadge, { backgroundColor: team.color }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <View style={styles.teamDetails}>
              <Text style={styles.teamName}>Team {team.name}</Text>
              <Text style={styles.teamStatus}>
                Status: {team.status?.charAt(0).toUpperCase() + team.status?.slice(1)}
              </Text>
              <Text style={styles.teamMembers}>
                {team.members?.length || 0} Members
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noTeam}>
            <Ionicons name="people-outline" size={40} color="#ccc" />
            <Text style={styles.noTeamText}>Not assigned to a team yet</Text>
            <Text style={styles.noTeamSubtext}>
              An admin will assign you to a team
            </Text>
          </View>
        )}
      </View>

      {/* Edit Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile Information</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Change Password (Optional)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
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
                <Text style={styles.infoValue}>{user?.name}</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
              </View>
            </View>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* App Info */}
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
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SALBA - Emergency Reporting & Rescue Coordination
        </Text>
        <Text style={styles.footerText}>
          Malaybalay City
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
    padding: 15,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    marginBottom: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  roleText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  editButton: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamBadge: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  teamStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  teamMembers: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noTeam: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noTeamText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  noTeamSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  profileInfo: {
    marginTop: -5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    marginTop: 2,
  },
  editForm: {
    marginTop: -5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  appInfo: {
    marginTop: -5,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  appInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
});
