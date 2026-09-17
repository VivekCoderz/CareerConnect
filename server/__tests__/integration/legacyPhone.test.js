const User = require('../../models/User');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

describe('Legacy users with a missing country code', () => {
  it('does not turn a Google login save into a duplicate phone', async () => {
    await User.init();

    await User.create({
      fullName: 'Existing Owner',
      email: 'owner@example.com',
      userType: 'student',
      phone: '9876543210',
      countryCode: '+91',
    });

    const { insertedId } = await User.collection.insertOne({
      fullName: 'Legacy User',
      email: 'legacy@example.com',
      userType: 'student',
      phone: '9876543210',
      authProviders: [],
      password: 'existing-hash',
    });

    const legacyUser = await User.findById(insertedId);
    expect(legacyUser.countryCode).toBeUndefined();

    legacyUser.firebaseUid = 'legacy-google-uid';
    legacyUser.authProviders.push('google');
    legacyUser.lastLogin = new Date();
    await expect(legacyUser.save()).resolves.toBeDefined();

    const token = jwt.sign({ id: insertedId.toString() }, process.env.JWT_SECRET);
    const cancel = await request(app)
      .post('/api/auth/cancel-google-signup')
      .set('Cookie', `token=${token}`);
    expect(cancel.statusCode).toBe(200);
    expect(await User.collection.findOne({ _id: insertedId })).not.toBeNull();

    legacyUser.password = 'Strong@123';
    legacyUser.hasPassword = true;
    legacyUser.authProviders.push('email');
    await expect(legacyUser.save()).resolves.toBeDefined();

    const stored = await User.collection.findOne({ _id: insertedId });
    expect(stored.countryCode).toBeUndefined();
    expect(stored.firebaseUid).toBe('legacy-google-uid');

    const newUser = new User({
      fullName: 'New User',
      email: 'new@example.com',
      userType: 'student',
    });
    expect(newUser.countryCode).toBe('+91');
  });

  it('still removes a cancelled, unfinished Google-only signup', async () => {
    const user = await User.create({
      fullName: 'New Google User',
      email: 'google-new@example.com',
      userType: 'student',
      firebaseUid: 'new-google-uid',
      authProviders: ['google'],
      hasPassword: false,
    });

    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);
    const cancel = await request(app)
      .post('/api/auth/cancel-google-signup')
      .set('Cookie', `token=${token}`);

    expect(cancel.statusCode).toBe(200);
    expect(await User.findById(user._id)).toBeNull();
  });
});
