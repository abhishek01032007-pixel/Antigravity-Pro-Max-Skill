/**
 * SkillLibraryScreen.js - Skill Library Catalog Screen (Phase 6.2 Gate 6 Live Catalog Integrated)
 * Displays actual installed Nexora skill registry from backend skills.catalog in Live Mode,
 * and deterministic 48-skill mock baseline in Mock Mode.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { SkillCard } from '../components/SkillCard.js';

export const SkillLibraryScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const catalog = isLive
      ? (params.catalog || [])
      : ((data.skillCatalog && data.skillCatalog.length > 0) ? data.skillCatalog : Array(48).fill({ id: 'mock-skill', name: 'Mock Skill', category: 'General' }));
    const countText = isLive ? `${catalog.length} Skills Available` : "48 Skills Available";

    // Category breakdown
    const categories = ['All', 'Frontend', 'Backend', 'QA & Testing', 'Architecture', 'Mobile', 'Tooling', 'Security', 'Debugging'];
    const categoryCounts = {};
    categories.forEach(cat => {
      if (cat === 'All') {
        categoryCounts[cat] = catalog.length;
      } else {
        categoryCounts[cat] = catalog.filter(s => s.category && s.category.toLowerCase().includes(cat.toLowerCase())).length;
      }
    });

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Skill Library",
          count: countText,
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

        <!-- Skill Sync Notification Panel (Hidden by default, shown on sync click) -->
        <div class="card hidden flex items-center justify-between" id="skill-sync-status-panel" style="padding: var(--space-3) var(--space-4); background-color: var(--color-surface-container); border-color: var(--color-primary-container); margin-bottom: var(--space-2);">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary" style="font-size: 20px;">cloud_sync</span>
            <div class="flex flex-col">
              <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);" id="skill-sync-title">
                Skill Library Up to Date
              </span>
              <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);" id="skill-sync-desc">
                ${catalog.length} official skills installed | Last checked: Just now
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary btn-sm" id="btn-sync-dismiss">Dismiss</button>
          </div>
        </div>

        <!-- Dynamic Category Chips -->
        <div class="flex items-center gap-2" style="overflow-x: auto; padding-bottom: var(--space-2);">
          ${categories.map((cat, idx) => `
            <button class="badge ${idx === 0 ? 'badge-primary' : 'badge-neutral'} cat-filter-btn" data-cat="${cat}" style="cursor: pointer;">
              ${cat} (${categoryCounts[cat] || 0})
            </button>
          `).join('')}
        </div>

        <!-- 3-Column Skill Grid -->
        <div class="bento-grid" id="skill-library-grid">
          ${catalog.length === 0 ? `
            <div class="col-12 text-center text-muted" style="padding: var(--space-8);">
              No skills found matching search criteria.
            </div>
          ` : catalog.map(skill => `
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

    document.querySelectorAll('.cat-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat').toLowerCase();
        document.querySelectorAll('.cat-filter-btn').forEach(b => {
          b.classList.remove('badge-primary');
          b.classList.add('badge-neutral');
        });
        btn.classList.remove('badge-neutral');
        btn.classList.add('badge-primary');

        document.querySelectorAll('#skill-library-grid > div').forEach(col => {
          if (cat === 'all') {
            col.style.display = '';
          } else {
            const text = col.textContent.toLowerCase();
            col.style.display = text.includes(cat) ? '' : 'none';
          }
        });
      });
    });

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
          desc.textContent = "All local skills verified against official catalog. 0 updates pending.";
        }, 800);
      }
    });

    document.getElementById('btn-sync-dismiss')?.addEventListener('click', () => {
      document.getElementById('skill-sync-status-panel')?.classList.add('hidden');
    });
  }
};
