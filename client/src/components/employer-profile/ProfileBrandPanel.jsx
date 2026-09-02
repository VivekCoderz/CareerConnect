import React from "react";
import { Link } from "react-router-dom";

const stepHeadings = {
  1: {
    badge: "Step 1 of 6 · Basic Info",
    title: "Build your company profile",
    highlight: "& attract top talent",
    description:
      "Establish your official company presence on CareerConnect. Verified companies get 3x more quality applications from Geeta University candidates.",
  },
  2: {
    badge: "Step 2 of 6 · About Us",
    title: "Tell your company story",
    highlight: "& inspire candidates",
    description:
      "Share your mission, core values, and company achievements. Help students and professionals understand why your company is a great workplace.",
  },
  3: {
    badge: "Step 3 of 6 · Company Details",
    title: "Locations, departments",
    highlight: "& social presence",
    description:
      "Let candidates know where you operate, which departments are hiring, and how they can discover your brand across social channels.",
  },
  4: {
    badge: "Step 4 of 6 · Team & Culture",
    title: "Showcase workplace life",
    highlight: "& leadership team",
    description:
      "Highlight your work environment, employee benefits, perks, and introduce company mentors and leadership figures to build candidate trust.",
  },
  5: {
    badge: "Step 5 of 6 · Hiring Preferences",
    title: "Define talent criteria",
    highlight: "& target roles",
    description:
      "Specify preferred branches, required skills, degree qualifications, and salary brackets for intelligent matching with Geeta University talent.",
  },
  6: {
    badge: "Step 6 of 6 · Final Review",
    title: "Review & publish profile",
    highlight: "to Geeta University",
    description:
      "Review your profile completion score, verify all company information, and publish your official employer profile to start receiving applications.",
  },
};

const ProfileBrandPanel = ({ currentStep = 1, profileCompletion = 0 }) => {
  const stepInfo = stepHeadings[currentStep] || stepHeadings[1];

  return (
    <div className="hidden lg:flex w-[40%] bg-gradient-to-br from-[#92400e] via-[#b45309] to-[#78350f] text-white p-12 flex-col justify-between relative overflow-hidden sticky top-0 h-screen">
      {/* Decorative ambient blurs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#fbbf24]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      {/* Top GU Branding */}
      <div className="relative z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm text-white group-hover:bg-white/20 transition">
            GU
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-white">
              GEETA UNIVERSITY
            </p>
            <p className="text-[11px] text-[#fde68a] font-semibold tracking-wide">
              CareerConnect · Employers
            </p>
          </div>
        </Link>
      </div>

      {/* Middle Step-Contextual Content */}
      <div className="relative z-10 py-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] font-semibold text-amber-100 mb-6 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-[#fde68a] animate-pulse" />
          {stepInfo.badge}
        </div>

        <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight mb-4 text-white">
          {stepInfo.title}
          <br />
          <span className="text-[#fde68a]">{stepInfo.highlight}</span>
        </h2>

        <p className="text-amber-50/90 text-[14.5px] leading-relaxed max-w-md mb-8">
          {stepInfo.description}
        </p>

        {/* Live Completion Badge */}
        <div className="bg-black/20 border border-white/15 rounded-2xl p-4 backdrop-blur-md max-w-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-100 mb-2">
            <span>Profile Completion</span>
            <span className="text-[#fde68a] font-bold text-sm">
              {profileCompletion}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#fde68a] to-[#fbbf24] rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Link */}
      <div className="relative z-10 text-sm text-amber-100/80 flex items-center justify-between">
        <span>Already completed?</span>
        <Link
          to="/employer/dashboard"
          className="text-white font-semibold hover:text-[#fde68a] transition underline decoration-amber-300/40 underline-offset-4"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
};

export default ProfileBrandPanel;
