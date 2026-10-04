import { Link } from "react-router-dom";
import LegalLayout, { Email, Fill, List, Section } from "../../components/legal/LegalLayout";
import { LEGAL } from "../../config/legal";

// Text from docs/legal/terms-of-use.md. Keep the two in sync until the final
// reviewed text replaces both.
const link = "text-blue-700 font-semibold hover:underline";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Use"
      intro={
        <p>
          These terms are an agreement between you and <strong><Fill value={LEGAL.entityName} label="legal entity name" /></strong>{" "}
          ("E2Job", "we", "us") for your use of the E2Job website and services. By creating an account or
          using E2Job, you agree to these terms and to our <Link to="/privacy" className={link}>Privacy Policy</Link>.
        </p>
      }
    >
      <Section title="1. Eligibility and accounts">
        <List>
          <li>You must be <strong>18 years or older</strong>.</li>
          <li>Give accurate information and keep it up to date.</li>
          <li>Keep your password private. You are responsible for activity on your account.</li>
          <li>One person or company per account. Don't create accounts for someone else without their permission.</li>
        </List>
      </Section>

      <Section title="2. What E2Job is">
        <p>
          E2Job is a platform that connects candidates with employers. <strong>We are not the employer</strong> and
          we are not a party to any job offer or employment contract. We do not guarantee that any candidate will get a job,
          or that any employer will find a candidate.
        </p>
        <p>
          Some listings come from <strong>other job sites or company career pages</strong>. They are marked as external and
          link to the original source. We are not responsible for the content of those sites.
        </p>
      </Section>

      <Section title="3. Rules for candidates">
        <List>
          <li>Apply only with accurate information and your own resume.</li>
          <li>Don't apply to jobs in bulk with irrelevant applications or use automated tools to apply.</li>
          <li>Treat employers with respect in interviews and messages.</li>
        </List>
      </Section>

      <Section title="4. Rules for employers">
        <List>
          <li>Post only <strong>genuine openings</strong> at a company you are authorised to represent.</li>
          <li>
            <strong>Never ask a candidate for money</strong>, including registration, training, security deposit, kit or
            certificate fees. Doing so leads to immediate removal and a permanent ban.
          </li>
          <li>Don't ask for bank details, OTPs, Aadhaar or PAN before an interview.</li>
          <li>Describe the role, location and pay honestly.</li>
          <li>
            Follow applicable employment laws. Don't discriminate on religion, caste, gender, marital status or disability,
            except where the law allows.
          </li>
          <li>Use candidate data only to recruit for the role the candidate applied to. Don't copy, sell or share it.</li>
        </List>
      </Section>

      <Section title="5. Content you are not allowed to post">
        <p>
          Anything that is false, fraudulent or misleading; that impersonates another person or company; that is abusive,
          hateful, sexual or illegal; that promotes MLM, gambling or investment schemes; or that contains malware or spam.
        </p>
        <p>
          We may review, edit, hide or remove any content, and suspend or close any account that breaks these terms, with or
          without notice.
        </p>
      </Section>

      <Section title="6. AI features">
        <p>
          Our resume tools (for example the ATS score and resume optimisation) use automated analysis, including AI. Results
          are <strong>suggestions only</strong>. Check anything you use, and don't add skills or experience you don't have.
        </p>
      </Section>

      <Section title="7. Your content">
        <p>
          You keep ownership of the content you upload, such as your resume and profile. You give us permission to store it,
          display it as your settings allow, and share it with employers you apply to, so that we can provide the service.
        </p>
      </Section>

      <Section title="8. Fees">
        <p>
          Using E2Job is <strong>free for candidates</strong>. We may introduce paid features for employers or
          optional paid features for candidates in future. If we do, the price will be shown clearly before you pay.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          E2Job is provided "as is". To the extent the law allows, we are not liable for indirect or consequential
          losses, or for the actions of employers, candidates or third-party sites. Nothing in these terms limits any right
          you have under applicable consumer law.
        </p>
      </Section>

      <Section title="10. Ending your account">
        <p>
          You can delete your account at any time from{" "}
          <Link to="/account" className={link}>Account settings → Delete account</Link>. We may suspend or close accounts
          that break these terms.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these terms. If a change is significant, we will tell you by email or on the site before it takes
          effect. Continuing to use E2Job afterwards means you accept the updated terms.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>
          These terms are governed by the laws of India. Courts in <strong><Fill value={LEGAL.jurisdictionCity} label="city" /></strong>{" "}
          have jurisdiction.
        </p>
      </Section>

      <Section title="13. Contact and grievances">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="font-semibold text-slate-900">Questions</dt>
          <dd><Email value={LEGAL.emails.support} label="support email" /></dd>
          <dt className="font-semibold text-slate-900">Grievance Officer</dt>
          <dd>
            <Fill value={LEGAL.grievanceOfficer} label="name" />, <Email value={LEGAL.emails.grievance} label="grievance email" />
          </dd>
          <dt className="font-semibold text-slate-900">Report a fake job or fraud</dt>
          <dd>
            Use <strong>Report this job</strong> on the listing, or email <Email value={LEGAL.emails.report} label="report email" />
          </dd>
        </dl>
      </Section>
    </LegalLayout>
  );
}
