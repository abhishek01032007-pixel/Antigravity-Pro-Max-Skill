/**
 * SemVer.js - Semantic Version 2.0.0 Parser and Comparator
 *
 * Implements strict 3-tier numerical precedence comparison and prerelease
 * ordering without lexicographical string comparison pitfalls.
 */

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parses a SemVer string into structured components.
 */
function parse(versionString) {
  if (!versionString || typeof versionString !== 'string') return null;

  // Clean optional leading 'v' or 'V'
  let clean = versionString.trim();
  if (clean.startsWith('v') || clean.startsWith('V')) {
    clean = clean.slice(1);
  }

  const match = clean.match(SEMVER_REGEX);
  if (!match) return null;

  return {
    raw: versionString,
    clean,
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] || null
  };
}

/**
 * Checks if a version string is valid SemVer.
 */
function isValid(versionString) {
  return parse(versionString) !== null;
}

/**
 * Compares two prerelease components according to SemVer 2.0.0 rules:
 * - Identifiers consisting of only digits are compared numerically.
 * - Identifiers with letters/hyphens are compared lexically in ASCII sort order.
 * - Numeric identifiers always have lower precedence than non-numeric identifiers.
 * - A larger set of pre-release fields has a higher precedence than a smaller set,
 *   if all of the preceding identifiers are equal.
 */
function comparePrerelease(preA, preB) {
  // A normal release has higher precedence than a prerelease
  if (preA.length === 0 && preB.length === 0) return 0;
  if (preA.length === 0) return 1;  // 1.0.0 > 1.0.0-beta
  if (preB.length === 0) return -1; // 1.0.0-beta < 1.0.0

  const len = Math.max(preA.length, preB.length);
  for (let i = 0; i < len; i++) {
    const a = preA[i];
    const b = preB[i];

    if (a === undefined) return -1; // fewer identifiers = lower precedence
    if (b === undefined) return 1;

    if (a === b) continue;

    const aIsNum = /^\d+$/.test(a);
    const bIsNum = /^\d+$/.test(b);

    if (aIsNum && bIsNum) {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (numA !== numB) return numA > numB ? 1 : -1;
    } else if (aIsNum && !bIsNum) {
      return -1; // Numeric identifiers always have lower precedence
    } else if (!aIsNum && bIsNum) {
      return 1;
    } else {
      // Lexical comparison
      if (a !== b) return a > b ? 1 : -1;
    }
  }

  return 0;
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 * Throws error if either version string is invalid.
 */
function compare(v1, v2) {
  const p1 = parse(v1);
  const p2 = parse(v2);

  if (!p1) throw new Error(`Invalid semantic version: '${v1}'`);
  if (!p2) throw new Error(`Invalid semantic version: '${v2}'`);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  return comparePrerelease(p1.prerelease, p2.prerelease);
}

/**
 * Returns true if v1 is strictly greater than v2.
 */
function isGreaterThan(v1, v2) {
  return compare(v1, v2) === 1;
}

/**
 * Returns true if v1 is equal to v2.
 */
function isEqual(v1, v2) {
  return compare(v1, v2) === 0;
}

module.exports = {
  parse,
  isValid,
  compare,
  isGreaterThan,
  isEqual
};
