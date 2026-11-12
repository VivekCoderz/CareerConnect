import { useCallback, useEffect, useMemo, useState } from "react";
import { CampusContext } from "./useCampus";
import { campusApi, getToken, setToken } from "./api";
import { devTenant } from "./host";

// Small app state for the campus portal: the institution and the signed-in person.
// Deliberately not the main app's Redux store (architecture rule 1).

const readStaff = () => {
  try {
    return JSON.parse(sessionStorage.getItem("campus_staff") || "null");
  } catch {
    return null;
  }
};

// The last institution and signed-in person this browser saw, so a repeat visit opens at
// once instead of waiting for the API (which can take a while to wake up). Both are
// refreshed from the API on every load; the stored copies only fill the gap.
const portalKey = () => devTenant || window.location.hostname.toLowerCase();
const INSTITUTION_KEY = () => `campus_institution:${portalKey()}`;
const ME_KEY = () => `campus_me:${portalKey()}`;

const readStored = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const store = (key, value) => {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // Private mode without storage: the portal just waits for the API, as before.
  }
};

const SIGNED_OUT = { loading: false, member: null, batch: null, needsConsent: false, staff: null };

const initialSession = () => {
  if (!getToken()) return SIGNED_OUT;
  const me = readStored(ME_KEY());
  // Show the stored person straight away; loadMe() replaces it, or signs out on a 401.
  return me ? { ...SIGNED_OUT, ...me } : { ...SIGNED_OUT, loading: true };
};

export const CampusProvider = ({ children }) => {
  const [institution, setInstitution] = useState(() => readStored(INSTITUTION_KEY()));
  const [tenantError, setTenantError] = useState("");
  const [session, setSession] = useState(initialSession);

  // Only called with a token; signed-out visitors start with loading: false.
  const loadMe = useCallback(() =>
    campusApi.get("/me")
      .then((res) => {
        const me = { member: res.data.member, batch: res.data.batch, needsConsent: res.data.needsConsent, profileCompletion: res.data.profileCompletion };
        store(ME_KEY(), me);
        setSession({ ...SIGNED_OUT, ...me });
      })
      .catch((error) => {
        const code = error?.response?.data?.code;
        const staff = readStaff();
        store(ME_KEY(), null);
        // E2Job staff are not members; their admin token is still valid for /ops.
        if (code === "NOT_A_MEMBER" && staff) {
          setSession({ ...SIGNED_OUT, staff });
          return;
        }
        if (error?.response?.status === 401 || code === "NOT_A_MEMBER") setToken("");
        setSession(SIGNED_OUT);
      }), []);

  useEffect(() => {
    campusApi.get("/tenant")
      .then((res) => {
        store(INSTITUTION_KEY(), res.data.institution);
        setInstitution(res.data.institution);
      })
      .catch((error) => {
        if (error?.response?.status === 404) {
          store(INSTITUTION_KEY(), null);
          setInstitution(null);
          setTenantError("not_found");
        } else if (!readStored(INSTITUTION_KEY())) {
          // With a stored institution the portal stays usable; only a first visit shows the error.
          setTenantError("unavailable");
        }
      });
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
    store(ME_KEY(), null);
    sessionStorage.removeItem("campus_staff");
    setSession(SIGNED_OUT);
  }, []);

  const value = useMemo(
    () => ({ institution, tenantError, ...session, reload: loadMe, signOut, setSession }),
    [institution, tenantError, session, loadMe, signOut]
  );
  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
};

