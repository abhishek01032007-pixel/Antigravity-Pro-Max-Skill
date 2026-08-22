/**
 * CrossProjectUsageScreen.js - Cross-Project Skill Usage Screen (Stitch Reference)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const CrossProjectUsageScreen = {
  render(data) {
    const allProjects = data.allProjects;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Cross-Project Usage: flutter-build-responsive-layout",
          count: "3 Projects",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-cross-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back</span>
            </button>
            <button class="btn btn-destructive" id="btn-cross-remove-all">
              <span class="material-symbols-outlined" style="font-size: 16px;">delete_sweep</span>
              <span>Remove From All Projects</span>
            </button>
          `
        })}

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
              ${allProjects.map(p => `
                <tr>
                  <td style="font-weight: 600;">${p.name}</td>
                  <td><span class="badge badge-neutral">${p.type}</span></td>
                  <td><span class="code-pill">${p.path}</span></td>
                  <td>${StatusBadge.render("Active")}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-destructive btn-sm action-deactivate-single" data-project="${p.name}">Deactivate</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-cross-back')?.addEventListener('click', () => app.navigate('skill-library'));
    document.getElementById('btn-cross-remove-all')?.addEventListener('click', () => {
      app.showRemoveAllModal("flutter-build-responsive-layout", app.data.allProjects);
    });

    document.querySelectorAll('.action-deactivate-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const projectName = btn.getAttribute('data-project');
        app.showDeactivateModal("flutter-build-responsive-layout", projectName);
      });
    });
  }
};
