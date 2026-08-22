/**
 * RecommendedSkillsScreen.js - Ranked Recommended Skills Screen (Extended Phase 6.1B)
 * Enforces: Recommended != Selected != Active
 * Navigation flow: Recommended Skills Review -> AI Platform Selection (PlatformSelectionScreen.js)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { SkillCard } from '../components/SkillCard.js';

export const RecommendedSkillsScreen = {
  render(data) {
    const recommended = data.recommendedSkills;
    const state = data.state;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: `Recommended Skills for ${data.sampleProject.name}`,
          count: `${recommended.length} Suggestions`,
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-rec-add-custom">
              <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
              <span>Add Compatible Skills</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-rec-change-mode">
              <span class="material-symbols-outlined" style="font-size: 16px;">tune</span>
              <span>${state.currentWorkingMode ? 'Change Working Mode' : 'Choose Mode'}</span>
            </button>
            <button class="btn btn-primary" id="btn-rec-continue-platforms">
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
                Recommendations customized for <strong style="color: var(--color-primary);">${state.currentWorkingMode || 'Full Stack (Default)'}</strong> ${state.currentTarget ? `(${state.currentTarget})` : ''}.
              </span>
            </div>
            <span class="badge badge-neutral">Recommended != Active</span>
          </div>
        </div>

        <!-- Recalculation Loader Outlet (Hidden by default) -->
        <div id="rec-recalc-outlet" class="hidden"></div>

        <!-- Skills List -->
        <div class="flex flex-col gap-3" id="recommended-skills-list">
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
    // Add Compatible Skills Drawer Trigger (Item 5 Side Sheet)
    document.getElementById('btn-rec-add-custom')?.addEventListener('click', () => {
      app.openCatalogSideSheet();
    });

    // Change Mode Trigger
    document.getElementById('btn-rec-change-mode')?.addEventListener('click', () => {
      app.startModeSelectionWizard();
    });

    // Navigation Flow Step: Routes to PlatformSelectionScreen.js (Preserved Phase 6.1A screen)
    document.getElementById('btn-rec-continue-platforms')?.addEventListener('click', () => {
      // Gather selected skills from checkboxes
      const selected = [];
      document.querySelectorAll('.skill-select-cb:checked').forEach(cb => {
        selected.push(cb.getAttribute('data-id'));
      });
      app.data.state.selectedSkillsForActivation = selected.length > 0 ? selected : ["flutter-build-responsive-layout", "flutter-add-widget-test"];
      app.navigate('platform-selection');
    });
  }
};
