import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const RECAPTCHA_SITE_KEY = '6LfzgIgtAAAAADM2dIVYJBPFLSmZ4ajYmM5fGNcP';

const RecaptchaV3 = forwardRef(({ onReceiveToken }, ref) => {
  const webViewRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('recaptcha-v3-script')) {
        const script = document.createElement('script');
        script.id = 'recaptcha-v3-script';
        script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
        script.async = true;
        document.head.appendChild(script);
      }
      if (!document.getElementById('recaptcha-hide-style')) {
        const style = document.createElement('style');
        style.id = 'recaptcha-hide-style';
        style.innerHTML = '.grecaptcha-badge { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
        document.head.appendChild(style);
      }
    }
  }, []);

  useImperativeHandle(ref, () => ({
    execute: () => {
      let resolved = false;
      const deliverToken = (token) => {
        if (!resolved) {
          resolved = true;
          if (onReceiveToken) onReceiveToken(token);
        }
      };

      if (Platform.OS === 'web') {
        // Fallback timer: guarantees onReceiveToken fires within 2 seconds on Safari / iOS PWA
        const timer = setTimeout(() => {
          console.warn('[RecaptchaV3] Web timeout reached; continuing with fallback token');
          deliverToken('web-recaptcha-bypass-token');
        }, 2000);

        try {
          if (
            typeof window !== 'undefined' &&
            window.grecaptcha &&
            typeof window.grecaptcha.ready === 'function'
          ) {
            window.grecaptcha.ready(function () {
              try {
                if (typeof window.grecaptcha.execute === 'function') {
                  window.grecaptcha
                    .execute(RECAPTCHA_SITE_KEY, { action: 'submit' })
                    .then(function (token) {
                      clearTimeout(timer);
                      deliverToken(token || 'web-recaptcha-bypass-token');
                    })
                    .catch(function (err) {
                      clearTimeout(timer);
                      console.warn('[RecaptchaV3] Error executing grecaptcha on web:', err);
                      deliverToken('web-recaptcha-bypass-token');
                    });
                } else {
                  clearTimeout(timer);
                  deliverToken('web-recaptcha-bypass-token');
                }
              } catch (innerErr) {
                clearTimeout(timer);
                console.warn('[RecaptchaV3] Exception in grecaptcha.ready callback:', innerErr);
                deliverToken('web-recaptcha-bypass-token');
              }
            });
          } else {
            clearTimeout(timer);
            deliverToken('web-recaptcha-bypass-token');
          }
        } catch (e) {
          clearTimeout(timer);
          console.warn('[RecaptchaV3] Exception invoking grecaptcha:', e);
          deliverToken('web-recaptcha-bypass-token');
        }
        return;
      }

      // Native fallback timer
      const nativeTimer = setTimeout(() => {
        deliverToken('native-recaptcha-timeout-token');
      }, 3500);

      if (webViewRef.current) {
        try {
          webViewRef.current.injectJavaScript(`
            if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
              window.grecaptcha.ready(function() {
                window.grecaptcha.execute('${RECAPTCHA_SITE_KEY}', {action: 'submit'}).then(function(token) {
                  window.ReactNativeWebView.postMessage(token);
                }).catch(function() {
                  window.ReactNativeWebView.postMessage('native-recaptcha-error');
                });
              });
            } else {
              window.ReactNativeWebView.postMessage('native-recaptcha-not-ready');
            }
            true;
          `);
        } catch (err) {
          clearTimeout(nativeTimer);
          deliverToken('native-recaptcha-inject-failed');
        }
      } else {
        clearTimeout(nativeTimer);
        deliverToken('native-recaptcha-no-webview');
      }
    }
  }));

  if (Platform.OS === 'web') {
    return null;
  }

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <script src="https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}"></script>
        <style>
          body { background-color: transparent; }
          .grecaptcha-badge { visibility: hidden; }
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
    if (token && onReceiveToken) {
      onReceiveToken(token);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateHTML(), baseUrl: 'http://localhost' }}
        onMessage={handleMessage}
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
