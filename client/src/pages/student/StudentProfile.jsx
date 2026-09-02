import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudentProfile } from "../../services/studentProfileService";

import ProfileHeader from "../../components/student/ProfileHeader";
import PersonalInfo from "../../components/student/PersonalInfo";
import EducationSection from "../../components/student/EducationSection";
import SkillsSection from "../../components/student/SkillsSection";
import ProjectsSection from "../../components/student/ProjectsSection";
import CertificationsSection from "../../components/student/CertificationsSection";
import AchievementsSection from "../../components/student/AchievementsSection";
import ExperienceSection from "../../components/student/ExperienceSection";
import CareerPreferences from "../../components/student/CareerPreferences";
import ResumeSection from "../../components/student/ResumeSection";

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentProfile();
      if (data?.profile) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Unable to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Loading student profile...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Profile Load Error</h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchProfile}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Retry
            </button>
            <Link
              to="/student/dashboard"
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const safeProfile = profile || {
    education: [],
    technicalSkills: [],
    softSkills: [],
    projects: [],
    certifications: [],
    achievements: [],
    experience: [],
    jobPreferences: {},
    resume: {},
  };

  return (
    <div className="student-profile bg-slate-50 min-h-screen py-6 px-4 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link
          to="/student/dashboard"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <ProfileHeader profile={safeProfile} />

      <PersonalInfo
        profile={safeProfile}
        setProfile={setProfile}
      />

      <EducationSection
        education={safeProfile.education || []}
        setProfile={setProfile}
      />

      <SkillsSection
        technicalSkills={safeProfile.technicalSkills || []}
        softSkills={safeProfile.softSkills || []}
        setProfile={setProfile}
      />

      <ProjectsSection
        projects={safeProfile.projects || []}
        setProfile={setProfile}
      />

      <CertificationsSection
        certifications={safeProfile.certifications || []}
        setProfile={setProfile}
      />

      <AchievementsSection
        achievements={safeProfile.achievements || []}
        setProfile={setProfile}
      />

      <ExperienceSection
        experience={safeProfile.experience || []}
        setProfile={setProfile}
      />

      <CareerPreferences
        preferences={safeProfile.jobPreferences || {}}
        setProfile={setProfile}
      />

      <ResumeSection
        resume={safeProfile.resume || {}}
        setProfile={setProfile}
      />
    </div>
  );
};

export default StudentProfile;