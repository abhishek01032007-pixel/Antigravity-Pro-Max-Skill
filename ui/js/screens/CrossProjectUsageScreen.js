/**
 * CrossProjectUsageScreen.js - Cross-Project Skill Usage Screen (Phase 6.2 Gate 7 Integrated)
 * Displays live usage across registered managed projects from skills.usage IPC response.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const CrossProjectUsageScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const skillId = params.skillId || (params.usage && params.usage.skillId) || "flutter-build-responsive-layout";
    const usage = isLive ? (params.usage || { skillId, projectCount: 0, projects: [] }) : {
      skillId,
      projectCount: (data.allProjects || []).length,
      projects: data.allProjects || []
    };

    const projects = usage.projects || [];
    const countText = `${projects.length} Projects`;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: `Cross-Project Usage: ${skillId}`,
          count: countText,
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-cross-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back</span>
            </button>
            <button class="btn btn-destructive" id="btn-cross-remove-all" data-skill="${skillId}" ${projects.length === 0 ? 'disabled' : ''}>
              <span class="material-symbols-outlined" style="font-size: 16px;">delete_sweep</span>
              <span>Remove From All Projects</span>
            </button>
          `
        })}

        ${projects.length === 0 ? `
          <!-- Zero Usage Empty State -->
          <div class="card flex flex-col items-center justify-center gap-3" style="padding: var(--space-8); text-align: center; border-style: dashed; border-color: var(--color-outline-variant);">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--color-outline);">check_circle</span>
            <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Not Active in Any Managed Project</h3>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); max-width: 480px;">
              The skill <code class="code-pill">${skillId}</code> is currently not active in any registered project workspace.
            </p>
            <button class="btn btn-secondary" id="btn-cross-back-empty" style="margin-top: var(--space-2);">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Return to Skill Library</span>
            </button>
          </div>
        ` : `
          <!-- Usage Table -->
          <div class="card" style="padding: 0; overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Type</th>
                  <th>Path</th>
                  <th>Skill Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${projects.map(p => `
                  <tr data-project-id="${p.projectId || p.id}">
                    <td style="font-weight: 600;">${p.name}</td>
                    <td><span class="badge badge-neutral">${p.type || 'Managed Project'}</span></td>
                    <td><span class="code-pill">${p.path}</span></td>
                    <td>${StatusBadge.render("Active")}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-destructive btn-sm action-deactivate-single" data-skill="${skillId}" data-project="${p.name}" data-project-id="${p.projectId || p.id}">
                        Deactivate
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-cross-back')?.addEventListener('click', () => window.history.back());
    document.getElementById('btn-cross-back-empty')?.addEventListener('click', () => app.navigate('skill-library'));

    document.getElementById('btn-cross-remove-all')?.addEventListener('click', (e) => {
      const skillId = e.currentTarget.getAttribute('data-skill');
      app.startGlobalRemovalFlow(skillId);
    });

    document.querySelectorAll('.action-deactivate-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const skillId = btn.getAttribute('data-skill');
        const projectName = btn.getAttribute('data-project');
        const projectId = btn.getAttribute('data-project-id');
        app.showDeactivateModal(skillId, projectName, projectId);
      });
    });
  }
};
