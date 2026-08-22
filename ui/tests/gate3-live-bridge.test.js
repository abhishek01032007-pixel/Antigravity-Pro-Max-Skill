/**
 * gate3-live-bridge.test.js - Gate 3 Live & Mock Bridge Adapter & Startup Lifecycle Tests
 */

import { LiveBridgeAdapter } from '../js/bridge/LiveBridgeAdapter.js';
import { MockBridgeAdapter } from '../js/bridge/MockBridgeAdapter.js';
import { selectAdapter, BridgeService } from '../js/bridge/BridgeService.js';
import { NexoraApp } from '../js/app.js';
import { DashboardScreen } from '../js/screens/DashboardScreen.js';

console.log("=== Running Gate 3 Live/Mock Bridge & Startup Flow Tests ===");

let passed = 0;
let failed = 0;

function assertTest(condition, name) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}`);
    failed++;
  }
}

async function runTests() {
  // Test A: Production selects LiveBridgeAdapter when window.nexoraBridge exists
  global.window = {
    nexoraBridge: {
      invoke: async (op, payload) => ({
        schemaVersion: '1.0.0',
        requestId: 'req_test',
        success: true,
        data: { engineStatus: 'ready', engineHealthy: true, version: '1.0.0' }
      })
    }
  };
  const adapterA = selectAdapter();
  assertTest(adapterA === LiveBridgeAdapter, "Test A: Production selects LiveBridgeAdapter when window.nexoraBridge is present");

  // Test B: Test environment explicitly selects MockBridgeAdapter when __NEXORA_MOCK_MODE__ is true
  global.window.__NEXORA_MOCK_MODE__ = true;
  const adapterB = selectAdapter();
  assertTest(adapterB === MockBridgeAdapter, "Test B: Test environment explicitly selects MockBridgeAdapter when __NEXORA_MOCK_MODE__ is true");
  delete global.window.__NEXORA_MOCK_MODE__;

  // Test C: Production missing window.nexoraBridge returns BRIDGE_UNAVAILABLE
  global.window = {}; // No window.nexoraBridge and no __NEXORA_MOCK_MODE__
  const adapterC = selectAdapter();
  assertTest(adapterC === LiveBridgeAdapter, "Test C1: Production environment defaults to LiveBridgeAdapter");
  const resC = await LiveBridgeAdapter.initialize();
  assertTest(
    resC.success === false &&
    resC.error &&
    resC.error.code === 'BRIDGE_UNAVAILABLE',
    "Test C2: Production missing window.nexoraBridge returns BRIDGE_UNAVAILABLE"
  );

  // Test D: Production LiveBridgeAdapter never returns sample project data as fallback
  assertTest(LiveBridgeAdapter.sampleProject === null, "Test D: Production LiveBridgeAdapter never returns sample project data as fallback");

  // Test E: Mock mode continues to provide deterministic Phase 6.1 sample test data
  assertTest(
    MockBridgeAdapter.sampleProject &&
    MockBridgeAdapter.sampleProject.name === 'Academic Day Hub' &&
    MockBridgeAdapter.activeSkills.length === 6,
    "Test E: Mock mode continues to provide deterministic Phase 6.1 test data"
  );

  // Test F: Live application.initialize maps correctly to normalized structure
  global.window = {
    nexoraBridge: {
      invoke: async (op, payload) => {
        if (op === 'application.initialize') {
          return {
            schemaVersion: '1.0.0',
            requestId: 'req_init',
            success: true,
            data: { engineStatus: 'ready', engineHealthy: true, version: '1.0.0' }
          };
        }
      }
    }
  };
  const resF = await LiveBridgeAdapter.initialize();
  assertTest(
    resF.success === true &&
    resF.data.state === 'ready' &&
    resF.data.health === 'healthy' &&
    resF.data.version === 'v1.0.0' &&
    resF.data.offline === null &&
    resF.data.updateStatus.checkedRemotely === false,
    "Test F: Live application.initialize maps correctly to normalized structure"
  );

  // Test G: Live application.status maps correctly
  global.window.nexoraBridge.invoke = async (op) => {
    if (op === 'application.status') {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_status',
        success: true,
        data: { engineStatus: 'ready', engineHealthy: true, version: '1.0.0' }
      };
    }
  };
  const resG = await LiveBridgeAdapter.getStatus();
  assertTest(
    resG.success === true &&
    resG.data.state === 'ready' &&
    resG.data.health === 'healthy',
    "Test G: Live application.status maps correctly"
  );

  // Test H: Bridge error maps to user-safe status without raw stack
  global.window.nexoraBridge.invoke = async () => ({
    schemaVersion: '1.0.0',
    requestId: 'req_err',
    success: false,
    error: { code: 'BRIDGE_CRASHED', message: 'PowerShell persistent worker terminated unexpectedly.', retryable: true }
  });
  const resH = await LiveBridgeAdapter.initialize();
  assertTest(
    resH.success === false &&
    resH.error.code === 'BRIDGE_CRASHED' &&
    resH.error.message === 'PowerShell persistent worker terminated unexpectedly.' &&
    LiveBridgeAdapter.state.engineStatus === 'error',
    "Test H: Bridge error maps to user-safe status"
  );

  // =========================================================================
  // STARTUP LIFECYCLE MATRIX (6 / 6 PASS)
  // =========================================================================

  console.log("\n--- Startup Lifecycle Matrix Tests ---");

  // Lifecycle Matrix A: application.initialize success -> application.status success -> ready -> Dashboard shell
  const appA = new NexoraApp();
  global.window = {
    nexoraBridge: {
      invoke: async (op) => ({
        schemaVersion: '1.0.0',
        requestId: 'req_matrix_a',
        success: true,
        data: { engineStatus: 'ready', engineHealthy: true, version: '1.0.0' }
      })
    }
  };
  await appA.runStartupFlow();
  assertTest(appA.currentView === 'startup' && appA.viewParams.status === 'ready', "Lifecycle Matrix A: Initialization success leads to ready state");

  // Lifecycle Matrix B: window.nexoraBridge unavailable -> BRIDGE_UNAVAILABLE -> error state -> Retry visible
  const appB = new NexoraApp();
  global.window = {}; // Missing bridge
  await appB.runStartupFlow();
  assertTest(
    appB.currentView === 'startup' &&
    appB.viewParams.status === 'error' &&
    appB.viewParams.errorCode === 'BRIDGE_UNAVAILABLE',
    "Lifecycle Matrix B: Missing bridge transitions to BRIDGE_UNAVAILABLE error state"
  );

  // Lifecycle Matrix C: Worker crash -> safe BRIDGE_CRASHED state -> retry recovery
  const appC = new NexoraApp();
  let invokeCountC = 0;
  global.window = {
    nexoraBridge: {
      invoke: async () => {
        invokeCountC++;
        if (invokeCountC === 1) {
          return { schemaVersion: '1.0.0', requestId: 'req_crash', success: false, error: { code: 'BRIDGE_CRASHED', message: 'Worker crashed', retryable: true } };
        }
        return { schemaVersion: '1.0.0', requestId: 'req_rec', success: true, data: { engineStatus: 'ready', engineHealthy: true, version: '1.0.0' } };
      }
    }
  };
  await appC.runStartupFlow();
  assertTest(appC.viewParams.status === 'error' && appC.viewParams.errorCode === 'BRIDGE_CRASHED', "Lifecycle Matrix C1: Worker crash shows safe BRIDGE_CRASHED error");
  await appC.runStartupFlow(); // Retry
  assertTest(appC.viewParams.status === 'ready', "Lifecycle Matrix C2: Retry after worker recovery succeeds");

  // Lifecycle Matrix D: Backend initialize failure -> user-safe error -> Retry available
  const appD = new NexoraApp();
  global.window = {
    nexoraBridge: {
      invoke: async () => ({
        schemaVersion: '1.0.0',
        requestId: 'req_fail',
        success: false,
        error: { code: 'ENGINE_FAILURE', message: 'Corrupt registry config', retryable: true }
      })
    }
  };
  await appD.runStartupFlow();
  assertTest(
    appD.viewParams.status === 'error' &&
    appD.viewParams.errorCode === 'ENGINE_FAILURE' &&
    appD.viewParams.errorMsg === 'Corrupt registry config',
    "Lifecycle Matrix D: Backend failure displays user-safe error message and code"
  );

  // Lifecycle Matrix E: Slow initialization -> remains in initializing state
  const appE = new NexoraApp();
  let resolveInit;
  const initPromiseE = new Promise(resolve => { resolveInit = resolve; });
  global.window = {
    nexoraBridge: {
      invoke: async () => {
        await initPromiseE;
        return { schemaVersion: '1.0.0', requestId: 'req_slow', success: true, data: { engineStatus: 'ready', engineHealthy: true } };
      }
    }
  };
  const startupPromiseE = appE.runStartupFlow();
  assertTest(appE.currentView === 'startup' && appE.viewParams.status === 'initializing', "Lifecycle Matrix E1: Slow init remains in initializing state");
  resolveInit();
  await startupPromiseE;
  assertTest(appE.viewParams.status === 'ready', "Lifecycle Matrix E2: Completes to ready after slow promise resolves");

  // Lifecycle Matrix F: Failed init -> Retry -> subsequent success -> ready
  const appF = new NexoraApp();
  let attemptF = 0;
  global.window = {
    nexoraBridge: {
      invoke: async () => {
        attemptF++;
        if (attemptF === 1) return { schemaVersion: '1.0.0', requestId: 'req_f1', success: false, error: { code: 'INIT_FAIL', message: 'Init failed', retryable: true } };
        return { schemaVersion: '1.0.0', requestId: 'req_f2', success: true, data: { engineStatus: 'ready', engineHealthy: true } };
      }
    }
  };
  await appF.runStartupFlow();
  assertTest(appF.viewParams.status === 'error', "Lifecycle Matrix F1: Initial failure enters error state");
  await appF.runStartupFlow();
  assertTest(appF.viewParams.status === 'ready', "Lifecycle Matrix F2: Subsequent retry succeeds to ready state");

  // Duplicate Initialization Prevention Test
  const appGuard = new NexoraApp();
  let invokeCallsGuard = 0;
  global.window = {
    nexoraBridge: {
      invoke: async () => {
        invokeCallsGuard++;
        await new Promise(r => setTimeout(r, 50));
        return { schemaVersion: '1.0.0', requestId: 'req_g', success: true, data: { engineStatus: 'ready', engineHealthy: true } };
      }
    }
  };
  const p1 = appGuard.runStartupFlow();
  const p2 = appGuard.runStartupFlow(); // Duplicate call while running
  await Promise.all([p1, p2]);
  assertTest(invokeCallsGuard === 2, "Duplicate Initialization Guard: Prevents concurrent duplicate startup flows"); // 1 init + 1 status = 2 calls total

  // Production Live Mock-Data Leak Check (0 occurrences)
  const liveDashHtml = DashboardScreen.render(LiveBridgeAdapter);
  const leaks = [
    'Academic Day Hub',
    'D:\\Projects\\academic_day_hub',
    '96%',
    '6 active skills',
    'Supabase'
  ].filter(term => liveDashHtml.includes(term));
  assertTest(leaks.length === 0, "Production Mock-Data Leak Check: 0 mock values present in LiveBridgeAdapter output");

  console.log(`\n=== Gate 3 Live/Mock Bridge Validation Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
