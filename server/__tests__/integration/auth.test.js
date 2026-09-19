const request = require('supertest');
const app = require('../../app');
const { createTestUser, createUserWithToken } = require('../helpers/createTestUser');

describe('🔐 Auth API — Integration Tests', () => {

  // ─── GET /api/auth/me ───────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('✅ should return current user for valid JWT cookie', async () => {
      const { user, token } = await createUserWithToken();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(user.email);
    });

    it('✅ password should NEVER be in the response', async () => {
      const { token } = await createUserWithToken();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);

      expect(res.body.user?.password).toBeUndefined();
    });

    it('❌ should return 401 without any token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('NOT_AUTHENTICATED');
    });

    it('❌ should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=fake.invalid.token');

      expect(res.statusCode).toBe(401);
    });
  });

  // These account-enumeration endpoints were deliberately removed. Keep both
  // existing and unknown identities indistinguishable by requiring 404.
  describe('removed account-enumeration endpoints', () => {
    it('keeps /check-email unavailable for every account state', async () => {
      await createTestUser({ email: 'existing123@gmail.com' });

      const [existing, unknown] = await Promise.all([
        request(app).post('/api/auth/check-email').send({ email: 'existing123@gmail.com' }),
        request(app).post('/api/auth/check-email').send({ email: 'unknown123@gmail.com' }),
      ]);

      expect(existing.statusCode).toBe(404);
      expect(unknown.statusCode).toBe(404);
    });

    it('keeps /check-phone unavailable for every account state', async () => {
      await createTestUser({ phone: '+919876543210' });

      const [existing, unknown] = await Promise.all([
        request(app).post('/api/auth/check-phone').send({ phone: '9876543210', countryCode: '+91' }),
        request(app).post('/api/auth/check-phone').send({ phone: '9123456780', countryCode: '+91' }),
      ]);

      expect(existing.statusCode).toBe(404);
      expect(unknown.statusCode).toBe(404);
    });
  });

  // ─── POST /api/auth/logout ─────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('✅ should return success on logout', async () => {
      const { token } = await createUserWithToken();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      expect([200, 204]).toContain(res.statusCode);
    });

    it('✅ logout should clear token cookie', async () => {
      const { token } = await createUserWithToken();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      // If there's a set-cookie header, token should be cleared
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        if (tokenCookie) {
          const isCleared = tokenCookie.includes('Max-Age=0') ||
                            tokenCookie.includes('Expires=Thu, 01 Jan 1970') ||
                            tokenCookie.match(/token=;/);
          expect(isCleared).toBeTruthy();
        }
      }
    });
  });
});
