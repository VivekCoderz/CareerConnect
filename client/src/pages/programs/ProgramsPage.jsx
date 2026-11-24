import { Link } from "react-router-dom";
import ProgramsLayout from "../../components/programs/ProgramsLayout";
import { PROGRAMS, PROGRAM_LEVELS } from "../../data/programs";
import useSeo from "../../hooks/useSeo";

// C13: the list of career programmes. Each card opens the programme page with "Enquire now".
export default function ProgramsPage() {
  useSeo({
    title: "Career Programmes",
    description: "Career programmes from E2Job in AI, data analytics, full stack development, cybersecurity and cloud. Enquire and our team will call you.",
    path: "/programs",
  });

  return (
    <ProgramsLayout>
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">Career Programmes</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Learn the skills employers hire for
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          Every programme has Foundation, Professional and Advanced levels. Send an enquiry and our team will
          call you with the details.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PROGRAMS.map((p) => (
          <Link
            key={p.slug}
            to={`/programs/${p.slug}`}
            className="group flex flex-col bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition"
          >
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#1e3a8a]">{p.title}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">{p.duration}</p>
            {p.summary && <p className="mt-3 text-sm text-slate-600 line-clamp-3">{p.summary}</p>}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {PROGRAM_LEVELS.map((l) => (
                <span key={l.value} className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-[#1e3a8a]">
                  {l.label}
                </span>
              ))}
            </div>
            <span className="mt-auto pt-5 text-sm font-bold text-[#1e3a8a]">View programme →</span>
          </Link>
        ))}
      </div>
    </ProgramsLayout>
  );
}
