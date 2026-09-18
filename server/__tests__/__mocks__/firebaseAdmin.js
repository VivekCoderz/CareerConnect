/**
 * Mock for Firebase Admin SDK
 * Replaces real Firebase calls in test environment
 */
const verifyIdToken = jest.fn().mockResolvedValue({
  uid: 'mock-firebase-uid',
  email: 'mock@gmail.com',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
  name: 'Mock User',
  picture: 'https://example.com/avatar.jpg',
});
const getUser = jest.fn().mockResolvedValue({ uid: 'mock-firebase-uid' });

const firebaseAdminMock = {
  verifyIdToken,
  getUser,
  auth: () => ({
    verifyIdToken,
    getUser,
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

const getFirebaseAdmin = () => firebaseAdminMock;
getFirebaseAdmin.verifyIdToken = verifyIdToken;
getFirebaseAdmin.getUser = getUser;

module.exports = getFirebaseAdmin;
