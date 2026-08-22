/**
 * SystemHealthScreen.js - System Health / Doctor Screen (Stitch Reference)
 * Shows exactly 6 health checks with distinct Run Doctor, Repair, and Refresh actions.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { HealthCheckRow } from '../components/HealthCheckRow.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const SystemHealthScreen = {
  render(data) {
    const checks = data.healthChecks;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "System Health & Maintenance",
          count: "6/6 Passed",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-health-refresh">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Refresh</span>
            </button>
            <button class="btn btn-secondary" id="btn-health-repair">
              <span class="material-symbols-outlined" style="font-size: 16px;">healing</span>
              <span>Repair</span>
            </button>
            <button class="btn btn-primary" id="btn-health-run-doctor">
              <span class="material-symbols-outlined" style="font-size: 16px;">stethoscope</span>
              <span>Run Doctor</span>
            </button>
          `
        })}

        <!-- Overall Status Banner -->
        <div class="card flex items-center justify-between" style="padding: var(--space-4); background-color: var(--color-surface-container); border-color: var(--color-success-border);">
          <div class="flex items-center gap-3">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background-color: var(--color-success-bg); color: var(--color-success); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 20px;">check_circle</span>
            </div>
            <div class="flex flex-col">
              <span style="font-size: var(--text-body-md); font-weight: 700; color: var(--color-on-surface);">All Systems Operational</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Nexora CLI, Core Engine, Registries, and Platform Adapters are fully functional.</span>
            </div>
          </div>
          ${StatusBadge.render("Healthy")}
        </div>

        <!-- 6 Health Check Cards -->
        <div class="bento-grid">
          ${checks.map(c => `
            <div class="col-6">
              ${HealthCheckRow.render(c)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-health-refresh')?.addEventListener('click', () => {
      app.showToast("System health status refreshed.");
    });

    document.getElementById('btn-health-repair')?.addEventListener('click', () => {
      app.showToast("Repair completed: environment and command shims verified.");
    });

    document.getElementById('btn-health-run-doctor')?.addEventListener('click', () => {
      app.showToast("Nexora Doctor finished: 6/6 diagnostics passed.");
    });
  }
};
