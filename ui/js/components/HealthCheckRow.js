/**
 * HealthCheckRow.js - Diagnostic Check Item Card for System Health
 */
import { StatusBadge } from './StatusBadge.js';

export const HealthCheckRow = {
  render(check) {
    return `
      <div class="card" style="padding: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
        <div class="flex items-center gap-3">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 16px;">${check.icon || 'check_circle'}</span>
          </div>
          <div class="flex flex-col">
            <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">${check.name}</span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${check.detail}</span>
          </div>
        </div>

        <div>
          ${StatusBadge.render(check.status || "Healthy")}
        </div>
      </div>
    `;
  }
};
