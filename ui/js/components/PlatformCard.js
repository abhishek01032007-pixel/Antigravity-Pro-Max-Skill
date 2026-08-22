/**
 * PlatformCard.js - AI Platform Card (Google Antigravity, Cursor, Copilot)
 */
import { StatusBadge } from './StatusBadge.js';

export const PlatformCard = {
  render(platform, isSelected = false) {
    const icon = platform.name.includes("Antigravity") ? "rocket_launch" : (platform.name.includes("Cursor") ? "near_me" : "smart_toy");

    return `
      <div class="card card-clickable ${isSelected ? 'card-selected' : ''}" data-platform-id="${platform.id}" style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4);">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
            </div>
            <div class="flex flex-col">
              <span style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">${platform.name}</span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">Compatible</span>
            </div>
          </div>
          <input type="checkbox" class="checkbox-custom platform-cb" data-id="${platform.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();">
        </div>

        <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3); margin-top: auto;">
          <div class="flex items-center gap-2">
            ${StatusBadge.render(platform.status || "Available")}
          </div>
          <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
            ${platform.activeSkills} active skills
          </span>
        </div>
      </div>
    `;
  }
};
