import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import {
  getFresherProfile,
  updateFresherProfile,
} from "../../services/fresherProfileService";

// Predefined searchable catalog
const POPULAR_TECHNICAL_SKILLS = [
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "C++",
  "C#",
  "PHP",
  "Go",
  "Rust",
  "React",
  "Node.js",
  "Express.js",
  "MongoDB",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "Git",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Next.js",
  "Redux",
  "Docker",
  "AWS",
  "REST APIs",
  "GraphQL",
  "Data Structures",
  "Algorithms",
  "Linux",
  "Postman",
  "Firebase",
  "Figma",
];

const POPULAR_SOFT_SKILLS = [
  "Communication",
  "Teamwork",
  "Problem Solving",
  "Leadership",
  "Time Management",
  "Critical Thinking",
  "Adaptability",
  "Attention to Detail",
  "Presentation Skills",
  "Fast Learner",
];

const TARGET_ROLE_OPTIONS = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "UI/UX Designer",
  "QA Engineer",
  "DevOps Engineer",
  "Mobile App Developer",
  "Cloud Engineer",
  "Cybersecurity Associate",
];

const LOCATION_OPTIONS = [
  "Bangalore",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Chennai",
  "Kolkata",
  "Noida",
  "Gurgaon",
  "Remote",
  "Anywhere in India",
];

const CAREER_GOALS = [
  "Get my first job",
  "Find an internship",
  "Become job-ready",
  "Improve my technical skills",
  "Start a career in a new field",
];

const STEPS = [
  { id: 1, label: "Education", icon: "🎓" },
  { id: 2, label: "Internship", icon: "🏢" },
  { id: 3, label: "Projects", icon: "🚀" },
  { id: 4, label: "Skills", icon: "⚡" },
  { id: 5, label: "Career Preferences", icon: "🎯" },
];

const FresherProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);

  const initialStepParam = parseInt(searchParams.get("step"), 10);
  const [currentStep, setCurrentStep] = useState(
    initialStepParam >= 1 && initialStepParam <= 5 ? initialStepParam : 1
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // ─── Profile State ────────────────────────────────────────────────────────
  const [educationList, setEducationList] = useState([
    {
      qualificationType: "B.Tech",
      degree: "B.Tech",
      specialization: "Computer Science & Engineering",
      institution: "",
      startYear: 2022,
      graduationYear: 2026,
      percentageOrCgpa: "",
    },
  ]);

  const [hasInternship, setHasInternship] = useState(false);
  const [internshipList, setInternshipList] = useState([]);

  const [hasProjects, setHasProjects] = useState(true);
  const [projectList, setProjectList] = useState([
    {
      title: "",
      projectType: "Personal",
      description: "",
      technologies: [],
      techInput: "",
      githubUrl: "",
      liveUrl: "",
    },
  ]);

  // Skills
  const [technicalSkills, setTechnicalSkills] = useState(["JavaScript", "React", "Node.js", "MongoDB", "Git"]);
  const [softSkills, setSoftSkills] = useState(["Problem Solving", "Teamwork", "Communication"]);
  const [primarySkills, setPrimarySkills] = useState(["JavaScript", "React"]);
  const [skillSearch, setSkillSearch] = useState("");
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Career Preferences
  const [targetRoles, setTargetRoles] = useState(["Full Stack Developer"]);
  const [jobType, setJobType] = useState("Both"); // "Full Time", "Internship", "Both"
  const [workModes, setWorkModes] = useState(["Remote", "Hybrid"]);
  const [preferredLocations, setPreferredLocations] = useState(["Bangalore", "Pune", "Remote"]);
  const [careerGoal, setCareerGoal] = useState("Get my first job");
  const [activelyLooking, setActivelyLooking] = useState(true);

  // ─── Fetch Existing Profile ───────────────────────────────────────────────
  useEffect(() => {
    const fetchExisting = async () => {
      setLoading(true);
      try {
        const res = await getFresherProfile();
        if (res?.profile) {
          const p = res.profile;
          if (p.education && p.education.length > 0) {
            setEducationList(
              p.education.map((e) => ({
                qualificationType: e.qualificationType || "B.Tech",
                degree: e.degree || "",
                specialization: e.specialization || "",
                institution: e.institution || "",
                startYear: e.startYear || 2022,
                graduationYear: e.graduationYear || 2026,
                percentageOrCgpa: e.percentageOrCgpa || "",
              }))
            );
          }

          if (p.internships && p.internships.length > 0) {
            setHasInternship(true);
            setInternshipList(
              p.internships.map((int) => ({
                companyName: int.companyName || "",
                role: int.role || "",
                startDate: int.startDate ? int.startDate.substring(0, 7) : "",
                endDate: int.endDate ? int.endDate.substring(0, 7) : "",
                workMode: int.workMode || "Remote",
                description: int.description || "",
                technologiesUsed: int.technologiesUsed || [],
                skillsInput: (int.technologiesUsed || []).join(", "),
              }))
            );
          }

          if (p.projects && p.projects.length > 0) {
            setHasProjects(true);
            setProjectList(
              p.projects.map((proj) => ({
                title: proj.title || "",
                projectType: proj.projectType || "Personal",
                description: proj.description || "",
                technologies: proj.technologies || [],
                techInput: (proj.technologies || []).join(", "),
                githubUrl: proj.githubUrl || "",
                liveUrl: proj.liveUrl || "",
              }))
            );
          }

          // Skills
          const tech = [];
          (p.skills?.programmingLanguages || []).forEach((s) => tech.push(s.name));
          (p.skills?.frameworks || []).forEach((s) => tech.push(s.name));
          (p.skills?.databases || []).forEach((s) => tech.push(s.name));
          (p.skills?.tools || []).forEach((s) => tech.push(s.name));
          (p.skills?.technical || []).forEach((s) => tech.push(s.name));
          if (tech.length > 0) setTechnicalSkills(Array.from(new Set(tech)));

          const soft = (p.skills?.softSkills || []).map((s) => s.name);
          if (soft.length > 0) setSoftSkills(Array.from(new Set(soft)));

          if (p.primarySkills && p.primarySkills.length > 0) {
            setPrimarySkills(p.primarySkills);
          }

          // Preferences
          if (p.targetRoles && p.targetRoles.length > 0) {
            setTargetRoles(p.targetRoles);
          } else if (p.targetRole) {
            setTargetRoles([p.targetRole]);
          }

          if (p.jobPreferences?.employmentTypes?.length > 0) {
            const types = p.jobPreferences.employmentTypes;
            if (types.includes("Full-time") && types.includes("Internship")) setJobType("Both");
            else if (types.includes("Full-time")) setJobType("Full Time");
            else if (types.includes("Internship")) setJobType("Internship");
          }

          if (p.jobPreferences?.workMode?.length > 0) {
            setWorkModes(p.jobPreferences.workMode);
          }

          if (p.jobPreferences?.preferredLocations?.length > 0) {
            setPreferredLocations(p.jobPreferences.preferredLocations);
          }

          if (p.careerGoal) setCareerGoal(p.careerGoal);
          if (p.activelyLooking !== undefined) setActivelyLooking(p.activelyLooking);
        }
      } catch (err) {
        console.error("Error fetching fresher profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, []);

  // ─── Step 1: Education handlers ──────────────────────────────────────────
  const handleAddEducation = () => {
    setEducationList((prev) => [
      ...prev,
      {
        qualificationType: "B.Tech",
        degree: "",
        specialization: "",
        institution: "",
        startYear: new Date().getFullYear() - 4,
        graduationYear: new Date().getFullYear(),
        percentageOrCgpa: "",
      },
    ]);
  };

  const handleRemoveEducation = (index) => {
    if (educationList.length === 1) return;
    setEducationList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEducationChange = (index, field, value) => {
    setEducationList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setFieldErrors((prev) => ({ ...prev, [`edu_${index}_${field}`]: "" }));
  };

  // ─── Step 2: Internship handlers ─────────────────────────────────────────
  const handleAddInternship = () => {
    setInternshipList((prev) => [
      ...prev,
      {
        companyName: "",
        role: "",
        startDate: "",
        endDate: "",
        workMode: "Remote",
        description: "",
        technologiesUsed: [],
        skillsInput: "",
      },
    ]);
  };

  const handleRemoveInternship = (index) => {
    setInternshipList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInternshipChange = (index, field, value) => {
    setInternshipList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "skillsInput") {
        copy[index].technologiesUsed = value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return copy;
    });
  };

  // ─── Step 3: Projects handlers ───────────────────────────────────────────
  const handleAddProject = () => {
    setProjectList((prev) => [
      ...prev,
      {
        title: "",
        projectType: "Personal",
        description: "",
        technologies: [],
        techInput: "",
        githubUrl: "",
        liveUrl: "",
      },
    ]);
  };

  const handleRemoveProject = (index) => {
    setProjectList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProjectChange = (index, field, value) => {
    setProjectList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "techInput") {
        copy[index].technologies = value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return copy;
    });
    setFieldErrors((prev) => ({ ...prev, [`proj_${index}_${field}`]: "" }));
  };

  // ─── Step 4: Skills handlers ─────────────────────────────────────────────
  const toggleTechnicalSkill = (skill) => {
    setTechnicalSkills((prev) => {
      const exists = prev.includes(skill);
      const next = exists ? prev.filter((s) => s !== skill) : [...prev, skill];
      if (exists) {
        setPrimarySkills((p) => p.filter((s) => s !== skill));
      }
      return next;
    });
  };

  const toggleSoftSkill = (skill) => {
    setSoftSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const togglePrimarySkill = (skill) => {
    setPrimarySkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), skill];
      }
      return [...prev, skill];
    });
  };

  const handleAddCustomSkill = (e) => {
    e.preventDefault();
    const clean = customSkillInput.trim();
    if (!clean) return;
    if (!technicalSkills.includes(clean)) {
      setTechnicalSkills((prev) => [...prev, clean]);
    }
    setCustomSkillInput("");
  };

  const filteredCatalogSkills = useMemo(() => {
    if (!skillSearch.trim()) return POPULAR_TECHNICAL_SKILLS;
    const q = skillSearch.toLowerCase();
    return POPULAR_TECHNICAL_SKILLS.filter((s) => s.toLowerCase().includes(q));
  }, [skillSearch]);

  // ─── Step 5: Preferences handlers ────────────────────────────────────────
  const toggleTargetRole = (role) => {
    setTargetRoles((prev) =>
      prev.includes(role)
        ? prev.length > 1
          ? prev.filter((r) => r !== role)
          : prev
        : [...prev, role]
    );
  };

  const toggleWorkMode = (mode) => {
    setWorkModes((prev) =>
      prev.includes(mode)
        ? prev.length > 1
          ? prev.filter((m) => m !== mode)
          : prev
        : [...prev, mode]
    );
  };

  const toggleLocation = (loc) => {
    setPreferredLocations((prev) =>
      prev.includes(loc)
        ? prev.length > 1
          ? prev.filter((l) => l !== loc)
          : prev
        : [...prev, loc]
    );
  };

  // ─── Step Validation ─────────────────────────────────────────────────────
  const validateCurrentStep = () => {
    const errors = {};
    if (currentStep === 1) {
      educationList.forEach((edu, idx) => {
        if (!edu.degree.trim()) errors[`edu_${idx}_degree`] = "Degree title is required";
        if (!edu.institution.trim()) errors[`edu_${idx}_institution`] = "College / University name is required";
        if (!edu.graduationYear) errors[`edu_${idx}_graduationYear`] = "Graduation year is required";
      });
    } else if (currentStep === 3) {
      if (hasProjects) {
        projectList.forEach((proj, idx) => {
          if (!proj.title.trim()) errors[`proj_${idx}_title`] = "Project title is required";
          if (!proj.description.trim()) errors[`proj_${idx}_description`] = "Short description is required";
        });
      }
    } else if (currentStep === 4) {
      if (technicalSkills.length === 0) {
        errors.skills = "Please select at least 2 technical skills";
      }
    } else if (currentStep === 5) {
      if (targetRoles.length === 0) {
        errors.targetRoles = "Please select at least one target role";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleCompleteProfile();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setFieldErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ─── Complete Profile Save ───────────────────────────────────────────────
  const handleCompleteProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        targetRole: targetRoles[0] || "Full Stack Developer",
        targetRoles,
        careerGoal,
        activelyLooking,
        education: educationList.map((e, idx) => ({
          ...e,
          isHighest: idx === 0,
        })),
        internships: hasInternship
          ? internshipList.filter((i) => i.companyName.trim() && i.role.trim())
          : [],
        projects: hasProjects
          ? projectList.filter((p) => p.title.trim())
          : [],
        skills: {
          programmingLanguages: technicalSkills.map((s) => ({ name: s, proficiency: "Intermediate" })),
          frameworks: [],
          databases: [],
          tools: [],
          technical: [],
          softSkills: softSkills.map((s) => ({ name: s, proficiency: "Intermediate" })),
        },
        primarySkills: primarySkills.length > 0 ? primarySkills : technicalSkills.slice(0, 3),
        jobPreferences: {
          preferredRoles: targetRoles,
          employmentTypes:
            jobType === "Both"
              ? ["Full-time", "Internship"]
              : [jobType === "Full Time" ? "Full-time" : "Internship"],
          preferredLocations,
          workMode: workModes,
        },
        isProfileComplete: true,
      };

      const res = await updateFresherProfile(payload);
      if (res?.profile) {
        dispatch(
          updateUserProfile({
            isProfileComplete: true,
            userType: "fresher",
          })
        );
      }
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setFieldErrors({ submit: "Failed to save profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Setting up Fresher Workspace...</h2>
        <p className="text-xs text-slate-500 mt-1">Loading your profile preferences</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/fresher/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-base shadow-sm">
              GU
            </div>
            <div>
              <p className="text-sm font-bold text-[#1e3a8a] tracking-tight">GEETA UNIVERSITY</p>
              <p className="text-[10px] text-[#f59e0b] font-semibold tracking-wider uppercase">CareerConnect · Fresher Profile</p>
            </div>
          </Link>

          <Link
            to="/fresher/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Skip to Dashboard →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex-1 flex flex-col items-center relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(step.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm cursor-pointer ${
                      isDone
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : isCurrent
                        ? "bg-[#1e3a8a] text-white ring-4 ring-blue-100"
                        : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                    }`}
                  >
                    {isDone ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(step.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`mt-2 text-[12px] font-semibold text-center transition cursor-pointer ${
                      isCurrent ? "text-[#1e3a8a]" : isDone ? "text-slate-700 hover:text-[#1e3a8a]" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {step.label}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 max-w-2xl mx-auto overflow-hidden">
            <div
              className="bg-[#1e3a8a] h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Global Error Notice */}
        {fieldErrors.submit && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {fieldErrors.submit}
          </div>
        )}

        {/* Step Content Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* ============================================================
              STEP 1: EDUCATION
          ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Tell us about your education 🎓
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Add your recent degree, university, and graduation year to unlock eligible graduate roles.
                </p>
              </div>

              <div className="space-y-6">
                {educationList.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 relative space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                        {idx === 0 ? "Primary Qualification" : `Education Record #${idx + 1}`}
                      </span>
                      {educationList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(idx)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Highest Qualification
                        </label>
                        <select
                          value={edu.qualificationType}
                          onChange={(e) => handleEducationChange(idx, "qualificationType", e.target.value)}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="B.Tech">B.Tech / B.E.</option>
                          <option value="BCA">BCA</option>
                          <option value="MCA">MCA</option>
                          <option value="B.Sc">B.Sc Computer Science / IT</option>
                          <option value="M.Sc">M.Sc Computer Science / IT</option>
                          <option value="M.Tech">M.Tech</option>
                          <option value="Diploma">Diploma in Engineering</option>
                          <option value="Other">Other Graduate Degree</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Degree / Certificate Title *
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => handleEducationChange(idx, "degree", e.target.value)}
                          placeholder="e.g. B.Tech"
                          className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm outline-none focus:ring-2 ${
                            fieldErrors[`edu_${idx}_degree`]
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-200 focus:border-[#1e3a8a] focus:ring-blue-100"
                          }`}
                        />
                        {fieldErrors[`edu_${idx}_degree`] && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors[`edu_${idx}_degree`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Specialization / Branch
                        </label>
                        <input
                          type="text"
                          value={edu.specialization}
                          onChange={(e) => handleEducationChange(idx, "specialization", e.target.value)}
                          placeholder="e.g. Computer Science & Engineering"
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          College / University *
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => handleEducationChange(idx, "institution", e.target.value)}
                          placeholder="e.g. Geeta University / ABC Institute"
                          className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm outline-none focus:ring-2 ${
                            fieldErrors[`edu_${idx}_institution`]
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-200 focus:border-[#1e3a8a] focus:ring-blue-100"
                          }`}
                        />
                        {fieldErrors[`edu_${idx}_institution`] && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors[`edu_${idx}_institution`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Start Year
                        </label>
                        <input
                          type="number"
                          value={edu.startYear || ""}
                          onChange={(e) => handleEducationChange(idx, "startYear", parseInt(e.target.value, 10))}
                          placeholder="e.g. 2022"
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Graduation Year *
                          </label>
                          <input
                            type="number"
                            value={edu.graduationYear || ""}
                            onChange={(e) => handleEducationChange(idx, "graduationYear", parseInt(e.target.value, 10))}
                            placeholder="e.g. 2026"
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            CGPA / %
                          </label>
                          <input
                            type="text"
                            value={edu.percentageOrCgpa}
                            onChange={(e) => handleEducationChange(idx, "percentageOrCgpa", e.target.value)}
                            placeholder="e.g. 8.2"
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddEducation}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 font-semibold text-xs transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                + Add Another Education Record
              </button>
            </div>
          )}

          {/* ============================================================
              STEP 2: INTERNSHIP EXPERIENCE
          ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Do you have any internship experience? 🏢
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Internships demonstrate practical work readiness. If you have not done an internship yet, you can skip this step.
                </p>
              </div>

              {/* Yes / No Toggle Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setHasInternship(true);
                    if (internshipList.length === 0) handleAddInternship();
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition flex items-center justify-center gap-2 ${
                    hasInternship
                      ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                    {hasInternship && <span className="w-2 h-2 rounded-full bg-[#1e3a8a]" />}
                  </span>
                  Yes, I have internship experience
                </button>

                <button
                  type="button"
                  onClick={() => setHasInternship(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition flex items-center justify-center gap-2 ${
                    !hasInternship
                      ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                    {!hasInternship && <span className="w-2 h-2 rounded-full bg-[#1e3a8a]" />}
                  </span>
                  No internship experience yet
                </button>
              </div>

              {!hasInternship ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1e3a8a] mx-auto flex items-center justify-center text-xl mb-3">
                    💼
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No internship experience yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    No problem at all! You can showcase your personal/academic projects in the next step to demonstrate your skills.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {internshipList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          Internship #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInternship(idx)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            value={item.companyName}
                            onChange={(e) => handleInternshipChange(idx, "companyName", e.target.value)}
                            placeholder="e.g. Infosys, StartUp Inc."
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Internship Role *
                          </label>
                          <input
                            type="text"
                            value={item.role}
                            onChange={(e) => handleInternshipChange(idx, "role", e.target.value)}
                            placeholder="e.g. Frontend Intern, Software Trainee"
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              Start Date
                            </label>
                            <input
                              type="month"
                              value={item.startDate}
                              onChange={(e) => handleInternshipChange(idx, "startDate", e.target.value)}
                              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              End Date
                            </label>
                            <input
                              type="month"
                              value={item.endDate}
                              onChange={(e) => handleInternshipChange(idx, "endDate", e.target.value)}
                              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Work Mode
                          </label>
                          <select
                            value={item.workMode}
                            onChange={(e) => handleInternshipChange(idx, "workMode", e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="On-site">On-site</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Description of Work
                        </label>
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(e) => handleInternshipChange(idx, "description", e.target.value)}
                          placeholder="Briefly describe what you built, features developed, or tools you used during the internship..."
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Skills / Technologies Used (comma separated)
                        </label>
                        <input
                          type="text"
                          value={item.skillsInput || ""}
                          onChange={(e) => handleInternshipChange(idx, "skillsInput", e.target.value)}
                          placeholder="e.g. React, Redux, REST API, Git"
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddInternship}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 font-semibold text-xs transition"
                  >
                    + Add Another Internship
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 3: PROJECTS
          ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Showcase your projects 🚀
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Projects are strongly encouraged for freshers because they prove practical coding ability to recruiters.
                </p>
              </div>

              {/* Yes / No Toggle */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setHasProjects(true);
                    if (projectList.length === 0) handleAddProject();
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition flex items-center justify-center gap-2 ${
                    hasProjects
                      ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                    {hasProjects && <span className="w-2 h-2 rounded-full bg-[#1e3a8a]" />}
                  </span>
                  Yes, I have projects to add
                </button>

                <button
                  type="button"
                  onClick={() => setHasProjects(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition flex items-center justify-center gap-2 ${
                    !hasProjects
                      ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                    {!hasProjects && <span className="w-2 h-2 rounded-full bg-[#1e3a8a]" />}
                  </span>
                  I will add projects later
                </button>
              </div>

              {hasProjects && (
                <div className="space-y-5">
                  {projectList.map((proj, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          Project #{idx + 1}
                        </span>
                        {projectList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(idx)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Project Name *
                          </label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => handleProjectChange(idx, "title", e.target.value)}
                            placeholder="e.g. CareerConnect Job Portal, E-Commerce App"
                            className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm outline-none focus:ring-2 ${
                              fieldErrors[`proj_${idx}_title`]
                                ? "border-red-400 focus:ring-red-100"
                                : "border-slate-200 focus:border-[#1e3a8a] focus:ring-blue-100"
                            }`}
                          />
                          {fieldErrors[`proj_${idx}_title`] && (
                            <p className="text-xs text-red-500 mt-1">{fieldErrors[`proj_${idx}_title`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Project Type
                          </label>
                          <select
                            value={proj.projectType}
                            onChange={(e) => handleProjectChange(idx, "projectType", e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="Personal">Personal Project</option>
                            <option value="Academic">Academic / Capstone Project</option>
                            <option value="Internship">Internship Project</option>
                            <option value="Hackathon">Hackathon Project</option>
                            <option value="Open Source">Open Source</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Short Description *
                        </label>
                        <textarea
                          rows={3}
                          value={proj.description}
                          onChange={(e) => handleProjectChange(idx, "description", e.target.value)}
                          placeholder="Briefly explain what the project does, key problem it solves, and your contribution..."
                          className={`w-full p-3 rounded-xl border bg-white text-sm outline-none focus:ring-2 ${
                            fieldErrors[`proj_${idx}_description`]
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-200 focus:border-[#1e3a8a] focus:ring-blue-100"
                          }`}
                        />
                        {fieldErrors[`proj_${idx}_description`] && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors[`proj_${idx}_description`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Technologies / Tech Stack (comma separated)
                        </label>
                        <input
                          type="text"
                          value={proj.techInput || ""}
                          onChange={(e) => handleProjectChange(idx, "techInput", e.target.value)}
                          placeholder="e.g. React, Node.js, Express, MongoDB, Tailwind CSS"
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            GitHub Repository URL
                          </label>
                          <input
                            type="url"
                            value={proj.githubUrl}
                            onChange={(e) => handleProjectChange(idx, "githubUrl", e.target.value)}
                            placeholder="https://github.com/username/project"
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Live Demo URL <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            value={proj.liveUrl}
                            onChange={(e) => handleProjectChange(idx, "liveUrl", e.target.value)}
                            placeholder="https://myproject.vercel.app"
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 font-semibold text-xs transition"
                  >
                    + Add Another Project
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 4: SKILLS
          ============================================================ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  What skills do you have? ⚡
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select your core technical & soft skills. We’ll match your profile with relevant openings and provide personalized skill gap insights.
                </p>
              </div>

              {fieldErrors.skills && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                  {fieldErrors.skills}
                </div>
              )}

              {/* Search & Custom Add */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search technical skills..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <form onSubmit={handleAddCustomSkill} className="flex gap-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    placeholder="Add custom skill"
                    className="h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    className="h-11 px-4 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-xl transition shadow-sm"
                  >
                    + Add
                  </button>
                </form>
              </div>

              {/* Technical Skills Catalog */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Technical Skills (Click to select)
                </label>
                <div className="flex flex-wrap gap-2">
                  {filteredCatalogSkills.map((skill) => {
                    const isSelected = technicalSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleTechnicalSkill(skill)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          isSelected
                            ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Soft Skills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Soft Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SOFT_SKILLS.map((skill) => {
                    const isSelected = softSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSoftSkill(skill)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary / Strongest Skills Selection */}
              {technicalSkills.length > 0 && (
                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Which skills are your strongest?</h4>
                      <p className="text-xs text-slate-500">Pick up to 3–5 primary skills you excel at.</p>
                    </div>
                    <span className="text-xs font-bold text-[#1e3a8a] bg-white px-2.5 py-1 rounded-full border border-blue-200">
                      {primarySkills.length}/5 Selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {technicalSkills.map((skill) => {
                      const isPrimary = primarySkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => togglePrimarySkill(skill)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                            isPrimary
                              ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                              : "bg-white text-slate-700 border-blue-200 hover:border-[#1e3a8a]"
                          }`}
                        >
                          {isPrimary ? `★ ${skill}` : skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 5: CAREER PREFERENCES
          ============================================================ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  What kind of opportunity are you looking for? 🎯
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Configure your target roles, job preferences, and availability to receive tailored recommendations.
                </p>
              </div>

              {/* Target Role (Multi-select) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Target Role (Select multiple) *
                  </label>
                  <span className="text-xs text-slate-400">Selected: {targetRoles.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TARGET_ROLE_OPTIONS.map((role) => {
                    const isSelected = targetRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleTargetRole(role)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                          isSelected
                            ? "border-[#1e3a8a] bg-blue-50/80 text-[#1e3a8a] font-bold shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {isSelected ? `✓ ${role}` : role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Job Type & Work Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Job Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Full Time", "Internship", "Both"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setJobType(type)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition text-center ${
                          jobType === type
                            ? "border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Work Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["On-site", "Hybrid", "Remote"].map((mode) => {
                      const isSelected = workModes.includes(mode);
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => toggleWorkMode(mode)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition text-center ${
                            isSelected
                              ? "border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-xs"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? `✓ ${mode}` : mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Preferred Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Preferred Location (Select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map((loc) => {
                    const isSelected = preferredLocations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggleLocation(loc)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          isSelected
                            ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {isSelected ? `✓ ${loc}` : loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Career Goal & Actively Looking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Career Goal
                  </label>
                  <select
                    value={careerGoal}
                    onChange={(e) => setCareerGoal(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 font-medium text-slate-800"
                  >
                    {CAREER_GOALS.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Are you actively looking for opportunities?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActivelyLooking(true)}
                      className={`h-11 rounded-xl border font-bold text-xs transition ${
                        activelyLooking
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      ✓ Yes, Actively Looking
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivelyLooking(false)}
                      className={`h-11 rounded-xl border font-bold text-xs transition ${
                        !activelyLooking
                          ? "border-slate-700 bg-slate-800 text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Not Right Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:bg-blue-300 text-white font-semibold text-sm transition flex items-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving Profile...
                </>
              ) : currentStep === 5 ? (
                "Complete Profile 🎉"
              ) : (
                "Continue →"
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">
              🎉
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              Your CareerConnect profile is ready!
            </h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              We’ll use your profile to personalize jobs, skills and career recommendations.
            </p>

            <button
              type="button"
              onClick={() => navigate("/fresher/dashboard", { replace: true })}
              className="w-full mt-6 py-3.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-sm transition shadow-md shadow-blue-900/20"
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FresherProfile;
