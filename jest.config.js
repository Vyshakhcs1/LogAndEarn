module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.ttf$':
      '<rootDir>/node_modules/@react-native/jest-preset/jest/assetFileTransformer.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@react-native-vector-icons|react-native-safe-area-context|react-native-screens)/)',
  ],
};
