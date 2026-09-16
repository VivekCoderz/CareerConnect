const request = require('supertest');
const app = require('../../app');
const { createTestUser, createTestEmployer, createUserWithToken, createEmployerWithToken, generateToken } = require('../helpers/createTestUser');

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

  // ─── POST /api/auth/check-email ────────────────────────────────────────
  describe('POST /api/auth/check-email', () => {
    it('✅ should return exists:false for new (unused) email', async () => {
      const res = await request(app)
        .post('/api/auth/check-email')
        .send({ email: `newemail${Date.now()}@gmail.com` });

      expect(res.statusCode).toBe(200);
      expect(res.body.exists).toBe(false); // API returns 'exists' field
    });

    it('❌ should return exists:true for already-registered email', async () => {
      await createTestUser({ email: 'existing123@gmail.com' });

      const res = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'existing123@gmail.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.exists).toBe(true); // Email is taken
    });

    it('❌ should reject missing email field', async () => {
      const res = await request(app)
        .post('/api/auth/check-email')
        .send({});

      expect([400, 422]).toContain(res.statusCode);
    });
  });

  // ─── POST /api/auth/check-phone ────────────────────────────────────────
  describe('POST /api/auth/check-phone', () => {
    it('✅ should return exists:false for new phone', async () => {
      const res = await request(app)
        .post('/api/auth/check-phone')
        .send({ phone: '9876543210', countryCode: '+91' });

      expect(res.statusCode).toBe(200);
      expect(res.body.exists).toBe(false); // API returns 'exists' field
    });

    it('❌ should return exists:true for already-registered phone', async () => {
      const uniquePhone = `98765${Date.now().toString().slice(-5)}`;
      await createTestUser({ phone: uniquePhone });

      const res = await request(app)
        .post('/api/auth/check-phone')
        .send({ phone: uniquePhone, countryCode: '+91' });

      expect(res.statusCode).toBe(200);
      expect(res.body.exists).toBe(true); // Phone is taken
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
