import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Protected = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default Protected;