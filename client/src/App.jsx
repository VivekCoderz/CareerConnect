import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";

// Guards & Common Modals
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import RateLimitWarningModal from "./components/RateLimitWarningModal";
import FloatingAiAssistant from "./components/ai/FloatingAiAssistant";

// Lazy-loaded Pages: Public & Discovery
const Home = lazy(() => import("./pages/Home.jsx"));
const SelectRole = lazy(() => import("./pages/SelectRole"));
const JobDiscoveryPage = lazy(() => import("./pages/jobs/JobDiscoveryPage"));
const InternshipDiscoveryPage = lazy(() => import("./pages/internships/InternshipDiscoveryPage"));
const OpportunitiesPage = lazy(() => import("./pages/OpportunitiesPage"));

// Lazy-loaded Pages: Auth
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const EmployerRegister = lazy(() => import("./pages/auth/EmployerRegister"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword.jsx"));
const SetPassword = lazy(() => import("./pages/auth/SetPassword.jsx"));
const GoogleOnboarding = lazy(() => import("./pages/auth/GoogleOnboarding.jsx"));
const GoogleEmployerOnboarding = lazy(() => import("./pages/auth/GoogleEmployerOnboarding.jsx"));

// Lazy-loaded Pages: Student
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const Internships = lazy(() => import("./pages/student/Internships"));
const InternshipDetail = lazy(() => import("./pages/student/InternshipDetail"));
const MyApplications = lazy(() => import("./pages/student/MyApplications"));

// Lazy-loaded Pages: Courses
const StudentCoursesPage = lazy(() => import("./pages/courses/StudentCoursesPage"));
const StudentMyCoursesPage = lazy(() => import("./pages/courses/StudentMyCoursesPage"));
const CourseDetailsPage = lazy(() => import("./pages/courses/CourseDetailsPage"));
const EmployeeCoursesPage = lazy(() => import("./pages/courses/EmployeeCoursesPage"));
const CreateCoursePage = lazy(() => import("./pages/courses/CreateCoursePage"));
const EditCoursePage = lazy(() => import("./pages/courses/EditCoursePage"));
const CourseContentPage = lazy(() => import("./pages/courses/CourseContentPage"));

// Lazy-loaded Pages: Fresher
const FresherDashboard = lazy(() => import("./pages/fresher/FresherDashboard"));
const FresherProfile = lazy(() => import("./pages/fresher/FresherProfile"));
const CareerRecommendationsPage = lazy(() => import("./pages/fresher/CareerRecommendationsPage"));

// Lazy-loaded Pages: Professional
const ProfessionalDashboard = lazy(() => import("./pages/professional/ProfessionalDashboard"));
const ProfessionalProfile = lazy(() => import("./pages/professional/ProfessionalProfile"));

// Lazy-loaded Pages: Employer
const EmployerProfile = lazy(() => import("./pages/employer/EmployerProfile"));
const EmployerDashboard = lazy(() => import("./pages/employer/EmployerDashboard"));
const CompanyPublicProfile = lazy(() => import("./pages/employer/CompanyPublicProfile"));
const PostInternship = lazy(() => import("./pages/employer/PostInternship"));
const MyInternships = lazy(() => import("./pages/employer/MyInternships"));
const EditInternship = lazy(() => import("./pages/employer/EditInternship"));

// Lazy-loaded Pages: Resume Builder
const ResumeBuilder = lazy(() => import("./pages/resume/ResumeBuilder"));

// Lightweight Page Fallback Loader
const PageFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="relative flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-[#1e3a8a] animate-spin" />
      <span className="absolute text-[9px] font-black text-[#1e3a8a]">GU</span>
    </div>
    <p className="mt-3 text-xs font-semibold text-slate-400 animate-pulse">
      Loading...
    </p>
  </div>
);

// Redux
import { getCurrentUser } from "./services/authService";
import { setUser, setInitialized } from "./redux/features/authSlice";
import { getDashboardPath } from "./utils/dashboardRedirect";

// ─── Route Guards for Public Pages ──────────────────────────────────────────
const RootRoute = () => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  if (!isInitialized) return null;
  if (user) {
    if (user.hasPassword === false) {
      return <Navigate to="/set-password" replace />;
    }
    if (!user.phone?.trim() || !user.isProfileComplete) {
      return <Navigate to={user.role === "employer" ? "/onboarding/employer" : "/onboarding/profile"} replace />;
    }
    return <Navigate to={getDashboardPath(user.userType || user.role, user)} replace />;
  }
  return <Home />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  if (!isInitialized) return null;
  if (user) {
    if (user.hasPassword === false) {
      return <Navigate to="/set-password" replace />;
    }
    if (!user.phone?.trim() || !user.isProfileComplete) {
      return <Navigate to={user.role === "employer" ? "/onboarding/employer" : "/onboarding/profile"} replace />;
    }
    return <Navigate to={getDashboardPath(user.userType || user.role, user)} replace />;
  }
  return children;
};

// =====================================================
// AUTH INITIALIZER
// =====================================================

const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();

  const { isInitialized } = useSelector((state) => state.auth);

  const [initializing, setInitializing] = useState(!isInitialized);

  useEffect(() => {
    if (isInitialized) {
      setInitializing(false);
      return;
    }

    const initAuth = async () => {
      try {
        const res = await getCurrentUser();

        if (res?.success && res?.user) {
          dispatch(setUser(res.user));
        } else {
          dispatch(setInitialized(true));
        }
      } catch {
        dispatch(setInitialized(true));
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />

        <p className="text-sm font-medium text-slate-500">
          Loading CareerConnect...
        </p>
      </div>
    );
  }

  return children;
};

// =====================================================
// APP
// =====================================================

function App() {
  return (
    <BrowserRouter>
      <RateLimitWarningModal />
      <FloatingAiAssistant />
      <AuthInitializer>
        <Suspense fallback={<PageFallback />}>
          <Routes>
          {/* =================================================
              PUBLIC ROUTES
          ================================================= */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register/student"
            element={
              <PublicOnlyRoute>
                <Signup />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register/employer"
            element={
              <PublicOnlyRoute>
                <EmployerRegister />
              </PublicOnlyRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route
            path="/home"
            element={
              <PublicOnlyRoute>
                <Home />
              </PublicOnlyRoute>
            }
          />
          <Route path="/companies/:companyId" element={<CompanyPublicProfile />} />

          {/* =================================================
              SET PASSWORD
          ================================================= */}
          <Route path="/set-password" element={<SetPassword />} />

          {/* =================================================
              JOB DISCOVERY
          ================================================= */}
          <Route path="/jobs" element={<JobDiscoveryPage />} />
          <Route path="/jobs/work-from-home" element={<JobDiscoveryPage />} />
          <Route path="/jobs/latest" element={<JobDiscoveryPage />} />
          <Route path="/jobs/in/:city" element={<JobDiscoveryPage />} />
          <Route path="/jobs/category/:category" element={<JobDiscoveryPage />} />

          {/* =================================================
              LIVE OPPORTUNITIES MATRIX & DISCOVERY
          ================================================= */}
          <Route path="/opportunities" element={<OpportunitiesPage />} />

          {/* =================================================
              INTERNSHIP DISCOVERY
          ================================================= */}
          <Route path="/internships" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/browse" element={<Internships />} />
          <Route path="/internships/work-from-home" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/international" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/latest" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/paid" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/with-job-offer" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/in/:city" element={<InternshipDiscoveryPage />} />
          <Route path="/internships/category/:category" element={<InternshipDiscoveryPage />} />

          {/* =================================================
              GOOGLE ONBOARDING
          ================================================= */}
          <Route path="/onboarding/profile" element={<GoogleOnboarding />} />
          <Route path="/onboarding/employer" element={<GoogleEmployerOnboarding />} />

          {/* ========== CANDIDATES: student + fresher + professional ========== */}
          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={[
                  "student",
                  "fresher",
                  "professional",
                ]}
              />
            }
          >
            <Route path="/internships/:id" element={<InternshipDetail />} />
            <Route path="/applications" element={<MyApplications />} />
            <Route path="/courses" element={<StudentCoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/my-courses" element={<StudentMyCoursesPage />} />
          </Route>

          {/* =================================================
              STUDENT ONLY
          ================================================= */}
          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["student"]}
              />
            }
          >
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<StudentProfile />} />
          </Route>

          {/* =================================================
              FRESHER ONLY
          ================================================= */}
          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["fresher"]}
              />
            }
          >
            <Route path="/fresher/dashboard" element={<FresherDashboard />} />
            <Route path="/fresher/profile" element={<FresherProfile />} />
            <Route path="/fresher/profile/setup" element={<FresherProfile />} />
            <Route path="/fresher/career-recommendations" element={<CareerRecommendationsPage />} />
          </Route>

          {/* =================================================
              PROFESSIONAL ONLY
          ================================================= */}
          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["professional"]}
              />
            }
          >
            <Route path="/professional/dashboard" element={<ProfessionalDashboard />} />
            <Route path="/professional/profile" element={<ProfessionalProfile />} />
          </Route>

          {/* =================================================
              EMPLOYER ONLY
          ================================================= */}
          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["employer"]}
              />
            }
          >
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/employer/profile" element={<EmployerProfile />} />
            <Route path="/employer/company" element={<CompanyPublicProfile />} />
            <Route path="/employer/internships" element={<MyInternships />} />
            <Route path="/employer/internships/new" element={<PostInternship />} />
            <Route path="/employer/internships/:id/edit" element={<EditInternship />} />

            {/* EMPLOYER COURSES */}
            <Route path="/employer/courses" element={<EmployeeCoursesPage />} />
            <Route path="/employer/courses/create" element={<CreateCoursePage />} />
            <Route path="/employer/courses/:id/edit" element={<EditCoursePage />} />
            <Route path="/employer/courses/:id/content" element={<CourseContentPage />} />
          </Route>

          {/* =================================================
              RESUME BUILDER
          ================================================= */}
          <Route path="/resume-builder" element={<ResumeBuilder />} />

          {/* ========== DEFAULT ========== */}
          <Route path="/" element={<RootRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;