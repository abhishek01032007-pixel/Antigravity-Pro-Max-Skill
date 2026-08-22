/**
 * ActiveSkillsScreen.js - Active Skills for Current Project Screen (Stitch Reference)
 * Shows exactly 6 active skills with actions: View Details, Update, Deactivate.
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const ActiveSkillsScreen = {
  render(data) {
    const activeSkills = data.activeSkills;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Active Skills: Academic Day Hub",
          count: "6 Active",
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

        <!-- Table of 6 Active Skills -->
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
                    ${skill.platforms ? skill.platforms.join(', ') : 'Google Antigravity'}
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
            <span style="font-size: var(--text-meta); color: var(--color-outline);">Showing 1–6 of 6 skills</span>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm" disabled>Previous</button>
              <button class="btn btn-secondary btn-sm" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-active-add-more')?.addEventListener('click', () => app.navigate('skill-library'));
    document.getElementById('btn-active-check-updates')?.addEventListener('click', () => app.navigate('update-center'));

    document.querySelectorAll('.action-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        app.navigate('skill-detail', { skillId: id });
      });
    });

    document.querySelectorAll('.action-update').forEach(btn => {
      btn.addEventListener('click', () => {
        app.showToast("Skill is already at the latest version (v1.0.0).");
      });
    });

    document.querySelectorAll('.action-deactivate').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        app.showDeactivateModal(id, "Academic Day Hub");
      });
    });
  }
};
