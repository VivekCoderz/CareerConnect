import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/api.jsx";
import { updateUserProfile } from "../redux/features/authSlice";
import { getDashboardPath } from "../utils/dashboardRedirect";

const SelectRole = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: "student",
      title: "Student",
      description:
        "Currently studying and looking for internships or entry-level opportunities.",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 14l9-5-9-5-9 5 9 5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
          />
        </svg>
      ),
      path: "/student",
    },
    {
      id: "fresher",
      title: "Fresher",
      description:
        "Recently graduated and ready to start your professional journey.",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      path: "/fresher",
    },
    {
      id: "professional",
      title: "Working Professional",
      description:
        "Already working and looking for better opportunities or career growth.",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      path: "/professional",
    },
  ];

  const handleContinue = async () => {
    console.log(selected)
    if (!selected) return;

    setLoading(true);

    try {
      const res = await api.patch("/auth/update-experience-level", {
        userType: selected,
        experienceLevel: selected, // "student" | "fresher" | "professional"
      });

      if (res?.data?.user) {
        dispatch(updateUserProfile(res.data.user));
      } else {
        dispatch(updateUserProfile({ userType: selected }));
      }

      // Navigate dynamically to role dashboard
      const dest = getDashboardPath(selected);
      navigate(dest, { replace: true });
    } catch (err) {
      console.error(err);
      // error message dikhao
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl mb-5 shadow-lg shadow-blue-600/30">
            C
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            How would you like to continue?
          </h1>
          <p className="text-slate-500 mt-3 text-base max-w-lg mx-auto">
            Select the option that best describes you. You can always update
            this later.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelected(role.id)}
              className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 bg-white
                ${
                  selected === role.id
                    ? "border-blue-600 shadow-lg shadow-blue-600/10 ring-2 ring-blue-600/20"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}
            >
              {/* Selected Indicator */}
              {selected === role.id && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition
                  ${selected === role.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {role.icon}
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {role.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {role.description}
              </p>
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="w-full sm:w-auto min-w-[220px] h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold transition flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Continuing...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can change your profile type anytime from settings.
        </p>
      </div>
    </div>
  );
};

export default SelectRole;
