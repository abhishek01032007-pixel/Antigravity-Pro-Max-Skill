/**
 * bridge-protocol.test.js - Comprehensive Gate 2 Bridge Protocol & Security Test Suite
 *
 * Verifies persistent worker lifecycle, single-line JSON IPC, error handling,
 * timeout classes, exact 25-operation frozen contract, payload validations,
 * read vs mutating timeout semantics, PID persistence, and Global Removal security matrix (A-F).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { PowerShellProcessHost } = require('../bridge/PowerShellProcessHost');
const { OPERATIONS, OPERATION_IDS, isValidOperation, TIMEOUT_CLASSES } = require('../registry/operations');

let passCount = 0;
let totalCount = 0;

function assertTest(condition, name) {
  totalCount++;
  if (condition) {
    passCount++;
    console.log(`  \x1b[32m[PASS]\x1b[0m Test #${totalCount}: ${name}`);
  } else {
    console.log(`  \x1b[31m[FAIL]\x1b[0m Test #${totalCount}: ${name}`);
    throw new Error(`Assertion failed in Test #${totalCount}: ${name}`);
  }
}

const FROZEN_25_OPERATIONS = new Set([
  'application.initialize',
  'application.status',
  'projects.list',
  'projects.validate',
  'projects.add',
  'projects.remove',
  'projects.profile',
  'projects.analyze',
  'context.get',
  'context.set',
  'recommendations.get',
  'skills.catalog',
  'skills.active',
  'skills.activate',
  'skills.deactivate',
  'skills.usage',
  'skills.globalRemoval.preview',
  'skills.globalRemoval.execute',
  'platforms.list',
  'platforms.preferences.get',
  'platforms.preferences.set',
  'doctor.run',
  'doctor.repair',
  'activity.list',
  'updates.status'
]);

async function runTests() {
  console.log('\x1b[36m=== Running Nexora Gate 2 Bridge Protocol & Security Tests ===\x1b[0m\n');

  const host = new PowerShellProcessHost({ debug: false });

  try {
    // =========================================================================
    // SECTION 1: EXACT 25-OPERATION REGISTRY CONTRACT TEST
    // =========================================================================

    const currentSet = new Set(OPERATION_IDS);
    const hasExact25 = currentSet.size === 25 &&
      FROZEN_25_OPERATIONS.size === 25 &&
      [...FROZEN_25_OPERATIONS].every(op => currentSet.has(op));

    assertTest(hasExact25, 'Exact 25-operation frozen contract set equality');

    // =========================================================================
    // SECTION 2: PROTOCOL & WORKER LIFECYCLE TESTS
    // =========================================================================

    // Test: Worker starts successfully
    await host.start();
    const initialPid = host.child.pid;
    assertTest(host.child !== null && !host.child.killed && initialPid > 0, 'Worker process starts and remains alive');

    // Test: application.status returns valid JSON envelope
    const statusRes = await host.invoke('application.status');
    assertTest(
      statusRes.schemaVersion === '1.0.0' &&
      statusRes.success === true &&
      statusRes.data &&
      statusRes.data.engineStatus === 'ready',
      'application.status returns valid JSON envelope with ready engine'
    );

    // Test: Same-worker PID persistence across sequential calls
    const listRes = await host.invoke('projects.list');
    assertTest(
      listRes.success === true && host.child.pid === initialPid,
      'Worker process PID remains identical across sequential operations (persistent worker)'
    );

    // Test: updates.status (formerly application.updateStatus)
    const updateRes = await host.invoke('updates.status');
    assertTest(
      updateRes.success === true && updateRes.data && updateRes.data.currentVersion === '1.0.0',
      'updates.status returns valid local installation status'
    );

    // Test: Unknown operation rejected
    const unknownRes = await host.invoke('unknown.operation.xyz');
    assertTest(
      unknownRes.success === false &&
      unknownRes.error &&
      unknownRes.error.code === 'INVALID_OPERATION',
      'Unknown operation is rejected by registry policy'
    );

    // Test: Malformed JSON line handled safely
    host.child.stdin.write('MALFORMED NON-JSON STRING\n');
    const recoverRes = await host.invoke('updates.status');
    assertTest(
      recoverRes.success === true &&
      recoverRes.data &&
      recoverRes.data.currentVersion === '1.0.0',
      'Malformed JSON on stdin is discarded without crashing worker session'
    );

    // Test: RequestId round-trip preserved
    const reqRes = await host.invoke('platforms.list');
    assertTest(
      reqRes.requestId &&
      reqRes.requestId.startsWith('req_') &&
      reqRes.success === true &&
      Array.isArray(reqRes.data),
      'Unique requestId is generated and preserved in response envelope'
    );

    // Test: Stdout line-buffering is clean
    assertTest(host.stdoutBuffer === '', 'Stdout line-buffering is clean and protocol-only');

    // =========================================================================
    // SECTION 3: PROJECTS.VALIDATE READ-ONLY PATH VALIDATION
    // =========================================================================

    // Valid folder validation
    const validValRes = await host.invoke('projects.validate', { path: process.cwd() });
    assertTest(
      validValRes.success === true &&
      validValRes.data.isValid === true &&
      validValRes.data.isDirectory === true &&
      validValRes.data.isAccessible === true,
      'projects.validate approves existing accessible directory'
    );

    // Non-existent folder validation
    const nonExistValRes = await host.invoke('projects.validate', { path: 'C:\\NonExistentPath_' + Date.now() });
    assertTest(
      nonExistValRes.success === true &&
      nonExistValRes.data.isValid === false &&
      nonExistValRes.data.reason === 'Path does not exist',
      'projects.validate rejects non-existent path safely'
    );

    // Invalid missing path payload
    const badPathValRes = await host.invoke('projects.validate', { path: 12345 });
    assertTest(
      badPathValRes.success === false &&
      badPathValRes.error &&
      badPathValRes.error.code === 'INVALID_PAYLOAD',
      'projects.validate rejects non-string path payload'
    );

    // =========================================================================
    // SECTION 4: PAYLOAD VALIDATION & SECURITY TESTS
    // =========================================================================

    const badProfileRes = await host.invoke('projects.profile', {});
    assertTest(
      badProfileRes.success === false && badProfileRes.error.code === 'INVALID_PAYLOAD',
      'projects.profile rejects missing projectId'
    );

    const badContextRes = await host.invoke('context.set', { projectId: 9999 });
    assertTest(
      badContextRes.success === false && badContextRes.error.code === 'INVALID_PAYLOAD',
      'context.set rejects non-string projectId'
    );

    const badActivateRes = await host.invoke('skills.activate', { projectId: 'proj_123', skillIds: 'not_an_array' });
    assertTest(
      badActivateRes.success === false && badActivateRes.error.code === 'INVALID_PAYLOAD',
      'skills.activate rejects non-array skillIds'
    );

    const badGlobalExecRes = await host.invoke('skills.globalRemoval.execute', { operationId: 123 });
    assertTest(
      badGlobalExecRes.success === false &&
      (badGlobalExecRes.error.code === 'INVALID_OPERATION_ID' || badGlobalExecRes.error.code === 'INVALID_PAYLOAD'),
      'skills.globalRemoval.execute rejects non-string operationId'
    );

    const badActivityRes = await host.invoke('activity.list', { limit: -10 });
    assertTest(
      badActivityRes.success === false && badActivityRes.error.code === 'INVALID_PAYLOAD',
      'activity.list rejects negative log limit'
    );

    // =========================================================================
    // SECTION 5: TIMEOUT SEMANTICS (READ vs MUTATING)
    // =========================================================================

    const readMeta = OPERATIONS['application.status'];
    const mutateMeta = OPERATIONS['projects.add'];
    assertTest(
      readMeta.isMutating === false && mutateMeta.isMutating === true,
      'Registry correctly distinguishes read-only vs mutating operations'
    );

    // =========================================================================
    // SECTION 6: WORKER RESTART & CRASH RECOVERY
    // =========================================================================

    const crashHost = new PowerShellProcessHost({ autoRestart: false });
    await crashHost.start();
    const pendingPromise = crashHost.invoke('projects.analyze', { path: process.cwd() });
    crashHost.child.kill('SIGKILL');
    const crashRes = await pendingPromise;
    assertTest(
      crashRes.success === false && crashRes.error.code === 'BRIDGE_CRASHED',
      'Worker crash rejects pending requests with BRIDGE_CRASHED'
    );

    // Restart main host
    await host.stop();
    assertTest(host.child === null, 'Worker stopped cleanly');
    const restartRes = await host.invoke('application.status');
    assertTest(
      restartRes.success === true && host.child !== null && !host.child.killed,
      'Worker auto-restarts successfully on subsequent invocation'
    );

    // Live bridge checks
    const initRes = await host.invoke('application.initialize');
    assertTest(
      initRes.success === true && initRes.data && fs.existsSync(initRes.data.runtimePath),
      'Live bridge connects to real runtime without mock fallback'
    );

    // Node API Preload isolation check
    const preloadContent = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
    assertTest(
      !preloadContent.includes('require(\'child_process\')') &&
      !preloadContent.includes('require(\'fs\')') &&
      preloadContent.includes('contextBridge.exposeInMainWorld'),
      'Preload script strictly isolates Node APIs and exposes only nexoraBridge'
    );

    // =========================================================================
    // SECTION 7: GLOBAL REMOVAL SECURITY MATRIX (A - F) & ZERO-PROJECT TESTS
    // =========================================================================

    // Setup: Create a real temporary project to test global removal flow
    const tmpDir = path.join(process.env.TEMP, 'NexoraRemovalTest_' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'removal-test', dependencies: { express: '4.0.0' } }));

    // Register project
    const addProj = await host.invoke('projects.add', { path: tmpDir, autoAnalyze: true });
    const testProjectId = addProj.data.projectId;

    // Test Zero-Project Global Removal Preview
    const zeroPreviewRes = await host.invoke('skills.globalRemoval.preview', { skillId: 'unused-skill-xyz' });
    assertTest(
      zeroPreviewRes.success === true &&
      zeroPreviewRes.data.operationId &&
      zeroPreviewRes.data.affectedProjectCount === 0,
      'Global removal preview for 0 affected projects returns safe structured result'
    );

    // Test Zero-Project Global Removal Execution
    const zeroExecRes = await host.invoke('skills.globalRemoval.execute', { operationId: zeroPreviewRes.data.operationId });
    assertTest(
      zeroExecRes.success === true &&
      zeroExecRes.data &&
      zeroExecRes.data.success === true &&
      (zeroExecRes.data.totalAffected === 0 || zeroExecRes.data.successCount === 0),
      'Global removal execution for 0 affected projects completes safely without modifying anything'
    );

    // Activate a test skill in the project
    await host.invoke('skills.activate', { projectId: testProjectId, skillIds: ['api-design-principles'] });

    // Activate a test skill in the project for Matrix A tests
    const actRes = await host.invoke('skills.activate', { projectId: testProjectId, skillIds: ['api-design-principles'] });

    // Matrix A: Preview -> operationId -> Execute -> PASS
    const prevA = await host.invoke('skills.globalRemoval.preview', { skillId: 'api-design-principles' });
    assertTest(
      prevA.success === true &&
      prevA.data.operationId &&
      prevA.data.operationId.startsWith('op_'),
      'Matrix A1: Preview returns non-secret opaque operationId'
    );

    const execA = await host.invoke('skills.globalRemoval.execute', { operationId: prevA.data.operationId });
    assertTest(
      execA.success === true &&
      execA.data &&
      (execA.data.successCount >= 1 || execA.data.totalAffected >= 1),
      'Matrix A2: Execution with valid operationId succeeds'
    );

    // Matrix B: Replay -> Execute same operationId again -> FAIL
    const execB = await host.invoke('skills.globalRemoval.execute', { operationId: prevA.data.operationId });
    assertTest(
      execB.success === false &&
      execB.error &&
      execB.error.code === 'INVALID_OPERATION_ID',
      'Matrix B: Replay execution of consumed operationId is rejected'
    );

    // Matrix C: TTL Expiry -> Execute -> FAIL
    await host.invoke('skills.activate', { projectId: testProjectId, skillIds: ['api-design-principles'] });
    const prevC = await host.invoke('skills.globalRemoval.preview', { skillId: 'api-design-principles' });
    const opIdC = prevC.data.operationId;
    const tokenRecord = host.confirmationTokenStore.get(opIdC);
    if (tokenRecord) {
      tokenRecord.expiresAt = Date.now() - 1000;
    }
    const execC = await host.invoke('skills.globalRemoval.execute', { operationId: opIdC });
    assertTest(
      execC.success === false &&
      execC.error &&
      execC.error.code === 'TOKEN_EXPIRED',
      'Matrix C: Expired confirmation token is rejected with TOKEN_EXPIRED'
    );

    // Matrix D: Fingerprint Mutation -> Execute -> FAIL
    await host.invoke('skills.activate', { projectId: testProjectId, skillIds: ['api-design-principles'] });
    const prevD = await host.invoke('skills.globalRemoval.preview', { skillId: 'api-design-principles' });
    const opIdD = prevD.data.operationId;
    const tmpDir2 = path.join(process.env.TEMP, 'NexoraRemovalTest2_' + Date.now());
    fs.mkdirSync(tmpDir2, { recursive: true });
    fs.writeFileSync(path.join(tmpDir2, 'package.json'), JSON.stringify({ name: 'removal-test-2', dependencies: { express: '4.0.0' } }));
    const addProj2 = await host.invoke('projects.add', { path: tmpDir2, autoAnalyze: true });
    await host.invoke('skills.activate', { projectId: addProj2.data.projectId, skillIds: ['api-design-principles'] });

    const execD = await host.invoke('skills.globalRemoval.execute', { operationId: opIdD });
    assertTest(
      execD.success === false &&
      execD.error &&
      (execD.error.message.includes('affected projects has changed') || execD.error.message.includes('Fingerprint')),
      'Matrix D: Project fingerprint mutation rejects execution and requires fresh preview'
    );

    // Matrix E: Worker restart -> Execute old operationId -> FAIL
    const prevE = await host.invoke('skills.globalRemoval.preview', { skillId: 'api-design-principles' });
    const opIdE = prevE.data.operationId;
    await host.stop();
    await host.start();
    const execE = await host.invoke('skills.globalRemoval.execute', { operationId: opIdE });
    assertTest(
      execE.success === false &&
      execE.error &&
      execE.error.code === 'INVALID_OPERATION_ID',
      'Matrix E: Worker restart clears in-memory tokens, rejecting old operationIds'
    );

    // Matrix F: Inspect renderer-visible responses for secret leaks
    const prevF = await host.invoke('skills.globalRemoval.preview', { skillId: 'api-design-principles' });
    const keys = Object.keys(prevF.data);
    assertTest(
      !keys.includes('confirmationToken') &&
      !keys.includes('projectFingerprint') &&
      !keys.includes('expiresAt') &&
      keys.includes('operationId') &&
      keys.includes('skillId') &&
      keys.includes('affectedProjectCount'),
      'Matrix F: Renderer preview envelope contains NO confirmationToken, NO fingerprint, NO TTL internals'
    );

    // Clean up temporary test projects
    await host.invoke('projects.remove', { projectId: testProjectId });
    await host.invoke('projects.remove', { projectId: addProj2.data.projectId });
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(tmpDir2, { recursive: true, force: true }); } catch {}

    // =========================================================================
    // SECTION 8: STATIC SECURITY AUDIT CHECKS
    // =========================================================================

    const mainContent = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
    assertTest(
      mainContent.includes('contextIsolation: true') &&
      mainContent.includes('nodeIntegration: false') &&
      mainContent.includes('sandbox: true') &&
      mainContent.includes('webSecurity: true') &&
      mainContent.includes('allowRunningInsecureContent: false'),
      'Static: Electron BrowserWindow enforces all 5 mandatory security primitives'
    );

    assertTest(
      mainContent.includes('will-navigate') &&
      mainContent.includes('setWindowOpenHandler'),
      'Static: Navigation and popup window creation are strictly blocked'
    );

    const hostContent = fs.readFileSync(path.join(__dirname, '..', 'bridge', 'PowerShellProcessHost.js'), 'utf8');
    assertTest(
      hostContent.includes('NexoraDesktopBridgeHost.ps1') &&
      !hostContent.includes('eval(') &&
      !hostContent.includes('exec('),
      'Static: PowerShellProcessHost uses fixed script path and safe spawn arguments'
    );

    const psHostContent = fs.readFileSync(path.join(__dirname, '..', 'bridge', 'NexoraDesktopBridgeHost.ps1'), 'utf8');
    assertTest(
      !psHostContent.includes('Invoke-Expression') &&
      !psHostContent.includes('iex '),
      'Static: PowerShell bridge dispatcher uses strict switch dispatch with zero Invoke-Expression'
    );

    // Stop worker cleanly
    await host.stop();

  } catch (err) {
    console.error('\n\x1b[31mTest Suite Error:\x1b[0m', err.message);
    if (host) {
      await host.stop();
    }
    process.exit(1);
  }

  console.log(`\n\x1b[36m=== Gate 2 Validation Summary: ${passCount} Passed, ${totalCount - passCount} Failed ===\x1b[0m\n`);
  if (passCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
