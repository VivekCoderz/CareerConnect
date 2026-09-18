const Job = require('../../models/Job');

/**
 * Creates a test job listing in the in-memory MongoDB
 */
const createTestJob = async (employerId, overrides = {}) => {
  return Job.create({
    title: overrides.title || 'Junior React Developer',
    companyName: overrides.companyName || 'Test Corp',
    description: overrides.description ||
      'We are looking for a React developer with 0-2 years of experience to join our team.',
    location: overrides.location || 'Bangalore, Karnataka',
    city: overrides.city || 'Bangalore',
    state: overrides.state || 'Karnataka',
    country: overrides.country || 'India',
    employmentType: overrides.employmentType || 'Full-time',
    workMode: overrides.workMode || 'Hybrid',
    category: overrides.category || 'Web Development',
    subCategory: 'Frontend Development',
    requiredSkills: overrides.requiredSkills || ['React', 'JavaScript', 'HTML', 'CSS'],
    preferredSkills: overrides.preferredSkills || ['TypeScript', 'Redux'],
    status: overrides.status || 'Published',
    employerId: employerId || null,
    createdBy: employerId || null,
    source: 'CareerConnect',
    openings: 1,
    salaryRange: { min: 400000, max: 700000, currency: 'INR', isNegotiable: true },
    experience: { minYears: 0, maxYears: 2, level: 'Fresher / Entry-Level' },
    ...overrides,
  });
};

module.exports = { createTestJob };
