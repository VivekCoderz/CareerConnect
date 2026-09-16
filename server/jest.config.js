module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 75, statements: 75 }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
  // Allow Jest to transform ESM packages (jose, firebase-admin deps)
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@firebase|firebase-admin|jwks-rsa)/)'
  ],
  // Mock Firebase Admin in tests to avoid ESM issues
  moduleNameMapper: {
    '^../config/firebaseAdmin$': '<rootDir>/__tests__/__mocks__/firebaseAdmin.js',
    '^../../config/firebaseAdmin$': '<rootDir>/__tests__/__mocks__/firebaseAdmin.js',
    '^../../../config/firebaseAdmin$': '<rootDir>/__tests__/__mocks__/firebaseAdmin.js',
  },
};
