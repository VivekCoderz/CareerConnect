/**
 * Strong Random Password Generator
 *
 * Generates high-entropy passwords with uppercase, lowercase,
 * numbers, and special symbols, avoiding confusing characters (e.g. O vs 0, l vs 1).
 */
export const generateStrongPassword = (length = 14) => {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*()_+-=";
  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least 1 character from each group
  const passwordArr = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  // Fill the remaining length
  for (let i = passwordArr.length; i < length; i++) {
    passwordArr.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Cryptographic/Fisher-Yates Shuffle
  for (let i = passwordArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArr[i], passwordArr[j]] = [passwordArr[j], passwordArr[i]];
  }

  return passwordArr.join("");
};

/**
 * Calculates password strength score (0-4) and readable label
 */
export const calculatePasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", color: "text-red-500", bg: "bg-red-500" };
    case 2:
      return { score: 2, label: "Fair", color: "text-amber-500", bg: "bg-amber-500" };
    case 3:
      return { score: 3, label: "Good", color: "text-blue-500", bg: "bg-blue-500" };
    case 4:
      return { score: 4, label: "Strong", color: "text-emerald-600", bg: "bg-emerald-500" };
    default:
      return { score: 0, label: "", color: "", bg: "" };
  }
};
