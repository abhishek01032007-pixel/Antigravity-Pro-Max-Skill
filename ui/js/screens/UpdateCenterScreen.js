/**
 * UpdateCenterScreen.js - Update Center & Module Management Screen (Extended Phase 6.1B)
 * Full 13A-13J simulation without persisting version mutations across reloads.
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

    // Item 13: Launch Full Update Wizard Flow (13A -> 13C -> 13D -> 13E -> 13G)
    document.getElementById('btn-launch-update-flow')?.addEventListener('click', () => {
      app.startAppUpdateFlow();
    });
  }
};
