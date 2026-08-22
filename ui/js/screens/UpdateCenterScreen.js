/**
 * UpdateCenterScreen.js - Update Center & Local Module Management (Phase 6.2 Gate 9 Integrated)
 * Truthful local-only presentation in LIVE mode, preserving Phase 6.1 simulation in Mock mode.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { UpdateModuleCard } from '../components/UpdateModuleCard.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const UpdateCenterScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const updateStatus = isLive ? (params.updateStatus || { currentVersion: 'v1.0.0', channel: 'stable', status: 'Local installation verified' }) : {
      currentVersion: 'v1.0.0',
      channel: 'stable',
      status: 'Up to date'
    };
    const modules = isLive ? (params.updateModules || []) : (data.updateModules || []);

    const curVer = updateStatus.currentVersion || 'v1.0.0';
    const channel = (updateStatus.channel || 'stable').toUpperCase();

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Update Center",
          actionsHtml: isLive ? `
            <button class="btn btn-secondary btn-sm" id="btn-update-refresh">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Refresh Status</span>
            </button>
          ` : `
            <button class="btn btn-secondary" id="btn-launch-update-flow">
              <span class="material-symbols-outlined" style="font-size: 16px;">system_update</span>
              <span>Simulate Nexora v1.1.0 Update</span>
            </button>
            <button class="btn btn-primary" id="btn-check-updates-now">
              <span class="material-symbols-outlined" style="font-size: 16px;">sync</span>
              <span>Check for Updates</span>
            </button>
          `
        })}

        <!-- Current Version Banner -->
        <div class="card flex items-center justify-between" id="update-status-banner" style="padding: var(--space-4); background-color: var(--color-surface-container);">
          <div class="flex items-center gap-3">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 20px;">deployed_code</span>
            </div>
            <div class="flex flex-col">
              <span style="font-size: var(--text-body-md); font-weight: 700; color: var(--color-on-surface);">Nexora Skills Manager ${curVer}</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);" id="update-status-subtitle">
                ${isLive ? `Channel: ${channel} | Remote update check: Not performed (Local offline verification only)` : 'All components and skill packages are on the verified stable release.'}
              </span>
            </div>
          </div>
          <div id="update-status-badge-container">
            ${StatusBadge.render(isLive ? "Local Verified" : "Up to date")}
          </div>
        </div>

        <!-- Modules Grid -->
        <div class="bento-grid" id="update-modules-grid">
          ${modules.map(m => `
            <div class="col-4">
              ${UpdateModuleCard.render(m, false)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-update-refresh')?.addEventListener('click', () => {
      app.refreshLocalUpdateStatus();
    });

    document.getElementById('btn-check-updates-now')?.addEventListener('click', () => {
      app.showToast("Checked for updates: all modules are up to date.");
    });

    document.getElementById('btn-launch-update-flow')?.addEventListener('click', () => {
      app.startAppUpdateFlow();
    });
  }
};
