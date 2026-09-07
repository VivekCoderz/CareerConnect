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
    try {
      // 1. Firebase sign-out (clears Google session)
      await signOut(auth);
    } catch (firebaseErr) {
      // Non-critical — proceed even if Firebase signOut fails
      console.warn("[Logout] Firebase signOut error:", firebaseErr.message);
    }

    try {
      // 2. Backend logout — clears HTTP-only cookie
      await api.post("/auth/logout");
    } catch (apiErr) {
      // Non-critical — clear frontend state regardless
      console.warn("[Logout] Backend logout error:", apiErr.message);
    }

    // 3. Clear Redux auth state
    dispatch(logout());

    // 4. Navigate to login
    navigate("/login", { replace: true });
  };

  return performLogout;
};

export default useLogout;
