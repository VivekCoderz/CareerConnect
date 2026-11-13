import JourneyLoader from "../../components/common/JourneyLoader";
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Code,
  GraduationCap,
  LoaderCircle,
  Plus,
  Search,
  Star,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import BrandLogo from "../../components/common/BrandLogo";
import AccountDetailsCard from "../../components/fresher-profile/AccountDetailsCard";
import {
  card,
  chip,
  errorBanner,
  fieldError,
  input,
  label,
  outlineButton,
  primaryButton,
  textarea,
} from "../../components/fresher-profile/profileUi";
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
  "Problem Solving",
  "Linux",
  "Postman",
  "Firebase",
  "Figma",
];

const POPULAR_SOFT_SKILLS = [
  "Communication",
  "Teamwork",
  "Leadership",
  "Time Management",
  "Critical Thinking",
  "Adaptability",
  "Attention to Detail",
  "Presentation Skills",
  "Fast Learner",
];

const TARGET_ROLE_OPTIONS = [
  "Web Developer",
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

const QUALIFICATION_OPTIONS = [
  ["B.Tech", "B.Tech / B.E."],
  ["BCA", "BCA"],
  ["MCA", "MCA"],
  ["B.Sc", "B.Sc Computer Science / IT"],
  ["M.Sc", "M.Sc Computer Science / IT"],
  ["M.Tech", "M.Tech"],
  ["Diploma", "Diploma in Engineering"],
  ["Other", "Other Graduate Degree"],
];

const STEPS = [
  { id: 1, label: "Education", icon: GraduationCap },
  { id: 2, label: "Internship", icon: Briefcase },
  { id: 3, label: "Projects", icon: Code },
  { id: 4, label: "Skills", icon: Zap },
  { id: 5, label: "Preferences", icon: Target },
];

// One-line summary of an education record for its collapsed header.
const educationSummary = (edu) => {
  const years =
    edu.startYear && edu.graduationYear
      ? `${edu.startYear} – ${edu.graduationYear}`
      : edu.graduationYear
        ? `Class of ${edu.graduationYear}`
        : "";
  const score = edu.percentageOrCgpa ? `Score ${edu.percentageOrCgpa}` : "";
  return [edu.institution, years, score].filter(Boolean).join(" · ");
};

const StepHeading = ({ title, subtitle }) => (
  <div>
    <h2 className="text-xl font-semibold text-neutral-100 tracking-tight">{title}</h2>
    <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>
  </div>
);

const ChoiceButton = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-semibold transition flex items-center justify-center gap-2 ${
      selected
        ? "border-[#1e3a8a] bg-[#1e3a8a]/20 text-blue-100 ring-2 ring-[#1e3a8a]/30"
        : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600"
    }`}
  >
    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
      {selected && <span className="w-2 h-2 rounded-full bg-current" />}
    </span>
    {children}
  </button>
);

const RecordCard = ({ title, onRemove, removeLabel, children }) => (
  <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-blue-300 bg-[#1e3a8a]/25 px-2 py-0.5 rounded-md">{title}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
    {children}
  </div>
);

const AddButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-neutral-700 text-neutral-300 hover:border-[#1e3a8a] hover:text-blue-300 hover:bg-[#1e3a8a]/10 text-sm font-medium transition"
  >
    <Plus className="w-4 h-4" />
    {children}
  </button>
);

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
  // Starts blank: nothing is filled in (or saved) that the fresher didn't enter.
  const [educationList, setEducationList] = useState([
    {
      qualificationType: "B.Tech",
      degree: "",
      specialization: "",
      institution: "",
      startYear: "",
      graduationYear: "",
      percentageOrCgpa: "",
    },
  ]);

  // Which education card is expanded (UI only).
  const [openEducation, setOpenEducation] = useState(0);

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
  const [technicalSkills, setTechnicalSkills] = useState([]);
  const [softSkills, setSoftSkills] = useState([]);
  const [primarySkills, setPrimarySkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Career Preferences
  const [targetRoles, setTargetRoles] = useState([]);
  const [jobType, setJobType] = useState(""); // "Full Time", "Internship", "Both"; "" = not chosen
  // Types this form has no option for (e.g. Part-time from the dashboard), kept on save.
  const [otherEmploymentTypes, setOtherEmploymentTypes] = useState([]);
  const [workModes, setWorkModes] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [careerGoal, setCareerGoal] = useState("");
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
                startYear: e.startYear || "",
                graduationYear: e.graduationYear || "",
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
          // Saved roles use the option's spelling, so "web developer" selects "Web Developer".
          const savedRoles = p.targetRoles?.length ? p.targetRoles : [p.targetRole].filter(Boolean);
          const asOption = (role) => TARGET_ROLE_OPTIONS.find((o) => o.toLowerCase() === role.trim().toLowerCase()) || role.trim();
          if (savedRoles.length > 0) setTargetRoles([...new Set(savedRoles.map(asOption))]);

          if (p.jobPreferences?.employmentTypes?.length > 0) {
            const types = p.jobPreferences.employmentTypes;
            if (types.includes("Full-time") && types.includes("Internship")) setJobType("Both");
            else if (types.includes("Full-time")) setJobType("Full Time");
            else if (types.includes("Internship")) setJobType("Internship");
            setOtherEmploymentTypes(types.filter((t) => t !== "Full-time" && t !== "Internship"));
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
        startYear: "",
        graduationYear: "",
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
        targetRole: targetRoles[0] || "",
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
          employmentTypes: [
            ...(jobType === "Both"
              ? ["Full-time", "Internship"]
              : jobType === "Full Time"
                ? ["Full-time"]
                : jobType === "Internship"
                  ? ["Internship"]
                  : []),
            ...otherEmploymentTypes,
          ],
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

  // When Continue finds a new problem in an education card, open that card. Typing only
  // clears errors, so it never moves the open card.
  const [checkedErrors, setCheckedErrors] = useState(fieldErrors);
  if (checkedErrors !== fieldErrors) {
    setCheckedErrors(fieldErrors);
    const newErrorKeys = Object.keys(fieldErrors).filter((key) => fieldErrors[key] && !checkedErrors[key]);
    const failed = educationList.findIndex((_, idx) => newErrorKeys.some((key) => key.startsWith(`edu_${idx}_`)));
    if (failed !== -1) setOpenEducation(failed);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <JourneyLoader variant="profile" size="hero" className="mb-4" />
        <h2 className="text-base font-semibold text-slate-900">Setting up Fresher Workspace...</h2>
        <p className="text-xs text-slate-500 mt-1">Loading your profile preferences</p>
      </div>
    );
  }

  const percentComplete = Math.round(((currentStep - 1) / STEPS.length) * 100);
  const currentYear = new Date().getFullYear();
  const goToStep = (stepId) => {
    setCurrentStep(stepId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo className="h-9 w-44" />

          <Link
            to="/fresher/dashboard"
            className="text-xs font-semibold text-neutral-400 hover:text-neutral-100 transition px-3 py-1.5 rounded-lg hover:bg-neutral-800"
          >
            Skip to Dashboard →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        <AccountDetailsCard />

        {/* Progress Stepper */}
        <section className={`${card} mb-6`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-200">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-neutral-400">{percentComplete}% complete</span>
          </div>

          <div className="relative mt-5">
            {/* Connecting line, filled up to the active step */}
            <div className="absolute left-5 right-5 top-5 h-0.5 bg-neutral-800 rounded-full">
              <div
                className="h-full bg-[#1e3a8a] rounded-full transition-all duration-300"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>

            <ol className="relative flex justify-between">
              {STEPS.map((step) => {
                const isDone = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const StepIcon = step.icon;
                return (
                  <li key={step.id} className="flex flex-col items-center w-16 sm:w-20">
                    <button
                      type="button"
                      onClick={() => goToStep(step.id)}
                      aria-current={isCurrent ? "step" : undefined}
                      aria-label={`${step.label}${isDone ? " (completed)" : ""}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                        isDone
                          ? "bg-[#5DCAA5] text-neutral-950 hover:brightness-110"
                          : isCurrent
                            ? "bg-[#1e3a8a] text-white ring-4 ring-[#1e3a8a]/30"
                            : "bg-neutral-900 text-neutral-500 border border-neutral-700 hover:border-neutral-500"
                      }`}
                    >
                      {isDone ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <StepIcon className="w-[18px] h-[18px]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(step.id)}
                      className={`mt-2 text-[11px] sm:text-xs font-medium text-center transition ${
                        isCurrent ? "text-neutral-100" : isDone ? "text-neutral-300 hover:text-white" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {step.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Global Error Notice */}
        {fieldErrors.submit && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{fieldErrors.submit}</div>
        )}

        {/* Step Content Card */}
        <div className={`${card} sm:p-6`}>
          {/* ============================================================
              STEP 1: EDUCATION
          ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <StepHeading
                title="Tell us about your education"
                subtitle="Add your recent degree, university, and graduation year to unlock eligible graduate roles."
              />

              {/* Timeline of education records */}
              <ol className="relative space-y-4">
                <span className="absolute left-[15px] top-4 bottom-4 w-px bg-neutral-800" aria-hidden="true" />
                {educationList.map((edu, idx) => {
                  const isOpen = openEducation === idx;
                  const hasErrors = ["degree", "institution", "graduationYear"].some((f) => fieldErrors[`edu_${idx}_${f}`]);
                  const qualificationLabel = QUALIFICATION_OPTIONS.find(([value]) => value === edu.qualificationType)?.[1];
                  const status = edu.graduationYear ? (edu.graduationYear > currentYear ? "Pursuing" : "Completed") : null;
                  const summary = educationSummary(edu);
                  return (
                    <li key={idx} className="relative pl-11">
                      <span
                        className={`absolute left-0 top-3 w-8 h-8 rounded-full flex items-center justify-center border ${
                          isOpen ? "bg-[#1e3a8a] border-[#1e3a8a] text-white" : "bg-neutral-900 border-neutral-700 text-neutral-400"
                        }`}
                        aria-hidden="true"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </span>

                      <div
                        className={`rounded-xl border transition ${
                          isOpen
                            ? "border-[#1e3a8a] ring-4 ring-[#1e3a8a]/20 bg-neutral-950/40"
                            : hasErrors
                              ? "border-red-500/60 bg-neutral-950/40"
                              : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700"
                        }`}
                      >
                        {/* Collapsed header */}
                        <div className="flex items-center gap-2 p-4">
                          <button
                            type="button"
                            onClick={() => setOpenEducation(isOpen ? -1 : idx)}
                            aria-expanded={isOpen}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-sm text-neutral-100 truncate">
                                {edu.degree || qualificationLabel || "New qualification"}
                              </span>
                              {idx === 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#1e3a8a]/30 text-blue-200 text-[10px] font-semibold">
                                  Primary
                                </span>
                              )}
                              {status && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                    status === "Pursuing" ? "bg-amber-500/15 text-amber-300" : "bg-[#5DCAA5]/15 text-[#5DCAA5]"
                                  }`}
                                >
                                  {status}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 truncate ${hasErrors && !isOpen ? "text-red-400" : "text-neutral-400"}`}>
                              {hasErrors && !isOpen ? "Some required details are missing" : summary || "Add your details"}
                            </p>
                          </button>

                          {educationList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveEducation(idx);
                                setOpenEducation((open) => (open === idx ? -1 : open > idx ? open - 1 : open));
                              }}
                              aria-label="Delete qualification"
                              className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenEducation(isOpen ? -1 : idx)}
                            aria-label={isOpen ? "Collapse qualification" : "Expand qualification"}
                            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {isOpen && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pb-4 pt-1 border-t border-neutral-800">
                            <div className="pt-3">
                              <label className={label}>Highest Qualification</label>
                              <select
                                value={edu.qualificationType}
                                onChange={(e) => handleEducationChange(idx, "qualificationType", e.target.value)}
                                className={input()}
                              >
                                {QUALIFICATION_OPTIONS.map(([value, text]) => (
                                  <option key={value} value={value}>
                                    {text}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:pt-3">
                              <label className={label}>Degree / Certificate Title *</label>
                              <input
                                type="text"
                                value={edu.degree}
                                onChange={(e) => handleEducationChange(idx, "degree", e.target.value)}
                                placeholder="e.g. B.Tech"
                                className={input(fieldErrors[`edu_${idx}_degree`])}
                              />
                              {fieldErrors[`edu_${idx}_degree`] && (
                                <p className={fieldError}>{fieldErrors[`edu_${idx}_degree`]}</p>
                              )}
                            </div>

                            <div>
                              <label className={label}>Specialization / Branch</label>
                              <input
                                type="text"
                                value={edu.specialization}
                                onChange={(e) => handleEducationChange(idx, "specialization", e.target.value)}
                                placeholder="e.g. Computer Science & Engineering"
                                className={input()}
                              />
                            </div>

                            <div>
                              <label className={label}>College / University *</label>
                              <input
                                type="text"
                                value={edu.institution}
                                onChange={(e) => handleEducationChange(idx, "institution", e.target.value)}
                                placeholder="e.g. E2Job / ABC Institute"
                                className={input(fieldErrors[`edu_${idx}_institution`])}
                              />
                              {fieldErrors[`edu_${idx}_institution`] && (
                                <p className={fieldError}>{fieldErrors[`edu_${idx}_institution`]}</p>
                              )}
                            </div>

                            <div>
                              <label className={label}>Start Year</label>
                              <input
                                type="number"
                                value={edu.startYear || ""}
                                onChange={(e) => handleEducationChange(idx, "startYear", parseInt(e.target.value, 10))}
                                placeholder="e.g. 2022"
                                className={input()}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={label}>Graduation Year *</label>
                                <input
                                  type="number"
                                  value={edu.graduationYear || ""}
                                  onChange={(e) => handleEducationChange(idx, "graduationYear", parseInt(e.target.value, 10))}
                                  placeholder="e.g. 2026"
                                  className={input(fieldErrors[`edu_${idx}_graduationYear`])}
                                />
                                {fieldErrors[`edu_${idx}_graduationYear`] && (
                                  <p className={fieldError}>{fieldErrors[`edu_${idx}_graduationYear`]}</p>
                                )}
                              </div>
                              <div>
                                <label className={label}>CGPA / %</label>
                                <input
                                  type="text"
                                  value={edu.percentageOrCgpa}
                                  onChange={(e) => handleEducationChange(idx, "percentageOrCgpa", e.target.value)}
                                  placeholder="e.g. 8.2"
                                  className={input()}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <AddButton
                onClick={() => {
                  handleAddEducation();
                  setOpenEducation(educationList.length);
                }}
              >
                Add another qualification
              </AddButton>
            </div>
          )}

          {/* ============================================================
              STEP 2: INTERNSHIP EXPERIENCE
          ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <StepHeading
                title="Do you have any internship experience?"
                subtitle="Internships demonstrate practical work readiness. If you have not done an internship yet, you can skip this step."
              />

              {/* Yes / No Toggle Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <ChoiceButton
                  selected={hasInternship}
                  onClick={() => {
                    setHasInternship(true);
                    if (internshipList.length === 0) handleAddInternship();
                  }}
                >
                  Yes, I have internship experience
                </ChoiceButton>
                <ChoiceButton selected={!hasInternship} onClick={() => setHasInternship(false)}>
                  No internship experience yet
                </ChoiceButton>
              </div>

              {!hasInternship ? (
                <div className="p-8 text-center rounded-xl bg-neutral-950/40 border border-neutral-800">
                  <div className="w-12 h-12 rounded-full bg-[#1e3a8a]/30 text-blue-300 mx-auto flex items-center justify-center mb-3">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-100">No internship experience yet</h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                    No problem at all! You can showcase your personal/academic projects in the next step to demonstrate your skills.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {internshipList.map((item, idx) => (
                    <RecordCard
                      key={idx}
                      title={`Internship #${idx + 1}`}
                      onRemove={() => handleRemoveInternship(idx)}
                      removeLabel="Delete internship"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={label}>Company Name *</label>
                          <input
                            type="text"
                            value={item.companyName}
                            onChange={(e) => handleInternshipChange(idx, "companyName", e.target.value)}
                            placeholder="e.g. Infosys, StartUp Inc."
                            className={input()}
                          />
                        </div>

                        <div>
                          <label className={label}>Internship Role *</label>
                          <input
                            type="text"
                            value={item.role}
                            onChange={(e) => handleInternshipChange(idx, "role", e.target.value)}
                            placeholder="e.g. Frontend Intern, Software Trainee"
                            className={input()}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={label}>Start Date</label>
                            <input
                              type="month"
                              value={item.startDate}
                              onChange={(e) => handleInternshipChange(idx, "startDate", e.target.value)}
                              className={input()}
                            />
                          </div>
                          <div>
                            <label className={label}>End Date</label>
                            <input
                              type="month"
                              value={item.endDate}
                              onChange={(e) => handleInternshipChange(idx, "endDate", e.target.value)}
                              className={input()}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={label}>Work Mode</label>
                          <select
                            value={item.workMode}
                            onChange={(e) => handleInternshipChange(idx, "workMode", e.target.value)}
                            className={input()}
                          >
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="On-site">On-site</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={label}>Description of Work</label>
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(e) => handleInternshipChange(idx, "description", e.target.value)}
                          placeholder="Briefly describe what you built, features developed, or tools you used during the internship..."
                          className={textarea()}
                        />
                      </div>

                      <div>
                        <label className={label}>Skills / Technologies Used (comma separated)</label>
                        <input
                          type="text"
                          value={item.skillsInput || ""}
                          onChange={(e) => handleInternshipChange(idx, "skillsInput", e.target.value)}
                          placeholder="e.g. React, Redux, REST API, Git"
                          className={input()}
                        />
                      </div>
                    </RecordCard>
                  ))}

                  <AddButton onClick={handleAddInternship}>Add another internship</AddButton>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 3: PROJECTS
          ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <StepHeading
                title="Showcase your projects"
                subtitle="Projects are strongly encouraged for freshers because they prove practical coding ability to recruiters."
              />

              {/* Yes / No Toggle */}
              <div className="flex flex-col sm:flex-row gap-3">
                <ChoiceButton
                  selected={hasProjects}
                  onClick={() => {
                    setHasProjects(true);
                    if (projectList.length === 0) handleAddProject();
                  }}
                >
                  Yes, I have projects to add
                </ChoiceButton>
                <ChoiceButton selected={!hasProjects} onClick={() => setHasProjects(false)}>
                  I will add projects later
                </ChoiceButton>
              </div>

              {hasProjects && (
                <div className="space-y-4">
                  {projectList.map((proj, idx) => (
                    <RecordCard
                      key={idx}
                      title={`Project #${idx + 1}`}
                      onRemove={projectList.length > 1 ? () => handleRemoveProject(idx) : null}
                      removeLabel="Delete project"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={label}>Project Name *</label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => handleProjectChange(idx, "title", e.target.value)}
                            placeholder="e.g. E2Job Job Portal, E-Commerce App"
                            className={input(fieldErrors[`proj_${idx}_title`])}
                          />
                          {fieldErrors[`proj_${idx}_title`] && (
                            <p className={fieldError}>{fieldErrors[`proj_${idx}_title`]}</p>
                          )}
                        </div>

                        <div>
                          <label className={label}>Project Type</label>
                          <select
                            value={proj.projectType}
                            onChange={(e) => handleProjectChange(idx, "projectType", e.target.value)}
                            className={input()}
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
                        <label className={label}>Short Description *</label>
                        <textarea
                          rows={3}
                          value={proj.description}
                          onChange={(e) => handleProjectChange(idx, "description", e.target.value)}
                          placeholder="Briefly explain what the project does, key problem it solves, and your contribution..."
                          className={textarea(fieldErrors[`proj_${idx}_description`])}
                        />
                        {fieldErrors[`proj_${idx}_description`] && (
                          <p className={fieldError}>{fieldErrors[`proj_${idx}_description`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={label}>Technologies / Tech Stack (comma separated)</label>
                        <input
                          type="text"
                          value={proj.techInput || ""}
                          onChange={(e) => handleProjectChange(idx, "techInput", e.target.value)}
                          placeholder="e.g. React, Node.js, Express, MongoDB, Tailwind CSS"
                          className={input()}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={label}>GitHub Repository URL</label>
                          <input
                            type="url"
                            value={proj.githubUrl}
                            onChange={(e) => handleProjectChange(idx, "githubUrl", e.target.value)}
                            placeholder="https://github.com/username/project"
                            className={input()}
                          />
                        </div>
                        <div>
                          <label className={label}>
                            Live Demo URL <span className="text-neutral-600">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            value={proj.liveUrl}
                            onChange={(e) => handleProjectChange(idx, "liveUrl", e.target.value)}
                            placeholder="https://myproject.vercel.app"
                            className={input()}
                          />
                        </div>
                      </div>
                    </RecordCard>
                  ))}

                  <AddButton onClick={handleAddProject}>Add another project</AddButton>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              STEP 4: SKILLS
          ============================================================ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <StepHeading
                title="What skills do you have?"
                subtitle="Select your core technical & soft skills. We’ll match your profile with relevant openings and provide personalized skill gap insights."
              />

              {fieldErrors.skills && <div className={errorBanner}>{fieldErrors.skills}</div>}

              {/* Search & Custom Add */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search technical skills..."
                    className={`${input()} pl-10`}
                  />
                </div>

                <form onSubmit={handleAddCustomSkill} className="flex gap-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    placeholder="Add custom skill"
                    className={`${input()} sm:w-48`}
                  />
                  <button type="submit" className={`${primaryButton} h-11 px-4 text-xs shrink-0`}>
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </form>
              </div>

              {/* Technical Skills Catalog */}
              <div>
                <span className={`${label} mb-2.5`}>Technical Skills (Click to select)</span>
                <div className="flex flex-wrap gap-2">
                  {filteredCatalogSkills.map((skill) => {
                    const isSelected = technicalSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleTechnicalSkill(skill)}
                        className={`${chip(isSelected)} inline-flex items-center gap-1`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Soft Skills */}
              <div>
                <span className={`${label} mb-2.5`}>Soft Skills</span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SOFT_SKILLS.map((skill) => {
                    const isSelected = softSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSoftSkill(skill)}
                        className={`${chip(isSelected, "success")} inline-flex items-center gap-1`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary / Strongest Skills Selection */}
              {technicalSkills.length > 0 && (
                <div className="p-4 rounded-xl bg-[#1e3a8a]/10 border border-[#1e3a8a]/40 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-100">Which skills are your strongest?</h4>
                      <p className="text-xs text-neutral-400">Pick up to 3–5 primary skills you excel at.</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-blue-200 bg-[#1e3a8a]/30 px-2.5 py-1 rounded-full">
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
                          className={`${chip(isPrimary)} inline-flex items-center gap-1`}
                        >
                          {isPrimary && <Star className="w-3.5 h-3.5 fill-current" />}
                          {skill}
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
              <StepHeading
                title="What kind of opportunity are you looking for?"
                subtitle="Configure your target roles, job preferences, and availability to receive tailored recommendations."
              />

              {fieldErrors.targetRoles && <div className={errorBanner}>{fieldErrors.targetRoles}</div>}

              {/* Target Role (Multi-select) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${label} mb-0`}>Target Role (Select multiple) *</span>
                  <span className="text-xs text-neutral-500">Selected: {targetRoles.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Roles saved at signup or on the dashboard show here too, even if not in the list. */}
                  {[...TARGET_ROLE_OPTIONS, ...targetRoles.filter((r) => !TARGET_ROLE_OPTIONS.includes(r))].map((role) => {
                    const isSelected = targetRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleTargetRole(role)}
                        className={`p-3 rounded-lg border text-left text-xs font-semibold transition flex items-center gap-1.5 ${
                          isSelected
                            ? "border-[#1e3a8a] bg-[#1e3a8a]/20 text-blue-100 ring-2 ring-[#1e3a8a]/30"
                            : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Job Type & Work Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className={label}>Job Type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {["Full Time", "Internship", "Both"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setJobType(type)}
                        className={`${chip(jobType === type)} py-2.5 text-center`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={label}>Work Mode</span>
                  <div className="grid grid-cols-3 gap-2">
                    {["On-site", "Hybrid", "Remote"].map((mode) => {
                      const isSelected = workModes.includes(mode);
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => toggleWorkMode(mode)}
                          className={`${chip(isSelected)} py-2.5 text-center`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Preferred Location */}
              <div>
                <span className={label}>Preferred Location (Select multiple)</span>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map((loc) => {
                    const isSelected = preferredLocations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggleLocation(loc)}
                        className={`${chip(isSelected)} inline-flex items-center gap-1`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Career Goal & Actively Looking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={label}>Career Goal</label>
                  <select value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} className={input()}>
                    <option value="">Select a career goal</option>
                    {CAREER_GOALS.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className={label}>Are you actively looking for opportunities?</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActivelyLooking(true)}
                      className={`${chip(activelyLooking, "success")} h-11 inline-flex items-center justify-center gap-1`}
                    >
                      {activelyLooking && <Check className="w-3.5 h-3.5" />}
                      Yes, Actively Looking
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivelyLooking(false)}
                      className={`h-11 rounded-lg border text-xs font-semibold transition ${
                        !activelyLooking
                          ? "border-neutral-500 bg-neutral-800 text-neutral-100"
                          : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600"
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
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 mt-8 border-t border-neutral-800">
            <p className="text-xs text-neutral-500">
              {currentStep < 5 ? "Your profile is saved when you finish step 5." : "Review your choices, then finish."}
            </p>
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button type="button" onClick={handleBack} className={`${outlineButton} flex-1 sm:flex-none`}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className={`${primaryButton} flex-1 sm:flex-none`}
              >
                {saving ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : currentStep === 5 ? (
                  <>
                    Save and finish
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#5DCAA5]/15 text-[#5DCAA5] flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-semibold text-neutral-100 tracking-tight">Your E2Job profile is ready!</h3>
            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
              We’ll use your profile to personalize jobs, skills and career recommendations.
            </p>

            <button
              type="button"
              onClick={() => navigate("/fresher/dashboard", { replace: true })}
              className={`${primaryButton} w-full mt-6 py-3`}
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FresherProfile;
