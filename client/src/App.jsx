import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import EmployerRegister from "./pages/auth/EmployerRegister";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import SetPassword from "./pages/auth/SetPassword.jsx";
import GoogleOnboarding from "./pages/auth/GoogleOnboarding.jsx";
import GoogleEmployerOnboarding from "./pages/auth/GoogleEmployerOnboarding.jsx";

// Guards
import RoleProtectedRoute from "./components/RoleProtectedRoute";

// General & Discovery Pages
import SelectRole from "./pages/SelectRole";
import Home from "./pages/Home.jsx";
import InternshipDiscoveryPage from "./pages/internships/InternshipDiscoveryPage";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import Internships from "./pages/student/Internships";
import InternshipDetail from "./pages/student/InternshipDetail";
import MyApplications from "./pages/student/MyApplications";

// Fresher
import FresherDashboard from "./pages/fresher/FresherDashboard";
import FresherProfile from "./pages/fresher/FresherProfile";

// Professional
import ProfessionalDashboard from "./pages/professional/ProfessionalDashboard";
import ProfessionalProfile from "./pages/professional/ProfessionalProfile";

// Employer
import EmployerProfile from "./pages/employer/EmployerProfile";
import EmployerDashboard from "./pages/employer/EmployerDashboard";
import CompanyPublicProfile from "./pages/employer/CompanyPublicProfile";
import PostInternship from "./pages/employer/PostInternship";
import MyInternships from "./pages/employer/MyInternships";
import EditInternship from "./pages/employer/EditInternship";

// Resume Builder
import ResumeBuilder from "./pages/resume/ResumeBuilder";

// Redux
import { getCurrentUser } from "./services/authService";
import { setUser, setInitialized } from "./redux/features/authSlice";
import { getDashboardPath } from "./utils/dashboardRedirect";

// ─── Route Guards for Public Pages ──────────────────────────────────────────
const RootRoute = () => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  if (!isInitialized) return null;
  if (user && user.hasPassword !== false && user.phone?.trim()) {
    return <Navigate to={getDashboardPath(user.userType, user)} replace />;
  }
  return <Navigate to="/home" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, isInitialized } = useSelector((state) => state.auth);
  if (!isInitialized) return null;
  if (user && user.hasPassword !== false && user.phone?.trim()) {
    return <Navigate to={getDashboardPath(user.userType, user)} replace />;
  }
  return children;
};

// ─── Auth Initializer ─────────────────────────────────────────────────────────
/**
 * AuthInitializer — runs once on app startup.
 *
 * Calls GET /api/auth/me to check if a valid CareerConnect JWT cookie exists.
 * If valid → restores user in Redux → isInitialized = true.
 * If invalid/expired → isInitialized = true, user = null → protected routes redirect to /login.
 *
 * While this check is pending, renders a full-screen loading spinner to prevent
 * a flash of the login page or incorrect redirects.
 */
const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const { isInitialized } = useSelector((state) => state.auth);
  const [initializing, setInitializing] = useState(!isInitialized);

  useEffect(() => {
    // If auth was already initialized (e.g., by a previous route check), skip
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
        // 401 from /me means no valid session — that's normal for logged-out users
        dispatch(setInitialized(true));
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
  }, []); // Runs exactly once on mount

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading CareerConnect...</p>
      </div>
    );
  }

  return children;
};

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Routes>
          {/* ========== PUBLIC ========== */}
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
          <Route path="/home" element={<Home />} />
          <Route path="/companies/:companyId" element={<CompanyPublicProfile />} />

          {/* ========== SET PASSWORD (Google-first users) ========== */}
          {/* Protected: accessible only when authenticated + hasPassword=false */}
          <Route path="/set-password" element={<SetPassword />} />

          {/* ========== GOOGLE ONBOARDING — CANDIDATES ========== */}
          {/* Shown after set-password → select-role → profile info + resume */}
          <Route path="/onboarding/profile" element={<GoogleOnboarding />} />

          {/* ========== GOOGLE ONBOARDING — EMPLOYERS ========== */}
          {/* Shown after set-password → company details collection */}
          <Route path="/onboarding/employer" element={<GoogleEmployerOnboarding />} />

          {/* ========== CANDIDATES: student + fresher + professional ========== */}
          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["student", "fresher", "professional"]}
              />
            }
          >
            <Route path="/internships" element={<Internships />} />
            <Route path="/internships/:id" element={<InternshipDetail />} />
            <Route path="/applications" element={<MyApplications />} />
          </Route>

          {/* Student-only */}
          <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<StudentProfile />} />
          </Route>

          {/* Fresher-only */}
          <Route element={<RoleProtectedRoute allowedRoles={["fresher"]} />}>
            <Route path="/fresher/dashboard" element={<FresherDashboard />} />
            <Route path="/fresher/profile" element={<FresherProfile />} />
          </Route>

          {/* Professional-only */}
          <Route element={<RoleProtectedRoute allowedRoles={["professional"]} />}>
            <Route path="/professional/dashboard" element={<ProfessionalDashboard />} />
            <Route path="/professional/profile" element={<ProfessionalProfile />} />
          </Route>

          {/* ========== EMPLOYER ========== */}
          <Route element={<RoleProtectedRoute allowedRoles={["employer"]} />}>
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/employer/profile" element={<EmployerProfile />} />
            <Route path="/employer/company" element={<CompanyPublicProfile />} />
            <Route path="/employer/internships" element={<MyInternships />} />
            <Route path="/employer/internships/new" element={<PostInternship />} />
            <Route path="/employer/internships/:id/edit" element={<EditInternship />} />
          </Route>

          <Route path="/resume-builder" element={<ResumeBuilder />} />

          {/* ========== DEFAULT ========== */}
          <Route path="/" element={<RootRoute />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthInitializer>
      
    </BrowserRouter>
  );
}

export default App;