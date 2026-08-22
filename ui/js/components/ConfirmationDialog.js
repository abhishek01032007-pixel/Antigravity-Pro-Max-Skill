/**
 * ConfirmationDialog.js - Clean, safety-first modal dialog
 */
export const ConfirmationDialog = {
  render({ title, message, skillId = "", projectName = "", projectCount = 0, projectList = [], confirmText = "Confirm", isDestructive = false, onConfirmAction = "" }) {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined" style="color: ${isDestructive ? 'var(--color-error-accent)' : 'var(--color-warning)'}; font-size: 20px;">
                ${isDestructive ? 'delete_forever' : 'warning'}
              </span>
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

            ${skillId ? `
              <div class="card" style="padding: var(--space-3); background-color: var(--color-surface-container);">
                <div class="flex items-center justify-between">
                  <span style="font-size: var(--text-meta); color: var(--color-outline);">Target Skill:</span>
                  <span class="code-pill">${skillId}</span>
                </div>
                ${projectName ? `
                  <div class="flex items-center justify-between" style="margin-top: 4px;">
                    <span style="font-size: var(--text-meta); color: var(--color-outline);">Project:</span>
                    <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-on-surface);">${projectName}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${projectList && projectList.length > 0 ? `
              <div class="flex flex-col gap-1" style="margin-top: var(--space-2);">
                <span style="font-size: var(--text-meta); color: var(--color-outline); font-weight: 600;">
                  Affected Projects (${projectCount}):
                </span>
                <div class="flex flex-col gap-1" style="max-height: 120px; overflow-y: auto; padding: var(--space-2); background-color: var(--color-surface-lowest); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-sm);">
                  ${projectList.map(p => `
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
            <button class="btn ${isDestructive ? 'btn-destructive' : 'btn-primary'}" id="modal-confirm-btn" data-action="${onConfirmAction}">
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
