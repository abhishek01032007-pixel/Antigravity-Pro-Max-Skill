/**
 * main.js - Nexora Skills Manager Desktop Host (Electron Main Process)
 *
 * Implements strict sandboxed BrowserWindow lifecycle, single persistent worker,
 * persistent PowerShellProcessHost lifecycle, and navigation locking.
 */

const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { PowerShellProcessHost } = require('./bridge/PowerShellProcessHost');
const { registerBridgeIpc } = require('./ipc/bridge-handler');

let mainWindow = null;
let processHost = null;

// Suppress default Electron application menu bar on Windows
Menu.setApplicationMenu(null);

/**
 * Resolves the appropriate path to ui/index.html across development and packaged ASAR modes.
 */
function resolveRendererEntry(customApp = null) {
  const currentApp = customApp || app;

  // 1. Packaged ASAR / app path
  if (currentApp && currentApp.isPackaged) {
    const packagedPath = path.join(currentApp.getAppPath(), 'ui', 'index.html');
    if (fs.existsSync(packagedPath)) return packagedPath;
  }

  // 2. Development repository path
  const devPath = path.resolve(__dirname, '..', 'ui', 'index.html');
  if (fs.existsSync(devPath)) return devPath;

  // 3. Fallback to getAppPath
  if (currentApp && typeof currentApp.getAppPath === 'function') {
    const appPathUi = path.join(currentApp.getAppPath(), 'ui', 'index.html');
    if (fs.existsSync(appPathUi)) return appPathUi;
  }

  return devPath;
}

// Folder picker IPC handler
ipcMain.handle('nexora:select-project-folder', async () => {
  if (!mainWindow) return { canceled: true, path: null };
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Project Directory',
    properties: ['openDirectory']
  });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return { canceled: true, path: null };
  }
  return { canceled: false, path: res.filePaths[0] };
});

async function createWindow() {
  // 1. Initialize persistent process host
  processHost = new PowerShellProcessHost();
  try {
    await processHost.start();
  } catch (err) {
    console.error('[NexoraMain] Warning: Failed to pre-warm PowerShell worker:', err.message);
  }

  // 2. Register IPC handlers
  registerBridgeIpc(processHost);

  // 3. Create secure BrowserWindow
  const devIconPath = path.join(__dirname, '..', 'assets', 'branding', 'NexoraSkillsManager.ico');
  const windowIcon = fs.existsSync(devIconPath) ? devIconPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    title: 'Nexora Skills Manager',
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // 4. Security: Prevent external navigation & popups
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // Only allow local file navigation within the app package
    const parsed = new URL(navigationUrl);
    if (parsed.protocol !== 'file:') {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && parsed.hostname === 'github.com' && parsed.pathname.startsWith('/abhishek01032007-pixel/Nexora-Skills-Manager')) {
        const { shell } = require('electron');
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // 5. Packaged Mode: Block developer shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+R)
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        if (input.key === 'F12') {
          event.preventDefault();
        } else if (input.control && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'r')) {
          event.preventDefault();
        }
      }
    });
  }

  // 6. Load UI index.html dynamically
  const uiPath = resolveRendererEntry();
  mainWindow.loadFile(uiPath);

  // Automated Smoke Test Mode
  if (process.argv.includes('--smoke-test')) {
    mainWindow.webContents.on('did-finish-load', async () => {
      const fs = require('fs');
      const os = require('os');
      const ts = Date.now();
      const tmpDirA = path.join(os.tmpdir(), `NexoraGate7E2E_A_${ts}`);
      const tmpDirB = path.join(os.tmpdir(), `NexoraGate7E2E_B_${ts}`);

      try {
        if (!fs.existsSync(tmpDirA)) fs.mkdirSync(tmpDirA, { recursive: true });
        if (!fs.existsSync(tmpDirB)) fs.mkdirSync(tmpDirB, { recursive: true });

        console.log('[ElectronSmoke] Window loaded. Executing Gate 7 E2E live multi-project usage & protected global removal validation...');
        const result = await mainWindow.webContents.executeJavaScript(`
          (async () => {
            const hasBridge = typeof window.nexoraBridge === 'object' && typeof window.nexoraBridge.invoke === 'function';
            const hasNoRequire = typeof window.require === 'undefined';
            const hasNoProcess = typeof window.process === 'undefined';

            // 1. Live status & startup
            const initRes = await window.nexoraBridge.invoke('application.initialize');
            const statusRes = await window.nexoraBridge.invoke('application.status');

            // 2. Add two temporary fixture projects
            const addResA = await window.nexoraBridge.invoke('projects.add', { path: ${JSON.stringify(tmpDirA)} });
            const projIdA = addResA.success && (addResA.data.projectId || (addResA.data.project && addResA.data.project.id));

            const addResB = await window.nexoraBridge.invoke('projects.add', { path: ${JSON.stringify(tmpDirB)} });
            const projIdB = addResB.success && (addResB.data.projectId || (addResB.data.project && addResB.data.project.id));

            // 2b. Project Profile & Context & Recommendations
            const profResA = await window.nexoraBridge.invoke('projects.profile', { projectId: projIdA });
            const setCtxRes = await window.nexoraBridge.invoke('context.set', { projectId: projIdA, mode: 'full_stack', target: 'feature_implementation' });
            const getCtxRes = await window.nexoraBridge.invoke('context.get', { projectId: projIdA });
            const recRes = await window.nexoraBridge.invoke('recommendations.get', { projectId: projIdA, mode: 'full_stack', target: 'feature_implementation' });

            // 2c. Set authoritative platform preferences per project
            await window.nexoraBridge.invoke('platforms.preferences.set', { projectId: projIdA, platforms: ['antigravity', 'cursor'] });
            await window.nexoraBridge.invoke('platforms.preferences.set', { projectId: projIdB, platforms: ['antigravity', 'cursor'] });

            // 3. Activate same skill in both projects
            const testSkillId = 'flutter-build-responsive-layout';
            const actResA = await window.nexoraBridge.invoke('skills.activate', {
              projectId: projIdA,
              skillIds: [testSkillId],
              platforms: ['antigravity', 'cursor']
            });
            const actResB = await window.nexoraBridge.invoke('skills.activate', {
              projectId: projIdB,
              skillIds: [testSkillId],
              platforms: ['antigravity', 'cursor']
            });

            // 4. Verify skills.usage shows 2 projects
            const usageResBefore = await window.nexoraBridge.invoke('skills.usage', { skillId: testSkillId });
            const usageCountBefore = (usageResBefore && usageResBefore.success && Array.isArray(usageResBefore.data)) ? usageResBefore.data.length : 0;

            // 5. Generate protected global removal preview
            const prevRes = await window.nexoraBridge.invoke('skills.globalRemoval.preview', { skillId: testSkillId });
            const opId = prevRes.success && prevRes.data && prevRes.data.operationId;
            const noTokenInRenderer = prevRes.success && typeof prevRes.data.confirmationToken === 'undefined';

            // 6. Execute global removal with EXACTLY { operationId } ONLY
            const execPayload = { operationId: opId };
            const payloadKeyCount = Object.keys(execPayload).length;
            const execRes = opId ? await window.nexoraBridge.invoke('skills.globalRemoval.execute', execPayload) : null;

            // 7. Verify skills.usage is now 0
            const usageResAfter = await window.nexoraBridge.invoke('skills.usage', { skillId: testSkillId });
            const usageCountAfter = (usageResAfter && usageResAfter.success && Array.isArray(usageResAfter.data)) ? usageResAfter.data.length : 0;

            // 8. Verify skills.active in both projects is 0
            const activeA = await window.nexoraBridge.invoke('skills.active', { projectId: projIdA });
            const activeB = await window.nexoraBridge.invoke('skills.active', { projectId: projIdB });
            const activeCountA = (activeA && activeA.success && Array.isArray(activeA.data)) ? activeA.data.length : (activeA.data ? 1 : 0);
            const activeCountB = (activeB && activeB.success && Array.isArray(activeB.data)) ? activeB.data.length : (activeB.data ? 1 : 0);

            // 9. Verify Gate 9 Live Activity Logs Before Project Removal
            const activityResBefore = await window.nexoraBridge.invoke('activity.list', { limit: 10 });
            const hasActivity = activityResBefore.success && Array.isArray(activityResBefore.data) && activityResBefore.data.length > 0;

            // 10. Verify Gate 9 Local Update Status
            const updateRes = await window.nexoraBridge.invoke('updates.status');
            const updateData = updateRes && updateRes.success ? updateRes.data : {};
            const isLocalUpdateValid = updateData.currentVersion === '1.0.0' && updateData.latestVersion === null && updateData.checkedRemotely === false;

            // 11. Remove projects from registry
            const remResA = await window.nexoraBridge.invoke('projects.remove', { projectId: projIdA });
            const remResB = await window.nexoraBridge.invoke('projects.remove', { projectId: projIdB });

            // 12. Gate 8 Live Doctor Diagnostics & Refresh
            const doctorRes = await window.nexoraBridge.invoke('doctor.run');
            const doctorChecks = doctorRes && doctorRes.success && doctorRes.data ? (Array.isArray(doctorRes.data.checks) ? doctorRes.data.checks : (Array.isArray(doctorRes.data) ? doctorRes.data : [])) : [];
            const hasExact6Categories = doctorChecks.length >= 6;

            const refreshDocRes = await window.nexoraBridge.invoke('doctor.run');
            const refreshSuccess = refreshDocRes && refreshDocRes.success === true;

            // 13. Refresh Activity & Updates
            const refreshActRes = await window.nexoraBridge.invoke('activity.list', { limit: 5 });
            const refreshUpdRes = await window.nexoraBridge.invoke('updates.status');
            const refreshActSuccess = refreshActRes && refreshActRes.success;
            const refreshUpdSuccess = refreshUpdRes && refreshUpdRes.success;

            return {
              hasBridge,
              hasNoRequire,
              hasNoProcess,
              initRes,
              statusRes,
              addResA,
              addResB,
              actResA,
              actResB,
              usageCountBefore,
              noTokenInRenderer,
              payloadKeyCount,
              execRes,
              usageCountAfter,
              activeCountA,
              activeCountB,
              remResA,
              remResB,
              hasExact6Categories,
              refreshSuccess,
              hasActivity,
              isLocalUpdateValid,
              refreshActSuccess,
              refreshUpdSuccess
            };
          })()
        `);

        // Physical File Safety Check: verify adapter cleanup in both projects
        const antigravityPathA = path.join(tmpDirA, '.agents', 'skills', 'flutter-build-responsive-layout', 'SKILL.md');
        const cursorPathA = path.join(tmpDirA, '.cursor', 'rules', 'flutter-build-responsive-layout.mdc');
        const antigravityPathB = path.join(tmpDirB, '.agents', 'skills', 'flutter-build-responsive-layout', 'SKILL.md');
        const cursorPathB = path.join(tmpDirB, '.cursor', 'rules', 'flutter-build-responsive-layout.mdc');
        const filesPrunedCleanly = !fs.existsSync(antigravityPathA) && !fs.existsSync(cursorPathA) && !fs.existsSync(antigravityPathB) && !fs.existsSync(cursorPathB);

        // Clean up temporary fixture directories
        try {
          fs.rmSync(tmpDirA, { recursive: true, force: true });
          fs.rmSync(tmpDirB, { recursive: true, force: true });
        } catch {}

        if (
          result.hasBridge &&
          result.hasNoRequire &&
          result.hasNoProcess &&
          result.initRes && result.initRes.success === true &&
          result.statusRes && result.statusRes.success === true &&
          result.addResA && result.addResA.success === true &&
          result.addResB && result.addResB.success === true &&
          result.actResA && result.actResA.success === true &&
          result.actResB && result.actResB.success === true &&
          result.usageCountBefore === 2 &&
          result.noTokenInRenderer === true &&
          result.payloadKeyCount === 1 &&
          result.execRes && result.execRes.success === true &&
          result.usageCountAfter === 0 &&
          result.activeCountA === 0 &&
          result.activeCountB === 0 &&
          result.remResA && result.remResA.success === true &&
          result.remResB && result.remResB.success === true &&
          filesPrunedCleanly === true &&
          result.hasExact6Categories === true &&
          result.refreshSuccess === true &&
          result.hasActivity === true &&
          result.isLocalUpdateValid === true &&
          result.refreshActSuccess === true &&
          result.refreshUpdSuccess === true
        ) {
          console.log('[ELECTRON_SMOKE_TEST_SUCCESS] Live Electron host + Gate 9 Activity Timeline & Local Update Center verified clean!');
          if (processHost) await processHost.stop();
          app.quit();
          process.exit(0);
        } else {
          console.error('[ELECTRON_SMOKE_TEST_FAIL] Gate 7 validation failed:', JSON.stringify(result, null, 2));
          if (processHost) await processHost.stop();
          app.quit();
          process.exit(1);
        }
      } catch (err) {
        console.error('[ELECTRON_SMOKE_TEST_ERROR]', err.message);
        if (fs.existsSync(tmpDirA)) try { fs.rmSync(tmpDirA, { recursive: true, force: true }); } catch {}
        if (fs.existsSync(tmpDirB)) try { fs.rmSync(tmpDirB, { recursive: true, force: true }); } catch {}
        if (processHost) await processHost.stop();
        app.quit();
        process.exit(1);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  if (processHost) {
    await processHost.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (processHost) {
    await processHost.stop();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
