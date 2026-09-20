import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function IOSInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if device is iOS (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Check if running in standalone mode (already added to home screen)
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Check if dismissed previously in session
    const isDismissed = sessionStorage.getItem('salba_ios_install_dismissed') === 'true';

    if (isIOS && !isStandalone && !isDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('salba_ios_install_dismissed', 'true');
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={24} color="#dc2626" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Install SALBA DisasterSOS</Text>
          <Text style={styles.descText}>
            For full-screen SOS & offline access: Tap <Text style={styles.boldText}>Share</Text> (
            <Ionicons name="share-outline" size={14} color="#333" />
            ) then <Text style={styles.boldText}>"Add to Home Screen"</Text>.
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#fff1f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecdd3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 9999,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  descText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
