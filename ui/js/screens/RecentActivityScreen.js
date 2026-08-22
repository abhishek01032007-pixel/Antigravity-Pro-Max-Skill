/**
 * RecentActivityScreen.js - Human-Readable Activity Log Screen (Stitch Reference)
 * Shows clean chronological events without raw enums or snapshot IDs.
 */
import { SectionHeader } from '../components/SectionHeader.js';

export const RecentActivityScreen = {
  render(data) {
    const logs = data.activityLogs;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Recent Activity",
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-activity-clear">
              <span class="material-symbols-outlined" style="font-size: 16px;">delete_sweep</span>
              <span>Clear History</span>
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

        <!-- Activity Feed -->
        <div class="flex flex-col gap-3">
          ${logs.map(log => `
            <div class="card" style="padding: var(--space-4); display: flex; items-center; justify-content: space-between;">
              <div class="flex items-center gap-3">
                <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">
                    ${log.category === 'Projects' ? 'folder_open' : (log.category === 'Skills' ? 'school' : (log.category === 'Analysis' ? 'analytics' : 'verified'))}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">${log.title}</span>
                  <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${log.details}</span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span class="badge badge-neutral">${log.category}</span>
                <span style="font-size: var(--text-meta); color: var(--color-outline);">${log.timestamp}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-activity-clear')?.addEventListener('click', () => {
      app.showToast("Activity history cleared.");
    });
  }
};
