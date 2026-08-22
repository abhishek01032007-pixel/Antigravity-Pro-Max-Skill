/**
 * AddProjectScreen.js - Add Local Project Screen (Extended Phase 6.1B)
 * Frozen directory flow + Item 8 Validation & Item 12 Lifecycle Edge Cases
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const AddProjectScreen = {
  render() {
    return `
      <div class="content-container" style="max-width: 680px;">
        ${SectionHeader.render({
          title: "Add Project to Nexora",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-add-proj-cancel-top">Cancel</button>
          `
        })}

        <div class="card flex flex-col gap-6" style="padding: var(--space-6);">
          <!-- Directory Selection -->
          <div class="flex flex-col gap-2">
            <label style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
              Select Local Directory
            </label>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Choose an existing project folder on your local system to register with Nexora.
            </p>
            <div class="flex items-center gap-2" style="margin-top: var(--space-1);">
              <input type="text" class="input-text font-mono" id="input-project-path" value="D:\\Projects\\academic_day_hub">
              <button class="btn btn-secondary" id="btn-browse-folder" style="flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 16px;">folder_open</span>
                <span>Browse Folder</span>
              </button>
            </div>
          </div>

          <!-- Project Preview Card & Validation State (Item 8) -->
          <div class="card" id="project-preview-card" style="background-color: var(--color-surface-container); padding: var(--space-4); border-color: var(--color-outline-variant);">
            <h4 style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-primary); margin-bottom: var(--space-3);">
              Project Preview
            </h4>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Project:</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);" id="preview-proj-name">Academic Day Hub</span>
              </div>
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Path:</span>
                <span class="code-pill" id="preview-proj-path">D:\\Projects\\academic_day_hub</span>
              </div>
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Validation:</span>
                <div class="flex items-center gap-1 text-muted" style="font-size: var(--text-meta); color: var(--color-success);" id="preview-proj-val">
                  <span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span>
                  <span>Valid project folder</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-4); margin-top: var(--space-2);">
            <button class="btn btn-secondary" id="btn-add-proj-cancel">Cancel</button>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm" id="btn-sim-edge-case" title="Simulate Already Registered Edge Case">
                Simulate Duplicate
              </button>
              <button class="btn btn-primary" id="btn-add-proj-confirm">
                <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
                <span>Add & Analyze Project</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-add-proj-cancel')?.addEventListener('click', () => app.navigate('dashboard'));
    document.getElementById('btn-add-proj-cancel-top')?.addEventListener('click', () => app.navigate('dashboard'));

    document.getElementById('btn-browse-folder')?.addEventListener('click', () => {
      app.showToast("Folder selected: D:\\Projects\\academic_day_hub");
    });

    // Item 12 Edge Case Trigger: Duplicate Project
    document.getElementById('btn-sim-edge-case')?.addEventListener('click', () => {
      app.showProjectLifecycleModal("already_registered", "Academic Day Hub", "D:\\Projects\\academic_day_hub");
    });

    document.getElementById('btn-add-proj-confirm')?.addEventListener('click', () => {
      app.showToast("Project 'Academic Day Hub' added and analyzed successfully.");
      app.navigate('project-analysis');
    });
  }
};
