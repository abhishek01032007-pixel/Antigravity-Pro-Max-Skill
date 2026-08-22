/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - SIDE SHEET DRAWER (SideSheet.js)
 * Slide-Over Panel for Catalog Search and Compatible Skill Addition
 * ============================================================================
 */

import { SkillCard } from './SkillCard.js';

export const SideSheet = {
  render({ title = "Add Compatible Skills", catalog = [] }) {
    return `
      <div class="side-sheet-backdrop" id="side-sheet-backdrop">
        <aside class="side-sheet-container">
          <div class="side-sheet-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">add_circle</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">${title}</h3>
            </div>
            <button class="btn-ghost" id="side-sheet-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="side-sheet-search" style="padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-outline-variant);">
            <input type="text" class="input-text" id="side-sheet-search-input" placeholder="Search 48 catalog skills...">
          </div>

          <div class="side-sheet-body" id="side-sheet-skills-list" style="flex: 1; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);">
            ${catalog.map(skill => `
              <div class="card card-clickable flex items-center justify-between" data-add-skill-id="${skill.id}" style="padding: var(--space-3);">
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span class="code-pill">${skill.id}</span>
                    <span class="badge badge-neutral">${skill.category}</span>
                  </div>
                  <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">${skill.name}</span>
                </div>
                <button class="btn btn-secondary btn-sm action-add-to-rec" data-id="${skill.id}">
                  <span class="material-symbols-outlined" style="font-size: 14px;">add</span> Add
                </button>
              </div>
            `).join('')}
          </div>

          <div class="side-sheet-footer" style="padding: var(--space-4); border-top: 1px solid var(--color-outline-variant); background-color: var(--color-surface-lowest); display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" id="side-sheet-done-btn">Done</button>
          </div>
        </aside>
      </div>
    `;
  }
};
