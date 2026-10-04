import LegalLayout, { Email, Fill, Section } from "../../components/legal/LegalLayout";
import { LEGAL } from "../../config/legal";

// Text from docs/legal/contact.md.
const CHANNELS = [
  {
    topic: "Help with your account or applications",
    contact: <Email value={LEGAL.emails.support} label="support email" />,
    reply: "1–2 working days",
  },
  {
    topic: "Report a fake job or someone asking for money",
    contact: (
      <>
        Use <strong>Report this job</strong> on the listing, or email <Email value={LEGAL.emails.report} label="report email" />
      </>
    ),
    reply: <strong>2 hours for money or scam reports</strong>,
  },
  {
    topic: "Employers: post jobs or get verified",
    contact: <Email value={LEGAL.emails.employers} label="employers email" />,
    reply: "1 working day",
  },
  {
    topic: "Colleges and placement cells",
    contact: <Email value={LEGAL.emails.partnerships} label="partnerships email" />,
    reply: "2 working days",
  },
  {
    topic: "Privacy requests and complaints (Grievance Officer)",
    contact: (
      <>
        <Fill value={LEGAL.grievanceOfficer} label="name" />, <Email value={LEGAL.emails.grievance} label="grievance email" />
      </>
    ),
    reply: "Acknowledged within 48 hours",
  },
];

export default function Contact() {
  return (
    <LegalLayout title="Contact us" intro={<p>We're a small team and we read every message.</p>}>
      <div className="grid gap-3">
        {CHANNELS.map((channel) => (
          <div key={channel.topic} className="rounded-2xl border border-slate-200 p-4 space-y-1.5">
            <h2 className="text-sm font-bold text-slate-900">{channel.topic}</h2>
            <p className="text-sm text-slate-700">{channel.contact}</p>
            <p className="text-xs text-slate-500">We reply within: {channel.reply}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <strong>Remember:</strong> E2Job and genuine employers <strong>never ask candidates for money</strong>. If
        anyone does, report it straight away.
      </div>

      <Section title="Address">
        <p>
          <Fill value={LEGAL.entityName} label="legal entity name" />, <Fill value={LEGAL.registeredAddress} label="registered address" />, India
        </p>
      </Section>
    </LegalLayout>
  );
}
