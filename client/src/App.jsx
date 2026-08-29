import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// Components & Route Protectors
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

// General Pages
import SelectRole from "./pages/SelectRole";
import Home from "./pages/Home.jsx";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";

// Fresher Pages
import FresherDashboard from "./pages/fresher/FresherDashboard";
import FresherProfile from "./pages/fresher/FresherProfile";

// Professional Pages
import ProfessionalDashboard from "./pages/professional/ProfessionalDashboard";
import ProfessionalProfile from "./pages/professional/ProfessionalProfile";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import EmployerRegister from "./pages/auth/EmployerRegister.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============================= */}
        {/* PUBLIC ROUTES                 */}
        {/* ============================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/register/student" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register/employer" element={<EmployerRegister />} />

        {/* ============================= */}
        {/* BASE PROTECTED ROUTES         */}
        {/* ============================= */}
        {/* <Route element={<ProtectedRoute />}>
        </Route> */}

        {/* ============================= */}
        {/* ROLE PROTECTED: STUDENT       */}
        {/* ============================= */}
        <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
        </Route>

        {/* ============================= */}
        {/* ROLE PROTECTED: FRESHER       */}
        {/* ============================= */}
        <Route element={<RoleProtectedRoute allowedRoles={["fresher"]} />}>
          <Route path="/fresher/dashboard" element={<FresherDashboard />} />
          <Route path="/fresher/profile" element={<FresherProfile />} />
        </Route>

        {/* ============================= */}
        {/* ROLE PROTECTED: PROFESSIONAL  */}
        {/* ============================= */}
        <Route element={<RoleProtectedRoute allowedRoles={["professional"]} />}>
          <Route path="/professional/dashboard" element={<ProfessionalDashboard />} />
          <Route path="/professional/profile" element={<ProfessionalProfile />} />
        </Route>

        {/* ============================= */}
        {/* DEFAULT & FALLBACK ROUTES     */}
        {/* ============================= */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;