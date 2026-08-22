/**
 * RecommendedSkillsScreen.js - Ranked Recommended Skills Screen (Stitch Reference)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { SkillCard } from '../components/SkillCard.js';

export const RecommendedSkillsScreen = {
  render(data) {
    const recommended = data.recommendedSkills;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Recommended Skills for Academic Day Hub",
          count: `${recommended.length} Suggestions`,
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-rec-select-all">Select All</button>
            <button class="btn btn-primary" id="btn-rec-activate">
              <span class="material-symbols-outlined" style="font-size: 16px;">bolt</span>
              <span>Activate Selected (2)</span>
            </button>
          `
        })}

        <div class="card" style="padding: var(--space-4); background-color: rgba(99, 102, 241, 0.08); border-color: var(--color-primary-container);">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">info</span>
            <span style="font-size: var(--text-body-sm); color: var(--color-on-surface);">
              Recommendations are generated based on the detected Flutter, Supabase, and Dart stack. Selected skills will be activated upon your confirmation.
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          ${recommended.map(skill => SkillCard.render(skill, {
            showCheckbox: true,
            isSelected: skill.preselected,
            matchScore: skill.matchScore,
            reason: skill.reason
          })).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-rec-activate')?.addEventListener('click', () => {
      app.showToast("Skills activation confirmed for Academic Day Hub.");
      app.navigate('active-skills');
    });
  }
};
