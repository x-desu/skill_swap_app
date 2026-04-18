const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { pathToFileURL } = require('url');

const config = getDefaultConfig(__dirname);
const localFunctionsDir = path.resolve(__dirname, 'functions');

// Ignore the local Firebase Functions workspace without blocking packages such as
// @react-native-firebase/functions inside node_modules.
config.resolver.blockList = [
  new RegExp(`^${localFunctionsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*$`),
];

// On Windows, the input path must be formatted as a valid file:// URL for Node's ESM loader
const globalCssPath = pathToFileURL(path.join(__dirname, './global.css')).href;

module.exports = withNativeWind(config, { input: globalCssPath });
