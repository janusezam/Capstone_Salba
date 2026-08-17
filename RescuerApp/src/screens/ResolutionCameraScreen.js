import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { API_URL } from '../config/api';

const { width, height } = Dimensions.get('window');

/**
 * ResolutionCameraScreen — captures a proof-of-resolution photo for the rescuer.
 * Opened automatically when a rescuer confirms a mission as "Resolved".
 *
 * Navigation params:
 *   token (string)              — auth token for the upload API
 *   onPhotoUploaded(url: string) — callback after a successful upload
 *   onSkip()                    — callback when the user skips the photo
 */
export default function ResolutionCameraScreen({ navigation, route }) {
  const { token, onPhotoUploaded, onSkip } = route.params || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [facing, setFacing] = useState('back');
  const [uploading, setUploading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // ─── Permission handling ──────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.permText}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-off" size={60} color="#10B981" />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permText}>
          Please allow camera access to capture a resolution photo.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipTouchable} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
  function handleBack() {
    navigation.goBack();
  }

  function handleSkip() {
    if (onSkip) onSkip();
    navigation.goBack();
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      setCapturedPhoto(photo);
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleUsePhoto = async () => {
    if (!capturedPhoto) return;
    setUploading(true);
    try {
      // ── Step 1: Compress & resize locally for low-bandwidth networks ──
      const compressed = await manipulateAsync(
        capturedPhoto.uri,
        [{ resize: { width: 1200 } }], // max width 1200px, height auto
        {
          compress: 0.7,  // 70% JPEG quality
          format: SaveFormat.JPEG,
          base64: false,
        }
      );

      console.log(`📷 Resolution photo compressed → 1200px JPEG 70%`);

      // ── Step 2: Build multipart form data ────────────────────────────
      const formData = new FormData();
      formData.append('photo', {
        uri: Platform.OS === 'android' ? compressed.uri : compressed.uri.replace('file://', ''),
        type: 'image/jpeg',
        name: `resolution_${Date.now()}.jpg`,
      });

      // ── Step 3: Upload to backend ─────────────────────────────────────
      const response = await fetch(`${API_URL}/upload/resolution-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type here — let fetch set it with the multipart boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `Upload failed (${response.status})`);
      }

      const { url } = await response.json();
      console.log('✅ Resolution photo uploaded:', url);

      // ── Step 4: Return URL to caller ─────────────────────────────────
      if (onPhotoUploaded) onPhotoUploaded(url);
      navigation.goBack();
    } catch (err) {
      console.error('Resolution photo upload error:', err);
      Alert.alert(
        'Upload Failed',
        `Could not upload resolution photo: ${err.message}\n\nDo you want to mark as resolved without a photo?`,
        [
          { text: 'Retry', onPress: () => setUploading(false) },
          {
            text: 'Skip Photo',
            style: 'destructive',
            onPress: () => {
              setUploading(false);
              handleSkip();
            },
          },
        ]
      );
    } finally {
      setUploading(false);
    }
  };

  const toggleFlash = () => setFlashMode(prev => (prev === 'off' ? 'on' : 'off'));
  const toggleFacing = () => setFacing(prev => (prev === 'back' ? 'front' : 'back'));

  // ─── Photo preview screen ─────────────────────────────────────────────────
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedPhoto.uri }} style={styles.preview} resizeMode="cover" />

        {/* Header overlay */}
        <View style={styles.previewHeader}>
          <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          <Text style={styles.previewTitle}>Proof of Resolution</Text>
          <Text style={styles.previewSubtitle}>
            This photo confirms the incident has been addressed.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.previewBtn, styles.retakeBtn]}
            onPress={handleRetake}
            disabled={uploading}
          >
            <Ionicons name="refresh" size={22} color="#fff" />
            <Text style={styles.previewBtnText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewBtn, styles.usePhotoBtn, uploading && styles.btnDisabled]}
            onPress={handleUsePhoto}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.previewBtnText}>Uploading…</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-done-circle" size={22} color="#fff" />
                <Text style={styles.previewBtnText}>Use Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Live camera screen ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashMode}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarBtn} onPress={handleBack}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.cameraTitle}>✅ Resolution Photo</Text>
            <Text style={styles.cameraSubtitle}>Capture proof the incident is resolved</Text>
          </View>

          <TouchableOpacity style={styles.topBarBtn} onPress={toggleFlash}>
            <Ionicons
              name={flashMode === 'on' ? 'flash' : 'flash-off'}
              size={26}
              color={flashMode === 'on' ? '#FFD700' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* Viewfinder corners */}
        <View style={styles.viewfinderFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.sideBtn} onPress={toggleFacing}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutterOuter} onPress={handleCapture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} onPress={handleSkip}>
            <Text style={styles.skipLabel}>Skip</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 30,
  },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  permText: { color: '#aaa', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  permButton: {
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 25,
  },
  permButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipTouchable: { marginTop: 12, padding: 10 },
  skipText: { color: '#888', fontSize: 14 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topBarBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topBarCenter: { flex: 1, alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cameraSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2, textAlign: 'center' },

  viewfinderFrame: { flex: 1, margin: 40 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#10B981', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sideBtn: { width: 60, alignItems: 'center' },
  skipLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
  },

  // Preview
  preview: { flex: 1, width: '100%' },
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  previewSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    gap: 14,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  retakeBtn: { backgroundColor: '#374151' },
  usePhotoBtn: { backgroundColor: '#10B981' },
  btnDisabled: { opacity: 0.6 },
  previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
