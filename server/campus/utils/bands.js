// CGPA bands for a batch (PRD R7). Band 1: below 6.0, Band 2: 6.0 to 7.99, Band 3: 8.0 and above.
// A batch may override the cut-offs; each band covers [min, next band's min).

const DEFAULT_BANDS = [
  { band: 1, label: "Below 6.0", min: 0 },
  { band: 2, label: "6.0 to 7.99", min: 6 },
  { band: 3, label: "8.0 and above", min: 8 },
];

/** Band number for a CGPA on a 10-point scale, or null when the CGPA is missing or out of range. */
const bandFor = (cgpa, bands = DEFAULT_BANDS) => {
  const value = Number(cgpa);
  if (cgpa === null || cgpa === undefined || cgpa === "" || !Number.isFinite(value) || value < 0 || value > 10) {
    return null;
  }
  // Round to 2 decimals first so 7.999999 from a spreadsheet does not jump a band.
  const rounded = Math.round(value * 100) / 100;
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return (sorted.find((b) => rounded >= b.min) || sorted[sorted.length - 1]).band;
};

module.exports = { DEFAULT_BANDS, bandFor };
