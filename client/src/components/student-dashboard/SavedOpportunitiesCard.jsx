const SavedOpportunitiesCard = ({ savedItems = [], onRemove, onApply }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Saved Opportunities</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {savedItems.length} Bookmarked
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Jobs and internships you have saved to apply for later</p>
        </div>
      </div>

      {savedItems && savedItems.length > 0 ? (
        <div className="space-y-3">
          {savedItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    {item.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{item.company} • Deadline: {item.deadline || "Open"}</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  onClick={() => onApply(item)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Apply Now
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Remove from saved"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500 mb-1">No saved opportunities yet.</p>
          <p className="text-[11px] text-slate-400">Click "☆ Save" on any job or internship card to review it later.</p>
        </div>
      )}
    </div>
  );
};

export default SavedOpportunitiesCard;
