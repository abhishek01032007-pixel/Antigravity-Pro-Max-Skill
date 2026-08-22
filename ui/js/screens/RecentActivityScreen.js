/**
 * RecentActivityScreen.js - Human-Readable Activity Log Screen (Phase 6.2 Gate 9 Integrated)
 * Shows chronological events from live activity aggregator without raw enums, tokens, or snapshot IDs.
 */
import { SectionHeader } from '../components/SectionHeader.js';

export const RecentActivityScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const rawLogs = isLive ? (params.activityLogs || []) : (data.activityLogs || []);
    const isUnavailable = isLive && (params.activityUnavailable || (rawLogs && rawLogs.error));
    const logs = Array.isArray(rawLogs) ? rawLogs : [];

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Recent Activity",
          count: isUnavailable ? "Unavailable" : `${logs.length} Events`,
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-activity-refresh">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Refresh</span>
            </button>
          `
        })}

        <!-- Filter Chips -->
        <div class="flex items-center gap-2" style="overflow-x: auto; padding-bottom: var(--space-2);">
          <button class="badge badge-primary" style="cursor: pointer;">All Activity</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Projects</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Skills</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Analysis</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Updates</button>
          <button class="badge badge-neutral" style="cursor: pointer;">System</button>
        </div>

        ${isUnavailable ? `
          <div class="card flex flex-col items-center justify-center text-center" style="padding: var(--space-8); background-color: var(--color-surface-container);">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-error-accent); margin-bottom: var(--space-2);">error</span>
            <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">Activity unavailable</span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant); margin-top: var(--space-1);">Could not retrieve recent activity history from the engine.</span>
          </div>
        ` : (logs.length === 0 ? `
          <div class="card flex flex-col items-center justify-center text-center" style="padding: var(--space-8); background-color: var(--color-surface-container);">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-outline); margin-bottom: var(--space-2);">history_toggle_off</span>
            <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">No activity yet</span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant); margin-top: var(--space-1);">Project changes, skill deployments, and diagnostic events will appear here.</span>
          </div>
        ` : `
          <!-- Activity Feed -->
          <div class="flex flex-col gap-3">
            ${logs.map(log => `
              <div class="card" style="padding: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
                <div class="flex items-center gap-3">
                  <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">
                      ${log.category === 'Projects' ? 'folder_open' : (log.category === 'Skills' ? 'school' : (log.category === 'Analysis' ? 'analytics' : (log.category === 'Updates' ? 'sync' : 'verified')))}
                    </span>
                  </div>
                  <div class="flex flex-col">
                    <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">${log.title || log.message}</span>
                    <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${log.details || log.projectName || ''}</span>
                  </div>
                </div>

                <div class="flex flex-col items-end gap-1">
                  <span class="badge badge-neutral">${log.category || 'System'}</span>
                  <span style="font-size: var(--text-meta); color: var(--color-outline);">${log.timestamp}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `)}
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-activity-refresh')?.addEventListener('click', () => {
      app.refreshActivityTimeline();
    });
  }
};
