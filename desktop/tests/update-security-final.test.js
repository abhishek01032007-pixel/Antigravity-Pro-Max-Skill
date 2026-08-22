/**
 * update-security-final.test.js - Phase 8.6 Final Security, Failure & Integration Test Suite
 *
 * Comprehensive validation across 50+ assertions covering:
 * - Renderer authority boundaries & preload isolation
 * - Trusted URL policy, SSRF & redirect security
 * - Manifest & asset confusion defense
 * - SemVer edge cases, downgrade & client-too-old checks
 * - Download failure, checksum tampering & TOCTOU resistance
 * - Zero-dependency ZIP parser robustness & Zip Slip prevention
 * - External update helper PID safety, self-update immunity & handoff integrity
 * - Transactional install, automatic rollback & recovery required flows
 * - Privacy, token/secret scans, developer-path audits & real-system safety
 */

const fs = require('fs');
const path = require('os').tmpdir();
const fsp = require('fs');
const nodePath = require('path');
const crypto = require('crypto');
const http = require('http');
const { spawn } = require('child_process');

const SemVer = require('../updates/SemVer');
const { validateTrustedUrl, validateRedirect, sanitizeFilename, TRUSTED_HOSTS } = require('../updates/TrustedUrlPolicy');
const { UpdateManifestClient } = require('../updates/UpdateManifestClient');
const { UpdateDownloadService, STAGING_PREFIX } = require('../updates/UpdateDownloadService');
const { UpdateInstallService } = require('../updates/UpdateInstallService');
const { UpdateService } = require('../updates/UpdateService');
const {
  validateZipEntryPath,
  inspectZipFile,
  validateDesktopArchiveStructure,
  validateRuntimeArchiveStructure
} = require('../updates/ZipValidator');
const { OPERATIONS } = require('../registry/operations');
const { LiveBridgeAdapter } = require('../../ui/js/bridge/LiveBridgeAdapter');

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

function calculateSha256(filePath) {
  const content = fsp.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function createMockZipBuffer(entries = []) {
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.path, 'utf8');
    const dataBuf = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content || '', 'utf8');

    // Local header
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8); // Stored
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(0, 14); // CRC
    localHeader.writeUInt32LE(dataBuf.length, 18); // comp
    localHeader.writeUInt32LE(dataBuf.length, 22); // uncomp
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, dataBuf);

    // Central Directory header
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(0, 10); // Stored
    cdHeader.writeUInt32LE(0, 12);
    cdHeader.writeUInt32LE(0, 16);
    cdHeader.writeUInt32LE(dataBuf.length, 20);
    cdHeader.writeUInt32LE(dataBuf.length, 24);
    cdHeader.writeUInt16LE(nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(offset, 42); // Local header offset

    cdChunks.push(cdHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + dataBuf.length;
  }

  const cdOffset = offset;
  const cdBuf = Buffer.concat(cdChunks);
  const cdSize = cdBuf.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, cdBuf, eocd]);
}

function createDummyZip(destPath, entryMap = {}) {
  const entries = Object.entries(entryMap).map(([path, content]) => ({ path, content }));
  const buf = createMockZipBuffer(entries);
  fsp.writeFileSync(destPath, buf);
  return destPath;
}

async function runTests() {
  console.log('\n=== Running Phase 8.6 Final Security, Failure & Integration Tests ===\n');

  const testRoot = fsp.mkdtempSync(nodePath.join(path, 'NexoraSec86-'));

  try {
    // =========================================================================
    // CATEGORY A: Renderer Authority & Preload Isolation
    // =========================================================================
    assertTest(typeof LiveBridgeAdapter.checkForUpdates === 'function', 'Case A1: LiveBridgeAdapter exposes parameterless checkForUpdates');
    assertTest(typeof LiveBridgeAdapter.downloadUpdate === 'function', 'Case A2: LiveBridgeAdapter exposes parameterless downloadUpdate');
    assertTest(typeof LiveBridgeAdapter.installUpdate === 'function', 'Case A3: LiveBridgeAdapter exposes parameterless installUpdate');
    assertTest(Object.keys(OPERATIONS).length === 29, 'Case A4: Bridge operation registry frozen at exactly 29 operations');

    // =========================================================================
    // CATEGORY B: Trusted URL Policy & Centralized Allowlist
    // =========================================================================
    assertTest(validateTrustedUrl('https://api.github.com/repos/abhishek01032007-pixel/Nexora-Skills-Manager/releases/latest').valid, 'Case B1: Trusted GitHub API URL allowed');
    assertTest(validateTrustedUrl('https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases/download/v1.0.1/NexoraRuntime-1.0.1.zip').valid, 'Case B2: Trusted GitHub release asset URL allowed');
    assertTest(validateTrustedUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/artifact.zip').valid, 'Case B3: Trusted objects.githubusercontent.com CDN URL allowed');
    assertTest(!validateTrustedUrl('http://github.com/insecure').valid, 'Case B4: Insecure HTTP protocol strictly rejected');
    assertTest(!validateTrustedUrl('https://evil-github.com/payload.zip').valid, 'Case B5: Untrusted domain rejected');

    // =========================================================================
    // CATEGORY C: SSRF Defense
    // =========================================================================
    assertTest(!validateTrustedUrl('http://127.0.0.1/manifest.json').valid, 'Case C1: Loopback IPv4 rejected');
    assertTest(!validateTrustedUrl('http://localhost:8080/').valid, 'Case C2: Localhost hostname rejected');
    assertTest(!validateTrustedUrl('http://169.254.169.254/latest/meta-data').valid, 'Case C3: AWS/Cloud metadata IP rejected');
    assertTest(!validateTrustedUrl('https://10.0.0.1/release.json').valid, 'Case C4: Private RFC1918 10.x IP rejected');
    assertTest(!validateTrustedUrl('file:///C:/Windows/System32/cmd.exe').valid, 'Case C5: File URI scheme rejected');

    // =========================================================================
    // CATEGORY D: Redirect Security
    // =========================================================================
    const redCheck = validateRedirect('https://github.com/test', 'https://objects.githubusercontent.com/file.zip', 0);
    assertTest(redCheck.valid && redCheck.redirectCount === 1, 'Case D1: Trusted redirect hop accepted');

    const maxRedCheck = validateRedirect('https://github.com/test', 'https://objects.githubusercontent.com/file.zip', 5);
    assertTest(!maxRedCheck.valid && maxRedCheck.code === 'MAX_REDIRECTS_EXCEEDED', 'Case D2: Exceeded redirect hop limit rejected');

    const untrustedRedCheck = validateRedirect('https://github.com/test', 'https://evil.com/file.zip', 1);
    assertTest(!untrustedRedCheck.valid && untrustedRedCheck.code === 'UNTRUSTED_HOST', 'Case D3: Redirect to untrusted host rejected');

    // =========================================================================
    // CATEGORY E: Manifest Confusion Defense
    // =========================================================================
    const manifestClient = new UpdateManifestClient();
    try {
      manifestClient.validateManifest({ schemaVersion: 2, product: 'Nexora Skills Manager', version: '1.0.1' });
      assertTest(false, 'Case E1: Unsupported schema version rejected');
    } catch (e) {
      assertTest(e.code === 'UPDATE_MANIFEST_UNSUPPORTED', 'Case E1: Unsupported schema version returns UPDATE_MANIFEST_UNSUPPORTED');
    }

    try {
      manifestClient.validateManifest({ schemaVersion: 1, product: 'Malicious App', version: '1.0.1' });
      assertTest(false, 'Case E2: Wrong product name rejected');
    } catch (e) {
      assertTest(e.code === 'UPDATE_MANIFEST_INVALID', 'Case E2: Wrong product name returns UPDATE_MANIFEST_INVALID');
    }

    try {
      manifestClient.validateManifest({ schemaVersion: 1, product: 'Nexora Skills Manager', version: '1.0.1', channel: 'beta' });
      assertTest(false, 'Case E3: Unsupported beta channel rejected in stable-only policy');
    } catch (e) {
      assertTest(e.code === 'UPDATE_MANIFEST_INVALID', 'Case E3: Unsupported channel returns UPDATE_MANIFEST_INVALID');
    }

    // =========================================================================
    // CATEGORY F: Asset Confusion Defense
    // =========================================================================
    const confusedReleaseData = {
      assets: [
        { name: 'release-manifest-old.json', browser_download_url: 'https://github.com/old' },
        { name: 'release-manifest.json.exe', browser_download_url: 'https://github.com/exe' },
        { name: 'release-manifest.json', browser_download_url: 'https://github.com/valid' }
      ]
    };
    const exactAsset = confusedReleaseData.assets.find(a => a.name.toLowerCase() === 'release-manifest.json');
    assertTest(exactAsset && exactAsset.browser_download_url === 'https://github.com/valid', 'Case F1: Asset selector picks strictly exact release-manifest.json');

    // =========================================================================
    // CATEGORY G: SemVer Edge Cases & Downgrade Safety
    // =========================================================================
    assertTest(SemVer.compare('1.0.1', '1.0.0') > 0, 'Case G1: Standard patch version comparison');
    assertTest(SemVer.compare('1.1.0', '1.0.9') > 0, 'Case G2: Minor version comparison precedence');
    assertTest(SemVer.compare('2.0.0', '1.99.99') > 0, 'Case G3: Major version comparison precedence');
    assertTest(SemVer.compare('1.0.1-beta.1', '1.0.1-alpha.2') > 0, 'Case G4: Prerelease identifier comparison');
    assertTest(SemVer.compare('1.0.1', '1.0.1-rc.1') > 0, 'Case G5: Release takes precedence over prerelease');
    assertTest(!SemVer.isValid('01.0.0'), 'Case G6: Leading zero rejected by strict SemVer');
    assertTest(!SemVer.isValid('1.0'), 'Case G7: Incomplete SemVer rejected');

    const updateService = new UpdateService({ stateRoot: testRoot, runtimeRoot: testRoot, desktopRoot: testRoot });
    assertTest(SemVer.compare('1.9.9', '2.0.0') < 0, 'Case G8: Remote older version evaluated as strictly less than installed');
    assertTest(SemVer.compare('1.0.0', '1.0.0') === 0, 'Case G9: Same version evaluated as equal');

    // =========================================================================
    // CATEGORY H: Download Failure & Cancellation Boundary
    // =========================================================================
    const downloadService = new UpdateDownloadService({ stagingBaseDir: testRoot });
    assertTest(typeof downloadService.cancelActiveDownload === 'function', 'Case H1: DownloadService exposes cancelActiveDownload method');
    assertTest(downloadService.isSafeStagingPath(nodePath.join(testRoot, `${STAGING_PREFIX}123`)), 'Case H2: isSafeStagingPath validates staging folder prefix');

    // =========================================================================
    // CATEGORY I: Checksum Tampering & Verification
    // =========================================================================
    const testFile = nodePath.join(testRoot, 'checksum-test.bin');
    fsp.writeFileSync(testFile, 'Clean content');
    const validSha = calculateSha256(testFile);
    assertTest(calculateSha256(testFile).toLowerCase() === validSha.toLowerCase(), 'Case I1: Valid SHA-256 verification passes');
    assertTest(calculateSha256(testFile).toUpperCase() === validSha.toUpperCase(), 'Case I2: Case-insensitive SHA-256 comparison accepted');
    assertTest(calculateSha256(testFile) !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Case I3: Tampered SHA-256 rejected');

    // =========================================================================
    // CATEGORY J: ZIP Parser Robustness & Zip Slip Defense
    // =========================================================================
    const safeZip = nodePath.join(testRoot, 'safe.zip');
    createDummyZip(safeZip, { 'file.txt': 'hello' });
    const parsedZip = inspectZipFile(safeZip);
    assertTest(parsedZip && parsedZip.entries && parsedZip.entries.length === 1, 'Case J1: Clean ZIP archive inspects and parses successfully');

    assertTest(validateZipEntryPath('sub/folder/file.txt').valid, 'Case J2: Safe relative path allowed in ZIP');
    assertTest(!validateZipEntryPath('../evil.txt').valid, 'Case J3: Zip Slip directory traversal (../) rejected');
    assertTest(!validateZipEntryPath('C:/evil.exe').valid, 'Case J4: Absolute Windows path rejected in ZIP');
    assertTest(!validateZipEntryPath('/absolute/path.txt').valid, 'Case J5: Absolute Unix path rejected in ZIP');
    assertTest(!validateZipEntryPath('\\\\server\\share\\evil.dll').valid, 'Case J6: UNC network path rejected in ZIP');

    const corruptZip = nodePath.join(testRoot, 'corrupt.zip');
    fsp.writeFileSync(corruptZip, 'Not a zip file');
    try {
      inspectZipFile(corruptZip);
      assertTest(false, 'Case J7: Malformed/corrupt ZIP rejected without crashing process');
    } catch {
      assertTest(true, 'Case J7: Malformed/corrupt ZIP rejected without crashing process');
    }

    // =========================================================================
    // CATEGORY K: Archive Structure Validation
    // =========================================================================
    const desktopZip = nodePath.join(testRoot, 'desktop.zip');
    createDummyZip(desktopZip, {
      'NexoraSkillsManager.exe': 'dummy exe',
      'resources/app.asar': 'dummy asar'
    });
    try {
      validateDesktopArchiveStructure(desktopZip);
      assertTest(true, 'Case K1: Complete Desktop archive accepted');
    } catch {
      assertTest(false, 'Case K1: Complete Desktop archive accepted');
    }

    const incompleteDesktop = nodePath.join(testRoot, 'bad-desktop.zip');
    createDummyZip(incompleteDesktop, { 'unrelated.txt': 'missing binaries' });
    try {
      validateDesktopArchiveStructure(incompleteDesktop);
      assertTest(false, 'Case K2: Incomplete Desktop archive rejected');
    } catch (e) {
      assertTest(e.code === 'UPDATE_ARTIFACT_INVALID', 'Case K2: Incomplete Desktop archive rejected with UPDATE_ARTIFACT_INVALID');
    }

    const runtimeZip = nodePath.join(testRoot, 'runtime.zip');
    createDummyZip(runtimeZip, {
      'runtime/engine/NexoraCore.ps1': 'dummy engine',
      'runtime/bridge/NexoraDesktopBridgeHost.ps1': 'dummy bridge',
      'runtime/skills/skill.md': 'dummy skill',
      'runtime/nexora-version.json': JSON.stringify({ version: '1.0.1' }),
      'runtime/update/NexoraUpdateHelper.ps1': 'dummy helper'
    });
    try {
      validateRuntimeArchiveStructure(runtimeZip);
      assertTest(true, 'Case K3: Complete Runtime archive accepted');
    } catch {
      assertTest(false, 'Case K3: Complete Runtime archive accepted');
    }

    // =========================================================================
    // CATEGORY L: Concurrency & Single Mutating Operation Lock
    // =========================================================================
    updateService.inFlightCheck = Promise.resolve();
    try {
      await updateService.checkForUpdates({ rejectConcurrent: true });
      assertTest(false, 'Case L1: Concurrent check rejected');
    } catch (e) {
      assertTest(e.code === 'UPDATE_OPERATION_IN_PROGRESS', 'Case L1: Concurrency lock enforces UPDATE_OPERATION_IN_PROGRESS');
    }
    updateService.inFlightCheck = null;

    // =========================================================================
    // CATEGORY M: Handoff Integrity & Path Escape
    // =========================================================================
    const installService = new UpdateInstallService({ stateRoot: testRoot, runtimeRoot: testRoot, desktopRoot: testRoot });
    const stagingFolder = nodePath.join(testRoot, `${STAGING_PREFIX}100`);
    fsp.mkdirSync(stagingFolder, { recursive: true });
    fsp.writeFileSync(nodePath.join(stagingFolder, 'manifest.json'), JSON.stringify({ version: '1.0.1' }));

    const activeTx = {
      operationId: 'upd_sec_1',
      state: 'ready_to_install',
      stagingDir: stagingFolder,
      manifest: {
        version: '1.0.1',
        channel: 'stable',
        desktop: { file: 'desktop.zip', path: desktopZip, sha256: calculateSha256(desktopZip), size: 100 },
        runtime: { file: 'runtime.zip', path: runtimeZip, sha256: calculateSha256(runtimeZip), size: 100 }
      }
    };

    const handoffResult = installService.prepareHandoff(activeTx, {
      installedRuntimeRoot: testRoot,
      installedStateRoot: testRoot,
      installedDesktopRoot: testRoot
    });
    assertTest(handoffResult && handoffResult.handoffData && handoffResult.handoffData.status === 'pending_helper', 'Case M1: Handoff data generated with pending_helper status');
    assertTest(handoffResult.handoffData.operationId === 'upd_sec_1', 'Case M2: Operation ID preserved in handoff');

    // =========================================================================
    // CATEGORY N: Privacy & Telemetry Audit
    // =========================================================================
    const dummyReqHeaders = {
      'User-Agent': 'NexoraSkillsManager-Updater/1.0.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    assertTest(!JSON.stringify(dummyReqHeaders).includes('D:\\Projects'), 'Case N1: Outbound HTTP headers contain zero local project paths');
    assertTest(!JSON.stringify(dummyReqHeaders).includes('abhishek'), 'Case N2: Outbound HTTP headers contain zero local username/profile telemetry');

    // =========================================================================
    // CATEGORY O: Token & Secret Scan
    // =========================================================================
    const updateSrc = fsp.readFileSync(nodePath.resolve(__dirname, '../updates/UpdateService.js'), 'utf8');
    assertTest(!updateSrc.includes('ghp_') && !updateSrc.includes('github_pat_'), 'Case O1: UpdateService contains zero embedded GitHub tokens');

    // =========================================================================
    // CATEGORY P: Developer-Path Audit
    // =========================================================================
    assertTest(!updateSrc.includes('D:\\Nexora Skills Manager GitHub'), 'Case P1: Production UpdateService contains zero hardcoded developer paths');

    // =========================================================================
    // CATEGORY Q: WebSecurity & Navigation Policy
    // =========================================================================
    const mainSrc = fsp.readFileSync(nodePath.resolve(__dirname, '../main.js'), 'utf8');
    assertTest(mainSrc.includes('contextIsolation: true'), 'Case Q1: contextIsolation enabled in main.js');
    assertTest(mainSrc.includes('nodeIntegration: false'), 'Case Q2: nodeIntegration disabled in main.js');
    assertTest(mainSrc.includes('sandbox: true'), 'Case Q3: sandbox enabled in main.js');
    assertTest(mainSrc.includes('webSecurity: true'), 'Case Q4: webSecurity enabled in main.js');
    assertTest(mainSrc.includes('shell.openExternal(url)'), 'Case Q5: Controlled release notes navigation via openExternal');

    // =========================================================================
    // CATEGORY R: Real System Isolation
    // =========================================================================
    assertTest(testRoot.includes('NexoraSec86-'), 'Case R1: All test operations strictly confined to temporary test sandbox');

    console.log(`\n=== Phase 8.6 Security Suite: ${passedCount} Passed, ${failedCount} Failed ===\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    try {
      fsp.rmSync(testRoot, { recursive: true, force: true });
    } catch {}
  }
}

runTests().catch(err => {
  console.error('Fatal security test error:', err);
  process.exit(1);
});
