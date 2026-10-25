import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CampusProvider } from "./context";
import { useCampus } from "./useCampus";
import { Spinner } from "./components/ui";
import { homeFor } from "./home";
import Landing from "./pages/Landing";
import Consent from "./pages/Consent";
import Privacy from "./pages/Privacy";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Classes from "./pages/Classes";
import TestPage from "./pages/TestPage";
import Result from "./pages/Result";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import OpsLogin from "./pages/ops/OpsLogin";
import OpsStudents from "./pages/ops/OpsStudents";
import OpsReview from "./pages/ops/OpsReview";
import OpsAttempt from "./pages/ops/OpsAttempt";
import OpsClasses from "./pages/ops/OpsClasses";
import OpsAdmins from "./pages/ops/OpsAdmins";
import OpsTests from "./pages/ops/OpsTests";

// The campus portal (docs/campus/architecture.md). Rendered instead of the E2Job app on a
// campus host; uses only campus code and the shared Firebase config.

/** Lets a route open only for the given people; everyone else goes to their own home. */
const Only = ({ who, children }) => {
  const campus = useCampus();
  const { member, staff, needsConsent } = campus;
  const allowed =
    (who.includes("staff") && staff) ||
    (member && !needsConsent && who.includes(member.role)) ||
    (who.includes("consent") && member && needsConsent);
  if (allowed) return children;
  return <Navigate to={homeFor(campus)} replace />;
};

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
    <div>
      <p className="text-lg font-bold text-slate-900">This portal was not found</p>
      <p className="mt-2 text-sm text-slate-600">Check the address and try again.</p>
    </div>
  </div>
);

const Routed = () => {
  const campus = useCampus();
  if (campus.tenantError === "not_found") return <NotFound />;
  if (campus.tenantError) return <div className="p-10 text-center text-sm text-slate-600">The portal is not reachable right now. Please try again in a moment.</div>;
  if (!campus.institution || campus.loading) return <Spinner label="Opening the portal..." />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/welcome" element={<Only who={["consent"]}><Consent /></Only>} />
      <Route path="/dashboard" element={<Only who={["student"]}><Dashboard /></Only>} />
      <Route path="/profile" element={<Only who={["student"]}><Profile /></Only>} />
      <Route path="/classes" element={<Only who={["student"]}><Classes /></Only>} />
      <Route path="/test/:assessmentId" element={<Only who={["student"]}><TestPage /></Only>} />
      <Route path="/result/:assessmentId" element={<Only who={["student"]}><Result /></Only>} />
      <Route path="/manager" element={<Only who={["manager", "staff"]}><ManagerDashboard /></Only>} />
      <Route path="/ops/login" element={campus.staff ? <Navigate to="/ops/students" replace /> : <OpsLogin />} />
      <Route path="/ops/students" element={<Only who={["staff"]}><OpsStudents /></Only>} />
      <Route path="/ops/review" element={<Only who={["staff"]}><OpsReview /></Only>} />
      <Route path="/ops/attempts/:id" element={<Only who={["staff"]}><OpsAttempt /></Only>} />
      <Route path="/ops/classes" element={<Only who={["staff"]}><OpsClasses /></Only>} />
      <Route path="/ops/tests" element={<Only who={["staff"]}><OpsTests /></Only>} />
      <Route path="/ops/admins" element={<Only who={["staff"]}><OpsAdmins /></Only>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const CampusApp = () => (
  <BrowserRouter>
    <CampusProvider>
      <Routed />
    </CampusProvider>
  </BrowserRouter>
);

export default CampusApp;
