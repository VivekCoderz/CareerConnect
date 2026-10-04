import { useState } from "react";
import { Activity, AlertTriangle, Server } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { triggerBackendSentryTest } from "../../services/adminService";
import { sentryEnabled } from "../../monitoring/sentry";

// Monitoring check (I08), SUPER_ADMIN only: raises one test error in the browser and one on
// the server so both Sentry projects can be checked after a deploy.

const ThrowOnRender = () => {
  throw new Error(`Sentry test error (frontend) ${new Date().toISOString()}`);
};

export default function AdminSentryTest() {
  const [throwNow, setThrowNow] = useState(false);
  const [backendResult, setBackendResult] = useState("");
  const [sending, setSending] = useState(false);

  const sendBackendError = async () => {
    setSending(true);
    try {
      await triggerBackendSentryTest();
      setBackendResult("Unexpected: the server did not return an error.");
    } catch (error) {
      const status = error.response?.status;
      setBackendResult(
        status === 500
          ? "Done: the server returned 500 as expected. Look for \"Sentry test error (backend)\" in the backend Sentry project."
          : `Failed with status ${status || "none"}: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      {throwNow && <ThrowOnRender />}
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">Monitoring check</h1>
        </div>
        <p className="text-sm text-slate-600">
          Sends one test error to each Sentry project. Frontend Sentry is{" "}
          <b>{sentryEnabled ? "on" : "off (VITE_SENTRY_DSN is not set in this build)"}</b>.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Frontend
          </div>
          <p className="text-sm text-slate-600">
            Throws a render error. You will see the "Something went wrong" screen; reload to come back.
            Then look for "Sentry test error (frontend)" in the frontend Sentry project.
          </p>
          <button
            onClick={() => setThrowNow(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
          >
            Throw frontend test error
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Server className="w-5 h-5 text-indigo-600" /> Backend
          </div>
          <p className="text-sm text-slate-600">
            Calls POST /api/admin/debug/sentry-test, which throws on the server and returns a normal 500.
          </p>
          <button
            onClick={sendBackendError}
            disabled={sending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold"
          >
            {sending ? "Sending..." : "Trigger backend test error"}
          </button>
          {backendResult && <p className="text-sm text-slate-700">{backendResult}</p>}
        </div>
      </div>
    </AdminLayout>
  );
}
