const request = require('supertest');
const app = require('../../app');
const {
  createUserWithToken,
  createEmployerWithToken,
} = require('../helpers/createTestUser');
const { createTestJob } = require('../helpers/createTestJob');
const Application = require('../../models/Application');

describe('🔒 Security & RBAC — Integration Tests', () => {

  // ─── Role-Based Access Control ─────────────────────────────────────────
  describe('Role Protection', () => {
    it('❌ unauthenticated user cannot access /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('❌ unauthenticated user cannot POST to /api/applications', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({ opportunityType: 'Job', jobId: '507f1f77bcf86cd799439011' });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('❌ unauthenticated user cannot POST a new internship', async () => {
      const res = await request(app)
        .post('/api/internships')
        .send({ title: 'Test Internship' });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('❌ student cannot create a job posting', async () => {
      const { token } = await createUserWithToken({ email: `s${Date.now()}@test.com` });

      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Hack Job', description: 'Test' });

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ─── Data Isolation ────────────────────────────────────────────────────
  describe('Data Isolation', () => {
    it('✅ student A cannot see student B application data via /api/applications/my', async () => {
      const { user: student1 } = await createUserWithToken({ email: `s1${Date.now()}@test.com` });
      const { user: student2, token: token2 } = await createUserWithToken({ email: `s2${Date.now()}@test.com` });
      const { user: employer } = await createEmployerWithToken({ email: `emp${Date.now()}@test.com` });
      const job = await createTestJob(employer._id);

      // Create application for student1 only
      await Application.create({
        candidateId: student1._id,
        jobId: job._id,
        employerId: employer._id,
        opportunityType: 'Job',
        opportunityTitle: job.title,
        companyName: job.companyName,
        status: 'Applied',
      });

      // Student2 requests MY applications — should see 0 (not student1's)
      const res = await request(app)
        .get('/api/applications/my')
        .set('Cookie', `token=${token2}`);

      if (res.statusCode === 200) {
        const apps = res.body.applications || res.body.data || [];
        apps.forEach(app => {
          expect(app.candidateId.toString()).toBe(student2._id.toString());
        });
      }
    });
  });

  // ─── Input Sanitization / XSS ─────────────────────────────────────────
  describe('Input Sanitization', () => {
    it('does not expose account-existence lookup endpoints', async () => {
      const [email, phone] = await Promise.all([
        request(app).post('/api/auth/check-email').send({ email: 'someone@example.com' }),
        request(app).post('/api/auth/check-phone').send({ phone: '9876543210' }),
      ]);
      expect(email.statusCode).toBe(404);
      expect(phone.statusCode).toBe(404);
    });

    it('❌ API should not leak stack traces in production errors', async () => {
      const res = await request(app).get('/api/jobs/INVALID_ID_FORMAT');

      if (res.body.error || res.body.message) {
        // Should not expose internal stack trace
        const bodyStr = JSON.stringify(res.body);
        expect(bodyStr).not.toContain('at Object.');
        expect(bodyStr).not.toContain('node_modules');
      }
    });
  });

  // ─── Rate Limit Awareness ─────────────────────────────────────────────
  describe('API Response Integrity', () => {
    it('✅ all API responses should have consistent success field', async () => {
      const res = await request(app).get('/api/jobs');

      expect(res.body).toHaveProperty('success');
      expect(typeof res.body.success).toBe('boolean');
    });

    it('✅ error responses should include a message', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(typeof res.body.message).toBe('string');
    });
  });
});
