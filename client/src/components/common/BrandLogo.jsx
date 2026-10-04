/**
 * E2Job wordmark (text) until the designed logo is ready; replace with the image then.
 * markOnly shows "E2" for tight spaces such as the mobile header.
 */
const BrandLogo = ({ markOnly = false, className = "" }) => (
  <svg
    viewBox={markOnly ? "0 0 120 100" : "0 0 300 100"}
    className={className}
    role="img"
    aria-label="E2Job"
    preserveAspectRatio="xMidYMid meet"
  >
    <text
      x="0"
      y="78"
      fontFamily="Inter, 'Segoe UI', Arial, sans-serif"
      fontWeight="800"
      fontSize="88"
      letterSpacing="-2"
    >
      <tspan fill="#0f172a">E</tspan>
      <tspan fill="#008bdc">2</tspan>
      {!markOnly && <tspan fill="#0f172a">Job</tspan>}
    </text>
  </svg>
);

export default BrandLogo;
