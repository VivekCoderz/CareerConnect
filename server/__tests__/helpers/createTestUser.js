const User = require('../../models/User');
const jwt = require('jsonwebtoken');

/**
 * Creates a test user in the in-memory MongoDB
 */
const createTestUser = async (overrides = {}) => {
  const ts = Date.now();
  const user = await User.create({
    fullName: overrides.fullName || 'Test Student',
    firstName: 'Test',
    lastName: 'Student',
    email: overrides.email || `test${ts}@gmail.com`,
    password: overrides.password || 'Password@123',
    phone: overrides.phone || `9${String(ts).slice(-9)}`,
    countryCode: '+91',
    role: overrides.role || 'user',
    userType: overrides.userType || 'student',
    isEmailVerified: true,
    isProfileComplete: true,
    profileCompletion: 80,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    city: 'Bangalore',
    college: 'Test University',
    course: 'B.Tech',
    ...overrides,
  });
  return user;
};

/**
 * Generates a valid JWT for a user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET || 'test-secret-key-careerconnect-123',
    { expiresIn: '7d' }
  );
};

/**
 * Creates a test employer user
 */
const createTestEmployer = (overrides = {}) =>
  createTestUser({
    fullName: 'Test Employer',
    role: 'employer',
    userType: 'employer',
    ...overrides,
  });

/**
 * Creates a test fresher user
 */
const createTestFresher = (overrides = {}) =>
  createTestUser({ userType: 'fresher', ...overrides });

/**
 * Creates a test professional user
 */
const createTestProfessional = (overrides = {}) =>
  createTestUser({ userType: 'professional', ...overrides });

/**
 * Creates a user and returns both user + token together
 */
const createUserWithToken = async (overrides = {}) => {
  const user = await createTestUser(overrides);
  const token = generateToken(user._id);
  return { user, token };
};

const createEmployerWithToken = async (overrides = {}) => {
  const user = await createTestEmployer(overrides);
  const token = generateToken(user._id);
  return { user, token };
};

module.exports = {
  createTestUser,
  createTestEmployer,
  createTestFresher,
  createTestProfessional,
  createUserWithToken,
  createEmployerWithToken,
  generateToken,
};
