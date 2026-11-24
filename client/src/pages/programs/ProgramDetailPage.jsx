import { Link, useParams } from "react-router-dom";
import ProgramsLayout from "../../components/programs/ProgramsLayout";
import ProgramEnquiryForm from "../../components/programs/ProgramEnquiryForm";
import { findProgram, PROGRAM_LEVELS } from "../../data/programs";
import useSeo from "../../hooks/useSeo";
import NotFound from "../NotFound";

const Section = ({ title, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
    <div className="mt-3 text-sm text-slate-700 leading-relaxed">{children}</div>
  </section>
);

const List = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const scrollToEnquiry = () =>
  document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth", block: "start" });

const EnquireButton = ({ className = "" }) => (
  <button
    type="button"
    onClick={scrollToEnquiry}
    className={`px-6 h-11 rounded-xl bg-[#f59e0b] text-slate-900 text-sm font-bold hover:bg-amber-400 ${className}`}
  >
    Enquire now
  </button>
);

// C13: one programme. It shows only what the programme covers; trainer, batch dates and
// timings are shared by the team on the call after an enquiry, never on the portal.
export default function ProgramDetailPage() {
  const { slug } = useParams();
  const program = findProgram(slug);

  useSeo({
    title: program?.title,
    description: program?.summary || `${program?.title} career programme from E2Job. Enquire and our team will call you.`,
    path: `/programs/${slug}`,
    enabled: Boolean(program),
  });

  if (!program) return <NotFound />;

  return (
    <ProgramsLayout>
      <Link to="/programs" className="text-xs font-bold text-[#1e3a8a] hover:underline">
        ← All programmes
      </Link>

      <div className="mt-4 rounded-3xl bg-gradient-to-br from-[#1e3a8a] to-[#0f1f4d] text-white p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Career Programme</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">{program.title}</h1>
        <p className="mt-2 text-sm text-blue-100">{program.duration}</p>
        {program.summary && <p className="mt-4 max-w-2xl text-sm sm:text-base text-blue-50 leading-relaxed">{program.summary}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {PROGRAM_LEVELS.map((l) => (
            <span key={l.value} className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
              {l.label}
            </span>
          ))}
        </div>
        <EnquireButton className="mt-6" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5">
        {program.syllabus.length > 0 && (
          <Section title="Syllabus">
            <div className="space-y-4">
              {program.syllabus.map((module) => (
                <div key={module.title}>
                  <h3 className="font-semibold text-slate-900">{module.title}</h3>
                  {module.topics?.length > 0 && <List items={module.topics} />}
                </div>
              ))}
            </div>
          </Section>
        )}
        {program.projects.length > 0 && (
          <Section title="Projects">
            <List items={program.projects} />
          </Section>
        )}
        {program.tools.length > 0 && (
          <Section title="Tools you'll use">
            <div className="flex flex-wrap gap-2">
              {program.tools.map((tool) => (
                <span key={tool} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                  {tool}
                </span>
              ))}
            </div>
          </Section>
        )}
        {program.mentorship && (
          <Section title="Mentorship">
            <p>{program.mentorship}</p>
          </Section>
        )}
        {program.internship && (
          <Section title="Internship">
            <p>{program.internship}</p>
          </Section>
        )}
        {program.certificate && (
          <Section title="Certificate">
            <p>{program.certificate}</p>
          </Section>
        )}
        {program.faq.length > 0 && (
          <Section title="FAQ">
            <div className="space-y-2">
              {program.faq.map((item) => (
                <details key={item.question} className="rounded-xl border border-slate-200 px-4 py-3">
                  <summary className="cursor-pointer font-semibold text-slate-900">{item.question}</summary>
                  <p className="mt-2">{item.answer}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

        <section id="enquire" className="scroll-mt-20 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Enquire about {program.title}</h2>
          <p className="mt-1 mb-5 text-sm text-slate-600">
            Tell us how to reach you and which level interests you. Our team will call you with the details.
          </p>
          <ProgramEnquiryForm program={program} />
        </section>
      </div>
    </ProgramsLayout>
  );
}
