import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import api from "../api/api";
import { logout } from "../redux/features/authSlice";

/**
 * useLogout — shared logout hook.
 *
 * Performs the full logout sequence:
 *   1. Firebase signOut() — clears Firebase session/persistence
 *   2. POST /api/auth/logout — clears the HTTP-only CareerConnect JWT cookie
 *   3. Redux logout action — clears frontend auth state
 *   4. Navigate to /login
 *
 * After this sequence, a browser refresh will NOT automatically log the user back in.
 */
const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const performLogout = async () => {
    // 1. Immediately navigate to Home ("/") so route guards never trigger a /login redirect
    navigate("/", { replace: true });

    // 2. Clear Redux auth state
    dispatch(logout());

    // 3. Clear local storage tokens
    localStorage.removeItem("careerconnect_token");
    localStorage.removeItem("careerconnect_user");

    // 4. Clear Firebase & Backend sessions asynchronously
    try {
      await Promise.allSettled([
        signOut(auth),
        api.post("/auth/logout"),
      ]);
    } catch (err) {
      console.warn("[Logout] Cleanup error:", err);
    }
  };

  return performLogout;
};

export default useLogout;
