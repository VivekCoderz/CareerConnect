import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  FileText,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import "./JourneyLoader.css";

const variantIcons = {
  opportunity: BriefcaseBusiness,
  resume: FileText,
  profile: UserRound,
  employer: Building2,
  admin: ShieldCheck,
  learning: BookOpen,
  access: LockKeyhole,
};

/** Visual feedback only; the caller still controls when loading starts and ends. */
const JourneyLoader = ({
  size = "md",
  variant = "opportunity",
  className = "",
  message,
  detail,
}) => {
  const chosenVariant = variantIcons[variant] ? variant : "opportunity";
  const Icon = variantIcons[chosenVariant];

  return (
    <div
      className={`journey-loader journey-loader--${size} journey-loader--${chosenVariant} ${className}`.trim()}
      role="status"
      aria-label={message ? undefined : "Preparing your view"}
    >
      <div className="journey-loader__scene" aria-hidden="true">
        <span className="journey-loader__orbit" />
        <span className="journey-loader__beam" />
        <span className="journey-loader__node journey-loader__node--one" />
        <span className="journey-loader__node journey-loader__node--two" />
        <span className="journey-loader__node journey-loader__node--three" />
        <span className="journey-loader__core">
          <Icon strokeWidth={2} />
        </span>
      </div>
      {message && <p className="journey-loader__message">{message}</p>}
      {detail && <p className="journey-loader__detail">{detail}</p>}
    </div>
  );
};

export default JourneyLoader;
