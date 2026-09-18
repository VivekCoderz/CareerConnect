const request = require('supertest');
const app = require('../../app');
const ResumeAsset = require('../../models/ResumeAsset');
const EmployerProfile = require('../../models/EmployerProfile');
const Application = require('../../models/Application');
const { cloudinary } = require('../../config/cloudinary');
const { createTestUser, createTestEmployer, generateToken } = require('../helpers/createTestUser');

const assetUrl = 'https://res.cloudinary.com/test/raw/authenticated/v1/careerconnect/resumes/resume_test.pdf';

describe('authenticated resume access', () => {
  let signedUrl;

  beforeEach(() => {
    signedUrl = jest.spyOn(cloudinary.utils, 'private_download_url')
      .mockReturnValue('https://api.cloudinary.com/test-signed-download');
  });

  afterEach(() => signedUrl.mockRestore());

  it('allows the asset owner but denies another candidate even if they copy the URL into their profile', async () => {
    const owner = await createTestUser({ email: 'resume-owner@example.com' });
    const other = await createTestUser({ email: 'resume-other@example.com', resumeUrl: assetUrl });
    await ResumeAsset.create({ user: owner._id, publicId: 'careerconnect/resumes/resume_test.pdf', url: assetUrl });

    const ownerResponse = await request(app).get('/api/resume/download')
      .query({ url: assetUrl }).set('Authorization', `Bearer ${generateToken(owner._id)}`);
    expect(ownerResponse.status).toBe(302);
    expect(ownerResponse.headers.location).toBe('https://api.cloudinary.com/test-signed-download');
    expect(ownerResponse.headers['cache-control']).toBe('private, no-store');
    expect(signedUrl).toHaveBeenCalledWith(
      'careerconnect/resumes/resume_test.pdf', 'pdf',
      expect.objectContaining({ resource_type: 'raw', type: 'authenticated' }),
    );

    const otherResponse = await request(app).get('/api/resume/download')
      .query({ url: assetUrl }).set('Authorization', `Bearer ${generateToken(other._id)}`);
    expect(otherResponse.status).toBe(403);
    expect(signedUrl).toHaveBeenCalledTimes(1);
  });

  it('allows only the employer linked to an application for this asset owner', async () => {
    const owner = await createTestUser({ email: 'resume-applicant@example.com' });
    const employer = await createTestEmployer({ email: 'resume-employer@example.com' });
    const stranger = await createTestEmployer({ email: 'resume-stranger@example.com' });
    const profile = await EmployerProfile.create({ userId: employer._id, companyName: 'Test Company' });
    await EmployerProfile.create({ userId: stranger._id, companyName: 'Other Company' });
    await ResumeAsset.create({ user: owner._id, publicId: 'careerconnect/resumes/resume_test.pdf', url: assetUrl });
    await Application.create({
      candidateId: owner._id,
      employerId: profile._id,
      jobId: owner._id,
      opportunityType: 'Job',
      resumeUrl: assetUrl,
    });

    const allowed = await request(app).get('/api/resume/download')
      .query({ url: assetUrl }).set('Authorization', `Bearer ${generateToken(employer._id)}`);
    expect(allowed.status).toBe(302);

    const denied = await request(app).get('/api/resume/download')
      .query({ url: assetUrl }).set('Authorization', `Bearer ${generateToken(stranger._id)}`);
    expect(denied.status).toBe(403);
  });
});
