/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - WORKFLOW DIALOG COMPONENT (WorkflowDialog.js)
 * Multi-Step Dialogs for Mode, Target, Confirmation, and Results
 * ============================================================================
 */

export const WorkflowDialog = {
  // Item 1: Choose Development Mode Dialog
  renderModeSelection(detectedMode = "Full Stack Application", currentWorkingMode = null) {
    const modes = [
      { id: "frontend", title: "Frontend Development", desc: "UI, layouts, screens, components and client-side workflows.", icon: "devices" },
      { id: "backend", title: "Backend Development", desc: "APIs, server logic, database and backend services.", icon: "dns" },
      { id: "fullstack", title: "Full Stack Development", desc: "Frontend and backend work together.", icon: "layers" },
      { id: "qa", title: "QA / Debugging", desc: "Testing, debugging, validation and regression work.", icon: "bug_report" }
    ];

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 580px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">tune</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                Choose Development Mode
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container);">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Detected Project Mode:</span>
                <span class="code-pill">${detectedMode}</span>
              </div>
              <div class="flex items-center justify-between" style="margin-top: 4px;">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Current Working Mode:</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: ${currentWorkingMode ? 'var(--color-primary)' : 'var(--color-outline)'};">
                  ${currentWorkingMode || 'Not Selected'}
                </span>
              </div>
            </div>

            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Select the area of the application you are currently focusing on. Nexora will customize recommendations for your selected workflow.
            </p>

            <div class="flex flex-col gap-2" id="mode-options-container">
              ${modes.map(m => `
                <div class="card card-clickable mode-option-card ${currentWorkingMode && currentWorkingMode.toLowerCase().includes(m.id) ? 'card-selected' : ''}" data-mode-id="${m.id}" data-mode-title="${m.title}" style="padding: var(--space-3); display: flex; align-items: center; gap: var(--space-3);">
                  <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background-color: var(--color-surface-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">${m.icon}</span>
                  </div>
                  <div class="flex flex-col flex-1">
                    <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">${m.title}</span>
                    <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">${m.desc}</span>
                  </div>
                  <span class="material-symbols-outlined mode-check-icon text-primary" style="display: none; font-size: 18px;">check_circle</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="btn-mode-continue" disabled>
              <span>Continue</span>
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 2: Choose Development Target Dialog
  renderTargetSelection(modeTitle = "Frontend Development", targets = ["Web Application", "Website", "Mobile Application"], selectedTarget = null) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">target</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                Choose ${modeTitle} Target
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Select the primary target context for <span style="color: var(--color-primary); font-weight: 600;">${modeTitle}</span>:
            </p>

            <div class="flex flex-col gap-2" id="target-options-container">
              ${targets.map(t => `
                <div class="card card-clickable target-option-card ${selectedTarget === t ? 'card-selected' : ''}" data-target-name="${t}" style="padding: var(--space-3); display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: var(--text-body-md); font-weight: 500; color: var(--color-on-surface);">${t}</span>
                  <span class="material-symbols-outlined target-check-icon text-primary" style="display: none; font-size: 18px;">check_circle</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-target-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back</span>
            </button>
            <button class="btn btn-primary" id="btn-target-continue" disabled>
              <span>Apply & Refresh Recommendations</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 3: Change Development Mode Confirmation Dialog
  renderChangeModeConfirmation({ currentMode, newMode, currentTarget, newTarget }) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-warning); font-size: 20px;">swap_horiz</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                Change Development Mode
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Changing the working mode will refresh Nexora's recommendations using the existing project analysis.
            </p>

            <div class="card" style="padding: var(--space-4); background-color: var(--color-surface-container); display: flex; flex-direction: column; gap: var(--space-3);">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span style="font-size: var(--text-meta); color: var(--color-outline);">Current Mode / Target</span>
                  <span style="font-size: var(--text-body-sm); color: var(--color-on-surface); font-weight: 500;">
                    ${currentMode || 'Not Selected'} ${currentTarget ? `(${currentTarget})` : ''}
                  </span>
                </div>
                <span class="material-symbols-outlined text-muted">arrow_forward</span>
                <div class="flex flex-col items-end">
                  <span style="font-size: var(--text-meta); color: var(--color-primary);">New Mode / Target</span>
                  <span style="font-size: var(--text-body-sm); color: var(--color-primary); font-weight: 600;">
                    ${newMode} (${newTarget})
                  </span>
                </div>
              </div>
            </div>

            <div class="card" style="padding: var(--space-3); background-color: var(--color-success-bg); border-color: var(--color-success-border);">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="color: var(--color-success); font-size: 16px;">verified_user</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface);">
                  Existing active skills will <strong>NOT</strong> be automatically removed.
                </span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="btn-apply-change-mode">
              <span>Apply & Refresh Recommendations</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 6: Activation Confirmation Dialog
  renderActivationConfirmation({ project, workingMode, target, selectedSkills = [], selectedPlatforms = [] }) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 540px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">bolt</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                Confirm Skill Activation
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Nexora will activate the selected skills for this project and deploy them only to the selected AI platforms.
            </p>

            <div class="card" style="padding: var(--space-4); background-color: var(--color-surface-container); display: flex; flex-direction: column; gap: var(--space-2);">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Project:</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">${project.name}</span>
              </div>
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Detected Classification:</span>
                <span class="badge badge-neutral">${project.type}</span>
              </div>
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Working Context:</span>
                <span style="font-size: var(--text-meta); color: var(--color-primary); font-weight: 600;">
                  ${workingMode || 'General'} | ${target || 'Default'}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">
                Selected Skills (${selectedSkills.length}):
              </span>
              <div class="flex flex-wrap gap-1" style="max-height: 100px; overflow-y: auto; padding: var(--space-2); background: var(--color-surface-lowest); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-sm);">
                ${selectedSkills.map(s => `<span class="code-pill">${s}</span>`).join('')}
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">
                Target AI Platforms (${selectedPlatforms.length}):
              </span>
              <div class="flex gap-2">
                ${selectedPlatforms.map(p => `<span class="badge badge-primary">${p}</span>`).join('')}
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="btn-confirm-activation">
              <span class="material-symbols-outlined" style="font-size: 16px;">verified</span>
              <span>Confirm Activation</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 7: Activation Result States Dialog
  renderActivationResult({ status = "success", activatedSkills = [], deployments = [] }) {
    const isSuccess = status === "success";
    const isPartial = status === "partial";

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: ${isSuccess ? 'var(--color-success)' : (isPartial ? 'var(--color-warning)' : 'var(--color-error-accent)')}; font-size: 20px;">
                ${isSuccess ? 'check_circle' : (isPartial ? 'warning' : 'error')}
              </span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                ${isSuccess ? 'Skills Activated Successfully' : (isPartial ? 'Activation Partially Completed' : 'Activation Failed')}
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              ${isSuccess 
                ? `${activatedSkills.length} skills were activated and deployed to your selected AI platforms.` 
                : (isPartial ? 'Some platform deployments were not completed.' : 'No project changes were completed. Please retry.')}
            </p>

            <div class="flex flex-col gap-2">
              ${deployments.map(d => `
                <div class="flex items-center justify-between card" style="padding: var(--space-2) var(--space-3); background-color: var(--color-surface-container);">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined" style="font-size: 16px; color: ${d.status === 'Success' ? 'var(--color-success)' : 'var(--color-error-accent)'};">
                      ${d.status === 'Success' ? 'check' : 'close'}
                    </span>
                    <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">${d.platform}</span>
                  </div>
                  <span class="badge ${d.status === 'Success' ? 'badge-success' : 'badge-error'}">${d.status}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="modal-footer">
            ${isSuccess ? `
              <button class="btn btn-secondary" id="btn-result-done">Done</button>
              <button class="btn btn-primary" id="btn-result-view-active">View Active Skills</button>
            ` : (isPartial ? `
              <button class="btn btn-secondary" id="btn-result-view-details">View Details</button>
              <button class="btn btn-secondary" id="btn-result-retry-failed">Retry Failed</button>
              <button class="btn btn-primary" id="btn-result-done">Done</button>
            ` : `
              <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
              <button class="btn btn-primary" id="btn-result-retry">Retry</button>
            `)}
          </div>
        </div>
      </div>
    `;
  },

  // Item 8: Protected Global Removal Confirmation Dialog
  renderGlobalRemovalConfirmation({ skillId, affectedProjectCount = 0, affectedProjects = [] }) {
    const isZero = affectedProjectCount === 0;

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-error-accent); font-size: 20px;">delete_sweep</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Remove Skill From All Projects</h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">
              ${isZero
                ? `This skill is not active in any managed project.`
                : `This will deactivate <strong>${skillId}</strong> from <strong>${affectedProjectCount}</strong> managed project(s) and remove all deployed platform rule and skill files.`}
            </p>

            <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container); margin-top: var(--space-2);">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Target Skill:</span>
                <span class="code-pill">${skillId}</span>
              </div>
              <div class="flex items-center justify-between" style="margin-top: 4px;">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Affected Projects:</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">${affectedProjectCount} Projects</span>
              </div>
            </div>

            ${!isZero && affectedProjects.length > 0 ? `
              <div class="flex flex-col gap-1" style="margin-top: var(--space-2);">
                <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">
                  Impacted Project Workspaces:
                </span>
                <div class="flex flex-col gap-1" style="max-height: 140px; overflow-y: auto; padding: var(--space-2); background-color: var(--color-surface-lowest); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-sm);">
                  ${affectedProjects.map(p => `
                    <div class="flex items-center justify-between text-muted" style="font-size: var(--text-meta); padding: 2px 0;">
                      <span>${p.name || p}</span>
                      <span class="badge badge-neutral">Active</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-destructive" id="btn-confirm-remove-all" ${isZero ? 'disabled' : ''}>
              Confirm Removal
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 9: Global Removal Result Dialog
  renderGlobalRemovalResult({ status = "success", skillId = "", totalAffected = 0, succeededCount = 0, failedCount = 0, projectResults = [] }) {
    const isSuccess = status === "success";
    const isPartial = status === "partial";

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: ${isSuccess ? 'var(--color-success)' : (isPartial ? 'var(--color-warning)' : 'var(--color-error-accent)')}; font-size: 20px;">
                ${isSuccess ? 'check_circle' : (isPartial ? 'warning' : 'error')}
              </span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                ${isSuccess ? 'Global Removal Completed' : (isPartial ? 'Global Removal Partially Completed' : 'Global Removal Failed')}
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              ${isSuccess
                ? `Successfully removed ${skillId} from all ${succeededCount} managed projects.`
                : (isPartial ? `Removed ${skillId} from ${succeededCount} of ${totalAffected} projects. ${failedCount} projects failed.` : `Failed to remove ${skillId} from managed projects.`)}
            </p>

            ${projectResults.length > 0 ? `
              <div class="flex flex-col gap-1" style="margin-top: var(--space-2); max-height: 160px; overflow-y: auto;">
                ${projectResults.map(p => `
                  <div class="flex items-center justify-between card" style="padding: var(--space-2) var(--space-3); background-color: var(--color-surface-container);">
                    <span style="font-size: var(--text-body-sm); font-weight: 500; color: var(--color-on-surface);">${p.name || p.projectId}</span>
                    <span class="badge ${p.success ? 'badge-success' : 'badge-error'}">${p.success ? 'Removed' : 'Failed'}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn btn-primary" id="btn-global-result-done">Done</button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 10: Health Check Repair Confirmation Dialog
  renderHealthRepairConfirmation({ categoryId = null, categoryName = "All Diagnostic Warnings", detail = "" }) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-warning); font-size: 20px;">healing</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">Confirm Diagnostic Repair</h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">
              Nexora will attempt to repair <strong>${categoryName}</strong>. This may modify Nexora-managed local configuration or metadata.
            </p>

            ${detail ? `
              <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container); margin-top: var(--space-2);">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Reported Issue:</span>
                <p style="font-size: var(--text-body-sm); color: var(--color-on-surface); margin-top: 4px;">${detail}</p>
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="btn-confirm-health-repair" data-id="${categoryId || ''}">
              Repair Now
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 11: Health Check Repair Result Dialog
  renderHealthRepairResult({ success = true, repairsApplied = [], message = "" }) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: ${success ? 'var(--color-success)' : 'var(--color-error-accent)'}; font-size: 20px;">
                ${success ? 'check_circle' : 'error'}
              </span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                ${success ? 'Diagnostic Repair Completed' : 'Diagnostic Repair Failed'}
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              ${message || (success ? 'Diagnostic repairs applied successfully.' : 'Failed to apply diagnostic repairs.')}
            </p>

            ${repairsApplied.length > 0 ? `
              <div class="flex flex-col gap-1" style="margin-top: var(--space-2);">
                <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">Applied Fixes:</span>
                ${repairsApplied.map(r => `
                  <div class="flex items-center gap-2 card" style="padding: var(--space-2) var(--space-3); background-color: var(--color-surface-container);">
                    <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-success);">check</span>
                    <span style="font-size: var(--text-body-sm); color: var(--color-on-surface);">${r}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn btn-primary" id="btn-health-repair-done">Done</button>
          </div>
        </div>
      </div>
    `;
  }
};
