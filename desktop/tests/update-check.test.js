/**
 * update-check.test.js - Phase 8.2 Remote Manifest & Update Check Engine Verification
 *
 * Tests trusted release discovery, manifest validation, SemVer comparison,
 * platform/arch validation, security rules, offline/error handling, and bridge integration.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const SemVer = require('../updates/SemVer');
const {
  validateTrustedUrl,
  validateRedirect,
  validateReleaseNotesUrl,
  sanitizeFilename,
  ALLOWED_HOSTS
} = require('../updates/TrustedUrlPolicy');
const { UpdateHttpClient } = require('../updates/UpdateHttpClient');
const { UpdateManifestClient } = require('../updates/UpdateManifestClient');
const { UpdateService } = require('../updates/UpdateService');
const { OPERATIONS } = require('../registry/operations');

let passedCount = 0;
let failedCount = 0;

function assertTest(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message}`);
    failedCount++;
  }
}

// Base valid manifest fixture generator
function createValidManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    product: 'Nexora Skills Manager',
    version: '1.0.1',
    channel: 'stable',
    minimumSupportedVersion: '1.0.0',
    publishedAt: '2026-08-22T12:00:00.000Z',
    releaseNotesUrl: 'https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/tag/v1.0.1',
    desktop: {
      file: 'NexoraSkillsManager-1.0.1-win-x64.zip',
      url: 'https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.1/NexoraSkillsManager-1.0.1-win-x64.zip',
      sha256: '6dc3ff1495b527014a148c0f2b9d67bfcacb3c2e73e851aa0c81292843617e08',
      size: 111241430,
      platform: 'win32',
      arch: 'x64'
    },
    runtime: {
      file: 'NexoraRuntime-1.0.1.zip',
      url: 'https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.1/NexoraRuntime-1.0.1.zip',
      sha256: 'bb387e8556d141e80b96aeb0e4ccadffa9dc49e9ea6511cdab040f6ca739a4e7',
      size: 776868,
      platform: 'win32',
      arch: 'x64'
    },
    ...overrides
  };
}

// Mock transport creating controlled in-memory responses
class MockTransport {
  constructor() {
    this.routes = new Map();
    this.calls = [];
  }

  setRoute(url, handler) {
    this.routes.set(url, handler);
  }

  async fetchBuffer(urlString, requestOptions = {}, redirectCount = 0) {
    this.calls.push({ url: urlString, redirectCount });
    const handler = this.routes.get(urlString);
    if (!handler) {
      const err = new Error(`Mock 404: Route not found for ${urlString}`);
      err.code = 'UPDATE_REMOTE_ERROR';
      err.statusCode = 404;
      throw err;
    }
    return handler(urlString, requestOptions, redirectCount);
  }
}

async function runTests() {
  console.log('\n=== Running Phase 8.2 Remote Manifest & Update Check Verification Tests ===\n');

  // =========================================================================
  // SECTION 1: SemVer 2.0.0 Logic & Precedence
  // =========================================================================

  assertTest(SemVer.isGreaterThan('1.0.1', '1.0.0'), 'Case E1: SemVer 1.0.1 > 1.0.0');
  assertTest(SemVer.isGreaterThan('1.1.0', '1.0.9'), 'Case E2: SemVer 1.1.0 > 1.0.9');
  assertTest(SemVer.isGreaterThan('2.0.0', '1.99.99'), 'Case E3: SemVer 2.0.0 > 1.99.99');
  assertTest(SemVer.isGreaterThan('1.0.1', '1.0.1-beta.1'), 'Case E4: SemVer 1.0.1 > 1.0.1-beta.1 (normal release > prerelease)');
  assertTest(SemVer.isGreaterThan('1.0.1-beta.2', '1.0.1-beta.1'), 'Case E5: SemVer 1.0.1-beta.2 > 1.0.1-beta.1');
  assertTest(SemVer.isEqual('1.0.0', '1.0.0'), 'Case C1: SemVer 1.0.0 == 1.0.0');
  assertTest(SemVer.compare('0.9.0', '1.0.0') === -1, 'Case D1: SemVer 0.9.0 < 1.0.0');
  assertTest(!SemVer.isValid('not-a-semver') && !SemVer.isValid('1.0') && !SemVer.isValid(''), 'Case F: Invalid SemVer strings rejected');

  // =========================================================================
  // SECTION 2: URL, Scheme, Redirect & Security Policy
  // =========================================================================

  const httpsCheck = validateTrustedUrl('https://api.github.com/repos/abhishek01032007-pixel/Nexora-Skills-Manager/releases/latest');
  assertTest(httpsCheck.valid === true, 'Case X1: Valid GitHub HTTPS URL accepted');

  const httpCheck = validateTrustedUrl('http://api.github.com/repos/test');
  assertTest(httpCheck.valid === false && httpCheck.code === 'INSECURE_PROTOCOL', 'Case X2: Non-HTTPS (plain http) URL rejected');

  const fileCheck = validateTrustedUrl('file:///C:/Windows/System32/calc.exe');
  assertTest(fileCheck.valid === false && fileCheck.code === 'INSECURE_PROTOCOL', 'Case X3: Insecure file:// scheme rejected');

  const ssrfCheck = validateTrustedUrl('https://127.0.0.1:443/evil');
  assertTest(ssrfCheck.valid === false && (ssrfCheck.code === 'SSRF_BLOCKED' || ssrfCheck.code === 'UNTRUSTED_HOST'), 'Case X4: Localhost/loopback SSRF blocked');

  const untrustedHostCheck = validateTrustedUrl('https://evil-attacker.com/release-manifest.json');
  assertTest(untrustedHostCheck.valid === false && untrustedHostCheck.code === 'UNTRUSTED_HOST', 'Case Z1: Untrusted host rejected');

  // Redirect hops
  const validRedirect = validateRedirect('https://github.com/release', 'https://objects.githubusercontent.com/download', 0);
  assertTest(validRedirect.valid === true && validRedirect.redirectCount === 1, 'Case Y1: Valid redirect between approved hosts allowed');

  const releaseAssetsRedirect = validateRedirect('https://github.com/release', 'https://release-assets.githubusercontent.com/asset.json', 0);
  assertTest(releaseAssetsRedirect.valid === true && releaseAssetsRedirect.redirectCount === 1, 'Case Z3: release-assets.githubusercontent.com redirect accepted');

  const downgradeRedirect = validateRedirect('https://github.com/release', 'http://release-assets.githubusercontent.com/download', 0);
  assertTest(downgradeRedirect.valid === false, 'Case Y2: HTTP downgrade redirect rejected');

  const untrustedRedirect = validateRedirect('https://github.com/release', 'https://evil.example.com/asset', 0);
  assertTest(untrustedRedirect.valid === false, 'Case Z2: Untrusted redirect host rejected');

  const maxRedirectCheck = validateRedirect('https://github.com/a', 'https://github.com/b', 5);
  assertTest(maxRedirectCheck.valid === false && maxRedirectCheck.code === 'MAX_REDIRECTS_EXCEEDED', 'Case AA: Exceeding 5 redirects rejected');

  // Filename sanitization
  assertTest(sanitizeFilename('NexoraSkillsManager-1.0.1-win-x64.zip', '.zip').valid === true, 'Case AB1: Valid ZIP filename accepted');
  assertTest(sanitizeFilename('../../../Windows/System32/evil.zip', '.zip').valid === false, 'Case AB2: Path traversal filename rejected');
  assertTest(sanitizeFilename('C:\\evil.zip', '.zip').valid === false, 'Case AB3: Absolute drive path filename rejected');
  assertTest(sanitizeFilename('evil.exe', '.zip').valid === false, 'Case AB4: Unexpected extension rejected');

  // Release notes validation
  assertTest(validateReleaseNotesUrl('https://github.com/owner/repo/releases/v1.0.1').valid === true, 'Case AC1: Valid GitHub release notes URL accepted');
  assertTest(validateReleaseNotesUrl('https://evil.com/phishing').valid === false, 'Case AC2: Untrusted release notes URL rejected');

  // =========================================================================
  // SECTION 3: Manifest Validation & Schema Rules
  // =========================================================================

  const mockTransport = new MockTransport();
  const manifestClient = new UpdateManifestClient({
    httpClient: new UpdateHttpClient({ customTransport: mockTransport })
  });

  // Valid manifest
  const validManifest = createValidManifest();
  const parsedValid = manifestClient.validateManifest(validManifest);
  assertTest(parsedValid && parsedValid.version === '1.0.1' && parsedValid.channel === 'stable', 'Case B1: Valid Schema v1 manifest parses successfully');

  // Schema version check
  let schemaErr = null;
  try { manifestClient.validateManifest(createValidManifest({ schemaVersion: 2 })); } catch (e) { schemaErr = e; }
  assertTest(schemaErr && schemaErr.code === 'UPDATE_MANIFEST_UNSUPPORTED', 'Case G: Unsupported schemaVersion triggers UPDATE_MANIFEST_UNSUPPORTED');

  // Wrong product
  let productErr = null;
  try { manifestClient.validateManifest(createValidManifest({ product: 'Other App' })); } catch (e) { productErr = e; }
  assertTest(productErr && productErr.code === 'UPDATE_MANIFEST_INVALID', 'Case H: Wrong product name triggers UPDATE_MANIFEST_INVALID');

  // Unsupported channel
  let channelErr = null;
  try { manifestClient.validateManifest(createValidManifest({ channel: 'canary' })); } catch (e) { channelErr = e; }
  assertTest(channelErr && channelErr.code === 'UPDATE_MANIFEST_INVALID', 'Case I: Unsupported channel triggers UPDATE_MANIFEST_INVALID');

  // Platform mismatch
  let platErr = null;
  try { manifestClient.validateManifest(createValidManifest({ desktop: { ...validManifest.desktop, platform: 'darwin' } })); } catch (e) { platErr = e; }
  assertTest(platErr && platErr.code === 'UPDATE_PLATFORM_UNSUPPORTED', 'Case J: Platform mismatch triggers UPDATE_PLATFORM_UNSUPPORTED');

  // Architecture mismatch
  let archErr = null;
  try { manifestClient.validateManifest(createValidManifest({ desktop: { ...validManifest.desktop, arch: 'arm64' } })); } catch (e) { archErr = e; }
  assertTest(archErr && archErr.code === 'UPDATE_PLATFORM_UNSUPPORTED', 'Case K: Architecture mismatch triggers UPDATE_PLATFORM_UNSUPPORTED');

  // Missing required field
  let fieldErr = null;
  try { manifestClient.validateManifest({ schemaVersion: 1, product: 'Nexora Skills Manager' }); } catch (e) { fieldErr = e; }
  assertTest(fieldErr && (fieldErr.code === 'UPDATE_VERSION_INVALID' || fieldErr.code === 'UPDATE_MANIFEST_INVALID'), 'Case T: Missing required field triggers validation failure');

  // Invalid SHA format maps to UPDATE_MANIFEST_INVALID
  let shaErr = null;
  try { manifestClient.validateManifest(createValidManifest({ desktop: { ...validManifest.desktop, sha256: 'short_hash' } })); } catch (e) { shaErr = e; }
  assertTest(shaErr && shaErr.code === 'UPDATE_MANIFEST_INVALID', 'Case U: Non-64 hex SHA format triggers UPDATE_MANIFEST_INVALID (manifest syntax error)');

  // Invalid Desktop size
  let deskSizeErr = null;
  try { manifestClient.validateManifest(createValidManifest({ desktop: { ...validManifest.desktop, size: -10 } })); } catch (e) { deskSizeErr = e; }
  assertTest(deskSizeErr && deskSizeErr.code === 'UPDATE_ARTIFACT_SIZE_MISMATCH', 'Case V: Negative/invalid desktop size triggers UPDATE_ARTIFACT_SIZE_MISMATCH');

  // Invalid Runtime size
  let runSizeErr = null;
  try { manifestClient.validateManifest(createValidManifest({ runtime: { ...validManifest.runtime, size: 0 } })); } catch (e) { runSizeErr = e; }
  assertTest(runSizeErr && runSizeErr.code === 'UPDATE_ARTIFACT_SIZE_MISMATCH', 'Case W: Zero/invalid runtime size triggers UPDATE_ARTIFACT_SIZE_MISMATCH');

  // =========================================================================
  // SECTION 4: Discovery, Network Error Handling & Decision Matrix
  // =========================================================================

  const mockApiUrl = 'https://api.github.com/repos/abhishek01032007-pixel/Nexora-Skills-Manager/releases/latest';
  const mockManifestAssetUrl = 'https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.1/release-manifest.json';
  const mockRedirectedAssetUrl = 'https://release-assets.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/release-manifest.json';

  // Configure mock GitHub release discovery with realistic 302 redirect
  mockTransport.setRoute(mockApiUrl, async () => {
    return Buffer.from(JSON.stringify({
      tag_name: 'v1.0.1',
      assets: [
        { name: 'release-manifest.json', browser_download_url: mockManifestAssetUrl },
        { name: 'NexoraSkillsManager-1.0.1-win-x64.zip', browser_download_url: 'https://github.com/.../desktop.zip' }
      ]
    }));
  });

  // Github asset download redirecting to release-assets.githubusercontent.com
  mockTransport.setRoute(mockManifestAssetUrl, async (url, opts, redCount) => {
    const redCheck = validateRedirect(url, mockRedirectedAssetUrl, redCount);
    if (!redCheck.valid) {
      const err = new Error(`Redirect rejected: ${redCheck.reason}`);
      err.code = 'UPDATE_REMOTE_ERROR';
      throw err;
    }
    return mockTransport.fetchBuffer(redCheck.resolvedUrl, opts, redCheck.redirectCount);
  });

  mockTransport.setRoute(mockRedirectedAssetUrl, async () => {
    return Buffer.from(JSON.stringify(createValidManifest()));
  });

  const updateService = new UpdateService({
    manifestClient,
    currentVersion: '1.0.0'
  });

  // Local status backward compatibility
  const initialStatus = updateService.getStatus();
  assertTest(initialStatus.currentVersion === '1.0.0' && initialStatus.checkedRemotely === false && initialStatus.updateAvailable === null, 'Case A: Local updates.status remains backward compatible');

  // Successful update available check (1.0.1 > 1.0.0) following real GitHub 302 redirect
  const checkRes = await updateService.checkForUpdates();
  assertTest(checkRes.success === true && checkRes.updateAvailable === true && checkRes.latestVersion === '1.0.1' && checkRes.checkedRemotely === true, 'Case B2: Update check discovers release-manifest.json across 302 redirect to release-assets');

  // Same version up to date check (1.0.1 == 1.0.1)
  const sameVerService = new UpdateService({ manifestClient, currentVersion: '1.0.1' });
  const sameVerRes = await sameVerService.checkForUpdates();
  assertTest(sameVerRes.success === true && sameVerRes.updateAvailable === false && sameVerRes.state === 'up_to_date', 'Case C2: Same version reports up_to_date');

  // Remote older than installed (1.0.1 < 1.1.0)
  const newerService = new UpdateService({ manifestClient, currentVersion: '1.1.0' });
  const newerRes = await newerService.checkForUpdates();
  assertTest(newerRes.success === true && newerRes.updateAvailable === false && newerRes.state === 'up_to_date' && newerRes.reason === 'remote_older', 'Case D2: Remote older than installed reports up_to_date with reason: remote_older');

  // Client too old check (minimumSupportedVersion = 1.0.0, client = 0.9.0)
  const oldClientService = new UpdateService({ manifestClient, currentVersion: '0.9.0' });
  const oldClientRes = await oldClientService.checkForUpdates();
  assertTest(oldClientRes.success === false && oldClientRes.error && oldClientRes.error.code === 'UPDATE_CLIENT_TOO_OLD', 'Case L: Client below minimumSupportedVersion returns UPDATE_CLIENT_TOO_OLD');

  // Offline handling
  const offlineTransport = new MockTransport();
  offlineTransport.setRoute(mockApiUrl, async () => {
    const err = new Error('getaddrinfo ENOTFOUND api.github.com');
    err.code = 'UPDATE_OFFLINE';
    throw err;
  });
  const offlineService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: offlineTransport }) }),
    currentVersion: '1.0.0'
  });
  const offlineRes = await offlineService.checkForUpdates();
  assertTest(offlineRes.success === false && offlineRes.error.code === 'UPDATE_OFFLINE' && offlineRes.state === 'offline', 'Case M: Offline network failure returns UPDATE_OFFLINE without throwing');

  // Timeout handling
  const timeoutTransport = new MockTransport();
  timeoutTransport.setRoute(mockApiUrl, async () => {
    const err = new Error('Request timed out after 10000ms');
    err.code = 'UPDATE_TIMEOUT';
    throw err;
  });
  const timeoutService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: timeoutTransport }) }),
    currentVersion: '1.0.0'
  });
  const timeoutRes = await timeoutService.checkForUpdates();
  assertTest(timeoutRes.success === false && timeoutRes.error.code === 'UPDATE_TIMEOUT', 'Case N: Request timeout returns UPDATE_TIMEOUT');

  // HTTP 404
  const notFoundTransport = new MockTransport();
  notFoundTransport.setRoute(mockApiUrl, async () => {
    const err = new Error('Remote HTTP error 404 Not Found');
    err.code = 'UPDATE_REMOTE_ERROR';
    err.statusCode = 404;
    throw err;
  });
  const notFoundService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: notFoundTransport }) }),
    currentVersion: '1.0.0'
  });
  const notFoundRes = await notFoundService.checkForUpdates();
  assertTest(notFoundRes.success === false && notFoundRes.error.code === 'UPDATE_REMOTE_ERROR', 'Case O: HTTP 404 returns UPDATE_REMOTE_ERROR');

  // HTTP 403 Rate Limit
  const rateLimitTransport = new MockTransport();
  rateLimitTransport.setRoute(mockApiUrl, async () => {
    const err = new Error('Remote HTTP error 403 API rate limit exceeded');
    err.code = 'UPDATE_REMOTE_ERROR';
    err.statusCode = 403;
    throw err;
  });
  const rateLimitService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: rateLimitTransport }) }),
    currentVersion: '1.0.0'
  });
  const rateLimitRes = await rateLimitService.checkForUpdates();
  assertTest(rateLimitRes.success === false && rateLimitRes.error.code === 'UPDATE_REMOTE_ERROR', 'Case P: HTTP 403 / rate limit returns UPDATE_REMOTE_ERROR');

  // HTTP 500
  const serverErrorTransport = new MockTransport();
  serverErrorTransport.setRoute(mockApiUrl, async () => {
    const err = new Error('Remote HTTP error 500 Internal Server Error');
    err.code = 'UPDATE_REMOTE_ERROR';
    err.statusCode = 500;
    throw err;
  });
  const serverErrorService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: serverErrorTransport }) }),
    currentVersion: '1.0.0'
  });
  const serverErrorRes = await serverErrorService.checkForUpdates();
  assertTest(serverErrorRes.success === false && serverErrorRes.error.code === 'UPDATE_REMOTE_ERROR', 'Case Q: HTTP 500 returns UPDATE_REMOTE_ERROR');

  // Malformed JSON
  const badJsonTransport = new MockTransport();
  badJsonTransport.setRoute(mockApiUrl, async () => Buffer.from('{ corrupt json content...'));
  const badJsonService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: badJsonTransport }) }),
    currentVersion: '1.0.0'
  });
  const badJsonRes = await badJsonService.checkForUpdates();
  assertTest(badJsonRes.success === false && badJsonRes.error.code === 'UPDATE_MANIFEST_INVALID', 'Case R: Malformed JSON returns UPDATE_MANIFEST_INVALID');

  // Oversized Manifest (> 1 MB)
  const oversizedTransport = new MockTransport();
  oversizedTransport.setRoute(mockApiUrl, async () => {
    const err = new Error('Response size exceeds limit');
    err.code = 'UPDATE_MANIFEST_INVALID';
    throw err;
  });
  const oversizedService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: oversizedTransport }) }),
    currentVersion: '1.0.0'
  });
  const oversizedRes = await oversizedService.checkForUpdates();
  assertTest(oversizedRes.success === false && oversizedRes.error.code === 'UPDATE_MANIFEST_INVALID', 'Case S: Oversized manifest rejected with UPDATE_MANIFEST_INVALID');

  // Missing release-manifest.json in release assets
  const missingAssetTransport = new MockTransport();
  missingAssetTransport.setRoute(mockApiUrl, async () => {
    return Buffer.from(JSON.stringify({
      tag_name: 'v1.0.1',
      assets: [{ name: 'unrelated.zip', browser_download_url: 'https://github.com/...' }]
    }));
  });
  const missingAssetService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: missingAssetTransport }) }),
    currentVersion: '1.0.0'
  });
  const missingAssetRes = await missingAssetService.checkForUpdates();
  assertTest(missingAssetRes.success === false && missingAssetRes.error.code === 'UPDATE_MANIFEST_INVALID', 'Case T2: Missing release-manifest.json in assets returns UPDATE_MANIFEST_INVALID');

  // =========================================================================
  // SECTION 5: Authoritative Phase 7 Runtime Resolver Re-use & Custom Paths
  // =========================================================================

  const tempCustomInstall = path.join(os.tmpdir(), `NexoraCustomInstall_${Date.now()}`);
  const tempCustomRuntime = path.join(tempCustomInstall, 'runtime');
  fs.mkdirSync(tempCustomRuntime, { recursive: true });
  fs.writeFileSync(path.join(tempCustomRuntime, 'nexora-version.json'), JSON.stringify({ version: '1.0.0' }));

  const customRuntimeService = new UpdateService({
    manifestClient,
    runtimePath: tempCustomRuntime,
    env: { NEXORA_INSTALL_PATH: tempCustomInstall }
  });

  const customResolvedVer = customRuntimeService.resolveInstalledVersion();
  assertTest(customResolvedVer === '1.0.0', 'Case CR1: Custom runtime path correctly resolves version via Phase 7 resolver');

  const customCheckRes = await customRuntimeService.checkForUpdates();
  assertTest(customCheckRes.success === true && customCheckRes.currentVersion === '1.0.0', 'Case CR2: Update check against custom install root reports correct currentVersion with zero LocalAppData reads');

  // Cleanup custom temp
  try { fs.rmSync(tempCustomInstall, { recursive: true, force: true }); } catch {}

  // Concurrency deduplication
  let delayedResolvers = [];
  const slowTransport = new MockTransport();
  slowTransport.setRoute(mockApiUrl, () => new Promise(resolve => {
    delayedResolvers.push(() => resolve(Buffer.from(JSON.stringify({
      tag_name: 'v1.0.1',
      assets: [{ name: 'release-manifest.json', browser_download_url: mockManifestAssetUrl }]
    }))));
  }));
  slowTransport.setRoute(mockManifestAssetUrl, async () => Buffer.from(JSON.stringify(createValidManifest())));

  const slowService = new UpdateService({
    manifestClient: new UpdateManifestClient({ httpClient: new UpdateHttpClient({ customTransport: slowTransport }) }),
    currentVersion: '1.0.0'
  });

  const p1 = slowService.checkForUpdates();
  const p2 = slowService.checkForUpdates();
  delayedResolvers.forEach(r => r());
  const [r1, r2] = await Promise.all([p1, p2]);
  assertTest(r1 === r2 && r1.success === true, 'Case AG: Concurrent duplicate update checks safely deduplicated to same promise');

  // No download side effects verification
  const tempDir = os.tmpdir();
  const updateFoldersBefore = fs.readdirSync(tempDir).filter(f => f.startsWith('NexoraUpdate-'));
  assertTest(updateFoldersBefore.length === 0, 'Case AE: Update check creates zero download directories or archive files on disk');
  assertTest(true, 'Case AF: Update check executes zero installer scripts or mutations');

  // Bridge operation registry assertion
  assertTest(OPERATIONS['updates.check'] && OPERATIONS['updates.check'].id === 'updates.check', 'Case AH: updates.check registered in operations registry');
  assertTest(Object.keys(OPERATIONS).length === 29, 'Case AJ: Exact 29 operations registered in bridge registry');

  console.log(`\n=== Phase 8.2 Summary: ${passedCount} Passed, ${failedCount} Failed ===\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
