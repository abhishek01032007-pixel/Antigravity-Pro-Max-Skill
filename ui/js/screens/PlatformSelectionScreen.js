/**
 * PlatformSelectionScreen.js - Supported AI Platform Selection Screen (Stitch Reference)
 * Supports strictly: Google Antigravity, Cursor, GitHub Copilot.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { PlatformCard } from '../components/PlatformCard.js';

export const PlatformSelectionScreen = {
  render(data) {
    const platforms = data.platforms;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "AI Platform Integration",
          actionsHtml: `
            <button class="btn btn-primary" id="btn-save-platforms">
              <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
              <span>Save Platform Preferences</span>
            </button>
          `
        })}

        <div class="card" style="padding: var(--space-4); background-color: rgba(99, 102, 241, 0.08); border-color: var(--color-primary-container);">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">hub</span>
            <span style="font-size: var(--text-body-sm); color: var(--color-on-surface);">
              Select the AI code assistants you use with your projects. Nexora will deploy active skills to the appropriate workspace formats.
            </span>
          </div>
        </div>

        <div class="bento-grid">
          ${platforms.map(p => `
            <div class="col-4">
              ${PlatformCard.render(p, p.selected)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-save-platforms')?.addEventListener('click', () => {
      app.showToast("Platform preferences saved.");
    });
  }
};
