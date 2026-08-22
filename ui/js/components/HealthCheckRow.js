/**
 * HealthCheckRow.js - Diagnostic Check Item Card for System Health (Phase 6.2 Gate 8 Integrated)
 */
import { StatusBadge } from './StatusBadge.js';

export const HealthCheckRow = {
  render(check) {
    const isError = check.status === "Error" || check.status === "FAIL";
    const isWarn = check.status === "Warning" || check.status === "WARN";
    const isHealthy = check.status === "Healthy" || check.status === "OK";

    const icon = check.icon || (isHealthy ? "check_circle" : (isWarn ? "warning" : "error"));
    const iconColor = isHealthy ? "var(--color-success)" : (isWarn ? "var(--color-warning)" : "var(--color-error-accent)");

    return `
      <div class="card" style="padding: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
        <div class="flex items-center gap-3">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: ${iconColor}; display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="font-size: 16px;">${icon}</span>
          </div>
          <div class="flex flex-col">
            <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">${check.name || check.label || check.id}</span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${check.detail || ''}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          ${check.repairable && !isHealthy ? `
            <button class="btn btn-secondary btn-sm action-repair-single" data-id="${check.id}" data-name="${check.name || check.label || check.id}">
              Repair
            </button>
          ` : ''}
          ${StatusBadge.render(check.status || "Healthy")}
        </div>
      </div>
    `;
  }
};
