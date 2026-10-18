import { useCallback, useEffect, useMemo, useState } from "react";
import { CampusContext } from "./useCampus";
import { campusApi, getToken, setToken } from "./api";

// Small app state for the campus portal: the institution and the signed-in person.
// Deliberately not the main app's Redux store (architecture rule 1).

const readStaff = () => {
  try {
    return JSON.parse(sessionStorage.getItem("campus_staff") || "null");
  } catch {
    return null;
  }
};

export const CampusProvider = ({ children }) => {
  const [institution, setInstitution] = useState(null);
  const [tenantError, setTenantError] = useState("");
  const [session, setSession] = useState(() => ({ loading: Boolean(getToken()), member: null, batch: null, needsConsent: false, staff: null }));

  // Only called with a token; signed-out visitors start with loading: false.
  const loadMe = useCallback(() =>
    campusApi.get("/me")
      .then((res) => setSession({ loading: false, member: res.data.member, batch: res.data.batch, needsConsent: res.data.needsConsent, staff: null }))
      .catch((error) => {
        const code = error?.response?.data?.code;
        const staff = readStaff();
        // E2Job staff are not members; their admin token is still valid for /ops.
        if (code === "NOT_A_MEMBER" && staff) {
          setSession({ loading: false, member: null, batch: null, needsConsent: false, staff });
          return;
        }
        if (error?.response?.status === 401 || code === "NOT_A_MEMBER") setToken("");
        setSession({ loading: false, member: null, batch: null, needsConsent: false, staff: null });
      }), []);

  useEffect(() => {
    campusApi.get("/tenant")
      .then((res) => setInstitution(res.data.institution))
      .catch((error) => setTenantError(error?.response?.status === 404 ? "not_found" : "unavailable"));
  }, []);

  useEffect(() => {
    if (getToken()) loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!institution) return;
    document.title = `${institution.shortName || institution.name} | Assessment Portal`;
    document.documentElement.style.setProperty("--campus-brand", institution.brandColor || "#0B3A82");
    if (institution.iconUrl || institution.logoUrl) {
      const icon = document.querySelector('link[rel="icon"]') || document.head.appendChild(document.createElement("link"));
      icon.rel = "icon";
      icon.href = institution.iconUrl || institution.logoUrl;
    }
  }, [institution]);

  const signOut = useCallback(() => {
    setToken("");
    sessionStorage.removeItem("campus_staff");
    setSession({ loading: false, member: null, batch: null, needsConsent: false, staff: null });
  }, []);

  const value = useMemo(
    () => ({ institution, tenantError, ...session, reload: loadMe, signOut, setSession }),
    [institution, tenantError, session, loadMe, signOut]
  );
  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
};

