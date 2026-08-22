/**
 * DashboardScreen.js - Screen 2
 * Displays summary of registered projects, working mode, active skills,
 * detected tech stack, confidence score, and quick action cards.
 *
 * Supports both Live Production Mode (Live project list, working context, and recommendations)
 * and Mock Mode (Deterministic Phase 6.1 Academic Day Hub sample data for UI test suite).
 */
import { ProjectCard } from '../components/ProjectCard.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { InlineNotice } from '../components/InlineNotice.js';

export const DashboardScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const project = isLive ? (params.activeProject || null) : data.sampleProject;
    const allProjects = isLive ? (params.projectsList || []) : (data.allProjects || []);
    const recommendedSkills = isLive ? (params.recommendations || []) : (data.recommendedSkills || []);
    const state = data.state || {};

    const liveModeText = params.workingMode || (params.workingContext && params.workingContext.workingMode) || null;
    const liveTargetText = params.target || (params.workingContext && params.workingContext.target) || null;

    // Live Production Mode Rendering
    if (isLive) {
      if (!allProjects || allProjects.length === 0) {
        return `
          <div class="content-container flex flex-col gap-4">
            <!-- System Status Header -->
            <div class="card flex items-center justify-between" style="padding: var(--space-4) var(--space-6); border-color: var(--color-primary-container);">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined" style="font-size: 24px; color: var(--color-primary);">verified</span>
                <div>
                  <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">Nexora Desktop Engine Active</span>
                  <span class="text-muted" style="font-size: var(--text-meta); margin-left: 8px;">(0 managed projects)</span>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-dash-empty-add-project">
                <span class="material-symbols-outlined" style="font-size: 14px;">add</span>
                <span>Add Project</span>
              </button>
            </div>

            <!-- Zero-Project Empty State -->
            <div class="card flex flex-col items-center justify-center gap-3" style="padding: var(--space-8); text-align: center; border-style: dashed; border-color: var(--color-outline-variant);">
              <span class="material-symbols-outlined" style="font-size: 48px; color: var(--color-outline);">folder_off</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">No Managed Projects Yet</h3>
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); max-width: 480px;">
                Register a local project directory to enable automatic stack detection and AI skill management.
              </p>
              <button class="btn btn-primary" id="btn-dash-empty-add-project-body" style="margin-top: var(--space-2);">
                <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
                <span>+ Add First Project</span>
              </button>
            </div>
          </div>
        `;
      }

      // Live Mode with at least 1 registered project
      const activeProj = project || allProjects[0];
      return `
        <div class="content-container flex flex-col gap-4">
          <!-- Live Project Carousel -->
          <div class="flex items-center gap-3 w-full" style="overflow-x: auto; padding-bottom: var(--space-2);">
            ${allProjects.map(p => ProjectCard.render(p, p.projectId === activeProj.projectId)).join('')}
            <button class="btn btn-secondary" id="btn-dashboard-add-project" style="height: 56px; border-style: dashed; padding: 0 var(--space-4); min-width: 140px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
              <span>+ Add Project</span>
            </button>
          </div>

          <div class="bento-grid">
            <!-- Active Live Project Summary Card -->
            <div class="col-7 card flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div class="flex flex-col gap-1">
                  <h2 style="font-size: var(--text-screen-title); font-weight: 700; color: var(--color-on-surface);">${activeProj.name}</h2>
                  <div class="flex items-center gap-2">
                    <span class="badge badge-primary">${activeProj.type}</span>
                    <span class="code-pill">${activeProj.path}</span>
                  </div>
                </div>
                ${StatusBadge.render(activeProj.status)}
              </div>

              <!-- Working Context Selector Card -->
              <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container); border-color: var(--color-outline-variant);">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span style="font-size: var(--text-meta); color: var(--color-outline);">Current Working Mode:</span>
                    <span style="font-size: var(--text-body-sm); font-weight: 600; color: ${liveModeText ? 'var(--color-primary)' : 'var(--color-outline)'};">
                      ${liveModeText ? `${liveModeText} (${liveTargetText || 'Default Target'})` : 'Not Selected'}
                    </span>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-dash-choose-mode" data-project-id="${activeProj.projectId}">
                    <span class="material-symbols-outlined" style="font-size: 14px;">tune</span>
                    <span>${liveModeText ? 'Change Mode' : 'Choose Mode'}</span>
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-4); margin-top: auto;">
                <div class="flex items-center gap-2">
                  <span class="text-muted" style="font-size: var(--text-meta);">Last Analyzed: ${activeProj.lastAnalyzed || 'Never'}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn btn-secondary btn-sm" id="btn-dash-analyze-live" data-path="${activeProj.path}">Re-Analyze Project</button>
                  <button class="btn btn-danger btn-sm" id="btn-dash-remove-live" data-id="${activeProj.projectId}">Remove Project</button>
                </div>
              </div>
            </div>

            <!-- Live Recommended Skills Card -->
            <div class="col-5 card flex flex-col gap-3">
              <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--color-outline-variant); padding-bottom: var(--space-2);">
                <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Recommended Skills</h3>
                <span class="badge badge-warning">${recommendedSkills.length} Available</span>
              </div>

              <div class="flex flex-col gap-2">
                ${recommendedSkills.length === 0 ? `
                  <span class="text-muted" style="font-size: var(--text-body-sm); padding: var(--space-4) 0; text-align: center;">No skill recommendations for current stack/context</span>
                ` : recommendedSkills.slice(0, 3).map(skill => `
                  <div class="card flex items-center justify-between" style="padding: var(--space-2) var(--space-3); border-color: var(--color-outline-variant);">
                    <div class="flex items-center gap-2">
                      <span class="code-pill">${skill.skillId || skill.id}</span>
                    </div>
                    <span style="font-size: var(--text-meta); font-weight: bold; color: var(--color-primary);">Score: ${skill.matchScore}</span>
                  </div>
                `).join('')}
              </div>

              <button class="btn btn-primary w-full" id="btn-dash-activate-rec" style="margin-top: auto;">
                Review Recommendations <span class="material-symbols-outlined" style="font-size: 14px;">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Mock Mode Rendering (Deterministic Phase 6.1 test baseline)
    return `
      <div class="content-container">
        ${state.isOffline ? InlineNotice.renderOfflineBanner() : ''}
        ${state.appUpdateAvailable && !state.updateDismissed ? InlineNotice.renderUpdateAvailableBanner("v1.1.0") : ''}

        <div class="flex items-center gap-3 w-full" style="overflow-x: auto; padding-bottom: var(--space-2);">
          ${allProjects.map(p => ProjectCard.render(p, p.selected)).join('')}
          <button class="btn btn-secondary" id="btn-dashboard-add-project" style="height: 56px; border-style: dashed; padding: 0 var(--space-4); min-width: 140px;">
            <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
            <span>+ Add Project</span>
          </button>
        </div>

        <div class="bento-grid">
          <div class="col-7 card flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col gap-1">
                <h2 style="font-size: var(--text-screen-title); font-weight: 700; color: var(--color-on-surface);">${project.name}</h2>
                <div class="flex items-center gap-2">
                  <span class="badge badge-primary">${project.type}</span>
                  <span class="badge badge-neutral">${project.frontend[0]}</span>
                </div>
              </div>

              <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-surface-variant)" stroke-width="3.5"></path>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-primary)" stroke-dasharray="96, 100" stroke-linecap="round" stroke-width="3.5"></path>
                </svg>
                <span style="position: absolute; font-size: var(--text-body-sm); font-weight: 700; color: var(--color-on-surface);">96%</span>
              </div>
            </div>

            <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container); border-color: var(--color-outline-variant);">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span style="font-size: var(--text-meta); color: var(--color-outline);">Current Working Mode:</span>
                  <span style="font-size: var(--text-body-sm); font-weight: 600; color: ${state.currentWorkingMode ? 'var(--color-primary)' : 'var(--color-outline)'};">
                    ${state.currentWorkingMode ? `${state.currentWorkingMode} (${state.currentTarget || 'Default'})` : 'Not Selected'}
                  </span>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-dash-choose-mode">
                  <span class="material-symbols-outlined" style="font-size: 14px;">tune</span>
                  <span>${state.currentWorkingMode ? 'Change Mode' : 'Choose Mode'}</span>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-4); margin-top: auto;">
              <div class="flex items-center gap-2">
                ${StatusBadge.render(project.status)}
              </div>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary btn-sm" id="btn-dash-analyze">Analyze Project</button>
                <button class="btn btn-primary btn-sm" id="btn-dash-open-folder">Open Folder</button>
              </div>
            </div>
          </div>

          <div class="col-5 card flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Active Skills Summary</h3>
              <button class="btn-ghost" id="btn-dash-view-active-skills"><span class="material-symbols-outlined">more_horiz</span></button>
            </div>

            <div class="flex items-baseline gap-2">
              <span style="font-size: 40px; font-weight: 700; line-height: 1; color: var(--color-primary);">6</span>
              <span style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">Total Active</span>
            </div>

            <div class="flex flex-col gap-2" style="margin-top: auto;">
              <div class="flex flex-col gap-1">
                <div class="flex justify-between text-muted" style="font-size: var(--text-meta);">
                  <span>Frontend</span>
                  <span>2</span>
                </div>
                <div style="width: 100%; height: 4px; background: var(--color-surface-variant); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: 33.3%; height: 100%; background: var(--color-primary-accent);"></div>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <div class="flex justify-between text-muted" style="font-size: var(--text-meta);">
                  <span>QA / Testing</span>
                  <span>2</span>
                </div>
                <div style="width: 100%; height: 4px; background: var(--color-surface-variant); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: 33.3%; height: 100%; background: var(--color-warning);"></div>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <div class="flex justify-between text-muted" style="font-size: var(--text-meta);">
                  <span>Architecture</span>
                  <span>1</span>
                </div>
                <div style="width: 100%; height: 4px; background: var(--color-surface-variant); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: 16.6%; height: 100%; background: var(--color-primary);"></div>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <div class="flex justify-between text-muted" style="font-size: var(--text-meta);">
                  <span>Tooling</span>
                  <span>1</span>
                </div>
                <div style="width: 100%; height: 4px; background: var(--color-surface-variant); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: 16.6%; height: 100%; background: var(--color-secondary);"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-6 card flex flex-col gap-3">
            <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--color-outline-variant); padding-bottom: var(--space-2);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Detected Technologies</h3>
              <span class="material-symbols-outlined" style="color: var(--color-outline); font-size: 16px;">memory</span>
            </div>

            <div class="flex flex-col">
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Languages</span>
                <span class="code-pill">Dart</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Frontend</span>
                <span class="code-pill">Flutter</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Backend</span>
                <span class="code-pill">Supabase</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Database</span>
                <span class="code-pill">PostgreSQL</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">QA / Testing</span>
                <div class="flex gap-1">
                  <span class="code-pill">Flutter Test</span>
                  <span class="code-pill">Dart Analyzer</span>
                </div>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0;">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Tooling</span>
                <div class="flex gap-1">
                  <span class="code-pill">Flutter CLI</span>
                  <span class="code-pill">Gradle</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-6 card flex flex-col gap-3">
            <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--color-outline-variant); padding-bottom: var(--space-2);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Recommended Skills</h3>
              <span class="badge badge-warning">3 Available</span>
            </div>

            <div class="flex flex-col gap-2">
              ${recommendedSkills.slice(0, 3).map(skill => `
                <label class="card card-clickable flex items-center justify-between" style="padding: var(--space-2) var(--space-3); border-color: var(--color-outline-variant);">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" class="checkbox-custom" ${skill.preselected ? 'checked' : ''}>
                    <span class="code-pill">${skill.id}</span>
                  </div>
                  <span style="font-size: var(--text-meta); font-weight: bold; color: var(--color-primary);">${skill.matchScore}% Match</span>
                </label>
              `).join('')}
            </div>

            <button class="btn btn-primary w-full" id="btn-dash-activate-rec" style="margin-top: auto;">
              Review Recommendations <span class="material-symbols-outlined" style="font-size: 14px;">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    const handleAdd = () => app.navigate('add-project');
    document.getElementById('btn-dashboard-add-project')?.addEventListener('click', handleAdd);
    document.getElementById('btn-dash-empty-add-project')?.addEventListener('click', handleAdd);
    document.getElementById('btn-dash-empty-add-project-body')?.addEventListener('click', handleAdd);

    document.getElementById('btn-dash-analyze')?.addEventListener('click', () => app.navigate('project-analysis'));
    document.getElementById('btn-dash-view-active-skills')?.addEventListener('click', () => app.navigate('active-skills'));
    document.getElementById('btn-dash-activate-rec')?.addEventListener('click', () => app.navigate('recommended-skills'));

    document.getElementById('btn-dash-choose-mode')?.addEventListener('click', () => app.startModeSelectionWizard());

    // Live Removal Handler
    document.getElementById('btn-dash-remove-live')?.addEventListener('click', async (e) => {
      const projId = e.currentTarget.getAttribute('data-id');
      if (projId && confirm('Remove this project from Nexora Managed Registry? (Source files remain 100% untouched)')) {
        const res = await app.data.removeProject(projId);
        if (res.success) {
          app.showToast('Project removed from Nexora registry.');
          app.navigate('dashboard');
        } else {
          app.showToast(`Failed to remove project: ${(res.error && res.error.message) || 'Unknown error'}`);
        }
      }
    });

    // Live Analysis Handler
    document.getElementById('btn-dash-analyze-live')?.addEventListener('click', async (e) => {
      const path = e.currentTarget.getAttribute('data-path');
      if (path) {
        app.navigate('project-analysis', { path });
      }
    });
  }
};
