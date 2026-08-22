/**
 * AddProjectScreen.js - Add Local Project Screen (Phase 6.2 Gate 4 Live Integrated)
 * Trusted folder selection + Live validation & registration
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const AddProjectScreen = {
  render(data = {}) {
    const isLive = !!(data && data.isLiveMode);
    const defaultPath = isLive ? "" : "D:\\Projects\\academic_day_hub";
    const defaultName = isLive ? "Select Directory" : "Academic Day Hub";

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
              <input type="text" class="input-text font-mono" id="input-project-path" value="${defaultPath}" placeholder="Click Browse to select folder...">
              <button class="btn btn-secondary" id="btn-browse-folder" style="flex-shrink: 0;">
                <span class="material-symbols-outlined" style="font-size: 16px;">folder_open</span>
                <span>Browse Folder</span>
              </button>
            </div>
          </div>

          <!-- Project Preview Card & Validation State -->
          <div class="card" id="project-preview-card" style="background-color: var(--color-surface-container); padding: var(--space-4); border-color: var(--color-outline-variant);">
            <h4 style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-primary); margin-bottom: var(--space-3);">
              Project Validation & Preview
            </h4>
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Path:</span>
                <span class="code-pill" id="preview-proj-path">${defaultPath || 'No folder selected'}</span>
              </div>
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Validation:</span>
                <div class="flex items-center gap-1" style="font-size: var(--text-meta); color: ${isLive ? 'var(--color-outline)' : 'var(--color-success)'};" id="preview-proj-val">
                  <span class="material-symbols-outlined" style="font-size: 14px;">${isLive ? 'help' : 'check_circle'}</span>
                  <span>${isLive ? 'Awaiting directory selection' : 'Valid project folder'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between" style="border-top: 1px solid var(--color-outline-variant); padding-top: var(--space-4); margin-top: var(--space-2);">
            <button class="btn btn-secondary" id="btn-add-proj-cancel">Cancel</button>
            <div class="flex items-center gap-2">
              <button class="btn btn-primary" id="btn-add-proj-confirm" ${isLive ? 'disabled' : ''}>
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
    const cancelHandler = () => app.navigate('dashboard');
    document.getElementById('btn-add-proj-cancel')?.addEventListener('click', cancelHandler);
    document.getElementById('btn-add-proj-cancel-top')?.addEventListener('click', cancelHandler);

    const pathInput = document.getElementById('input-project-path');
    const valContainer = document.getElementById('preview-proj-val');
    const pathPreview = document.getElementById('preview-proj-path');
    const confirmBtn = document.getElementById('btn-add-proj-confirm');

    const runValidation = async (targetPath) => {
      if (!targetPath || targetPath.trim().length === 0) {
        if (valContainer) valContainer.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-outline);">help</span><span>No directory specified</span>`;
        if (confirmBtn) confirmBtn.disabled = true;
        return;
      }

      if (pathPreview) pathPreview.textContent = targetPath;
      if (valContainer) valContainer.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 14px;">sync</span><span>Validating...</span>`;

      const valRes = await app.data.validateProjectPath(targetPath);
      if (valRes.isValid) {
        if (valContainer) {
          valContainer.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-success);">check_circle</span><span style="color: var(--color-success);">Valid project directory</span>`;
        }
        if (confirmBtn) confirmBtn.disabled = false;
      } else {
        if (valContainer) {
          valContainer.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-error);">error</span><span style="color: var(--color-error);">${valRes.reason || 'Invalid directory'}</span>`;
        }
        if (confirmBtn) confirmBtn.disabled = true;
      }
    };

    pathInput?.addEventListener('input', (e) => {
      runValidation(e.target.value);
    });

    document.getElementById('btn-browse-folder')?.addEventListener('click', async () => {
      if (app.data.selectProjectFolder) {
        const pickerRes = await app.data.selectProjectFolder();
        if (!pickerRes.canceled && pickerRes.path) {
          if (pathInput) pathInput.value = pickerRes.path;
          runValidation(pickerRes.path);
        }
      }
    });

    document.getElementById('btn-add-proj-confirm')?.addEventListener('click', async () => {
      const selectedPath = pathInput ? pathInput.value.trim() : '';
      if (!selectedPath) return;

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> <span>Adding...</span>`;

      const addRes = await app.data.addProject(selectedPath);
      if (addRes.success) {
        app.showToast("Project added and analyzed successfully.");
        app.navigate('project-analysis', { path: selectedPath, projectId: addRes.projectId });
      } else {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">add</span> <span>Add & Analyze Project</span>`;
        const err = addRes.error || { code: 'ADD_FAILED', message: 'Failed to add project' };

        if (err.code === 'PROJECT_ALREADY_REGISTERED') {
          app.showToast("Project is already registered in Nexora.");
          app.navigate('dashboard');
        } else {
          app.showToast(`Error: ${err.message}`);
        }
      }
    });
  }
};
