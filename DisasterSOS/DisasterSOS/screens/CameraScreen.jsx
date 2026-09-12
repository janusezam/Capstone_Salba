import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { BASE_URL } from "../config/api";

const { width, height } = Dimensions.get("window");

/**
 * CameraScreen — captures an incident photo, shows preview with Retake/Use Photo,
 * compresses to JPEG 70% (max 1200px) for low-bandwidth uploads, then uploads
 * to the backend and returns the photo URL via navigation callback.
 *
 * Navigation params:
 *   onPhotoUploaded(photoUrl: string) — called after a successful upload
 *   onSkip() — called if the user chooses to skip the photo
 */
export default function CameraScreen({ navigation, route }) {
  const { onPhotoUploaded, onSkip, token } = route.params || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [facing, setFacing] = useState("back");
  const [uploading, setUploading] = useState(false);
  const [enableTorch, setEnableTorch] = useState(false);
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
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.permText}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={60} color="#DC2626" />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permText}>
          Please allow camera access to capture an incident photo.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={() => handleSkip()}>
          <Text style={styles.skipText}>Skip Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
    navigation.goBack();
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      setCapturedPhoto(photo);
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
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
          compress: 0.7,  // 70% JPEG quality — good balance of quality vs size
          format: SaveFormat.JPEG,
          base64: false,
        }
      );

      console.log(
        `📷 Photo compressed: original ~${capturedPhoto.width}x${capturedPhoto.height} → 1200px wide, JPEG 70%`
      );

      // ── Step 2: Build multipart form data ────────────────────────────
      const formData = new FormData();
      formData.append("photo", {
        uri: compressed.uri,
        type: "image/jpeg",
        name: `incident_${Date.now()}.jpg`,
      });

      // ── Step 3: Upload to backend via XMLHttpRequest ─────────────────
      const uploadUrl = `${BASE_URL}/api/upload/incident-photo`;
      
      const uploadResult = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Accept", "application/json");

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch (e) {
              reject(new Error("Invalid server JSON response"));
            }
          } else {
            let errMsg = `Upload failed (${xhr.status})`;
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.message) errMsg = res.message;
            } catch (e) {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during photo upload"));
        xhr.ontimeout = () => reject(new Error("Photo upload timed out"));

        xhr.send(formData);
      });

      const { url } = uploadResult;
      console.log("✅ Incident photo uploaded:", url);

      // ── Step 4: Return URL to caller ─────────────────────────────────
      if (onPhotoUploaded) onPhotoUploaded(url);
      navigation.goBack();
    } catch (err) {
      console.error("Photo upload error:", err);
      Alert.alert(
        "Upload Failed",
        `Could not upload photo: ${err.message}\n\nDo you want to submit the report without a photo?`,
        [
          { text: "Retry", onPress: () => setUploading(false) },
          {
            text: "Skip Photo",
            style: "destructive",
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

  const toggleTorch = () => {
    if (facing === "front") {
      Alert.alert("Flashlight Unavailable", "The flashlight is only available with the rear camera.");
      return;
    }
    setEnableTorch((prev) => !prev);
  };

  const toggleFacing = () => {
    setFacing((prev) => {
      const next = prev === "back" ? "front" : "back";
      if (next === "front") setEnableTorch(false);
      return next;
    });
  };

  // ─── Photo preview screen ─────────────────────────────────────────────────
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedPhoto.uri }} style={styles.preview} resizeMode="cover" />

        {/* Dark overlay header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>📷 Incident Photo</Text>
          <Text style={styles.previewSubtitle}>
            Review your photo before submitting the emergency report
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
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
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
        enableTorch={enableTorch}
        flash={enableTorch ? "on" : "off"}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={handleBack}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.cameraTitle}>📷 Capture Incident</Text>
          <Text style={styles.cameraSubtitle}>Take a photo of the emergency situation</Text>
        </View>

        <TouchableOpacity
          style={[styles.topBarBtn, enableTorch && styles.topBarBtnActive]}
          onPress={toggleTorch}
          activeOpacity={0.7}
          title={enableTorch ? "Turn off flashlight" : "Turn on flashlight"}
        >
          <Ionicons
            name={enableTorch ? "flashlight" : "flashlight-outline"}
            size={24}
            color={enableTorch ? "#FACC15" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* Viewfinder frame */}
      <View style={styles.viewfinderFrame} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Flip camera */}
        <TouchableOpacity style={styles.sideBtn} onPress={toggleFacing}>
          <Ionicons name="camera-reverse" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Shutter */}
        <TouchableOpacity style={styles.shutterOuter} onPress={handleCapture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleSkip}>
          <Text style={styles.skipLabel}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, width: "100%", height: "100%" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 30,
  },
  permTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 16, textAlign: "center" },
  permText: { color: "#aaa", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  permButton: {
    marginTop: 24,
    backgroundColor: "#DC2626",
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 25,
  },
  permButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipButton: { marginTop: 12, padding: 10 },
  skipText: { color: "#888", fontSize: 14 },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  topBarBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 22 },
  topBarBtnActive: {
    backgroundColor: "rgba(250, 204, 21, 0.25)",
    borderWidth: 1.5,
    borderColor: "#FACC15",
  },
  topBarCenter: { flex: 1, alignItems: "center" },
  cameraTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cameraSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2, textAlign: "center" },

  // Viewfinder
  viewfinderFrame: {
    position: "absolute",
    top: height * 0.22,
    left: 40,
    right: 40,
    height: height * 0.45,
    zIndex: 5,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#DC2626",
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 28,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sideBtn: { width: 60, alignItems: "center" },
  skipLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DC2626",
  },

  // Preview
  preview: { flex: 1, width: "100%" },
  previewHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
  },
  previewTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  previewSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4, textAlign: "center" },
  previewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
    gap: 14,
  },
  previewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  retakeBtn: { backgroundColor: "#374151" },
  usePhotoBtn: { backgroundColor: "#DC2626" },
  btnDisabled: { opacity: 0.6 },
  previewBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
