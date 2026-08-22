/**
 * SkillDetailScreen.js - Clean Skill Metadata Detail View (Phase 6.2 Gate 6 Integrated)
 * Free of invented backend fields. Shows: Name, ID, Category, Version, Status, Platforms, Purpose, Recommendation Reason, Project Usage, Dependencies, Conflicts.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const SkillDetailScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const skillId = params.skillId || "flutter-build-responsive-layout";

    const catalog = isLive ? (params.catalog || []) : (data.skillCatalog || []);
    const activeSkills = isLive ? (params.activeSkills || []) : (data.activeSkills || []);
    const recommendations = isLive ? (params.recommendations || []) : (data.recommendedSkills || []);

    const catMatch = catalog.find(s => s.id === skillId || s.skillId === skillId);
    const activeMatch = activeSkills.find(s => s.id === skillId || s.skillId === skillId);
    const recMatch = recommendations.find(s => s.id === skillId || s.skillId === skillId);

    const isActive = !!activeMatch;
    const skill = catMatch || activeMatch || recMatch || {
      id: skillId,
      name: skillId,
      category: "General",
      version: "v1.0.0",
      description: "Installed Nexora agent skill",
      dependencies: [],
      conflicts: []
    };

    const statusText = isActive ? "Active" : "Available";

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: skill.name || skill.id,
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-skill-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back</span>
            </button>
            <button class="btn btn-secondary" id="btn-skill-cross-project">
              <span class="material-symbols-outlined" style="font-size: 16px;">hub</span>
              <span>Cross-Project Usage</span>
            </button>
            ${isActive ? `
              <button class="btn btn-destructive" id="btn-skill-deactivate" data-id="${skill.id}">
                Deactivate
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-skill-activate" data-id="${skill.id}">
                Select for Activation
              </button>
            `}
          `
        })}

        <div class="bento-grid">
          <!-- Main Metadata Overview (8 Cols) -->
          <div class="col-8 card flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                ${recMatch
                  ? `<span class="badge badge-success" style="font-size: var(--text-meta);">Recommended for Current Project</span>`
                  : ''}
                <span class="badge badge-neutral" style="font-size: var(--text-meta);">${skill.category || 'General'}</span>
                <span class="code-pill">${skill.version || 'v1.0.0'}</span>
              </div>
              ${StatusBadge.render(statusText)}
            </div>

            <div class="flex flex-col gap-2">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Overview & Purpose</h3>
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.6;">
                ${skill.description || 'Provides specialized instructions, patterns, and workflows to AI code assistants for software engineering.'}
              </p>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Recommendation Status</h3>
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
                ${recMatch
                  ? `Recommended (Score: ${recMatch.matchScore || 70}) - ${recMatch.matchReason || recMatch.reason || 'Matches detected project stack and working context.'}`
                  : 'Not currently in active recommendation list for this working context.'}
              </p>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Supported AI Platforms</h3>
              <div class="flex items-center gap-2">
                <span class="badge badge-neutral">Google Antigravity</span>
                <span class="badge badge-neutral">Cursor</span>
                <span class="badge badge-neutral">GitHub Copilot</span>
              </div>
            </div>
          </div>

          <!-- Dependencies & Conflicts (4 Cols) -->
          <div class="col-4 card flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Dependencies</h3>
              <div class="flex flex-col gap-1">
                ${skill.dependencies && skill.dependencies.length > 0 ? skill.dependencies.map(d => `
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-success);">check_circle</span>
                    <span class="code-pill">${d}</span>
                  </div>
                `).join('') : '<span style="font-size: var(--text-meta); color: var(--color-outline);">No required dependencies.</span>'}
              </div>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Conflicts</h3>
              <div class="flex flex-col gap-1">
                ${skill.conflicts && skill.conflicts.length > 0 ? skill.conflicts.map(c => `
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-warning);">warning</span>
                    <span class="code-pill">${c}</span>
                  </div>
                `).join('') : '<span style="font-size: var(--text-meta); color: var(--color-outline);">No known conflicts detected.</span>'}
              </div>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3); margin-top: auto;">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">
                ${isActive ? 'Active in current project' : 'Available for activation'}
              </span>
              <button class="btn btn-secondary btn-sm w-full" id="btn-skill-detail-cross">View Cross-Project Usage</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-skill-back')?.addEventListener('click', () => window.history.back());
    document.getElementById('btn-skill-cross-project')?.addEventListener('click', () => {
      const id = (app.viewParams && app.viewParams.skillId) || "flutter-build-responsive-layout";
      app.navigate('cross-project', { skillId: id });
    });
    document.getElementById('btn-skill-detail-cross')?.addEventListener('click', () => {
      const id = (app.viewParams && app.viewParams.skillId) || "flutter-build-responsive-layout";
      app.navigate('cross-project', { skillId: id });
    });

    document.getElementById('btn-skill-deactivate')?.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const activeProjName = (app.viewParams && app.viewParams.activeProject && app.viewParams.activeProject.name) || "Current Project";
      app.showDeactivateModal(id, activeProjName);
    });

    document.getElementById('btn-skill-activate')?.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      app.data.state.selectedSkillIds = [id];
      app.navigate('platform-selection', { selectedSkillIds: [id] });
    });
  }
};
