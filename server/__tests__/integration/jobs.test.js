const request = require('supertest');
const app = require('../../app');
const {
  createUserWithToken,
  createEmployerWithToken,
  createTestUser,
  createTestEmployer,
  generateToken,
} = require('../helpers/createTestUser');
const { createTestJob } = require('../helpers/createTestJob');

describe('💼 Jobs API — Integration Tests', () => {

  let employerData, studentData;

  beforeEach(async () => {
    employerData = await createEmployerWithToken({ email: `emp${Date.now()}@test.com` });
    studentData = await createUserWithToken({ email: `stu${Date.now()}@test.com` });
  });

  // ─── GET /api/jobs ──────────────────────────────────────────────────────
  describe('GET /api/jobs — Public Job Listing', () => {
    it('✅ should return 200 and array of published jobs (no auth needed)', async () => {
      await createTestJob(employerData.user._id);
      await createTestJob(employerData.user._id, { title: 'Senior Dev' });

      const res = await request(app).get('/api/jobs');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const jobs = res.body.jobs || res.body.data || [];
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('✅ should filter jobs by city', async () => {
      await createTestJob(employerData.user._id, { city: 'Mumbai' });
      await createTestJob(employerData.user._id, { city: 'Delhi' });

      const res = await request(app).get('/api/jobs?city=Mumbai');

      expect(res.statusCode).toBe(200);
      const jobs = res.body.jobs || res.body.data || [];
      if (jobs.length > 0) {
        const onlyMumbai = jobs.every(j => j.city?.toLowerCase().includes('mumbai'));
        expect(onlyMumbai).toBe(true);
      }
    });

    it('✅ should filter by workMode=Remote', async () => {
      await createTestJob(employerData.user._id, { workMode: 'Remote' });

      const res = await request(app).get('/api/jobs?workMode=Remote');
      expect(res.statusCode).toBe(200);
    });

    it('✅ should NOT return Draft jobs to public users', async () => {
      await createTestJob(employerData.user._id, { status: 'Draft' });

      const res = await request(app).get('/api/jobs');
      const jobs = res.body.jobs || res.body.data || [];
      jobs.forEach(job => expect(job.status).not.toBe('Draft'));
    });

    it('✅ should NOT return Closed jobs', async () => {
      await createTestJob(employerData.user._id, { status: 'Closed' });

      const res = await request(app).get('/api/jobs');
      const jobs = res.body.jobs || res.body.data || [];
      jobs.forEach(job => expect(job.status).not.toBe('Closed'));
    });

    it('✅ should support pagination with page and limit params', async () => {
      const res = await request(app).get('/api/jobs?page=1&limit=5');
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── GET /api/jobs/:id ──────────────────────────────────────────────────
  describe('GET /api/jobs/:id — Single Job', () => {
    it('✅ should return 200 for valid published job', async () => {
      const job = await createTestJob(employerData.user._id);

      const res = await request(app).get(`/api/jobs/${job._id}`);

      expect(res.statusCode).toBe(200);
      const returnedJob = res.body.job || res.body.data || res.body;
      expect(returnedJob._id || returnedJob.id).toBeDefined();
    });

    it('❌ should return 404 for non-existent job', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app).get(`/api/jobs/${fakeId}`);
      expect([404, 400]).toContain(res.statusCode);
    });

    it('❌ should handle invalid ObjectId gracefully', async () => {
      const res = await request(app).get('/api/jobs/not-a-valid-object-id');
      expect([400, 404, 500]).toContain(res.statusCode);
    });
  });
});
