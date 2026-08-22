/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - INLINE NOTICE & BANNER (InlineNotice.js)
 * Non-blocking status banners, offline alerts, and recalculation overlays
 * ============================================================================
 */

export const InlineNotice = {
  // Item 9: Non-Blocking Offline Notification Banner
  renderOfflineBanner() {
    return `
      <div class="card flex items-center justify-between" id="offline-notice-banner" style="padding: var(--space-3) var(--space-4); background-color: var(--color-warning-bg); border-color: var(--color-warning-border); margin-bottom: var(--space-3);">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined" style="color: var(--color-warning); font-size: 20px;">cloud_off</span>
          <div class="flex flex-col">
            <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">You're Offline</span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
              Nexora is continuing with local project data, analysis, and installed skills. Update checks and remote downloads are paused.
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" id="btn-offline-retry">Retry Connection</button>
          <button class="btn-ghost" id="btn-offline-dismiss" title="Dismiss">
            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
          </button>
        </div>
      </div>
    `;
  },

  // Item 13B: Top Bar Update Available Indicator & Banner
  renderUpdateAvailableBanner(version = "v1.1.0") {
    return `
      <div class="card flex items-center justify-between" id="app-update-banner" style="padding: var(--space-3) var(--space-4); background-color: rgba(99, 102, 241, 0.12); border-color: var(--color-primary); margin-bottom: var(--space-3);">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">update</span>
          <div class="flex flex-col">
            <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">Nexora Update ${version} Available</span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
              New workflow features, improved skills management, and stability updates.
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-primary btn-sm" id="btn-banner-download-update">Update Now</button>
          <button class="btn-ghost" id="btn-banner-dismiss-update" title="Dismiss">
            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
          </button>
        </div>
      </div>
    `;
  },

  // Item 4: Recommendation Recalculation Inline State
  renderRecalculationLoader(mode = "Frontend Development", target = "Mobile Application") {
    return `
      <div class="card flex flex-col items-center justify-center gap-3" style="padding: var(--space-6); background-color: var(--color-surface-container); min-height: 220px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--color-surface-high); border-top-color: var(--color-primary-accent); animation: spin 0.8s linear infinite;"></div>
        <div class="flex flex-col items-center gap-1 text-center">
          <span style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
            Refreshing Recommendations
          </span>
          <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
            Using existing project analysis for <strong style="color: var(--color-primary);">${mode}</strong> (${target})...
          </span>
        </div>
      </div>
    `;
  }
};
