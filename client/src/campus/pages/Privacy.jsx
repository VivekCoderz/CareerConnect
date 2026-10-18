import { Link } from "react-router-dom";
import { useCampus } from "../useCampus";
import { BrandMark, Footer } from "../components/Layout";

// The portal's own privacy notice, in the university's name (white-label).

const Privacy = () => {
  const { institution } = useCampus();
  const name = institution?.name || "the university";
  const points = [
    ["What we keep", `The details ${name} shares for you (name, university email, roll number, CGPA, phone), your profile changes, your test answers and recordings, test-time photos and events, and your class attendance.`],
    ["Why", `To run your assessment and training, verify your details, and report results to ${name}.`],
    ["Who can see it", `You, the authorised staff of ${name}, and the programme assessment team that marks and reviews the tests.`],
    ["Written answers", "Written answers may be checked by an automated marking service. Only the answer text is sent, never your name or contact details. A person reviews every result before it is published."],
    ["Camera and microphone", "Used only during the test. Photos and recordings are private and are looked at only when marking the speaking answer or when a test is flagged."],
    ["How long", `For the duration of the programme, or as long as ${name} requires for its records.`],
    ["Your choices", `You can correct your details on your Profile page. For any other request, contact ${institution?.helpContact || "the programme office"}.`],
  ];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/"><BrandMark institution={institution} compact /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Privacy notice</h1>
        <p className="mt-2 text-sm text-slate-600">How {name} uses your information on this portal.</p>
        <dl className="mt-8 space-y-6">
          {points.map(([title, text]) => (
            <div key={title}>
              <dt className="font-bold text-slate-900">{title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-700">{text}</dd>
            </div>
          ))}
        </dl>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
