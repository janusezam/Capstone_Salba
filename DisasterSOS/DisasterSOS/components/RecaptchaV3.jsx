import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const RECAPTCHA_SITE_KEY = '6LfzgIgtAAAAADM2dIVYJBPFLSmZ4ajYmM5fGNcP';

const RecaptchaV3 = forwardRef(({ onReceiveToken }, ref) => {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    execute: () => {
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
