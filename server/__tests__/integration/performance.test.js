const request = require('supertest');
const app = require('../../app');
const Job = require('../../models/Job');
const { withOpenDeadline } = require('../../utils/listingExpiry');
const { createEmployerWithToken } = require('../helpers/createTestUser');
const { createTestJob } = require('../helpers/createTestJob');

// Stage names of an explain() plan, outermost first
const planStages = (plan, out = []) => {
  if (!plan) return out;
  out.push({ stage: plan.stage, indexName: plan.indexName });
  (plan.inputStages || (plan.inputStage ? [plan.inputStage] : [])).forEach((p) => planStages(p, out));
  return out;
};

describe('I06 performance: compression, Cache-Control, indexes, search', () => {
  let employer;

  beforeEach(async () => {
    employer = await createEmployerWithToken({ email: `perf${Date.now()}@test.com` });
  });

  describe('compression', () => {
    it('gzips the public job list', async () => {
      for (let i = 0; i < 3; i++) await createTestJob(employer.user._id, { title: `Gzip Job ${i}` });

      const res = await request(app).get('/api/jobs').set('Accept-Encoding', 'gzip');

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
      expect(res.body.success).toBe(true);
    });
  });

  describe('Cache-Control', () => {
    it('marks public job and internship lists cacheable for 60 seconds', async () => {
      const jobs = await request(app).get('/api/jobs');
      const internships = await request(app).get('/api/internships?source=campus');

      expect(jobs.headers['cache-control']).toBe('public, max-age=60');
      expect(internships.headers['cache-control']).toBe('public, max-age=60');
    });

    it('does not publicly cache the employer\'s own job list', async () => {
      const res = await request(app)
        .get('/api/jobs?myJobs=true')
        .set('Authorization', `Bearer ${employer.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['cache-control'] || '').not.toContain('public');
    });

    it('does not cache error responses', async () => {
      const res = await request(app).get('/api/internships?myPosts=true');

      expect(res.statusCode).toBe(401);
      expect(res.headers['cache-control'] || '').not.toContain('public');
    });
  });

  describe('job search', () => {
    beforeEach(async () => {
      await Job.init();
      await createTestJob(employer.user._id, { title: 'Backend Developer', requiredSkills: ['Node.js'] });
      await createTestJob(employer.user._id, {
        title: 'Data Analyst',
        description: 'SQL and dashboards',
        requiredSkills: ['SQL'],
      });
    });

    it('finds whole words through the text index', async () => {
      const res = await request(app).get('/api/jobs?search=backend developer');

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs.map((j) => j.title)).toEqual(['Backend Developer']);
    });

    it('still matches partial words through the regex fallback', async () => {
      const res = await request(app).get('/api/jobs?search=analy');

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs.map((j) => j.title)).toEqual(['Data Analyst']);
    });

    it('returns nothing when no job matches', async () => {
      const res = await request(app).get('/api/jobs?search=zzzznomatch');

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toHaveLength(0);
    });
  });

  describe('indexes (explain)', () => {
    beforeEach(async () => {
      await Job.init();
      const now = Date.now();
      await Job.collection.insertMany(Array.from({ length: 300 }, (_, i) => ({
        title: i % 2 ? `Backend Developer ${i}` : `Data Analyst ${i}`,
        description: 'Explain fixture',
        requiredSkills: ['Node.js'],
        status: i % 3 ? 'Published' : 'Draft',
        employmentType: 'Full-time',
        deadline: null,
        createdAt: new Date(now - i * 60000),
      })));
    });

    it('serves the public job list from {status, createdAt, _id} without an in-memory sort', async () => {
      const query = withOpenDeadline({ status: 'Published', employmentType: { $not: /^internship$/i } });
      const explain = await Job.find(query).sort({ createdAt: -1, _id: -1 }).limit(10).explain('executionStats');
      const stages = planStages(explain.queryPlanner.winningPlan.queryPlan || explain.queryPlanner.winningPlan);

      expect(stages).toContainEqual({ stage: 'IXSCAN', indexName: 'status_1_createdAt_-1__id_-1' });
      expect(stages.map((s) => s.stage)).not.toContain('SORT');
      expect(stages.map((s) => s.stage)).not.toContain('COLLSCAN');
    });

    it('uses the text index for keyword search', async () => {
      const explain = await Job.find({ status: 'Published', $text: { $search: '"backend developer"' } })
        .explain('executionStats');
      const stages = planStages(explain.queryPlanner.winningPlan.queryPlan || explain.queryPlanner.winningPlan);

      expect(stages).toContainEqual({ stage: 'IXSCAN', indexName: 'job_text_search' });
    });
  });
});
