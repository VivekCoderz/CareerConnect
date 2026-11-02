/**
 * E2Job logo (client/public/e2job-logo.png, 2172x724). The viewBox crops the white margin
 * around the artwork; markOnly shows just the icon for tight spaces such as the mobile header.
 */
const BrandLogo = ({ markOnly = false, className = "" }) => (
  <svg
    viewBox={markOnly ? "80 115 762 480" : "80 115 2020 480"}
    className={className}
    role="img"
    aria-label="E2Job"
    preserveAspectRatio="xMidYMid meet"
  >
    <image href="/e2job-logo.png" width="2172" height="724" />
  </svg>
);

export default BrandLogo;
