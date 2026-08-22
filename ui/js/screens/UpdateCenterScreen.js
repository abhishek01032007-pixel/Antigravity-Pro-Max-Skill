/**
 * UpdateCenterScreen.js - Live Update Center Screen & Visual State Machine
 * Part of Nexora Skills Manager Phase 8 Update System
 */

import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { getUpdateErrorMessage, formatBytes } from '../updates/UpdateErrorMapper.js';

export const UpdateCenterScreen = {
  activeUnsubscribe: null,
  dismissedResults: new Set(),

  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const rawStatus = params.updateStatus || (data.state && data.state.updateStatus) || {
      currentVersion: '1.0.0',
      latestVersion: null,
      updateAvailable: false,
      checkedRemotely: false,
      channel: 'stable',
      state: 'never_checked'
    };

    const state = params.overrideState || rawStatus.state || (rawStatus.checkedRemotely ? (rawStatus.updateAvailable ? 'update_available' : 'up_to_date') : 'never_checked');
    const curVer = rawStatus.currentVersion || '1.0.0';
    const latestVer = rawStatus.latestVersion || curVer;
    const channel = (rawStatus.channel || 'stable');
    const channelDisplay = channel.charAt(0).toUpperCase() + channel.slice(1);
    const lastResult = rawStatus.lastUpdateResult || params.lastUpdateResult;
    const progress = params.downloadProgress || { percent: 0, bytesReceived: 0, totalBytes: 0, artifact: 'desktop' };
    const errCode = params.errorCode || (rawStatus.error && rawStatus.error.code);
    const errMsg = params.errorMessage || (rawStatus.error && rawStatus.error.message) || getUpdateErrorMessage(errCode);

    // Calculate total size if available
    const desktopSize = rawStatus.desktopSize || 0;
    const runtimeSize = rawStatus.runtimeSize || 0;
    const totalSize = (desktopSize + runtimeSize) > 0 ? formatBytes(desktopSize + runtimeSize) : (rawStatus.size ? formatBytes(rawStatus.size) : '112.0 MB');

    // Startup / Result Banner
    let resultBannerHtml = '';
    if (lastResult && !this.dismissedResults.has(lastResult.operationId || 'default')) {
      if (lastResult.success) {
        resultBannerHtml = `
          <div class="card flex items-center justify-between" style="padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); background-color: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3);">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined" style="color: #22c55e; font-size: 20px;">check_circle</span>
              <div class="flex flex-col">
                <span style="font-weight: 600; color: var(--color-on-surface); font-size: var(--text-body-sm);">Nexora updated successfully</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Version ${lastResult.targetVersion || curVer} is now active.</span>
              </div>
            </div>
            <button class="btn-ghost btn-sm" id="btn-dismiss-result-banner" style="color: var(--color-on-surface-variant);">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>
        `;
      } else if (lastResult.previousVersionRestored) {
        resultBannerHtml = `
          <div class="card flex items-center justify-between" style="padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); background-color: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3);">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined" style="color: #f59e0b; font-size: 20px;">warning</span>
              <div class="flex flex-col">
                <span style="font-weight: 600; color: var(--color-on-surface); font-size: var(--text-body-sm);">Update couldn't be installed</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Your previous Nexora version (${curVer}) was restored successfully.</span>
              </div>
            </div>
            <button class="btn-ghost btn-sm" id="btn-dismiss-result-banner" style="color: var(--color-on-surface-variant);">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>
        `;
      } else {
        resultBannerHtml = `
          <div class="card flex items-center justify-between" style="padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); background-color: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.4);">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined" style="color: #ef4444; font-size: 20px;">error</span>
              <div class="flex flex-col">
                <span style="font-weight: 600; color: #ef4444; font-size: var(--text-body-sm);">Update recovery required</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Nexora could not confirm that the previous installation was restored. Please check System Health.</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-open-system-health">System Health</button>
          </div>
        `;
      }
    }

    // State Body Card
    let stateBodyHtml = '';

    if (state === 'checking') {
      stateBodyHtml = `
        <div class="card flex flex-col gap-3" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined animate-spin" style="color: var(--color-primary); font-size: 24px;">sync</span>
            <div class="flex flex-col">
              <span style="font-weight: 600; color: var(--color-on-surface); font-size: var(--text-body-md);">Checking for updates...</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Contacting trusted release endpoint</span>
            </div>
          </div>
        </div>
      `;
    } else if (state === 'up_to_date') {
      const isRemoteOlder = rawStatus.reason === 'remote_older';
      stateBodyHtml = `
        <div class="card flex flex-col gap-3" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: rgba(34, 197, 94, 0.15); color: #22c55e; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px;">check</span>
              </div>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-lg);">You're up to date</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
                  ${isRemoteOlder ? 'This installation is newer than the latest stable release.' : 'Nexora Skills Manager is on the latest version.'}
                </span>
              </div>
            </div>
            ${StatusBadge.render('Up to date')}
          </div>
          <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-surface-high); padding-top: var(--space-3); margin-top: var(--space-2);">
            <div class="flex items-center gap-4">
              <div class="flex flex-col">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Current Version</span>
                <span class="code-pill">${curVer}</span>
              </div>
              <div class="flex flex-col">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Channel</span>
                <span style="font-size: var(--text-meta); font-weight: 500; color: var(--color-on-surface);">${channelDisplay}</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-check-updates">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Check Again</span>
            </button>
          </div>
        </div>
      `;
    } else if (state === 'update_available') {
      stateBodyHtml = `
        <div class="card flex flex-col gap-4" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: rgba(99, 102, 241, 0.15); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px;">system_update</span>
              </div>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-lg);">Update Available</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">A new version of Nexora Skills Manager is available.</span>
              </div>
            </div>
            <span class="badge badge-primary">v${latestVer}</span>
          </div>

          <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container-high); border-color: var(--color-surface-high);">
            <div class="grid grid-cols-3 gap-3" style="display: grid; grid-template-columns: repeat(3, 1fr);">
              <div class="flex flex-col">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Installed Version</span>
                <span class="code-pill">${curVer}</span>
              </div>
              <div class="flex flex-col">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">New Version</span>
                <span class="code-pill" style="color: var(--color-primary);">${latestVer}</span>
              </div>
              <div class="flex flex-col">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Download Size</span>
                <span style="font-size: var(--text-meta); font-weight: 600; color: var(--color-on-surface);">${totalSize}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-surface-high); padding-top: var(--space-3);">
            <a href="${rawStatus.releaseNotesUrl || '#'}" target="_blank" rel="noreferrer" class="btn-link flex items-center gap-1" id="link-release-notes" style="font-size: var(--text-meta); color: var(--color-primary); text-decoration: none;">
              <span>View Release Notes</span>
              <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
            </a>
            <div class="flex items-center gap-2">
              <button class="btn btn-primary" id="btn-download-update">
                <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                <span>Download Update</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (state === 'downloading') {
      const overallPercent = progress.overallPercent !== undefined ? progress.overallPercent : (progress.percent || 0);
      const artifactLabel = progress.artifact === 'runtime' ? 'Shared Runtime package' : 'Desktop package';
      const downloadedBytesStr = formatBytes(progress.overallBytesReceived || progress.bytesReceived || 0);
      const totalBytesStr = formatBytes(progress.overallBytes || progress.totalBytes || 0);

      stateBodyHtml = `
        <div class="card flex flex-col gap-4" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined animate-spin" style="color: var(--color-primary); font-size: 24px;">downloading</span>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-md);">Downloading Update v${latestVer}...</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Downloading ${artifactLabel}</span>
              </div>
            </div>
            <span style="font-size: var(--text-body-sm); font-weight: 700; color: var(--color-primary);">${overallPercent}%</span>
          </div>

          <div style="width: 100%; height: 8px; background: var(--color-surface-high); border-radius: var(--radius-full); overflow: hidden;">
            <div style="width: ${overallPercent}%; height: 100%; background: var(--color-primary); transition: width 0.2s;" role="progressbar" aria-valuenow="${overallPercent}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>

          <div class="flex items-center justify-between" style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
            <span>${downloadedBytesStr} of ${totalBytesStr}</span>
            <button class="btn btn-secondary btn-sm" id="btn-cancel-download">
              <span class="material-symbols-outlined" style="font-size: 14px;">close</span>
              <span>Cancel Download</span>
            </button>
          </div>
        </div>
      `;
    } else if (state === 'ready_to_install') {
      stateBodyHtml = `
        <div class="card flex flex-col gap-4" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: rgba(34, 197, 94, 0.15); color: #22c55e; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px;">verified</span>
              </div>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-lg);">Update Verified & Ready to Install</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Version ${latestVer} has passed cryptographic validation.</span>
              </div>
            </div>
            <span class="badge badge-success">Ready</span>
          </div>

          <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">
            Nexora will close to finish installing the update. Your project configurations, custom skills, and workspace files will be preserved.
          </p>

          <div class="flex items-center justify-end gap-2" style="border-top: 1px solid var(--color-surface-high); padding-top: var(--space-3);">
            <button class="btn btn-secondary" id="btn-install-later">Later</button>
            <button class="btn btn-primary" id="btn-install-update">
              <span class="material-symbols-outlined" style="font-size: 16px;">restart_alt</span>
              <span>Install & Restart</span>
            </button>
          </div>
        </div>
      `;
    } else if (state === 'installing') {
      stateBodyHtml = `
        <div class="card flex flex-col gap-3" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined animate-spin" style="color: var(--color-primary); font-size: 24px;">sync</span>
            <div class="flex flex-col">
              <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-md);">Preparing update...</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Nexora will close to finish installing the update.</span>
            </div>
          </div>
        </div>
      `;
    } else if (state === 'offline') {
      stateBodyHtml = `
        <div class="card flex flex-col gap-3" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px;">wifi_off</span>
              </div>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-lg);">You're offline</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Nexora's local features still work normally.</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-check-updates">Try Again</button>
          </div>
        </div>
      `;
    } else if (state === 'error') {
      stateBodyHtml = `
        <div class="card flex flex-col gap-3" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px;">error</span>
              </div>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-md);">Update Check Error</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${errMsg}</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-check-updates">Try Again</button>
          </div>
        </div>
      `;
    } else {
      // never_checked / local verified baseline
      stateBodyHtml = `
        <div class="card flex flex-col gap-4" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center justify-between" id="update-status-banner">
            <div class="flex items-center gap-3">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px;">deployed_code</span>
              </div>
              <div class="flex flex-col">
                <span style="font-weight: 700; color: var(--color-on-surface); font-size: var(--text-body-lg);">Nexora Skills Manager v${curVer.replace(/^v/, '')}</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);" id="update-status-subtitle">
                  Channel: ${channel.toUpperCase()} | Remote update check: Not performed (Local offline verification only)
                </span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant); margin-top: 2px;">
                  Updates have not been checked yet.
                </span>
              </div>
            </div>
            <div id="update-status-badge-container">
              ${StatusBadge.render(isLive ? "Local Verified" : "Up to date")}
            </div>
          </div>
          <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-surface-high); padding-top: var(--space-3);">
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Check remote release endpoint for latest updates</span>
            <button class="btn btn-primary" id="btn-check-updates">
              <span class="material-symbols-outlined" style="font-size: 16px;">sync</span>
              <span>Check for Updates</span>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="content-container" id="update-center-view">
        ${SectionHeader.render({
          title: "Update Center",
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-update-refresh">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Refresh Status</span>
            </button>
          `
        })}

        ${resultBannerHtml}
        ${stateBodyHtml}
      </div>
    `;
  },

  attachEvents(app) {
    // Dismiss Result Banner
    document.getElementById('btn-dismiss-result-banner')?.addEventListener('click', () => {
      this.dismissedResults.add('default');
      app.navigate('update-center');
    });

    // Open System Health
    document.getElementById('btn-open-system-health')?.addEventListener('click', () => {
      app.navigate('maintenance');
    });

    // Check for Updates
    document.getElementById('btn-check-updates')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-check-updates');
      if (btn) btn.disabled = true;

      app.navigate('update-center', { overrideState: 'checking' });

      try {
        const res = await app.data.checkForUpdates();
        if (res && res.success) {
          if (res.updateAvailable) {
            app.navigate('update-center', {
              overrideState: 'update_available',
              updateStatus: res
            });
          } else {
            app.navigate('update-center', {
              overrideState: 'up_to_date',
              updateStatus: res
            });
          }
        } else {
          const errCode = (res && res.error && res.error.code) || 'UPDATE_REMOTE_ERROR';
          const overrideState = errCode === 'UPDATE_OFFLINE' ? 'offline' : 'error';
          app.navigate('update-center', {
            overrideState,
            errorCode: errCode
          });
        }
      } catch (err) {
        const errCode = err.code || 'UPDATE_REMOTE_ERROR';
        const overrideState = errCode === 'UPDATE_OFFLINE' ? 'offline' : 'error';
        app.navigate('update-center', {
          overrideState,
          errorCode: errCode
        });
      }
    });

    // Download Update
    document.getElementById('btn-download-update')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-download-update');
      if (btn) btn.disabled = true;

      app.navigate('update-center', {
        overrideState: 'downloading',
        downloadProgress: { percent: 0, bytesReceived: 0, totalBytes: 0, artifact: 'desktop' }
      });

      // Subscribe to live download progress events
      if (app.data.onUpdateProgress) {
        if (this.activeUnsubscribe) {
          try { this.activeUnsubscribe(); } catch {}
        }
        this.activeUnsubscribe = app.data.onUpdateProgress((progressData) => {
          if (app.currentView === 'update-center') {
            app.navigate('update-center', {
              overrideState: 'downloading',
              downloadProgress: progressData
            });
          }
        });
      }

      try {
        const res = await app.data.downloadUpdate();
        if (this.activeUnsubscribe) {
          try { this.activeUnsubscribe(); } catch {}
          this.activeUnsubscribe = null;
        }

        if (res && res.success && res.state === 'ready_to_install') {
          app.navigate('update-center', {
            overrideState: 'ready_to_install',
            updateStatus: res
          });
        } else {
          app.navigate('update-center', {
            overrideState: 'error',
            errorCode: (res && res.error && res.error.code) || 'UPDATE_DOWNLOAD_FAILED'
          });
        }
      } catch (err) {
        if (this.activeUnsubscribe) {
          try { this.activeUnsubscribe(); } catch {}
          this.activeUnsubscribe = null;
        }

        if (err.code === 'UPDATE_DOWNLOAD_CANCELLED') {
          app.showToast('Download cancelled.');
          app.navigate('update-center', { overrideState: 'update_available' });
        } else {
          app.navigate('update-center', {
            overrideState: 'error',
            errorCode: err.code || 'UPDATE_DOWNLOAD_FAILED'
          });
        }
      }
    });

    // Cancel Download
    document.getElementById('btn-cancel-download')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-cancel-download');
      if (btn) btn.disabled = true;

      try {
        await app.data.cancelUpdateDownload();
        if (this.activeUnsubscribe) {
          try { this.activeUnsubscribe(); } catch {}
          this.activeUnsubscribe = null;
        }
        app.showToast('Download cancelled.');
        app.navigate('update-center', { overrideState: 'update_available' });
      } catch {
        app.navigate('update-center', { overrideState: 'update_available' });
      }
    });

    // Install Update (Confirmation Dialog)
    document.getElementById('btn-install-update')?.addEventListener('click', () => {
      const confirmHtml = `
        <div class="modal-backdrop" id="modal-container">
          <div class="modal-dialog" style="max-width: 480px;">
            <div class="modal-header">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">restart_alt</span>
                <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Install Update & Restart?</h3>
              </div>
              <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
                <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
              </button>
            </div>
            <div class="modal-body">
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">
                Nexora will close while the update is installed. Your projects and settings will be preserved.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
              <button class="btn btn-primary" id="btn-confirm-install-restart">Install & Restart</button>
            </div>
          </div>
        </div>
      `;

      app.renderModal(confirmHtml);

      document.getElementById('btn-confirm-install-restart')?.addEventListener('click', async () => {
        app.closeModal();
        app.navigate('update-center', { overrideState: 'installing' });

        try {
          await app.data.installUpdate();
        } catch (err) {
          app.navigate('update-center', {
            overrideState: 'error',
            errorCode: err.code || 'UPDATE_INSTALL_FAILED'
          });
        }
      });

      document.getElementById('modal-cancel-btn')?.addEventListener('click', () => app.closeModal());
      document.getElementById('modal-close-btn')?.addEventListener('click', () => app.closeModal());
    });

    document.getElementById('btn-install-later')?.addEventListener('click', () => {
      app.navigate('dashboard');
    });

    document.getElementById('btn-update-refresh')?.addEventListener('click', async () => {
      try {
        const status = app.data.getUpdateStatus ? await app.data.getUpdateStatus() : null;
        app.navigate('update-center', { updateStatus: status });
      } catch {}
    });
  }
};
