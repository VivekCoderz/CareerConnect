/**
 * Password Generator & Validation Utility
 *
 * Rules:
 *  - Minimum length: 6 characters
 *  - At least 1 letter (uppercase or lowercase)
 *  - At least 1 number
 *  - At least 1 special character (@, #, $, %, &, *, !, ?)
 *  - Cryptographically secure random generation (never Math.random)
 */

export const PASSWORD_VALIDATION_ERROR =
  "Password must contain at least 6 characters, one letter, one number, and one special character.";

/**
 * Validates whether a password meets all mandatory requirements:
 * 1. Minimum 6 characters
 * 2. At least 1 uppercase or lowercase letter
 * 3. At least 1 number
 * 4. At least 1 special character (@ # $ % & * ! ? or any non-alphanumeric)
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 6) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[@#$%&*!?]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) return false;
  return true;
};

/**
 * Cryptographically secure random integer in range [0, max)
 */
const getCryptoRandomInt = (max) => {
  if (max <= 0) return 0;
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    const maxSafe = Math.floor(0xffffffff / max) * max;
    let rand;
    do {
      window.crypto.getRandomValues(array);
      rand = array[0];
    } while (rand >= maxSafe);
    return rand % max;
  }
  return 0;
};

/**
 * Returns a random character from a string charset using crypto randomness
 */
const getCryptoRandomChar = (charset) => {
  return charset[getCryptoRandomInt(charset.length)];
};

/**
 * Strong Password Generator
 *
 * @param {string} prefix - Optional prefix (e.g. "Rahul")
 * @param {number} totalLength - Target length if no prefix provided (default 10)
 * @returns {string} Generated password satisfying all mandatory rules
 */
export const generateStrongPassword = (prefix = "", totalLength = 10) => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const specials = "@#$%&*!?";
  const allChars = letters + numbers + specials;

  const cleanPrefix = typeof prefix === "string" ? prefix.trim() : "";

  if (cleanPrefix) {
    // Prefix provided (e.g. "Rahul" -> "Rahul@7K29x", "Rahul#82Km", "Rahul!9Xp2")
    const specialChar = getCryptoRandomChar(specials);
    const numberChar = getCryptoRandomChar(numbers);
    const letterChar = getCryptoRandomChar(letters);

    // Add remaining random characters to make it robust (4 to 5 chars)
    const suffixLength = Math.max(3, 8 - cleanPrefix.length);
    const suffixArr = [numberChar, letterChar];
    for (let i = 2; i < suffixLength; i++) {
      suffixArr.push(getCryptoRandomChar(allChars));
    }

    // Shuffle suffix characters
    for (let i = suffixArr.length - 1; i > 0; i--) {
      const j = getCryptoRandomInt(i + 1);
      [suffixArr[i], suffixArr[j]] = [suffixArr[j], suffixArr[i]];
    }

    const candidate = `${cleanPrefix}${specialChar}${suffixArr.join("")}`;
    if (validatePassword(candidate)) {
      return candidate;
    }
    // Fallback if prefix was very short
    return `${cleanPrefix}${specialChar}${numberChar}${letterChar}${getCryptoRandomChar(letters)}${getCryptoRandomChar(numbers)}`;
  }

  // No prefix provided: Generate fully random password (e.g. "K8@pX2mQ")
  const targetLength = Math.max(8, totalLength);
  const chars = [
    getCryptoRandomChar("ABCDEFGHJKLMNPQRSTUVWXYZ"), // Uppercase
    getCryptoRandomChar("abcdefghijkmnopqrstuvwxyz"), // Lowercase
    getCryptoRandomChar(numbers),                    // Digit
    getCryptoRandomChar(specials),                   // Special character (@#$%&*!?)
  ];

  for (let i = chars.length; i < targetLength; i++) {
    chars.push(getCryptoRandomChar(allChars));
  }

  // Fisher-Yates shuffle using crypto randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getCryptoRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const generated = chars.join("");
  return generated;
};
