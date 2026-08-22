/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - UPDATE PROGRESS & EDGE CASE MODAL (UpdateProgressModal.js)
 * Covers Item 8 (Analysis states), Item 11 (Skill Update), Item 12 (Edge cases), and Item 13 (App Update 13A-13J)
 * ============================================================================
 */

export const UpdateProgressModal = {
  // Item 8: Project Analysis Error & State Modals
  renderAnalysisStateModal({ state = "invalid", path = "D:\\Projects\\unknown" }) {
    let title = "Analysis Notice";
    let icon = "info";
    let iconColor = "var(--color-warning)";
    let message = "";
    let primaryBtnText = "Choose Another Folder";
    let primaryBtnId = "btn-analysis-choose-other";

    if (state === "invalid") {
      title = "Invalid Project Folder";
      icon = "folder_off";
      iconColor = "var(--color-warning)";
      message = "This folder does not appear to contain a supported project structure.";
      primaryBtnText = "Choose Another Folder";
      primaryBtnId = "btn-analysis-choose-other";
    } else if (state === "inaccessible") {
      title = "Folder Inaccessible During Analysis";
      icon = "lock";
      iconColor = "var(--color-error-accent)";
      message = `Permission denied while accessing <code>${path}</code>.`;
      primaryBtnText = "Retry Access";
      primaryBtnId = "btn-analysis-retry-access";
    } else if (state === "failed") {
      title = "Analysis Failed";
      icon = "error";
      iconColor = "var(--color-error-accent)";
      message = "Nexora encountered an unexpected error while analyzing project dependencies.";
      primaryBtnText = "Retry Analysis";
      primaryBtnId = "btn-analysis-retry";
    }

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 500px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: ${iconColor}; font-size: 20px;">${icon}</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">${title}</h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="${primaryBtnId}">${primaryBtnText}</button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 11: Skill Update Available Popup
  renderSkillUpdate({ skillName = "architecture-patterns", currentVersion = "v1.0.0", availableVersion = "v1.1.0" }) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 500px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-warning); font-size: 20px;">upgrade</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">
                Skill Update Available
              </h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container);">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Skill Name:</span>
                <span class="code-pill">${skillName}</span>
              </div>
              <div class="flex items-center justify-between" style="margin-top: 4px;">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Versions:</span>
                <span style="font-size: var(--text-meta); color: var(--color-on-surface);">
                  Installed <span class="code-pill">${currentVersion}</span> → Available <span class="code-pill" style="color: var(--color-warning);">${availableVersion}</span>
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">What's Changed:</span>
              <ul style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); padding-left: var(--space-4); line-height: 1.5;">
                <li>Improved layered architecture patterns and DDD guidance</li>
                <li>Updated compatibility metadata for Flutter & Dart</li>
                <li>Documentation and code template improvements</li>
              </ul>
            </div>

            <div class="card hidden" id="skill-updating-progress" style="padding: var(--space-3); background-color: var(--color-surface-lowest);">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-primary); font-weight: 600;">Updating skill package...</span>
                <span class="badge badge-warning">Applying</span>
              </div>
              <div style="width: 100%; height: 4px; background: var(--color-surface-high); border-radius: var(--radius-full); margin-top: var(--space-2); overflow: hidden;">
                <div style="width: 75%; height: 100%; background: var(--color-primary-accent); transition: width 0.3s;"></div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Later</button>
            <button class="btn btn-secondary btn-sm" id="btn-view-changes">View Changes</button>
            <button class="btn btn-primary" id="btn-confirm-skill-update">
              <span>Update Skill</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 12: Registered Project Lifecycle Edge Cases (Already Registered, Missing, Moved, Inaccessible)
  renderProjectLifecycleDialog({ type = "already_registered", projectName = "Academic Day Hub", path = "D:\\Projects\\academic_day_hub" }) {
    let title = "Project Notice";
    let icon = "info";
    let iconColor = "var(--color-primary)";
    let message = "";
    let primaryActionText = "OK";
    let primaryActionId = "btn-edge-ok";

    if (type === "already_registered") {
      title = "Project Already Registered";
      icon = "folder_managed";
      message = `<strong>${projectName}</strong> is already managed by Nexora at <code>${path}</code>.`;
      primaryActionText = "Open Existing Project";
      primaryActionId = "btn-edge-open-existing";
    } else if (type === "missing") {
      title = "Registered Project Missing";
      icon = "folder_off";
      iconColor = "var(--color-error-accent)";
      message = `The project folder for <strong>${projectName}</strong> could not be found at <code>${path}</code>.`;
      primaryActionText = "Locate Project";
      primaryActionId = "btn-edge-locate";
    } else if (type === "moved") {
      title = "Registered Project Moved";
      icon = "drive_file_move";
      iconColor = "var(--color-warning)";
      message = `The previously registered location <code>${path}</code> is unavailable. Please locate the new folder.`;
      primaryActionText = "Locate New Folder";
      primaryActionId = "btn-edge-locate-new";
    } else if (type === "inaccessible") {
      title = "Registered Location Inaccessible";
      icon = "lock";
      iconColor = "var(--color-warning)";
      message = `Permission denied while accessing registered location <code>${path}</code>.`;
      primaryActionText = "Retry Access";
      primaryActionId = "btn-edge-retry";
    }

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 500px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: ${iconColor}; font-size: 20px;">${icon}</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">${title}</h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">
              ${message}
            </p>
          </div>

          <div class="modal-footer">
            ${(type === 'missing' || type === 'moved') ? `<button class="btn btn-destructive btn-sm" id="btn-edge-remove-reg">Remove Registration</button>` : ''}
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="${primaryActionId}">
              ${primaryActionText}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Item 13: Full Application Update Simulation Wizard (13A–13J)
  renderAppUpdateFlow(step = "13A", { version = "v1.1.0", progress = 45 } = {}) {
    let title = "Nexora Update Available";
    let content = "";
    let footerHtml = "";

    switch (step) {
      case "13A": // App Update Available
        title = "Nexora Update Available";
        content = `
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between card" style="padding: var(--space-3); background-color: var(--color-surface-container);">
              <div class="flex flex-col">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Current Version:</span>
                <span class="code-pill">v1.0.0</span>
              </div>
              <span class="material-symbols-outlined text-muted">arrow_forward</span>
              <div class="flex flex-col items-end">
                <span style="font-size: var(--text-meta); color: var(--color-primary);">Available Version:</span>
                <span class="code-pill" style="color: var(--color-warning);">${version}</span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">What's New in v1.1.0:</span>
              <ul style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); padding-left: var(--space-4); line-height: 1.5;">
                <li>Interactive Development Mode & Target workflow wizards</li>
                <li>Enhanced local recommendations engine</li>
                <li>Non-blocking offline status mode</li>
                <li>System maintenance and performance optimizations</li>
              </ul>
            </div>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-secondary" id="btn-update-later">Later</button>
          <button class="btn btn-primary" id="btn-update-download-now">Download Now</button>
        `;
        break;

      case "13C": // Downloading
        title = "Downloading Update";
        content = `
          <div class="flex flex-col gap-3">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Downloading Nexora Skills Manager ${version}...
            </p>
            <div style="width: 100%; height: 6px; background: var(--color-surface-high); border-radius: var(--radius-full); overflow: hidden;">
              <div style="width: ${progress}%; height: 100%; background: var(--color-primary-accent); transition: width 0.3s;"></div>
            </div>
            <div class="flex items-center justify-between text-muted" style="font-size: var(--text-meta);">
              <span>12.4 MB of 28.6 MB (${progress}%)</span>
              <span>1.8 MB/s</span>
            </div>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-secondary" id="btn-update-pause-resume">Pause</button>
          <button class="btn btn-secondary" id="btn-update-cancel-download">Cancel Download</button>
        `;
        break;

      case "13D": // Verifying
        title = "Verifying Update";
        content = `
          <div class="flex flex-col items-center justify-center gap-3" style="padding: var(--space-4);">
            <div style="width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--color-surface-high); border-top-color: var(--color-primary-accent); animation: spin 0.8s linear infinite;"></div>
            <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">
              Verifying Update...
            </span>
            <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
              Checking downloaded package integrity.
            </span>
          </div>
        `;
        footerHtml = `<button class="btn btn-secondary" disabled>Verifying...</button>`;
        break;

      case "13E": // Ready to Install
        title = "Update Ready";
        content = `
          <div class="flex flex-col gap-3">
            <div class="card" style="padding: var(--space-3); background-color: var(--color-success-bg); border-color: var(--color-success-border);">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="color: var(--color-success); font-size: 20px;">check_circle</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">
                  Nexora ${version} is downloaded and verified.
                </span>
              </div>
            </div>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              You can restart Nexora now to apply the update immediately, or choose to install it automatically when the application closes.
            </p>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-secondary" id="btn-update-later-ready">Later</button>
          <button class="btn btn-secondary" id="btn-update-install-exit">Install When Nexora Closes</button>
          <button class="btn btn-primary" id="btn-update-restart-now">Restart & Update Now</button>
        `;
        break;

      case "13F": // Install on Exit
        title = "Update Ready to Install";
        content = `
          <div class="flex flex-col gap-3">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Nexora will install ${version} automatically when the application closes.
            </p>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-primary" id="btn-update-restart-now">Restart & Update Now</button>
        `;
        break;

      case "13G": // Success
        title = "Update Complete";
        content = `
          <div class="flex flex-col gap-3">
            <div class="card" style="padding: var(--space-3); background-color: var(--color-success-bg); border-color: var(--color-success-border);">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="color: var(--color-success); font-size: 20px;">verified</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">
                  Nexora Updated Successfully
                </span>
              </div>
            </div>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              You are now running Nexora Skills Manager ${version} (Simulation).
            </p>
          </div>
        `;
        footerHtml = `<button class="btn btn-primary" id="btn-update-finish">Continue</button>`;
        break;

      case "13H": // Update Failure
        title = "Update Failed";
        content = `
          <div class="flex flex-col gap-3">
            <div class="card" style="padding: var(--space-3); background-color: var(--color-error-bg); border-color: var(--color-error-border);">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="color: var(--color-error-accent); font-size: 20px;">error</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">
                  Update Failed
                </span>
              </div>
            </div>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Nexora could not complete the update. Your current installation remains available.
            </p>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-secondary" id="btn-update-fail-later">Later</button>
          <button class="btn btn-primary" id="btn-update-fail-retry">Retry</button>
        `;
        break;

      case "13I": // Offline Update Check
        title = "Unable to Check for Updates";
        content = `
          <div class="flex flex-col gap-3">
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              You're currently offline. Nexora will continue using the installed version.
            </p>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-secondary" id="btn-offline-check-dismiss">Dismiss</button>
          <button class="btn btn-primary" id="btn-offline-check-retry">Retry</button>
        `;
        break;

      case "13J": // Skill Library Update
        title = "Skill Library Update Available";
        content = `
          <div class="flex flex-col gap-3">
            <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container);">
              <div class="flex items-center justify-between">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Updates Available:</span>
                <span class="badge badge-warning">2 New Skills • 3 Updated Skills</span>
              </div>
              <div class="flex items-center justify-between" style="margin-top: 4px;">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Installed Library:</span>
                <span class="code-pill">48 skills</span>
              </div>
            </div>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">
              Updates packages in your skill library without reinstalling the desktop application.
            </p>
          </div>
        `;
        footerHtml = `
          <button class="btn btn-secondary" id="btn-skill-sync-later">Later</button>
          <button class="btn btn-secondary btn-sm" id="btn-skill-sync-changes">View Changes</button>
          <button class="btn btn-primary" id="btn-skill-sync-confirm">Update Skills</button>
        `;
        break;
    }

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">system_update</span>
              <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface);">${title}</h3>
            </div>
            <button class="btn-ghost" id="modal-close-btn" style="width: 24px; height: 24px; padding: 0;">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>

          <div class="modal-body">
            ${content}
          </div>

          <div class="modal-footer">
            ${footerHtml}
          </div>
        </div>
      </div>
    `;
  }
};
