import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../components/common/AuthLayout';
import LoginPage from '../components/pages/LoginPage';
import SignupPage from '../components/pages/SignupPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthLayout>
            <SignupPage />
          </AuthLayout>
        }
      />
      {/* Redirect root to login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Catch all other paths and redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
