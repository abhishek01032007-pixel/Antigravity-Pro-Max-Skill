/**
 * SystemHealthScreen.js - System Health / Doctor Screen (Phase 6.2 Gate 8 Integrated)
 * Shows exactly 6 live diagnostic categories with distinct Run Doctor, Repair, and Refresh actions.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { HealthCheckRow } from '../components/HealthCheckRow.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const SystemHealthScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const health = isLive ? (params.health || { overallStatus: 'healthy', healthy: true, checks: [] }) : {
      overallStatus: 'healthy',
      healthy: true,
      checks: data.healthChecks || []
    };

    const checks = health.checks || [];
    const healthyCount = checks.filter(c => c.status === 'Healthy' || c.status === 'OK').length;
    const countText = checks.length > 0 ? `${healthyCount}/${checks.length} Passed` : 'Health Status Unavailable';

    const overall = health.overallStatus || (health.healthy ? 'healthy' : 'warning');
    const isError = overall === 'error';
    const isWarn = overall === 'warning';
    const isUnknown = overall === 'unknown';
    const isHealthy = overall === 'healthy';

    let bannerTitle = "All Systems Operational";
    let bannerDesc = "Nexora CLI, Core Engine, Registries, and Platform Adapters are fully functional.";
    let bannerIcon = "check_circle";
    let bannerStatus = "Healthy";

    if (isError) {
      bannerTitle = "System Diagnostics Error Detected";
      bannerDesc = "One or more critical core diagnostics reported errors. Review categories below.";
      bannerIcon = "error";
      bannerStatus = "Error";
    } else if (isWarn) {
      bannerTitle = "System Attention Required";
      bannerDesc = "Non-critical warnings were reported. Diagnostic repairs may be available.";
      bannerIcon = "warning";
      bannerStatus = "Warning";
    } else if (isUnknown) {
      bannerTitle = "Health Status Unavailable";
      bannerDesc = "Could not retrieve authoritative diagnostic checks from the engine.";
      bannerIcon = "help";
      bannerStatus = "Unknown";
    }

    const hasRepairable = checks.some(c => c.repairable && c.status !== 'Healthy');

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "System Health & Maintenance",
          count: countText,
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-health-refresh">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Refresh</span>
            </button>
            <button class="btn btn-secondary" id="btn-health-repair" ${hasRepairable ? '' : 'disabled'}>
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
        <div class="card flex items-center justify-between" style="padding: var(--space-4); background-color: var(--color-surface-container); border-color: ${isHealthy ? 'var(--color-success-border)' : (isWarn ? 'var(--color-warning)' : 'var(--color-error-accent)')};">
          <div class="flex items-center gap-3">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background-color: ${isHealthy ? 'var(--color-success-bg)' : (isWarn ? 'var(--color-surface-high)' : 'var(--color-surface-lowest)')}; color: ${isHealthy ? 'var(--color-success)' : (isWarn ? 'var(--color-warning)' : 'var(--color-error-accent)')}; display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 20px;">${bannerIcon}</span>
            </div>
            <div class="flex flex-col">
              <span style="font-size: var(--text-body-md); font-weight: 700; color: var(--color-on-surface);">${bannerTitle}</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${bannerDesc}</span>
            </div>
          </div>
          ${StatusBadge.render(bannerStatus)}
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
      app.refreshHealthStatus();
    });

    document.getElementById('btn-health-run-doctor')?.addEventListener('click', () => {
      app.refreshHealthStatus();
    });

    document.getElementById('btn-health-repair')?.addEventListener('click', () => {
      app.startHealthRepairFlow();
    });

    document.querySelectorAll('.action-repair-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        app.startHealthRepairFlow(id, name);
      });
    });
  }
};
