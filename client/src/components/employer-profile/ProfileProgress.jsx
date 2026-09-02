import React from "react";

const steps = [
  { id: 1, title: "Basic", fullTitle: "Basic Information" },
  { id: 2, title: "About", fullTitle: "About Company" },
  { id: 3, title: "Details", fullTitle: "Company Details" },
  { id: 4, title: "Culture", fullTitle: "Team & Culture" },
  { id: 5, title: "Hiring", fullTitle: "Hiring Preferences" },
  { id: 6, title: "Review", fullTitle: "Review & Publish" },
];

const ProfileProgress = ({
  currentStep = 1,
  onStepClick = () => {},
  maxVisitedStep = 1,
}) => {
  return (
    <div className="w-full mb-8">
      {/* Mobile Step Bar */}
      <div className="sm:hidden mb-4 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {currentStep}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              Step {currentStep} of 6
            </p>
            <p className="text-[11px] text-amber-700 font-semibold">
              {steps[currentStep - 1]?.fullTitle}
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          {Math.round((currentStep / 6) * 100)}%
        </div>
      </div>

      {/* Desktop / Tablet Stepper */}
      <div className="hidden sm:flex items-center justify-between w-full relative">
        {steps.map((s, index) => {
          const isCurrent = currentStep === s.id;
          const isCompleted = currentStep > s.id;
          const isClickable = s.id <= maxVisitedStep || isCompleted;

          return (
            <React.Fragment key={s.id}>
              {/* Step Circle & Label */}
              <div
                onClick={() => isClickable && onStepClick(s.id)}
                className={`flex flex-col items-center group relative z-10 transition-all ${
                  isClickable ? "cursor-pointer" : "cursor-default opacity-80"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCurrent
                      ? "bg-[#f59e0b] text-white ring-4 ring-[#f59e0b]/20 scale-105 shadow-md"
                      : isCompleted
                      ? "bg-[#d97706] text-white hover:bg-[#b45309]"
                      : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4 stroke-[2.5]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>

                <span
                  className={`text-[11.5px] font-semibold mt-2 text-center transition-colors whitespace-nowrap ${
                    isCurrent
                      ? "text-[#b45309] font-bold"
                      : isCompleted
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  {s.title}
                </span>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 -mt-5 bg-slate-200 relative overflow-hidden rounded">
                  <div
                    className={`h-full bg-[#f59e0b] transition-all duration-500 ${
                      currentStep > s.id ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileProgress;
