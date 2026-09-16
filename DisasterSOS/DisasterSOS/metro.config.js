const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web specific module replacements
  if (platform === 'web' || !platform) {
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'components/web/react-native-maps-web.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'react-native-webview') {
      return {
        filePath: path.resolve(__dirname, 'components/web/react-native-webview-web.js'),
        type: 'sourceFile',
      };
    }
  }

  if (moduleName === 'fbjs/lib/invariant') {
    return {
      filePath: require.resolve('invariant'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'fbjs/lib/warning') {
    return {
      filePath: require.resolve('warning'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('fbjs/lib/')) {
    const subpath = moduleName.replace('fbjs/lib/', '');
    const candidate = path.resolve(__dirname, 'node_modules/fbjs/lib', `${subpath}.js`);
    return {
      filePath: candidate,
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
