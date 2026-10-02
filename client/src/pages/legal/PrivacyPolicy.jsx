import { Link } from "react-router-dom";
import LegalLayout, { Email, Fill, List, Section } from "../../components/legal/LegalLayout";
import { LEGAL } from "../../config/legal";

// Text from docs/legal/privacy-policy.md. Keep the two in sync until the final
// reviewed text replaces both.
const PURPOSES = [
  ["Creating and securing your account", "Account details, log data"],
  ["Showing you relevant jobs and internships", "Profile details, preferences"],
  ["Sending your application to the employer you apply to", "Profile, resume, application"],
  ["Letting employers review, interview and make offers", "Profile, resume, application"],
  ["Resume tools (ATS score, resume optimisation), when you choose to use them", "Resume, job description"],
  ["Sending emails about your account and applications", "Email address"],
  ["Checking employers are genuine and removing fake or fraudulent listings", "Employer details, reports"],
  ["Preventing abuse, spam and fraud", "Log data, account details"],
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <>
          <p>
            CareerConnect ("we", "us") is operated by <strong><Fill value={LEGAL.entityName} label="legal entity name" /></strong>,{" "}
            <Fill value={LEGAL.registeredAddress} label="registered address" />, India. This policy explains what personal
            data we collect when you use CareerConnect (the website and its services), why we collect it, who we share it
            with, and the choices you have.
          </p>
          <p>
            By creating an account you confirm that you have read this policy and that you agree to us processing your
            personal data as described here.
          </p>
        </>
      }
    >
      <Section title="1. Who can use CareerConnect">
        <p>
          You must be <strong>18 years or older</strong> to create an account. If you are younger than 18, please do not
          register.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p className="font-semibold text-slate-900">Information you give us</p>
        <List>
          <li><strong>Account details:</strong> name, email address, phone number, password (stored only in encrypted form), account type (student, fresher, professional or employer).</li>
          <li><strong>Profile details:</strong> education, skills, work experience, projects, certifications, job preferences, location, links (LinkedIn, GitHub, portfolio) and a profile photo if you add one.</li>
          <li><strong>Resumes and documents:</strong> resumes and job descriptions you upload, and resumes you create or improve with our tools.</li>
          <li><strong>Applications:</strong> the jobs and internships you apply to, and messages or notes connected to those applications.</li>
          <li><strong>Employer details:</strong> company name, website, registration details (for example GST or CIN), and the contact person's name, work email and phone.</li>
          <li><strong>Reports and support requests</strong> you send us.</li>
        </List>
        <p className="font-semibold text-slate-900">Information collected automatically</p>
        <List>
          <li><strong>Log and device data:</strong> IP address, browser type, pages visited and time of access, which we use for security and to keep the service working.</li>
          <li><strong>Cookies:</strong> we use a cookie to keep you signed in. We do not use advertising cookies.</li>
        </List>
        <p className="font-semibold text-slate-900">Information from others</p>
        <List>
          <li>If you sign in with Google, we receive your name, email address and profile photo from Google.</li>
        </List>
      </Section>

      <Section title="3. Why we use it">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Purpose</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Data used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PURPOSES.map(([purpose, data]) => (
                <tr key={purpose}>
                  <td className="px-4 py-2.5 align-top">{purpose}</td>
                  <td className="px-4 py-2.5 align-top text-slate-500">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We process your data based on your <strong>consent</strong>, which you give when you create an account, and,
          where the law allows, for purposes such as security and fraud prevention. <strong>We do not sell your personal data.</strong>
        </p>
      </Section>

      <Section title="4. Who can see your data">
        <List>
          <li><strong>Employers you apply to</strong> can see the profile, resume and application you send them.</li>
          <li>
            <strong>Your public profile:</strong> if you set your profile visibility to <em>public</em>, the parts of your
            profile marked public (for example your headline, skills and projects) can be seen by anyone. Your email, phone
            number, date of birth and resume are <strong>not</strong> shown on your public profile.
          </li>
          <li>
            <strong>Service providers</strong> who help us run CareerConnect, and only for that purpose:
            <List>
              <li>hosting and databases: Render, Vercel, MongoDB Atlas</li>
              <li>file storage: Cloudinary (resumes and images)</li>
              <li>email delivery: Brevo</li>
              <li>sign-in: Google Firebase</li>
              <li>AI features: Google Gemini, which processes resume and job-description text when you use our resume tools</li>
            </List>
          </li>
          <li><strong>Authorities</strong>, if the law requires it.</li>
        </List>
        <p>
          Some of these providers store data on servers <strong>outside India</strong>. We choose providers that protect data
          with reasonable security safeguards.
        </p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          We keep your data for as long as your account is active. If you delete your account, we delete your profile and
          resumes within <strong><Fill value={LEGAL.deletionDays} label="30" /> days</strong>, except for information we must
          keep by law or to resolve disputes, which we keep only for as long as required.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>You can:</p>
        <List>
          <li><strong>access and correct</strong> your data from your profile settings;</li>
          <li>
            <strong>delete your account</strong> and its data from{" "}
            <Link to="/account" className="text-blue-700 font-semibold hover:underline">Account settings → Delete account</Link>;
          </li>
          <li><strong>withdraw consent</strong> at any time by deleting your account (this does not affect processing that happened before);</li>
          <li><strong>nominate</strong> another person to exercise your rights if you die or become unable to do so;</li>
          <li>
            <strong>raise a complaint</strong> with our Grievance Officer (section 9). If you are not satisfied with the
            response, you may approach the Data Protection Board of India.
          </li>
        </List>
      </Section>

      <Section title="7. Security">
        <p>
          Passwords are stored in hashed form, connections use HTTPS, and access to personal data is limited to people who
          need it to run the service. No system is completely secure, so please use a strong password and keep it private.
        </p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          If we change this policy in a meaningful way, we will notify you by email or on the site before the change takes
          effect.
        </p>
      </Section>

      <Section title="9. Grievance Officer and contact">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="font-semibold text-slate-900">Grievance Officer</dt>
          <dd><Fill value={LEGAL.grievanceOfficer} label="name" /></dd>
          <dt className="font-semibold text-slate-900">Email</dt>
          <dd><Email value={LEGAL.emails.grievance} label="grievance email" /></dd>
          <dt className="font-semibold text-slate-900">Address</dt>
          <dd><Fill value={LEGAL.registeredAddress} label="registered address" /></dd>
        </dl>
        <p>
          We aim to acknowledge complaints within <strong>48 hours</strong> and resolve them within{" "}
          <strong><Fill value={LEGAL.resolutionDays} label="30" /> days</strong>.
        </p>
      </Section>
    </LegalLayout>
  );
}
