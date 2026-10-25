import { Badge } from "../../../components/ui";

// What an uploaded questions sheet contains, and every row that must be fixed before saving.
const SheetPreview = ({ preview }) => {
  if (!preview) return null;
  const bad = preview.rows.filter((r) => r.errors.length);
  return (
    <div className="mt-4 space-y-3">
      {preview.missingColumns?.length > 0 && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Missing columns: {preview.missingColumns.join(", ")}. Use the sample format.</p>}
      {preview.rows.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge>{preview.rows.length} rows</Badge>
          {preview.counts && <><Badge tone="blue">{preview.counts.mcq} MCQ</Badge><Badge tone="blue">{preview.counts.written} written</Badge><Badge tone="blue">{preview.counts.speaking} speaking</Badge></>}
          {preview.totalMarks !== undefined && <Badge>{preview.totalMarks} mark{preview.totalMarks === 1 ? "" : "s"} in all</Badge>}
          {preview.compulsory > 0 && <Badge tone="amber">{preview.compulsory} compulsory</Badge>}
          {preview.sections?.length > 0 && <Badge>{preview.sections.length} sections: {preview.sections.map((s) => s.title).join(", ")}</Badge>}
          {bad.length ? <Badge tone="red">{bad.length} rows to fix</Badge> : <Badge tone="green">Every row is fine</Badge>}
        </div>
      )}
      {bad.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-rose-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-rose-50 text-left text-xs text-rose-800"><tr><th className="px-3 py-2">Line</th><th>Question</th><th>What to fix</th></tr></thead>
            <tbody>
              {bad.map((r) => (
                <tr key={r.line} className="border-t border-rose-100 align-top">
                  <td className="px-3 py-2 font-bold">{r.line}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.summary}</td>
                  <td className="py-2 pr-3 text-rose-700">{r.errors.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SheetPreview;
