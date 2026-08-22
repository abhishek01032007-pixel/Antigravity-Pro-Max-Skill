/**
 * UpdateModuleCard.js - Component Version & Update Card
 */
import { StatusBadge } from './StatusBadge.js';

export const UpdateModuleCard = {
  render(module, hasUpdate = false) {
    return `
      <div class="card" style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">${module.name}</span>
          </div>
          ${StatusBadge.render(hasUpdate ? "Update Available" : module.status)}
        </div>

        <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
          ${module.description || ''}
        </p>

        <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3); margin-top: auto;">
          <div class="flex items-center gap-3">
            <div class="flex flex-col">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Installed</span>
              <span class="code-pill">${module.installedVersion}</span>
            </div>
            <div class="flex flex-col">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Available</span>
              <span class="code-pill" style="color: ${hasUpdate ? 'var(--color-warning)' : 'var(--color-on-surface)'};">${module.availableVersion}</span>
            </div>
          </div>

          ${hasUpdate ? `
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm" data-action="view-changes" data-module="${module.name}">View Changes</button>
              <button class="btn btn-primary btn-sm" data-action="update-now" data-module="${module.name}">Update Now</button>
            </div>
          ` : `
            <span style="font-size: var(--text-meta); color: var(--color-success); display: flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 14px;">check</span> Up to date
            </span>
          `}
        </div>
      </div>
    `;
  }
};
