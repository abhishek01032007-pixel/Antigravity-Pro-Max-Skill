/**
 * SkillDetailScreen.js - Clean Skill Metadata Detail View (Stitch Reference)
 * Free of invented backend fields. Shows: Name, ID, Category, Version, Status, Platforms, Purpose, Recommendation Reason, Project Usage, Dependencies, Conflicts.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const SkillDetailScreen = {
  render(data, params = {}) {
    const skillId = params.skillId || "flutter-build-responsive-layout";
    const skill = data.skillCatalog.find(s => s.id === skillId) || data.activeSkills.find(s => s.id === skillId) || {
      id: skillId,
      name: "Flutter Responsive Layout",
      category: "Frontend",
      version: "v1.0.0",
      status: "Active"
    };

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: skill.name,
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-skill-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back</span>
            </button>
            <button class="btn btn-secondary" id="btn-skill-cross-project">
              <span class="material-symbols-outlined" style="font-size: 16px;">hub</span>
              <span>Cross-Project Usage</span>
            </button>
            <button class="btn btn-destructive" id="btn-skill-deactivate">
              Deactivate
            </button>
          `
        })}

        <div class="bento-grid">
          <!-- Main Metadata Overview (8 Cols) -->
          <div class="col-8 card flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="code-pill" style="font-size: var(--text-body-sm);">${skill.id}</span>
                <span class="badge badge-primary">${skill.category}</span>
              </div>
              ${StatusBadge.render(skill.status || "Active")}
            </div>

            <div class="flex flex-col gap-2">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Overview & Purpose</h3>
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.6;">
                Guides agents in implementing adaptable, responsive layouts in Flutter apps using LayoutBuilder, MediaQuery, and Expanded/Flexible widgets across mobile, tablet, and desktop form factors.
              </p>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Recommendation Reason</h3>
              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
                Automatically recommended because Flutter SDK is declared in <span class="font-mono text-primary">pubspec.yaml</span> and multi-screen responsiveness was detected.
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
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-success);">check_circle</span>
                  <span class="code-pill">frontend_design</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3);">
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Conflicts</h3>
              <span style="font-size: var(--text-meta); color: var(--color-outline);">No known conflicts detected.</span>
            </div>

            <div class="flex flex-col gap-2" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-3); margin-top: auto;">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Project Usage: Active in 3 projects</span>
              <button class="btn btn-secondary btn-sm w-full" id="btn-skill-detail-cross">View Cross-Project Usage</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-skill-back')?.addEventListener('click', () => window.history.back());
    document.getElementById('btn-skill-cross-project')?.addEventListener('click', () => app.navigate('cross-project-usage'));
    document.getElementById('btn-skill-detail-cross')?.addEventListener('click', () => app.navigate('cross-project-usage'));
    document.getElementById('btn-skill-deactivate')?.addEventListener('click', () => {
      app.showDeactivateModal("flutter-build-responsive-layout", "Academic Day Hub");
    });
  }
};
