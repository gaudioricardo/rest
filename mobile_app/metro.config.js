const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders || []), require('path').resolve(__dirname, '../shared')];
module.exports = config;
