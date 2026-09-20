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
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.grecaptcha) {
          window.grecaptcha.ready(function() {
            window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' }).then(function(token) {
              if (onReceiveToken) onReceiveToken(token);
            }).catch(function(err) {
              console.warn('Recaptcha error on web, continuing with bypass token', err);
              if (onReceiveToken) onReceiveToken('web-recaptcha-bypass-token');
            });
          });
        } else {
          if (onReceiveToken) onReceiveToken('web-recaptcha-bypass-token');
        }
        return;
      }

      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.grecaptcha) {
            window.grecaptcha.ready(function() {
              window.grecaptcha.execute('${RECAPTCHA_SITE_KEY}', {action: 'submit'}).then(function(token) {
                window.ReactNativeWebView.postMessage(token);
              });
            });
          }
          true;
        `);
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
