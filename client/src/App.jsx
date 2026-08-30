
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import EmployeeCoursesPage from "./pages/courses/EmployeeCoursesPage";

// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import EmployerRegister from "./pages/auth/EmployerRegister";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";

// Guards
import RoleProtectedRoute from "./components/RoleProtectedRoute";

// General
import SelectRole from "./pages/SelectRole";
import Home from "./pages/Home.jsx";

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

// =============================
// RESUME BUILDER (new)
// =============================
import ResumeBuilder from "./pages/resume/ResumeBuilder";

function App() {
  return (
    <BrowserRouter>
      <Routes>
    
        <Route path="/login" element={<Login />} />
        <Route path="/register/student" element={<Signup />} />
        <Route path="/register/employer" element={<EmployerRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/select-role" element={<SelectRole />} />
        <Route path="/home" element={<Home />} />
        <Route
          path="/companies/:companyId"
          element={<CompanyPublicProfile />}
        />

      
        <Route
          path="/employer/courses"
          element={<EmployeeCoursesPage />}
        />

        
        {/* Internships & applications shared */}
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
        <Route
          element={
            <RoleProtectedRoute allowedRoles={["professional"]} />
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

       
        <Route element={<RoleProtectedRoute allowedRoles={["employer"]} />}>
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer/profile" element={<EmployerProfile />} />
          <Route path="/employer/company" element={<CompanyPublicProfile />} />
          <Route path="/employer/internships" element={<MyInternships />} />
          <Route
            path="/employer/internships/new"
            element={<PostInternship />}
          />
          <Route
            path="/employer/internships/:id/edit"
            element={<EditInternship />}
          />
        </Route>

        <Route path="/resume-builder" element={<ResumeBuilder />} />

     
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

