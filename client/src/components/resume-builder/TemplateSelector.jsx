import React from "react";
import { RESUME_TEMPLATES } from "../../data/templates";

/** Mini visual mock for each template style */
const TemplatePreviewMock = ({ id }) => {
  if (id === "executive") {
    return (
      <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white text-[6px] leading-tight">
        <div className="bg-slate-900 text-white px-2 py-1.5">
          <div className="h-2 w-20 bg-white/90 rounded-sm mb-1" />
          <div className="h-1 w-28 bg-white/40 rounded-sm" />
        </div>
        <div className="p-2 space-y-1.5">
          <div className="h-1 w-14 bg-slate-700 rounded-sm" />
          <div className="h-1 w-full bg-gray-200 rounded-sm" />
          <div className="h-1 w-5/6 bg-gray-200 rounded-sm" />
          <div className="h-1 w-12 bg-slate-700 rounded-sm mt-2" />
          <div className="h-1 w-full bg-gray-200 rounded-sm" />
          <div className="h-1 w-4/5 bg-gray-200 rounded-sm" />
        </div>
      </div>
    );
  }

  if (id === "sidebar") {
    return (
      <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white flex text-[6px]">
        <div className="w-[32%] bg-slate-800 p-1.5 space-y-1">
          <div className="h-1.5 w-10 bg-white/80 rounded-sm" />
          <div className="h-1 w-12 bg-white/30 rounded-sm" />
          <div className="h-1 w-10 bg-white/30 rounded-sm" />
          <div className="h-1 w-8 bg-white/50 rounded-sm mt-2" />
          <div className="h-1 w-full bg-white/20 rounded-sm" />
          <div className="h-1 w-full bg-white/20 rounded-sm" />
        </div>
        <div className="w-[68%] p-1.5 space-y-1">
          <div className="h-1 w-10 bg-slate-700 rounded-sm" />
          <div className="h-1 w-full bg-gray-200 rounded-sm" />
          <div className="h-1 w-5/6 bg-gray-200 rounded-sm" />
          <div className="h-1 w-12 bg-slate-700 rounded-sm mt-2" />
          <div className="h-1 w-full bg-gray-200 rounded-sm" />
          <div className="h-1 w-4/5 bg-gray-200 rounded-sm" />
        </div>
      </div>
    );
  }

  if (id === "twocolumn") {
    return (
      <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white p-2 text-[6px] space-y-1">
        <div className="text-center border-b border-gray-300 pb-1 mb-1">
          <div className="h-2 w-24 bg-gray-800 rounded-sm mx-auto mb-1" />
          <div className="h-1 w-32 bg-gray-300 rounded-sm mx-auto" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="h-1 w-10 bg-gray-700 rounded-sm" />
            <div className="h-1 w-full bg-gray-200 rounded-sm" />
            <div className="h-1 w-full bg-gray-200 rounded-sm" />
          </div>
          <div className="space-y-1">
            <div className="h-1 w-10 bg-gray-700 rounded-sm" />
            <div className="h-1 w-full bg-gray-200 rounded-sm" />
            <div className="h-1 w-4/5 bg-gray-200 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (id === "compact") {
    return (
      <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white p-2 text-[6px] space-y-1">
        <div className="flex justify-between items-end border-b border-teal-600 pb-1">
          <div className="h-2 w-20 bg-teal-800 rounded-sm" />
          <div className="h-1 w-16 bg-gray-300 rounded-sm" />
        </div>
        <div className="h-1 w-12 bg-teal-700 rounded-sm" />
        <div className="h-1 w-full bg-gray-200 rounded-sm" />
        <div className="h-1 w-full bg-gray-200 rounded-sm" />
        <div className="flex gap-1 mt-1">
          <div className="h-1 w-8 bg-teal-100 rounded-sm" />
          <div className="h-1 w-8 bg-teal-100 rounded-sm" />
          <div className="h-1 w-8 bg-teal-100 rounded-sm" />
        </div>
        <div className="h-1 w-14 bg-teal-700 rounded-sm mt-1" />
        <div className="h-1 w-full bg-gray-200 rounded-sm" />
        <div className="h-1 w-5/6 bg-gray-200 rounded-sm" />
      </div>
    );
  }

  if (id === "elegant") {
    return (
      <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white p-3 text-[6px] space-y-2">
        <div>
          <div className="h-2.5 w-28 bg-gray-800 rounded-sm mb-1" />
          <div className="h-1 w-24 bg-gray-300 rounded-sm" />
        </div>
        <div className="border-t border-gray-200 pt-2 space-y-1">
          <div className="h-1 w-10 bg-gray-400 rounded-sm tracking-widest" />
          <div className="h-1 w-full bg-gray-200 rounded-sm" />
          <div className="h-1 w-5/6 bg-gray-200 rounded-sm" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-10 bg-gray-400 rounded-sm" />
          <div className="h-1 w-full bg-gray-200 rounded-sm" />
        </div>
      </div>
    );
  }

  if (id === "bold") {
    return (
      <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white p-2 text-[6px] space-y-1.5">
        <div className="border-b-4 border-blue-600 pb-1.5">
          <div className="h-3 w-28 bg-gray-900 rounded-sm mb-1" />
          <div className="h-1 w-24 bg-gray-400 rounded-sm" />
        </div>
        <div className="h-1 w-16 bg-blue-600 rounded-sm" />
        <div className="h-1 w-full bg-gray-200 rounded-sm" />
        <div className="h-1 w-5/6 bg-gray-200 rounded-sm" />
        <div className="h-1 w-14 bg-blue-600 rounded-sm mt-1" />
        <div className="h-1 w-full bg-gray-200 rounded-sm" />
        <div className="h-1 w-4/5 bg-gray-200 rounded-sm" />
      </div>
    );
  }

  // classic (default)
  return (
    <div className="h-36 rounded-md overflow-hidden border border-gray-200 bg-white p-2 text-[6px] space-y-1">
      <div className="text-center border-b-2 border-gray-800 pb-1.5 mb-1">
        <div className="h-2 w-24 bg-gray-900 rounded-sm mx-auto mb-1" />
        <div className="h-1 w-28 bg-gray-400 rounded-sm mx-auto" />
      </div>
      <div className="h-1 w-12 bg-gray-800 rounded-sm mx-auto" />
      <div className="h-1 w-full bg-gray-200 rounded-sm" />
      <div className="h-1 w-5/6 bg-gray-200 rounded-sm mx-auto" />
      <div className="h-1 w-14 bg-gray-800 rounded-sm mt-1" />
      <div className="h-1 w-full bg-gray-200 rounded-sm" />
      <div className="h-1 w-full bg-gray-200 rounded-sm" />
      <div className="h-1 w-4/5 bg-gray-200 rounded-sm" />
    </div>
  );
};

const TemplateSelector = ({ selected, onSelect }) => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Choose a Resume Template</h2>
        <p className="text-gray-600 mt-2">
          Preview each design below. Content stays the same — only layout changes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {RESUME_TEMPLATES.map((tpl) => {
          const isSelected = selected === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={`relative text-left rounded-xl border-2 p-3 transition-all hover:shadow-md ${
                isSelected
                  ? "border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {/* Visual preview */}
              <TemplatePreviewMock id={tpl.id} />

              <div className="mt-3 px-0.5">
                <h3 className="font-semibold text-gray-900 text-sm">{tpl.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tpl.description}</p>
              </div>

              {isSelected && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;