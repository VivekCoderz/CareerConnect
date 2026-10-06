import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps a dashboard's active tab in the URL (?tab=jobs), so a refresh or a shared link
 * opens the same tab. The default tab leaves the URL clean. Uses replace, so switching
 * tabs doesn't fill the browser history.
 * @param {string} activeTab - the tab currently shown
 * @param {string} defaultTab - the dashboard's first tab (e.g. "dashboard" or "overview")
 */
export default function useTabInUrl(activeTab, defaultTab) {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("tab");

  useEffect(() => {
    const wanted = activeTab && activeTab !== defaultTab ? activeTab : null;
    if (wanted === current) return;
    const next = new URLSearchParams(searchParams);
    if (wanted) next.set("tab", wanted);
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [activeTab, defaultTab, current, searchParams, setSearchParams]);
}
