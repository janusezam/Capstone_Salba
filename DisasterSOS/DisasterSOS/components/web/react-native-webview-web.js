import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

export const WebView = forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    injectJavaScript: () => {},
    reload: () => {},
    goBack: () => {},
    goForward: () => {},
  }));

  if (props.source && props.source.html) {
    return (
      <iframe
        title="webview"
        srcDoc={props.source.html}
        style={{ border: 'none', width: '100%', height: '100%', ...(props.style || {}) }}
      />
    );
  }

  if (props.source && props.source.uri) {
    return (
      <iframe
        title="webview"
        src={props.source.uri}
        style={{ border: 'none', width: '100%', height: '100%', ...(props.style || {}) }}
      />
    );
  }

  return <View style={props.style} />;
});

export default WebView;
