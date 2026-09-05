import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

// Courses
import EmployeeCoursesPage from "./pages/courses/EmployeeCoursesPage";

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import EmployerRegister from "./pages/auth/EmployerRegister";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import SetPassword from "./pages/auth/SetPassword.jsx";

// Guards
import RoleProtectedRoute from "./components/RoleProtectedRoute";

// General & Discovery
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
      <AuthInitializer>
        <Routes>

          {/* =================================================
              PUBLIC ROUTES
          ================================================= */}

          <Route path="/login" element={<Login />} />

          <Route
            path="/register/student"
            element={<Signup />}
          />

          <Route
            path="/register/employer"
            element={<EmployerRegister />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/select-role"
            element={<SelectRole />}
          />

          <Route
            path="/home"
            element={<Home />}
          />

          <Route
            path="/companies/:companyId"
            element={<CompanyPublicProfile />}
          />

          {/* =================================================
              SET PASSWORD
          ================================================= */}

          <Route
            path="/set-password"
            element={<SetPassword />}
          />

          {/* =================================================
              INTERNSHIP DISCOVERY
          ================================================= */}

          <Route
            path="/internships"
            element={<InternshipDiscoveryPage />}
          />

          <Route
            path="/internships/browse"
            element={<Internships />}
          />

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

          {/* =================================================
              STUDENT + FRESHER + PROFESSIONAL
          ================================================= */}

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
            <Route
              path="/internships/:id"
              element={<InternshipDetail />}
            />

            <Route
              path="/applications"
              element={<MyApplications />}
            />
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
            <Route
              path="/student/dashboard"
              element={<StudentDashboard />}
            />

            <Route
              path="/student/profile"
              element={<StudentProfile />}
            />
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
            <Route
              path="/fresher/dashboard"
              element={<FresherDashboard />}
            />

            <Route
              path="/fresher/profile"
              element={<FresherProfile />}
            />
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

          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["employer"]}
              />
            }
          >
            <Route
              path="/employer/dashboard"
              element={<EmployerDashboard />}
            />

            <Route
              path="/employer/profile"
              element={<EmployerProfile />}
            />

            <Route
              path="/employer/company"
              element={<CompanyPublicProfile />}
            />

            <Route
              path="/employer/internships"
              element={<MyInternships />}
            />

            <Route
              path="/employer/internships/new"
              element={<PostInternship />}
            />

            <Route
              path="/employer/internships/:id/edit"
              element={<EditInternship />}
            />

            {/* ===============================
                EMPLOYER COURSES
            =============================== */}

            <Route
              path="/employer/courses"
              element={<EmployeeCoursesPage />}
            />
          </Route>

          {/* =================================================
              RESUME BUILDER
          ================================================= */}

          <Route
            path="/resume-builder"
            element={<ResumeBuilder />}
          />

          {/* =================================================
              DEFAULT ROUTES
          ================================================= */}

          <Route
            path="/"
            element={
              <Navigate
                to="/home"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/home"
                replace
              />
            }
          />

        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;