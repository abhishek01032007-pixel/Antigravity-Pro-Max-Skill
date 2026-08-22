/**
 * RecommendedSkillsScreen.js - Ranked Recommended Skills Screen (Phase 6.2 Gate 6 Integrated)
 * Enforces: Recommended != Selected != Active
 * Navigation flow: Recommended Skills Review -> AI Platform Selection (PlatformSelectionScreen.js)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { SkillCard } from '../components/SkillCard.js';

export const RecommendedSkillsScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const recommended = isLive ? (params.recommendations || []) : (data.recommendedSkills || []);
    const state = data.state || {};
    const projName = isLive ? ((params.activeProject && params.activeProject.name) || 'Current Project') : (data.sampleProject ? data.sampleProject.name : 'Project');
    const selectedIds = state.selectedSkillIds || [];

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: `Recommended Skills for ${projName}`,
          count: `${recommended.length} Suggestions`,
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-rec-add-custom">
              <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
              <span>Add Compatible Skills</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-rec-change-mode">
              <span class="material-symbols-outlined" style="font-size: 16px;">tune</span>
              <span>${params.workingMode ? 'Change Working Mode' : 'Choose Mode'}</span>
            </button>
            <button class="btn btn-primary" id="btn-rec-continue-platforms" ${selectedIds.length === 0 ? 'disabled' : ''}>
              <span>Activate Selected / Choose AI Platforms</span>
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
            </button>
          `
        })}

        <!-- Working Mode & Context Indicator -->
        <div class="card" style="padding: var(--space-4); background-color: rgba(99, 102, 241, 0.08); border-color: var(--color-primary-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">info</span>
              <span style="font-size: var(--text-body-sm); color: var(--color-on-surface);">
                Recommendations customized for <strong style="color: var(--color-primary);">${params.workingMode || state.currentWorkingMode || 'Full Stack (Default)'}</strong> ${params.target || state.currentTarget ? `(${params.target || state.currentTarget})` : ''}.
              </span>
            </div>
            <span class="badge badge-neutral">Recommended != Active</span>
          </div>
        </div>

        <!-- Recalculation Loader Outlet (Hidden by default) -->
        <div id="rec-recalc-outlet" class="hidden"></div>

        <!-- Skills List -->
        <div class="flex flex-col gap-3" id="recommended-skills-list">
          ${recommended.length === 0 ? `
            <div class="card text-center text-muted" style="padding: var(--space-8);">
              No recommended skills for current context. You can browse the complete Skill Library to add skills manually.
            </div>
          ` : recommended.map(skill => {
            const isSelected = selectedIds.includes(skill.id || skill.skillId);
            return SkillCard.render(skill, {
              showCheckbox: true,
              isSelected,
              matchScore: skill.matchScore,
              reason: skill.matchReason || skill.reason
            });
          }).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-rec-change-mode')?.addEventListener('click', () => app.startModeSelectionWizard());
    document.getElementById('btn-rec-add-custom')?.addEventListener('click', () => app.navigate('skill-library'));

    const updateContinueBtn = () => {
      const checkedSkillIds = [];
      document.querySelectorAll('#recommended-skills-list .skill-select-cb:checked').forEach(cb => {
        const id = cb.getAttribute('data-id');
        checkedSkillIds.push(id);
      });
      app.data.state.selectedSkillIds = checkedSkillIds;
      const btn = document.getElementById('btn-rec-continue-platforms');
      if (btn) btn.disabled = checkedSkillIds.length === 0;
    };

    document.querySelectorAll('#recommended-skills-list .skill-select-cb').forEach(cb => {
      cb.addEventListener('change', updateContinueBtn);
    });

    document.getElementById('btn-rec-continue-platforms')?.addEventListener('click', () => {
      const selectedSkillIds = app.data.state.selectedSkillIds || [];
      if (selectedSkillIds.length > 0) {
        app.navigate('platform-selection', { selectedSkillIds });
      }
    });

    document.querySelectorAll('#recommended-skills-list .card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-skill-id');
        app.navigate('skill-detail', { skillId: id });
      });
    });
  }
};
