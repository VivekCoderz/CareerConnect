import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminSettings, updateAdminSettings } from "../../services/adminService";
import { Settings, Save, ShieldCheck, Bell, Database, Check } from "lucide-react";

const AdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [scope, setScope] = useState("GLOBAL");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getAdminSettings();
      if (res?.success) {
        setSettings(res.settings || {});
        setScope(res.scope || "GLOBAL");
        if (res.companyName) setCompanyName(res.companyName);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateAdminSettings(settings);
      if (res?.success) {
        setSavedMsg("Settings saved successfully!");
        setTimeout(() => setSavedMsg(""), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout onRefresh={fetchSettings} isRefreshing={loading}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {scope === "GLOBAL" ? "Platform Settings" : `${companyName} Settings`}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  scope === "GLOBAL"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {scope === "GLOBAL" ? "Super Admin Global" : "Tenant Company"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {scope === "GLOBAL"
                ? "Configure platform-wide verification, rate limits, and registration controls."
                : "Configure tenant-specific applicant filtering, notifications, and company preferences."}
            </p>
          </div>

          {savedMsg && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {savedMsg}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {scope === "GLOBAL" ? (
            /* Super Admin Global Settings */
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Security & Platform Governance
              </h2>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Enforce Email Verification</span>
                  <span className="text-[11px] text-slate-500">Require candidates to verify email OTP before applying.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enforceEmailVerification !== false}
                  onChange={(e) =>
                    setSettings({ ...settings, enforceEmailVerification: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Auto-Approve Company Opportunities</span>
                  <span className="text-[11px] text-slate-500">Automatically publish jobs and internships without review.</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.autoApproveOpportunities)}
                  onChange={(e) =>
                    setSettings({ ...settings, autoApproveOpportunities: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Maintenance Mode</span>
                  <span className="text-[11px] text-slate-500">Restrict student/employer login during system upgrades.</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.maintenanceMode)}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          ) : (
            /* Company Admin Tenant Settings */
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                Tenant Automation & Alerts
              </h2>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Instant Application Email Alerts</span>
                  <span className="text-[11px] text-slate-500">Notify company admins immediately when a student applies.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications !== false}
                  onChange={(e) =>
                    setSettings({ ...settings, emailNotifications: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Auto-Shortlist Qualified Candidates</span>
                  <span className="text-[11px] text-slate-500">Move candidates matching 80%+ skills to Interview stage.</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.autoShortlist)}
                  onChange={(e) =>
                    setSettings({ ...settings, autoShortlist: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
