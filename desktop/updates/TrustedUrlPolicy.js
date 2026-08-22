/**
 * TrustedUrlPolicy.js - Strict URL, Host, Scheme and Redirect Security Policy
 *
 * Enforces HTTPS-only transport, strict host allowlists, anti-SSRF protections,
 * redirect hop validation, and filename sanitization for remote updates.
 */

const ALLOWED_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'raw.githubusercontent.com',
  'release-assets.githubusercontent.com'
]);

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i
];

const MAX_REDIRECTS = 5;

/**
 * Validates whether a URL is secure, uses HTTPS, and targets an approved host.
 */
function validateTrustedUrl(urlString, options = {}) {
  const { allowCustomPorts = false, allowedHosts = ALLOWED_HOSTS } = options;

  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string', code: 'INVALID_URL' };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { valid: false, reason: 'Malformed URL format', code: 'MALFORMED_URL' };
  }

  // 1. Enforce HTTPS only
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: `Insecure protocol '${parsed.protocol}'. HTTPS is required.`, code: 'INSECURE_PROTOCOL' };
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Embedded credentials are not permitted in update URLs.', code: 'EMBEDDED_CREDENTIALS' };
  }

  // 3. Port validation (default HTTPS port only unless explicitly allowed)
  if (parsed.port && parsed.port !== '443' && !allowCustomPorts) {
    return { valid: false, reason: `Unexpected port '${parsed.port}'. Default HTTPS port (443) required.`, code: 'INVALID_PORT' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 4. Anti-SSRF check: Reject local/private/loopback addresses
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: `Blocked destination '${hostname}'. Private/local destinations forbidden.`, code: 'SSRF_BLOCKED' };
    }
  }

  // 5. Host allowlist check
  if (!allowedHosts.has(hostname)) {
    return { valid: false, reason: `Host '${hostname}' is not in the approved update host allowlist.`, code: 'UNTRUSTED_HOST' };
  }

  return { valid: true, url: parsed.toString(), hostname };
}

/**
 * Validates a redirect from current URL to next URL.
 */
function validateRedirect(currentUrl, nextUrl, redirectCount, options = {}) {
  if (redirectCount >= MAX_REDIRECTS) {
    return { valid: false, reason: `Maximum redirect limit (${MAX_REDIRECTS}) exceeded.`, code: 'MAX_REDIRECTS_EXCEEDED' };
  }

  // Next URL can be relative or absolute
  let resolvedNext;
  try {
    resolvedNext = new URL(nextUrl, currentUrl).toString();
  } catch {
    return { valid: false, reason: 'Invalid redirect target URL.', code: 'MALFORMED_REDIRECT_URL' };
  }

  const check = validateTrustedUrl(resolvedNext, options);
  if (!check.valid) {
    return check;
  }

  return { valid: true, resolvedUrl: resolvedNext, redirectCount: redirectCount + 1 };
}

/**
 * Validates release notes URL (must be HTTPS and on trusted GitHub host).
 */
function validateReleaseNotesUrl(urlString, options = {}) {
  if (!urlString) return { valid: true, url: null };
  return validateTrustedUrl(urlString, options);
}

/**
 * Sanitizes and validates an artifact or manifest filename.
 */
function sanitizeFilename(filename, expectedExtension = null) {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, reason: 'Filename must be a non-empty string', code: 'INVALID_FILENAME' };
  }

  const trimmed = filename.trim();

  // Check for path traversal, slashes, colons, null bytes
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes(':') || trimmed.includes('\0')) {
    return { valid: false, reason: 'Filename contains forbidden path characters or traversal sequences', code: 'FORBIDDEN_PATH_CHARS' };
  }

  // Length check
  if (trimmed.length > 255) {
    return { valid: false, reason: 'Filename exceeds maximum allowable length (255)', code: 'FILENAME_TOO_LONG' };
  }

  // Extension check
  if (expectedExtension) {
    const ext = expectedExtension.startsWith('.') ? expectedExtension : `.${expectedExtension}`;
    if (!trimmed.toLowerCase().endsWith(ext.toLowerCase())) {
      return { valid: false, reason: `Filename must end with '${ext}'`, code: 'UNEXPECTED_EXTENSION' };
    }
  }

  return { valid: true, sanitized: trimmed };
}

module.exports = {
  ALLOWED_HOSTS,
  MAX_REDIRECTS,
  validateTrustedUrl,
  validateRedirect,
  validateReleaseNotesUrl,
  sanitizeFilename
};
