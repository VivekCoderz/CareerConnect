/** Crop the transparent canvas around the uploaded wordmark without altering the asset. */
const BrandLogo = ({ markOnly = false, className = "" }) => (
  <svg
    viewBox={markOnly ? "65 165 600 370" : "65 165 1950 370"}
    className={className}
    role="img"
    aria-label="CareerConnect"
    preserveAspectRatio="xMidYMid meet"
  >
    <image href="/careerconnect-logo.png" width="2124" height="740" />
  </svg>
);

export default BrandLogo;
