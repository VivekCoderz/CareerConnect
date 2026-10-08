const ResumeAsset = require('../../models/ResumeAsset');
const User = require('../../models/User');

let counter = 0;

/**
 * Gives a user an uploaded resume, as POST /api/resume/upload would: a ResumeAsset they
 * own plus the URL saved on their User. Returns the resume URL.
 */
const giveTestResume = async (user, { saveOnUser = true } = {}) => {
  counter += 1;
  const publicId = `careerconnect/resumes/resume_test_${user._id}_${counter}.pdf`;
  const url = `https://res.cloudinary.com/test-cloud/raw/authenticated/v1/${publicId}`;
  await ResumeAsset.create({ user: user._id, publicId, url });
  if (saveOnUser) {
    await User.updateOne({ _id: user._id }, { resumeUrl: url, resumeName: 'resume.pdf' });
    user.resumeUrl = url;
  }
  return url;
};

module.exports = { giveTestResume };
