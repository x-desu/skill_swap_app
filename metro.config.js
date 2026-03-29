const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const localFunctionsDir = path.resolve(__dirname, 'functions');

// Ignore the local Firebase Functions workspace without blocking packages such as
// @react-native-firebase/functions inside node_modules.
config.resolver.blockList = [
  new RegExp(`^${localFunctionsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*$`),
];

module.exports = config;
