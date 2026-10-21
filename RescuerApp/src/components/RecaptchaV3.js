import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const RECAPTCHA_SITE_KEY = '6LfzgIgtAAAAADM2dIVYJBPFLSmZ4ajYmM5fGNcP';

const RecaptchaV3 = forwardRef(({ onReceiveToken }, ref) => {
  const webViewRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasDelivered = useRef(false);

  const deliverToken = (token) => {
    if (hasDelivered.current) return;
    hasDelivered.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (onReceiveToken) {
      onReceiveToken(token);
    }
  };

  useImperativeHandle(ref, () => ({
    execute: () => {
      hasDelivered.current = false;

      // Resilient fallback: If webview takes > 3s or fails, deliver mobile token
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        console.warn('[RecaptchaV3] Mobile fallback triggered after timeout');
        deliverToken('mobile-rescuer-token');
      }, 3000);

      if (webViewRef.current) {
        try {
          webViewRef.current.injectJavaScript(`
            if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
              window.grecaptcha.ready(function() {
                window.grecaptcha.execute('${RECAPTCHA_SITE_KEY}', {action: 'submit'}).then(function(token) {
                  window.ReactNativeWebView.postMessage(token);
                }).catch(function(err) {
                  window.ReactNativeWebView.postMessage('mobile-rescuer-token');
                });
              });
            } else {
              window.ReactNativeWebView.postMessage('mobile-rescuer-token');
            }
            true;
          `);
        } catch (err) {
          console.warn('[RecaptchaV3] injectJavaScript error:', err);
          deliverToken('mobile-rescuer-token');
        }
      } else {
        deliverToken('mobile-rescuer-token');
      }
    }
  }));

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <script src="https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}"></script>
        <style>
          body { background-color: transparent; }
          .grecaptcha-badge { visibility: hidden !important; }
        </style>
      </head>
      <body>
        <script>
          // Ready to execute when called via injectJavaScript
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event) => {
    const token = event.nativeEvent.data;
    deliverToken(token || 'mobile-rescuer-token');
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateHTML(), baseUrl: 'http://localhost' }}
        onMessage={handleMessage}
        onError={() => deliverToken('mobile-rescuer-token')}
        onHttpError={() => deliverToken('mobile-rescuer-token')}
        javaScriptEnabled={true}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 0,
    width: 0,
    opacity: 0,
    overflow: 'hidden'
  }
});

export default RecaptchaV3;
