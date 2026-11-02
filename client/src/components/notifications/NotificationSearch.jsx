import { Search, X } from "lucide-react";

// Search field in a notifications header; sits beside the category tabs.
const NotificationSearch = ({ value, onChange, placeholder = "Search notifications" }) => (
  <div className="relative w-full sm:w-64 sm:mb-2.5">
    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600"
        aria-label="Clear search"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export default NotificationSearch;
