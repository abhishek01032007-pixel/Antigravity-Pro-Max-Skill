/**
 * DashboardScreen.js - Main Dashboard Screen (Extended with Phase 6.1B Workflows)
 * Locked Sample: Academic Day Hub (Flutter / Supabase / PostgreSQL, 96% confidence, 6 active skills)
 */
import { ProjectCard } from '../components/ProjectCard.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { InlineNotice } from '../components/InlineNotice.js';

export const DashboardScreen = {
  render(data) {
    const project = data.sampleProject;
    const allProjects = data.allProjects;
    const recommendedSkills = data.recommendedSkills;
    const state = data.state;

    return `
      <div class="content-container">
        <!-- Top Banner Notices (Offline / Update) -->
        ${state.isOffline ? InlineNotice.renderOfflineBanner() : ''}
        ${state.appUpdateAvailable && !state.updateDismissed ? InlineNotice.renderUpdateAvailableBanner("v1.1.0") : ''}

        <!-- Top: Project Carousel Slider -->
        <div class="flex items-center gap-3 w-full" style="overflow-x: auto; padding-bottom: var(--space-2);">
          ${allProjects.map(p => ProjectCard.render(p, p.selected)).join('')}
          <button class="btn btn-secondary" id="btn-dashboard-add-project" style="height: 56px; border-style: dashed; padding: 0 var(--space-4); min-width: 140px;">
            <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
            <span>+ Add Project</span>
          </button>
        </div>

        <!-- Bento Grid Layout -->
        <div class="bento-grid">
          <!-- Top Left: Current Project Overview (7 Cols) -->
          <div class="col-7 card flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col gap-1">
                <h2 style="font-size: var(--text-screen-title); font-weight: 700; color: var(--color-on-surface);">${project.name}</h2>
                <div class="flex items-center gap-2">
                  <span class="badge badge-primary">${project.type}</span>
                  <span class="badge badge-neutral">${project.frontend[0]}</span>
                </div>
              </div>

              <!-- 96% Confidence Ring SVG Gauge -->
              <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-surface-variant)" stroke-width="3.5"></path>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-primary)" stroke-dasharray="96, 100" stroke-linecap="round" stroke-width="3.5"></path>
                </svg>
                <span style="position: absolute; font-size: var(--text-body-sm); font-weight: 700; color: var(--color-on-surface);">96%</span>
              </div>
            </div>

            <!-- Working Mode Badge & Selector Panel (Domain Rule Preserved) -->
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

          <!-- Top Right: Active Skills Summary (5 Cols) - Exactly 6 Active Skills -->
          <div class="col-5 card flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Active Skills Summary</h3>
              <button class="btn-ghost" id="btn-dash-view-active-skills"><span class="material-symbols-outlined">more_horiz</span></button>
            </div>

            <div class="flex items-baseline gap-2">
              <span style="font-size: 40px; font-weight: 700; line-height: 1; color: var(--color-primary);">6</span>
              <span style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">Total Active</span>
            </div>

            <!-- Category distribution bars for 6 skills: 2 Frontend, 2 QA, 1 Architecture, 1 Tooling -->
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

          <!-- Bottom Left: Detected Technologies (6 Cols) -->
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

          <!-- Bottom Right: Recommended Skills Preview (6 Cols) -->
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
    document.getElementById('btn-dashboard-add-project')?.addEventListener('click', () => app.navigate('add-project'));
    document.getElementById('btn-dash-analyze')?.addEventListener('click', () => app.navigate('project-analysis'));
    document.getElementById('btn-dash-view-active-skills')?.addEventListener('click', () => app.navigate('active-skills'));
    document.getElementById('btn-dash-activate-rec')?.addEventListener('click', () => app.navigate('recommended-skills'));

    // Working Mode Selection Trigger (Item 1 / 3)
    document.getElementById('btn-dash-choose-mode')?.addEventListener('click', () => {
      app.startModeSelectionWizard();
    });

    // Offline Banner Handlers
    document.getElementById('btn-offline-retry')?.addEventListener('click', () => {
      app.data.state.isOffline = false;
      app.showToast("Connection restored. Online services active.");
      app.navigate('dashboard');
    });

    document.getElementById('btn-offline-dismiss')?.addEventListener('click', () => {
      document.getElementById('offline-notice-banner')?.remove();
    });

    // Update Banner Handlers
    document.getElementById('btn-banner-download-update')?.addEventListener('click', () => {
      app.startAppUpdateFlow();
    });

    document.getElementById('btn-banner-dismiss-update')?.addEventListener('click', () => {
      app.data.state.updateDismissed = true;
      document.getElementById('app-update-banner')?.remove();
    });
  }
};
