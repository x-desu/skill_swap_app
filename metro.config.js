const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const localFunctionsDir = path.resolve(__dirname, 'functions');

// Ignore the local Firebase Functions workspace without blocking packages such as
// @react-native-firebase/functions inside node_modules.
config.resolver.blockList = [
  new RegExp(`^${localFunctionsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*$`),
];

// Always use a plain POSIX-style path for NativeWind — works on both Windows and Linux
const globalCssPath = path.join(__dirname, './global.css');

module.exports = withNativeWind(config, { input: globalCssPath });
