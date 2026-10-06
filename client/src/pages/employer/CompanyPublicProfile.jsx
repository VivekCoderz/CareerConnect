import JourneyLoader from "../../components/common/JourneyLoader";
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getPublicCompanyProfile, getEmployerProfile } from "../../services/employerService";
import useSeo from "../../hooks/useSeo";
import BrandLogo from "../../components/common/BrandLogo";

const CompanyPublicProfile = () => {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        if (companyId && companyId !== "preview") {
          const res = await getPublicCompanyProfile(companyId);
          if (res?.success && res?.company) {
            setCompany(res.company);
          } else {
            setError("Company profile not found.");
          }
        } else {
          // If viewing own preview
          const res = await getEmployerProfile();
          if (res?.success && res?.profile) {
            setCompany(res.profile);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load company profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [companyId]);

  const isPreview = !companyId || companyId === "preview";
  const seoHq = company?.headquarters;
  const hqText = typeof seoHq === "string" ? seoHq : [seoHq?.city, seoHq?.state].filter(Boolean).join(", ");
  useSeo({
    title: company?.companyName
      ? `${company.companyName}${hqText ? `, ${hqText}` : ""}: jobs and company profile`
      : loading ? "Company profile" : "Company not found",
    description: company?.companyName
      ? `${company.companyName}${company.industry ? ` (${company.industry})` : ""} on E2Job. ${company.description || "See open jobs and internships and apply free."}`
      : undefined,
    path: `/companies/${companyId || ""}`,
    noindex: isPreview || (!loading && !company),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <JourneyLoader variant="employer" size="md" className="mb-4" />
        <p className="text-sm font-semibold text-slate-600">
          Loading company showcase...
        </p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="text-5xl">🏢</div>
          <h2 className="text-xl font-bold text-slate-900">Company Not Found</h2>
          <p className="text-xs text-slate-500">{error || "This company profile is currently unavailable."}</p>
          <Link
            to="/home"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold transition"
          >
            Back to E2Job
          </Link>
        </div>
      </div>
    );
  }

  const hq = company.headquarters || {};
  const hiring = company.hiringPreferences || {};

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <Link to="/home" className="flex items-center gap-3">
          <BrandLogo markOnly className="h-8 w-10 sm:hidden" /><BrandLogo className="hidden h-8 w-36 sm:block" />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Explore Opportunities
          </Link>
        </div>
      </header>

      {/* Main Showcase Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Banner Card with Logo and Header details */}
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="h-44 bg-gradient-to-r from-[#92400e] via-[#b45309] to-[#d97706] relative p-6 text-white flex items-end">
            {/* Only admin-approved companies (an employer's own preview can still be pending). */}
            {company.verificationStatus === "approved" && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-amber-100 border border-white/20">
                  ✓ Verified employer
                </span>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={company.companyName}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-[#92400e]">
                      {company.companyName?.[0] || "GU"}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {company.companyName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {company.industry} · {company.companySize || "11–50"} employees ·{" "}
                    {hq.city ? `${hq.city}, ${hq.country || "India"}` : "India"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFollowing((p) => !p)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                    isFollowing
                      ? "bg-slate-100 text-slate-800 border border-slate-200"
                      : "bg-[#f59e0b] hover:bg-[#d97706] text-white"
                  }`}
                >
                  {isFollowing ? "✓ Following" : "+ Follow Company"}
                </button>

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-amber-400 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5"
                  >
                    🌐 Visit Website
                  </a>
                )}
              </div>
            </div>

            {company.tagline && (
              <p className="text-xs text-slate-600 italic bg-amber-50/60 border border-amber-100 p-3 rounded-xl mb-6">
                "{company.tagline}"
              </p>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto pb-1">
              {[
                { id: "about", label: "About Us" },
                { id: "culture", label: "Culture & Perks" },
                { id: "team", label: "Leadership & Team" },
                { id: "hiring", label: "Hiring Criteria" },
                // "Open Positions" is hidden until the jobs API can list one company's real openings.
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#f59e0b] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: About Us */}
        {activeTab === "about" && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900">
                About the Organization
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {company.description ||
                  "This organization is partnering with E2Job E2Job to hire top emerging talent."}
              </p>

              {(company.mission || company.vision) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {company.mission && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1.5">
                      <span className="text-xs font-bold text-[#92400e] block">
                        🎯 Our Mission
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {company.mission}
                      </p>
                    </div>
                  )}
                  {company.vision && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <span className="text-xs font-bold text-slate-800 block">
                        🔭 Our Vision
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {company.vision}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(company.coreValues || []).length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2.5">
                    Core Organizational Values
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {company.coreValues.map((val) => (
                      <span
                        key={val}
                        className="px-3 py-1.5 rounded-xl bg-amber-100 text-[#92400e] text-xs font-bold border border-amber-200"
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {company.whyWorkWithUs && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    ✨ Why Work With Us
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {company.whyWorkWithUs}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Culture & Perks */}
        {activeTab === "culture" && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Work Environment & Benefits
                </h3>
                {company.culture?.workEnvironment && (
                  <p className="text-xs text-slate-500 mt-1">
                    Work mode: <strong className="text-amber-800">{company.culture.workEnvironment}</strong>
                  </p>
                )}
              </div>

              {company.culture?.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {company.culture.description}
                </p>
              )}

              {(company.benefits || []).length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Employee Happiness & Health Benefits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {company.benefits.map((b) => (
                      <div
                        key={b}
                        className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2"
                      >
                        <span>✓</span> {b}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(company.perks || []).length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Campus Facilities & Perks
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {company.perks.map((p) => (
                      <div
                        key={p}
                        className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-2"
                      >
                        <span>★</span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(company.gallery || []).length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Team & Workspace Moments
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {company.gallery.map((img, i) => (
                      <div
                        key={i}
                        className="h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs"
                      >
                        <img
                          src={img}
                          alt="Gallery"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Leadership Team */}
        {activeTab === "team" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-base font-bold text-slate-900">
              Key Leadership & Mentors
            </h3>

            {(company.leadership || []).length === 0 ? (
              <p className="text-xs text-slate-400">
                Leadership profiles will be listed here soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {company.leadership.map((l, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-start gap-3.5 shadow-2xs"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-[#92400e] flex items-center justify-center font-bold text-base overflow-hidden flex-shrink-0 border border-amber-200">
                      {l.profileImage ? (
                        <img
                          src={l.profileImage}
                          alt={l.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        l.name?.[0] || "L"
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        {l.name}
                      </h4>
                      <p className="text-[11px] font-bold text-amber-700">
                        {l.designation}
                      </p>
                      {l.bio && (
                        <p className="text-[10.5px] text-slate-500 leading-snug">
                          {l.bio}
                        </p>
                      )}
                      {l.linkedinUrl && (
                        <a
                          href={l.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10.5px] font-bold text-blue-600 hover:underline block pt-1"
                        >
                          LinkedIn Profile ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Hiring Criteria */}
        {activeTab === "hiring" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-base font-bold text-slate-900">
              Talent Criteria & Hiring Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Target Candidate Types
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {(hiring.candidateTypes || []).join(", ") || "Not specified"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Target Qualifications
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {(hiring.qualifications || []).join(", ") || "Not specified"}
                </span>
              </div>
            </div>

            {(hiring.skills || []).length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Preferred Technologies & Core Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {hiring.skills.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 text-[#92400e] text-xs font-bold border border-amber-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default CompanyPublicProfile;
