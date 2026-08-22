/**
 * PlatformSelectionScreen.js - Supported AI Platform Selection Screen (Phase 6.2 Gate 6 Integrated)
 * Supported public platform IDs: antigravity, cursor, copilot.
 * Connects to: Activation Confirmation Dialog
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { PlatformCard } from '../components/PlatformCard.js';

export const PlatformSelectionScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const platforms = isLive ? (params.platforms || []) : (data.platforms || []);
    const savedPrefs = params.savedPlatforms || (data.state && data.state.selectedPlatforms) || ['antigravity', 'cursor'];
    const selectedSkillIds = params.selectedSkillIds || (data.state && data.state.selectedSkillIds) || [];

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "AI Platform Integration",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-plat-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back</span>
            </button>
            <button class="btn btn-primary" id="btn-save-platforms" ${selectedSkillIds.length === 0 ? 'disabled' : ''}>
              <span class="material-symbols-outlined" style="font-size: 16px;">verified</span>
              <span>Proceed to Activation Confirmation</span>
            </button>
          `
        })}

        <div class="card" style="padding: var(--space-4); background-color: rgba(99, 102, 241, 0.08); border-color: var(--color-primary-container);">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">hub</span>
              <span style="font-size: var(--text-body-sm); color: var(--color-on-surface);">
                Select the AI code assistants you use with your projects. Nexora will deploy active skills to the appropriate workspace formats.
              </span>
            </div>
            <span class="badge badge-primary">${selectedSkillIds.length} Skills Selected</span>
          </div>
        </div>

        <div class="bento-grid">
          ${platforms.map(p => {
            const isChecked = savedPrefs.includes(p.id) || savedPrefs.includes(p.name);
            return `
              <div class="col-4">
                ${PlatformCard.render(p, isChecked)}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-plat-back')?.addEventListener('click', () => app.navigate('recommended-skills'));

    const updateProceedBtn = () => {
      const checkedCbs = document.querySelectorAll('.platform-cb:checked');
      const proceedBtn = document.getElementById('btn-save-platforms');
      if (proceedBtn) {
        proceedBtn.disabled = checkedCbs.length === 0;
      }
    };

    document.querySelectorAll('.platform-cb').forEach(cb => {
      cb.addEventListener('change', updateProceedBtn);
    });

    document.getElementById('btn-save-platforms')?.addEventListener('click', async () => {
      const selectedPlatformIds = [];
      const selectedPlatformNames = [];
      document.querySelectorAll('.platform-cb:checked').forEach(cb => {
        const id = cb.getAttribute('data-id');
        selectedPlatformIds.push(id);
        const plat = (app.viewParams && app.viewParams.platforms) ? app.viewParams.platforms.find(p => p.id === id) : null;
        selectedPlatformNames.push(plat ? plat.name : id);
      });

      if (selectedPlatformIds.length === 0) return;

      if (app.data.isLiveMode && app.data.setPlatformPreferences) {
        await app.data.setPlatformPreferences(null, selectedPlatformIds);
      }

      app.data.state.selectedPlatforms = selectedPlatformNames;
      app.data.state.selectedPlatformIds = selectedPlatformIds;

      app.showActivationConfirmationModal();
    });
  }
};
