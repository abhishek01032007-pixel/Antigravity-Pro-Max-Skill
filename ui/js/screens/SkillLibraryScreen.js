/**
 * SkillLibraryScreen.js - Universal 48-Skill Library Catalog Screen (Stitch Reference)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { SkillCard } from '../components/SkillCard.js';

export const SkillLibraryScreen = {
  render(data) {
    const catalog = data.skillCatalog;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Skill Library",
          count: "48 Skills Available",
          actionsHtml: `
            <div class="flex items-center gap-2">
              <input type="text" class="input-text" id="input-skill-search" placeholder="Search skills by name, ID, or stack..." style="width: 280px;">
              <button class="btn btn-secondary" id="btn-library-filter">
                <span class="material-symbols-outlined" style="font-size: 16px;">filter_list</span>
                <span>Filters</span>
              </button>
            </div>
          `
        })}

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
  }
};
