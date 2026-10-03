const request = require('supertest');
const app = require('../../app');
const ResumeAsset = require('../../models/ResumeAsset');
const Application = require('../../models/Application');
const { cloudinary } = require('../../config/cloudinary');
const { createTestUser, createTestEmployer, generateToken, createEmployerProfile } = require('../helpers/createTestUser');

describe('G10: Resume uploads consistency & access privacy', () => {
  let signedUrl;

  beforeEach(() => {
    signedUrl = jest.spyOn(cloudinary.utils, 'private_download_url')
      .mockReturnValue('https://api.cloudinary.com/test-signed-download');
  });

  afterEach(() => signedUrl.mockRestore());

  describe('Upload rules consistency (PDF only)', () => {
    it('rejects non-PDF files (.docx, .doc, .txt, .exe) on /api/resume/upload with 400', async () => {
      const user = await createTestUser({ email: 'g10-uploader@example.com' });
      const token = generateToken(user._id);

      const fakeDocxBuffer = Buffer.from('fake docx content');
      const response = await request(app)
        .post('/api/resume/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', fakeDocxBuffer, 'sample_resume.docx');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects spoofed PDF file where extension is .pdf but content is not valid PDF magic bytes', async () => {
      const user = await createTestUser({ email: 'g10-spoof@example.com' });
      const token = generateToken(user._id);

      const invalidBuffer = Buffer.from('NOT_A_REAL_PDF_CONTENT');
      const response = await request(app)
        .post('/api/resume/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', invalidBuffer, { filename: 'malicious.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Privacy verification: unauthorized resume URL returns 403', () => {
    const testAssetUrl = 'https://res.cloudinary.com/test/raw/authenticated/v1/careerconnect/resumes/g10_candidate_resume.pdf';

    it('returns 403 when an unrelated employer attempts to download candidate resume', async () => {
      const candidate = await createTestUser({ email: 'g10-candidate@example.com' });
      const unappliedEmployer = await createTestEmployer({ email: 'g10-unapplied-emp@example.com' });
      await createEmployerProfile(unappliedEmployer._id, { companyName: 'Unrelated Corp' });

      await ResumeAsset.create({
        user: candidate._id,
        publicId: 'careerconnect/resumes/g10_candidate_resume.pdf',
        url: testAssetUrl,
      });

      const res = await request(app)
        .get('/api/resume/download')
        .query({ url: testAssetUrl })
        .set('Authorization', `Bearer ${generateToken(unappliedEmployer._id)}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Resume access denied');
    });

    it('returns 403 when another candidate tries to access this candidate resume URL', async () => {
      const candidate = await createTestUser({ email: 'g10-cand1@example.com' });
      const attackerCandidate = await createTestUser({ email: 'g10-cand2@example.com' });

      await ResumeAsset.create({
        user: candidate._id,
        publicId: 'careerconnect/resumes/g10_cand1_resume.pdf',
        url: testAssetUrl,
      });

      const res = await request(app)
        .get('/api/resume/download')
        .query({ url: testAssetUrl })
        .set('Authorization', `Bearer ${generateToken(attackerCandidate._id)}`);

      expect(res.status).toBe(403);
    });

    it('returns 302 redirect for the legitimate employer who received candidate application', async () => {
      const candidate = await createTestUser({ email: 'g10-valid-cand@example.com' });
      const employer = await createTestEmployer({ email: 'g10-applied-emp@example.com' });
      const profile = await createEmployerProfile(employer._id, { companyName: 'Hiring Corp' });

      await ResumeAsset.create({
        user: candidate._id,
        publicId: 'careerconnect/resumes/g10_candidate_resume.pdf',
        url: testAssetUrl,
      });

      await Application.create({
        candidateId: candidate._id,
        employerId: profile._id,
        jobId: candidate._id,
        opportunityType: 'Job',
        resumeUrl: testAssetUrl,
      });

      const res = await request(app)
        .get('/api/resume/download')
        .query({ url: testAssetUrl })
        .set('Authorization', `Bearer ${generateToken(employer._id)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://api.cloudinary.com/test-signed-download');
    });
  });
});
