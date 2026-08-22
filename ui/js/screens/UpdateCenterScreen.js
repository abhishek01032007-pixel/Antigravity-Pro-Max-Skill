/**
 * UpdateCenterScreen.js - Update Center & Module Management Screen (Stitch Reference)
 * Free of update channel selectors, raw hashes, or rollback internals.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { UpdateModuleCard } from '../components/UpdateModuleCard.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const UpdateCenterScreen = {
  render(data) {
    const modules = data.updateModules;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Update Center",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-update-sim-toggle">
              <span class="material-symbols-outlined" style="font-size: 16px;">tune</span>
              <span>Toggle Update Simulation</span>
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
              <span style="font-size: var(--text-body-md); font-weight: 700; color: var(--color-on-surface);">Nexora Skills Manager v1.0.0</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);" id="update-status-subtitle">
                All components and skill packages are on the verified stable release.
              </span>
            </div>
          </div>
          <div id="update-status-badge-container">
            ${StatusBadge.render("Up to date")}
          </div>
        </div>

        <!-- Update Progress State (Hidden by Default) -->
        <div class="card flex flex-col gap-3 hidden" id="update-progress-card" style="padding: var(--space-4); background-color: var(--color-surface-low); border-color: var(--color-primary-container);">
          <div class="flex items-center justify-between">
            <span style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-primary);" id="update-progress-title">
              Updating Core Engine...
            </span>
            <span class="badge badge-warning" id="update-progress-badge">Applying</span>
          </div>
          <div style="width: 100%; height: 6px; background: var(--color-surface-high); border-radius: var(--radius-full); overflow: hidden;">
            <div id="update-progress-bar" style="width: 60%; height: 100%; background: var(--color-primary-accent); transition: width 0.4s ease;"></div>
          </div>
          <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);" id="update-progress-desc">
            Downloading verified package → Verifying SHA-256 integrity → Applying files → Finalizing
          </span>
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
    document.getElementById('btn-check-updates-now')?.addEventListener('click', () => {
      app.showToast("Checked for updates: all modules are up to date.");
    });

    let simulated = false;
    document.getElementById('btn-update-sim-toggle')?.addEventListener('click', () => {
      simulated = !simulated;
      const grid = document.getElementById('update-modules-grid');
      if (simulated) {
        grid.innerHTML = `
          <div class="col-4">
            ${UpdateModuleCard.render({
              name: "Core Engine",
              installedVersion: "v1.0.0",
              availableVersion: "v1.1.0",
              status: "Update Available",
              description: "Engine performance improvements and multi-project orchestrator updates."
            }, true)}
          </div>
          <div class="col-4">
            ${UpdateModuleCard.render({
              name: "Skill Library",
              installedVersion: "v1.0.0",
              availableVersion: "v1.0.0",
              status: "Up to date",
              description: "Official 48 skill packages across 16 taxonomies."
            }, false)}
          </div>
          <div class="col-4">
            ${UpdateModuleCard.render({
              name: "Platform Adapters",
              installedVersion: "v1.0.0",
              availableVersion: "v1.0.0",
              status: "Up to date",
              description: "Google Antigravity, Cursor, and GitHub Copilot deployment adapters."
            }, false)}
          </div>
        `;
        app.showToast("Simulation: Core Engine v1.1.0 update available.");
      } else {
        app.navigate('update-center');
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="update-now"]')) {
        const progressCard = document.getElementById('update-progress-card');
        if (progressCard) {
          progressCard.classList.remove('hidden');
          setTimeout(() => {
            progressCard.innerHTML = `
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-success);">
                  Update Completed Successfully
                </span>
                <span class="badge badge-success">Completed</span>
              </div>
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
                Core Engine has been successfully updated to v1.1.0.
              </p>
            `;
          }, 1500);
        }
      }
    });
  }
};
