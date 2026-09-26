// ─── Mock Firebase Admin (ESM-incompatible) BEFORE any require ────────────────
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  cert: jest.fn((arg) => arg),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'mock-uid-123',
      email: 'mockuser@gmail.com',
      name: 'Mock User',
      picture: 'https://example.com/pic.jpg',
    }),
  })),
}));

jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn(() => ({
    getSigningKey: jest.fn((kid, cb) => cb(null, { getPublicKey: () => 'mock-key' })),
  })),
  expressJwtSecret: jest.fn(),
}));

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  process.env.JWT_SECRET = 'test-secret-key-careerconnect-123';
  process.env.NODE_ENV = 'test';
  process.env.CLIENT_URL = 'http://localhost:5173';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Safety guard: only clean in-memory database
  if (mongod && mongoose.connection && mongoose.connection.name && mongod.getUri().includes(mongoose.connection.host)) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});
