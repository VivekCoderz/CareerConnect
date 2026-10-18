import { useState } from "react";
import { Link } from "react-router-dom";
import { campusApi, errorMessage } from "../api";
import { useCampus } from "../useCampus";
import Layout from "../components/Layout";
import { Button, Card, Notice } from "../components/ui";

// Data notice on first sign-in (PRD R5): required before anything else opens.
const Consent = () => {
  const { institution, member } = useCampus();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await campusApi.post("/consent", { accepted: true });
      // A fresh load, so every page sees the accepted notice; students check their profile first.
      window.location.replace(member?.role === "manager" ? "/manager" : "/profile?welcome=1");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <Card title="Before you continue">
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <p>This is the official assessment and training portal of <b>{institution?.name}</b>. Please read how your information is used.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Your details from the university (name, email, roll number, CGPA, phone) and your answers are stored securely for this programme.</li>
            <li>They are used to run your assessment and training and to report your results to {institution?.name}.</li>
            <li>Your written answers are checked by an AI service. Only the answer text is sent, never your name or contact details.</li>
            <li>During the test your camera and microphone must be on. The camera takes a photo every few minutes; photos are private and only reviewed if a test is flagged.</li>
            <li>Only you, {institution?.name} and the programme assessment team can see your results.</li>
          </ul>
          <p>
            Read the full{" "}
            <Link to="/privacy" target="_blank" className="font-semibold text-[var(--campus-brand)] underline">privacy notice</Link>.
          </p>
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm font-semibold text-slate-800">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I have read this notice and agree to continue.
        </label>
        {error && <div className="mt-4"><Notice tone="red">{error}</Notice></div>}
        <Button className="mt-5" onClick={accept} disabled={!checked || busy}>Agree and continue</Button>
      </Card>
    </Layout>
  );
};

export default Consent;
