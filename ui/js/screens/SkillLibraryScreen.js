/**
 * SkillLibraryScreen.js - Universal 48-Skill Library Catalog Screen (Extended Phase 6.1B)
 * Supports Item 10: Skill Sync / Refresh Status State
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { SkillCard } from '../components/SkillCard.js';

export const SkillLibraryScreen = {
  render(data) {
    const catalog = data.skillCatalog;
    const state = data.state;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Skill Library",
          count: "48 Skills Available",
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-sync-skills">
              <span class="material-symbols-outlined" style="font-size: 16px;">sync</span>
              <span id="sync-skills-text">Sync Library</span>
            </button>
            <div class="flex items-center gap-2">
              <input type="text" class="input-text" id="input-skill-search" placeholder="Search skills by name, ID, or stack..." style="width: 260px;">
              <button class="btn btn-secondary" id="btn-library-filter">
                <span class="material-symbols-outlined" style="font-size: 16px;">filter_list</span>
                <span>Filters</span>
              </button>
            </div>
          `
        })}

        <!-- Item 10: Skill Sync Notification Panel (Hidden by default, shown on sync click) -->
        <div class="card hidden flex items-center justify-between" id="skill-sync-status-panel" style="padding: var(--space-3) var(--space-4); background-color: var(--color-surface-container); border-color: var(--color-primary-container); margin-bottom: var(--space-2);">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary" style="font-size: 20px;">cloud_sync</span>
            <div class="flex flex-col">
              <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);" id="skill-sync-title">
                Skill Library Up to Date
              </span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);" id="skill-sync-desc">
                48 official skills installed | Last checked: Just now
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" id="btn-sync-dismiss">Dismiss</button>
          </div>
        </div>

        <!-- Category Chips -->
        <div class="flex items-center gap-2" style="overflow-x: auto; padding-bottom: var(--space-2);">
          <button class="badge badge-primary" style="cursor: pointer;">All (48)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Frontend (10)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Backend (4)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">QA & Testing (9)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Architecture (5)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Mobile (3)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Tooling (7)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Security (3)</button>
          <button class="badge badge-neutral" style="cursor: pointer;">Debugging (3)</button>
        </div>

        <!-- 3-Column Skill Grid -->
        <div class="bento-grid" id="skill-library-grid">
          ${catalog.map(skill => `
            <div class="col-4">
              ${SkillCard.render(skill)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.querySelectorAll('#skill-library-grid .card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-skill-id');
        app.navigate('skill-detail', { skillId: id });
      });
    });

    const searchInput = document.getElementById('input-skill-search');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#skill-library-grid > div').forEach(col => {
        const text = col.textContent.toLowerCase();
        col.style.display = text.includes(q) ? '' : 'none';
      });
    });

    // Item 10: Skill Sync Trigger
    document.getElementById('btn-sync-skills')?.addEventListener('click', () => {
      const panel = document.getElementById('skill-sync-status-panel');
      const title = document.getElementById('skill-sync-title');
      const desc = document.getElementById('skill-sync-desc');
      if (panel && title && desc) {
        panel.classList.remove('hidden');
        title.textContent = "Checking Skill Library...";
        desc.textContent = "Comparing local installed skills against official catalog manifest...";
        setTimeout(() => {
          title.textContent = "Skill Library Up to Date";
          desc.textContent = "48 official skills installed | Last checked: Just now (0 updates required)";
        }, 600);
      }
    });

    document.getElementById('btn-sync-dismiss')?.addEventListener('click', () => {
      document.getElementById('skill-sync-status-panel')?.classList.add('hidden');
    });
  }
};
