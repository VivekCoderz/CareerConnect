/**
 * Mock for Firebase Admin SDK
 * Replaces real Firebase calls in test environment
 */
const firebaseAdminMock = {
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'mock-firebase-uid',
      email: 'mock@gmail.com',
      name: 'Mock User',
      picture: 'https://example.com/avatar.jpg',
    }),
    getUserByEmail: jest.fn().mockResolvedValue({
      uid: 'mock-firebase-uid',
      email: 'mock@gmail.com',
    }),
    createUser: jest.fn().mockResolvedValue({
      uid: 'mock-firebase-uid-new',
    }),
    updateUser: jest.fn().mockResolvedValue({}),
    deleteUser: jest.fn().mockResolvedValue({}),
  }),
};

module.exports = firebaseAdminMock;
