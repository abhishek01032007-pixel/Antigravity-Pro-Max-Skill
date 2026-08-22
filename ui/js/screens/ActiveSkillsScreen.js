/**
 * ActiveSkillsScreen.js - Active Skills for Current Project Screen (Phase 6.2 Gate 6 Live Active Skills Integrated)
 * Displays actual activated skills for current project from skills.active IPC response.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const ActiveSkillsScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const activeSkills = isLive ? (params.activeSkills || []) : (data.activeSkills || []);
    const projName = isLive ? ((params.activeProject && params.activeProject.name) || 'Current Project') : 'Academic Day Hub';

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: `Active Skills: ${projName}`,
          count: `${activeSkills.length} Active`,
          actionsHtml: `
            <button class="btn btn-secondary btn-sm" id="btn-active-check-updates">
              <span class="material-symbols-outlined" style="font-size: 16px;">update</span>
              <span>Check Updates</span>
            </button>
            <button class="btn btn-primary" id="btn-active-add-more">
              <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
              <span>Add More Skills</span>
            </button>
          `
        })}

        ${activeSkills.length === 0 ? `
          <!-- Zero Active Skills Empty State -->
          <div class="card flex flex-col items-center justify-center gap-3" style="padding: var(--space-8); text-align: center; border-style: dashed; border-color: var(--color-outline-variant);">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--color-outline);">verified_user</span>
            <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">No Active Skills for ${projName}</h3>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); max-width: 480px;">
              Select recommended skills or browse the skill library to activate AI capabilities for your project workspace.
            </p>
            <button class="btn btn-primary" id="btn-active-empty-browse" style="margin-top: var(--space-2);">
              <span class="material-symbols-outlined" style="font-size: 16px;">auto_awesome</span>
              <span>Review Recommendations</span>
            </button>
          </div>
        ` : `
          <!-- Table of Active Skills -->
          <div class="card" style="padding: 0; overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Skill ID</th>
                  <th>Skill Name</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Platforms</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${activeSkills.map(skill => `
                  <tr data-skill-id="${skill.id}">
                    <td><span class="code-pill">${skill.id}</span></td>
                    <td style="font-weight: 600;">${skill.name}</td>
                    <td><span class="badge badge-neutral">${skill.category}</span></td>
                    <td><span class="code-pill">${skill.version}</span></td>
                    <td>${StatusBadge.render(skill.status)}</td>
                    <td style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
                      ${skill.platforms ? (Array.isArray(skill.platforms) ? skill.platforms.join(', ') : skill.platforms) : 'Google Antigravity'}
                    </td>
                    <td style="text-align: right;">
                      <div class="flex items-center justify-between gap-1" style="justify-content: flex-end;">
                        <button class="btn btn-secondary btn-sm action-view-detail" data-id="${skill.id}">View Details</button>
                        <button class="btn btn-secondary btn-sm action-update" data-id="${skill.id}">Update</button>
                        <button class="btn btn-destructive btn-sm action-deactivate" data-id="${skill.id}">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="flex items-center justify-between" style="padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container);">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Showing 1–${activeSkills.length} of ${activeSkills.length} skills</span>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary btn-sm" disabled>Previous</button>
                <button class="btn btn-secondary btn-sm" disabled>Next</button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-active-add-more')?.addEventListener('click', () => app.navigate('skill-library'));
    document.getElementById('btn-active-empty-browse')?.addEventListener('click', () => app.navigate('recommended-skills'));
    document.getElementById('btn-active-check-updates')?.addEventListener('click', () => app.navigate('update-center'));

    document.querySelectorAll('.action-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        app.navigate('skill-detail', { skillId: id });
      });
    });

    document.querySelectorAll('.action-update').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        app.showSkillUpdateModal(id);
      });
    });

    document.querySelectorAll('.action-deactivate').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const activeProjName = (app.viewParams && app.viewParams.activeProject && app.viewParams.activeProject.name) || "Current Project";
        app.showDeactivateModal(id, activeProjName);
      });
    });
  }
};
