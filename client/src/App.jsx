import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import {FEATURES} from "./config/features";
import JourneyLoader from "./components/common/JourneyLoader";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { getSafeRedirect } from "./utils/authRedirect";
import ErrorBoundary from "./components/common/ErrorBoundary";
// Guards & Common Modals
import RoleProtectedRoute from "./components/RoleProtectedRoute";

// Admin & 404
import NotFound from "./pages/NotFound";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminLogin = lazyWithRetry(() => import("./pages/admin/AdminLogin"));
const AdminCompanies = lazyWithRetry(() => import("./pages/admin/AdminCompanies"));
const AdminCompanyAdmins = lazyWithRetry(() => import("./pages/admin/AdminCompanyAdmins"));
const AdminCompanyProfile = lazyWithRetry(() => import("./pages/admin/AdminCompanyProfile"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminEmployers = lazyWithRetry(() => import("./pages/admin/AdminEmployers"));
const AdminOpportunities = lazyWithRetry(() => import("./pages/admin/AdminOpportunities"));
const AdminApplications = lazyWithRetry(() => import("./pages/admin/AdminApplications"));
const AdminReports = lazyWithRetry(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminSentryTest = lazyWithRetry(() => import("./pages/admin/AdminSentryTest"));

// Global Rate Limit Warning Modal
import RateLimitWarningModal from "./components/RateLimitWarningModal";
import FloatingAiAssistant from "./components/ai/FloatingAiAssistant";

// Lazy-loaded Pages: Public & Discovery
const Home = lazyWithRetry(() => import("./pages/Home.jsx"));
const SelectRole = lazyWithRetry(() => import("./pages/SelectRole"));
const JobDiscoveryPage = lazyWithRetry(() => import("./pages/jobs/JobDiscoveryPage"));
const JobDetailPage = lazyWithRetry(() => import("./pages/jobs/JobDetailPage"));
const InternshipDiscoveryPage = lazyWithRetry(
  () => import("./pages/internships/InternshipDiscoveryPage"),
);
const OpportunitiesPage = lazyWithRetry(() => import("./pages/OpportunitiesPage"));
const AccountSettings = lazyWithRetry(() => import("./pages/AccountSettings"));
const OrganizationRequestPage = lazyWithRetry(() => import("./pages/organizations/OrganizationRequestPage"));
const AdminActivate = lazyWithRetry(() => import("./pages/admin/AdminActivate"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const Terms = lazyWithRetry(() => import("./pages/legal/Terms"));
const Contact = lazyWithRetry(() => import("./pages/legal/Contact"));

// Lazy-loaded Pages: Auth
const Login = lazyWithRetry(() => import("./pages/auth/Login"));
const Signup = lazyWithRetry(() => import("./pages/auth/Signup"));
const EmployerRegister = lazyWithRetry(() => import("./pages/auth/EmployerRegister"));
const ForgotPassword = lazyWithRetry(() => import("./pages/auth/ForgotPassword.jsx"));
const SetPassword = lazyWithRetry(() => import("./pages/auth/SetPassword.jsx"));
const GoogleOnboarding = lazyWithRetry(
  () => import("./pages/auth/GoogleOnboarding.jsx"),
);
const GoogleEmployerOnboarding = lazyWithRetry(
  () => import("./pages/auth/GoogleEmployerOnboarding.jsx"),
);

// Lazy-loaded Pages: Student
const StudentDashboard = lazyWithRetry(() => import("./pages/student/StudentDashboard"));
const StudentProfile = lazyWithRetry(() => import("./pages/student/StudentProfile"));
const Internships = lazyWithRetry(() => import("./pages/student/Internships"));
const InternshipDetail = lazyWithRetry(() => import("./pages/student/InternshipDetail"));
const MyApplications = lazyWithRetry(() => import("./pages/student/MyApplications"));

// Lazy-loaded Pages: Courses
const StudentCoursesPage = lazyWithRetry(
  () => import("./pages/courses/StudentCoursesPage"),
);
const StudentMyCoursesPage = lazyWithRetry(
  () => import("./pages/courses/StudentMyCoursesPage"),
);
const CourseDetailsPage = lazyWithRetry(
  () => import("./pages/courses/CourseDetailsPage"),
);
const EmployeeCoursesPage = lazyWithRetry(
  () => import("./pages/courses/EmployeeCoursesPage"),
);
const CreateCoursePage = lazyWithRetry(() => import("./pages/courses/CreateCoursePage"));
const EditCoursePage = lazyWithRetry(() => import("./pages/courses/EditCoursePage"));
const CourseContentPage = lazyWithRetry(
  () => import("./pages/courses/CourseContentPage"),
);

// Lazy-loaded Pages: Fresher
const FresherDashboard = lazyWithRetry(() => import("./pages/fresher/FresherDashboard"));
const FresherProfile = lazyWithRetry(() => import("./pages/fresher/FresherProfile"));
const CareerRecommendationsPage = lazyWithRetry(
  () => import("./pages/fresher/CareerRecommendationsPage"),
);

// Lazy-loaded Pages: Professional
const ProfessionalDashboard = lazyWithRetry(
  () => import("./pages/professional/ProfessionalDashboard"),
);
const ProfessionalProfile = lazyWithRetry(
  () => import("./pages/professional/ProfessionalProfile"),
);

// Lazy-loaded Pages: Employer
const EmployerProfile = lazyWithRetry(() => import("./pages/employer/EmployerProfile"));
const EmployerDashboard = lazyWithRetry(
  () => import("./pages/employer/EmployerDashboard"),
);
const CompanyPublicProfile = lazyWithRetry(
  () => import("./pages/employer/CompanyPublicProfile"),
);
const PostInternship = lazyWithRetry(() => import("./pages/employer/PostInternship"));
const CreateOpportunityPage = lazyWithRetry(() => import("./pages/employer/CreateOpportunityPage"));
const EmployerApplicationDetailPage = lazyWithRetry(() => import("./pages/employer/EmployerApplicationDetailPage"));
const StudentApplicationTrackingPage = lazyWithRetry(() => import("./pages/student/StudentApplicationTrackingPage"));
const MyInternships = lazyWithRetry(() => import("./pages/employer/MyInternships"));
const EditInternship = lazyWithRetry(() => import("./pages/employer/EditInternship"));
const JobPostingFlow = lazyWithRetry(() => import("./pages/employer/JobPostingFlow"));

// Lazy-loaded Pages: Resume Builder & Live Resume (FL-15)
const ResumeBuilder = lazyWithRetry(() => import("./pages/resume/ResumeBuilder"));
const LiveResume = lazyWithRetry(() => import("./pages/resume/LiveResume"));

// Lightweight Page Fallback Loader
const PageFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <JourneyLoader message="Getting your next move ready" detail="Connecting the right opportunities." />
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
    if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.hasPassword === false) {
      return <Navigate to="/set-password" replace />;
    }
    if (!user.phone?.trim() || !user.isProfileComplete) {
      return (
        <Navigate
          to={
            user.role === "employer"
              ? "/onboarding/employer"
              : "/onboarding/profile"
          }
          replace
        />
      );
    }
    return (
      <Navigate
        to={getDashboardPath(user.userType || user.role, user)}
        replace
      />
    );
  }
  return <Home />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!isInitialized) return null;
  if (user) {
    if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN" || user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.hasPassword === false) {
      return <Navigate to="/set-password" replace />;
    }
    if (!user.phone?.trim() || !user.isProfileComplete) {
      return (
        <Navigate
          to={
            user.role === "employer"
              ? "/onboarding/employer"
              : "/onboarding/profile"
          }
          replace
        />
      );
    }
    return (
      <Navigate
        to={getSafeRedirect(location.search) || getDashboardPath(user.userType || user.role, user)}
        replace
      />
    );
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
        <JourneyLoader size="hero" variant="access" message="Opening your E2Job" detail="Your next step is coming together." />
      </div>
    );
  }

  return children;
};

// =====================================================
// APP
// =====================================================

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
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
            <Route
              path="/companies/:companyId"
              element={<CompanyPublicProfile />}
            />
            <Route path="/organizations" element={<OrganizationRequestPage />} />
            <Route path="/organizations/request-access" element={<OrganizationRequestPage />} />

            {/* =================================================
              LEGAL (public for everyone, logged in or not)
          ================================================= */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />

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
            <Route
              path="/jobs/category/:category"
              element={<JobDiscoveryPage />}
            />
            <Route path="/jobs/:id" element={<JobDetailPage />} />

            {/* =================================================
              LIVE OPPORTUNITIES MATRIX & DISCOVERY
          ================================================= */}
            <Route path="/opportunities" element={<OpportunitiesPage />} />

            {/* =================================================
              INTERNSHIP DISCOVERY
          ================================================= */}
            <Route path="/internships" element={<InternshipDiscoveryPage />} />
            <Route path="/internships/browse" element={<Internships />} />
            <Route
              path="/internships/work-from-home"
              element={<InternshipDiscoveryPage />}
            />
            <Route
              path="/internships/international"
              element={<InternshipDiscoveryPage />}
            />
            <Route
              path="/internships/latest"
              element={<InternshipDiscoveryPage />}
            />
            <Route
              path="/internships/paid"
              element={<InternshipDiscoveryPage />}
            />
            <Route
              path="/internships/with-job-offer"
              element={<InternshipDiscoveryPage />}
            />
            <Route
              path="/internships/in/:city"
              element={<InternshipDiscoveryPage />}
            />
            <Route
              path="/internships/category/:category"
              element={<InternshipDiscoveryPage />}
            />
            <Route path="/internships/:id" element={<InternshipDetail />} />

            {/* =================================================
              GOOGLE ONBOARDING
          ================================================= */}
            <Route path="/onboarding/profile" element={<GoogleOnboarding />} />
            <Route
              path="/onboarding/employer"
              element={<GoogleEmployerOnboarding />}
            />

            {/* ========== ACCOUNT SETTINGS: candidates and employers ========== */}
            <Route element={<RoleProtectedRoute allowedRoles={["student", "fresher", "professional", "employer"]} />}>
              <Route path="/account" element={<AccountSettings />} />
            </Route>

            {/* ========== CANDIDATES: student + fresher + professional ========== */}
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={["student", "fresher", "professional"]}
                />
              }
            >
              <Route path="/applications" element={<MyApplications />} />

              {FEATURES.courses && (
                <>
                  <Route path="/courses" element={<StudentCoursesPage />} />
                  <Route path="/courses/:id" element={<CourseDetailsPage />} />
                  <Route
                    path="/courses/:id/learn"
                    element={<CourseContentPage />}
                  />
                </>
              )}
           
            <Route path="/student/jobs/:id" element={<InternshipDetail />} />
            <Route path="/applications" element={<MyApplications />} />
            <Route path="/student/applications" element={<MyApplications />} />
            <Route path="/student/applications/:applicationId" element={<StudentApplicationTrackingPage />} />


             {FEATURES.courses && (
              <>
                <Route path="/courses" element={<StudentCoursesPage />} />
                <Route path="/courses/:id" element={<CourseDetailsPage />} />
                <Route path="/my-courses" element={<StudentMyCoursesPage />} />
              </>
            )}

            <Route path="/ats-resume" element={<Navigate to="/resume-builder?mode=ats-checker" replace />} />
          </Route>

            {/* =================================================
              STUDENT ONLY
          ================================================= */}
            <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/profile" element={<StudentProfile />} />
            </Route>

            {/* =================================================
              FRESHER ONLY
          ================================================= */}
            <Route element={<RoleProtectedRoute allowedRoles={["fresher"]} />}>
              <Route path="/fresher/dashboard" element={<FresherDashboard />} />
              <Route path="/fresher/profile" element={<FresherProfile />} />
              <Route
                path="/fresher/profile/setup"
                element={<FresherProfile />}
              />
              <Route
                path="/fresher/career-recommendations"
                element={<CareerRecommendationsPage />}
              />
            </Route>

            {/* =================================================
              PROFESSIONAL ONLY
          ================================================= */}
            <Route
              element={<RoleProtectedRoute allowedRoles={["professional"]} />}
            >
              <Route
                path="/professional/dashboard"
                element={<ProfessionalDashboard />}
              />
              <Route
                path="/professional/profile"
                element={<ProfessionalProfile />}
              />
            </Route>

            {/* =================================================
              EMPLOYER ONLY
          ================================================= */}
            <Route element={<RoleProtectedRoute allowedRoles={["employer"]} />}>
              <Route
                path="/employer/dashboard"
                element={<EmployerDashboard />}
              />
           
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/employer/jobs/create" element={<CreateOpportunityPage />} />
            <Route path="/employer/jobs/:id" element={<CreateOpportunityPage />} />
            <Route path="/employer/applications/:applicationId" element={<EmployerApplicationDetailPage />} />
            <Route path="/employer/profile" element={<EmployerProfile />} />
            <Route path="/employer/company" element={<CompanyPublicProfile />} />
            <Route path="/employer/internships" element={<MyInternships />} />
            <Route path="/employer/internships/new" element={<CreateOpportunityPage />} />

            
            <Route path="/employer/internships/:id/edit" element={<CreateOpportunityPage />} />

            {/* EMPLOYER COURSES */}

            {/* EMPLOYER COURSES */}
            {FEATURES.courses && (
              <>
                <Route path="/employer/courses" element={<EmployeeCoursesPage />} />
                <Route path="/employer/courses/create" element={<CreateCoursePage />} />
                <Route path="/employer/courses/:id/edit" element={<EditCoursePage />} />
                <Route path="/employer/courses/:id/content" element={<CourseContentPage />} />
              </>
            )}
          </Route>

          {/* =================================================
              ADMIN AUTHENTICATION & DASHBOARD
          ================================================= */}
          {/* Public Admin Login only */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/activate" element={<AdminActivate />} />

          {/* 404 Security: /admin and public-facing fake routes return generic 404 */}
          <Route path="/admin" element={<NotFound />} />
          <Route path="/admin/register" element={<NotFound />} />
          <Route path="/admin/signup" element={<NotFound />} />
          <Route path="/admin/create" element={<NotFound />} />

          {/* Strictly Protected Admin Routes */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* SUPER_ADMIN ONLY: Platform Multi-Tenant Provisioning & Management */}
            <Route element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN"]} />}>
              <Route path="/admin/companies" element={<AdminCompanies />} />
              <Route path="/admin/company-admins" element={<AdminCompanyAdmins />} />
              {/* Monitoring check (I08): sends test errors to Sentry */}
              <Route path="/admin/sentry-test" element={<AdminSentryTest />} />
            </Route>

            {/* COMPANY_ADMIN ONLY: Own Assigned Organization Profile & Settings */}
            <Route element={<AdminProtectedRoute allowedRoles={["COMPANY_ADMIN"]} />}>
              <Route path="/admin/company" element={<AdminCompanyProfile />} />
            </Route>

            {/* Shared Scoped Admin Routes */}
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/students" element={<AdminUsers />} />
            <Route path="/admin/employers" element={<AdminEmployers />} />
            <Route path="/admin/opportunities" element={<AdminOpportunities />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          {/* =================================================
              RESUME BUILDER & LIVE RESUME (FL-15)
          ================================================= */}
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/live-resume" element={<LiveResume />} />
          <Route path="/live-resume/:id" element={<LiveResume />} />
          <Route path="/resume/live" element={<LiveResume />} />
          <Route path="/resume/live/:id" element={<LiveResume />} />

          {/* ========== DEFAULT & 404 ========== */}
          <Route path="/" element={<RootRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
            </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RateLimitWarningModal />
      <FloatingAiAssistant />
      <AuthInitializer>
        <AppRoutes />
      </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;
