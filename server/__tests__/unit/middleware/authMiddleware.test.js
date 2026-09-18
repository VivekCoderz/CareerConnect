const jwt = require('jsonwebtoken');
const httpMocks = require('node-mocks-http');
const protect = require('../../../middleware/authMiddleware');
const { createTestUser, generateToken } = require('../../helpers/createTestUser');

describe('🔐 Auth Middleware — Unit Tests', () => {

  // ─── No Token ─────────────────────────────────────────────────────────────
  describe('❌ NO TOKEN Cases', () => {
    it('should return 401 when no token and no session', async () => {
      const req = httpMocks.createRequest({ cookies: {}, headers: {} });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res._getData());
      expect(body.code).toBe('NOT_AUTHENTICATED');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── Valid JWT ─────────────────────────────────────────────────────────────
  describe('✅ VALID JWT Cases', () => {
    it('should call next() with valid JWT in cookie', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id);

      const req = httpMocks.createRequest({ cookies: { token } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(user.email);
      expect(req.user.password).toBeUndefined(); // password never in req.user
    });

    it('should call next() with valid Bearer token in Authorization header', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id);

      const req = httpMocks.createRequest({
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user._id.toString()).toBe(user._id.toString());
    });

    it('should prefer session over JWT when session exists', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id);

      const req = httpMocks.createRequest({
        cookies: { token },
        session: { user: { userId: user._id.toString() } },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user._id.toString()).toBe(user._id.toString());
    });

    it('rejects a suspended user even if an existing session is present', async () => {
      const user = await createTestUser({ isActive: false });
      const destroy = jest.fn((callback) => callback());
      const req = httpMocks.createRequest({
        session: { user: { userId: user._id.toString(), authVersion: user.authVersion || 0 }, destroy },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res._getData()).code).toBe('ACCOUNT_SUSPENDED');
      expect(destroy).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── Invalid JWT ───────────────────────────────────────────────────────────
  describe('❌ INVALID TOKEN Cases', () => {
    it('should return 401 with INVALID_TOKEN for malformed token', async () => {
      const req = httpMocks.createRequest({ cookies: { token: 'bad.token.value' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res._getData());
      expect(body.code).toBe('INVALID_TOKEN');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with SESSION_EXPIRED for expired token', async () => {
      const user = await createTestUser();
      const expiredToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const req = httpMocks.createRequest({ cookies: { token: expiredToken } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res._getData());
      expect(body.code).toBe('SESSION_EXPIRED');
    });

    it('should return 401 for token signed with wrong secret', async () => {
      const user = await createTestUser();
      const badToken = jwt.sign({ id: user._id }, 'wrong-secret', { expiresIn: '1h' });

      const req = httpMocks.createRequest({ cookies: { token: badToken } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should return 403 with ACCOUNT_SUSPENDED for inactive user', async () => {
      const user = await createTestUser({ isActive: false });
      const token = generateToken(user._id);

      const req = httpMocks.createRequest({ cookies: { token } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res._getData());
      expect(body.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────
  describe('🔄 Edge Cases', () => {
    it('should return 401 with USER_NOT_FOUND for deleted user token', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id);
      const User = require('../../../models/User');
      await User.deleteOne({ _id: user._id });

      const req = httpMocks.createRequest({ cookies: { token } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res._getData());
      expect(body.code).toBe('USER_NOT_FOUND');
    });

    it('should handle completely empty token string', async () => {
      const req = httpMocks.createRequest({ cookies: { token: '' } });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
    });
  });
});
