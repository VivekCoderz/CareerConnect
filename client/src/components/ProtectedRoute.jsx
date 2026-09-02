import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "../services/authService";
import { setUser, setInitialized } from "../redux/features/authSlice";

const ProtectedRoute = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user, isInitialized } = useSelector((state) => state.auth);
  const [checkingAuth, setCheckingAuth] = useState(!isInitialized && !user);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!user && !isInitialized) {
        try {
          const res = await getCurrentUser();
          if (res?.success && res?.user) {
            dispatch(setUser(res.user));
          } else {
            dispatch(setInitialized(true));
          }
        } catch (error) {
          dispatch(setInitialized(true));
        } finally {
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    };

    verifyAuth();
  }, [user, isInitialized, dispatch]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;