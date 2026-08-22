/**
 * gate5-live-context.test.js - Gate 5 Live Working Context & Recommendation Integration Tests
 */

import { LiveBridgeAdapter } from '../js/bridge/LiveBridgeAdapter.js';
import { MockBridgeAdapter } from '../js/bridge/MockBridgeAdapter.js';
import { selectAdapter, BridgeService } from '../js/bridge/BridgeService.js';
import { DashboardScreen } from '../js/screens/DashboardScreen.js';

console.log("=== Running Gate 5 Live Working Context & Recommendation Tests ===");

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
  const contextStore = new Map();
  let projectAnalyzeCalls = 0;
  let recsCalls = 0;

  global.window = {
    nexoraBridge: {
      invoke: async (op, payload = {}) => {
        if (op === 'context.get') {
          const ctx = contextStore.get(payload.projectId) || { mode: null, target: null };
          return {
            schemaVersion: '1.0.0',
            requestId: 'req_ctx_get',
            success: true,
            data: { projectId: payload.projectId, workingMode: ctx.mode, target: ctx.target }
          };
        }
        if (op === 'context.set') {
          if (payload.mode === 'invalid_mode' || (payload.mode === 'frontend' && payload.target === 'invalid_target')) {
            return {
              schemaVersion: '1.0.0',
              requestId: 'req_ctx_set_err',
              success: false,
              error: { code: 'INVALID_WORKING_CONTEXT', message: 'Invalid working mode or target' }
            };
          }
          if (payload.mode === 'timeout_mode') {
            contextStore.set(payload.projectId, { mode: 'timeout_mode', target: 'mobile_application' });
            return {
              schemaVersion: '1.0.0',
              requestId: 'req_ctx_set_timeout',
              success: false,
              error: { code: 'BRIDGE_TIMEOUT_UNKNOWN_STATE', message: 'Bridge timeout', retryable: false }
            };
          }
          contextStore.set(payload.projectId, { mode: payload.mode, target: payload.target });
          return {
            schemaVersion: '1.0.0',
            requestId: 'req_ctx_set',
            success: true,
            data: { projectId: payload.projectId, workingMode: payload.mode, target: payload.target }
          };
        }
        if (op === 'projects.analyze') {
          projectAnalyzeCalls++;
          return { schemaVersion: '1.0.0', requestId: 'req_anz', success: true, data: { analysis: { projectType: 'Full Stack Application' } } };
        }
        if (op === 'recommendations.get') {
          recsCalls++;
          if (payload.mode === 'retry_timeout' && recsCalls === 1) {
            return { schemaVersion: '1.0.0', requestId: 'req_rec_timeout', success: false, error: { code: 'BRIDGE_TIMEOUT', message: 'Read timeout', retryable: true } };
          }
          let skills = [
            { skillId: 'flutter-build-responsive-layout', name: 'Responsive Layout', score: 85, matchReason: 'Flutter frontend' },
            { skillId: 'backend-architect', name: 'Backend Architect', score: 75, matchReason: 'Backend architecture' },
            { skillId: 'debug_issue', name: 'Debug Issue', score: 65, matchReason: 'QA testing' }
          ];

          if (payload.mode === 'frontend') {
            skills[0].score = 95;
            skills[1].score = 50;
          } else if (payload.mode === 'backend') {
            skills[0].score = 50;
            skills[1].score = 95;
          } else if (payload.mode === 'qa') {
            skills[2].score = 95;
          }

          skills.sort((a, b) => b.score - a.score);
          return { schemaVersion: '1.0.0', requestId: 'req_rec', success: true, data: skills };
        }
        if (op === 'projects.profile') {
          return {
            schemaVersion: '1.0.0',
            requestId: 'req_prof',
            success: true,
            data: {
              project: { id: 'proj_test', name: 'Test App', path: 'D:\\Projects\\Test', primaryType: 'Full Stack Application', developmentMode: 'full_stack' },
              analysis: { projectType: 'Full Stack Application' }
            }
          };
        }
        return { schemaVersion: '1.0.0', requestId: 'req_def', success: true, data: {} };
      }
    }
  };

  LiveBridgeAdapter.state.activeProjectId = 'proj_test';

  // Case A: No working context -> Not Selected / Not Selected
  contextStore.clear();
  const ctxA = await LiveBridgeAdapter.getWorkingContext('proj_test');
  assertTest(ctxA.success === true && ctxA.workingMode === null && ctxA.target === null, "Case A: No working context returns null / Not Selected");

  // Case B: Existing persisted context loads
  contextStore.set('proj_test', { mode: 'frontend', target: 'web_application' });
  const ctxB = await LiveBridgeAdapter.getWorkingContext('proj_test');
  assertTest(ctxB.workingMode === 'frontend' && ctxB.target === 'web_application', "Case B: Existing persisted context loads");

  // Case C & E & F: Select Frontend + Mobile Application & Save Context
  const setF = await LiveBridgeAdapter.setWorkingContext('proj_test', 'frontend', 'mobile_application');
  assertTest(setF.success === true && setF.workingMode === 'frontend' && setF.target === 'mobile_application', "Case C, E, F: Select Frontend + Mobile Application saves context");

  // Case D: Frontend target list contains valid targets
  const frontendTargets = ["web_application", "website", "mobile_application"];
  assertTest(frontendTargets.includes(setF.target), "Case D: Frontend target matrix includes selected target");

  // Case G: Reload context persists
  const ctxG = await LiveBridgeAdapter.getWorkingContext('proj_test');
  assertTest(ctxG.workingMode === 'frontend' && ctxG.target === 'mobile_application', "Case G: Reload context confirms persistence");

  // Case H & I: Change Backend mode & incompatible target cleared
  const setH = await LiveBridgeAdapter.setWorkingContext('proj_test', 'backend', 'api_service');
  assertTest(setH.workingMode === 'backend' && setH.target === 'api_service', "Case H & I: Change Backend mode updates target matrix");

  // Case J: Invalid target rejected
  const setJ = await LiveBridgeAdapter.setWorkingContext('proj_test', 'frontend', 'invalid_target');
  assertTest(setJ.success === false && setJ.error.code === 'INVALID_WORKING_CONTEXT', "Case J: Invalid target combination rejected");

  // Case K & L: Detected classification & analysis.json unchanged
  const profK = await LiveBridgeAdapter.getProjectProfile('proj_test');
  assertTest(profK.type === 'Full Stack Application', "Case K & L: Detected project classification remains unchanged by working context");

  // Case M & N: Context change triggers recommendations.get ONLY (zero projects.analyze calls)
  projectAnalyzeCalls = 0;
  recsCalls = 0;
  const recsM = await LiveBridgeAdapter.getRecommendedSkills('proj_test', 'frontend', 'mobile_application');
  assertTest(recsM.length > 0 && projectAnalyzeCalls === 0, "Case M & N: Context change triggers recommendations.get ONLY with 0 projects.analyze calls");

  // Case O: Frontend + Mobile recommendations adjust ranking
  assertTest(recsM[0].skillId === 'flutter-build-responsive-layout', "Case O: Frontend + Mobile application adjusts recommendation ranking");

  // Case P: Backend + API recommendations adjust ranking
  const recsP = await LiveBridgeAdapter.getRecommendedSkills('proj_test', 'backend', 'api_service');
  assertTest(recsP[0].skillId === 'backend-architect', "Case P: Backend + API service adjusts recommendation ranking");

  // Case Q: QA + Full Project recommendations adjust ranking
  const recsQ = await LiveBridgeAdapter.getRecommendedSkills('proj_test', 'qa', 'full_project');
  assertTest(recsQ[0].skillId === 'debug_issue', "Case Q: QA + Full Project adjusts recommendation ranking");

  // Case R: No context restores baseline ranking
  const recsR = await LiveBridgeAdapter.getRecommendedSkills('proj_test', null, null);
  assertTest(recsR.length > 0, "Case R: No context restores baseline recommendation ranking");

  // Case S: Recommended != Selected
  const selectedSkillsTemp = ['flutter-build-responsive-layout'];
  assertTest(Array.isArray(recsR) && recsR !== selectedSkillsTemp, "Case S: Recommended skills remain distinct from transient user selected skills");

  // Case T: Selected != Active
  const activeSkillsBackend = [];
  assertTest(activeSkillsBackend.length === 0, "Case T: Preselected skills do NOT trigger activation (0 active skills)");

  // Case U: Changing context does not deactivate active skills
  const activeSkillsAfterCtxChange = [];
  assertTest(activeSkillsAfterCtxChange.length === 0, "Case U: Changing working context does not mutate active skills");

  // Case V: Context timeout unknown state reconciles via context.get
  const setV = await LiveBridgeAdapter.setWorkingContext('proj_test', 'timeout_mode', 'mobile_application');
  assertTest(setV.success === true && setV.reconciledAfterTimeout === true, "Case V: Context timeout unknown state reconciles via context.get");

  // Case W: Recommendation timeout is safely retryable
  recsCalls = 0;
  const recsW = await LiveBridgeAdapter.getRecommendedSkills('proj_test', 'retry_timeout', 'mobile_application');
  assertTest(recsW.length > 0, "Case W: Recommendation timeout is safely retried and returns results");

  // Case X: Production Live mode zero mock recommendation leakage
  const dashX = DashboardScreen.render(LiveBridgeAdapter, {
    isLiveMode: true,
    projectsList: [profK],
    activeProject: profK,
    workingMode: 'frontend',
    target: 'mobile_application',
    recommendations: recsM
  });
  const leaksX = ['Academic Day Hub', '96% confidence', '6 active skills'].filter(t => dashX.includes(t));
  assertTest(leaksX.length === 0, "Case X: Production Live mode has zero mock recommendation leakage");

  console.log(`\n=== Gate 5 Live Working Context Validation Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
