/**
 * LoadingState.js - Startup Progress & Loading Spinner
 */
export const LoadingState = {
  render({ message = "Initializing Nexora Desktop Core...", progress = 75 }) {
    return `
      <div class="flex flex-col items-center justify-center h-full w-full gap-4" style="min-height: 380px;">
        <div class="logo-hexagon" style="width: 56px; height: 56px; border-radius: var(--radius-lg); box-shadow: 0 0 24px rgba(192, 193, 255, 0.3);">
          <span class="material-symbols-outlined" style="font-size: 32px;">hexagon</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <span style="font-size: var(--text-screen-title); font-weight: 700; color: var(--color-primary);">Nexora Skills Manager</span>
          <span style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">${message}</span>
        </div>
        <div style="width: 240px; height: 4px; background-color: var(--color-surface-high); border-radius: var(--radius-full); overflow: hidden; margin-top: var(--space-2);">
          <div style="width: ${progress}%; height: 100%; background-color: var(--color-primary-accent); transition: width 0.3s ease;"></div>
        </div>
        <span style="font-size: var(--text-meta); color: var(--color-outline); margin-top: var(--space-2);">v1.0.0</span>
      </div>
    `;
  }
};
