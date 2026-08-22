/**
 * SectionHeader.js - Uniform Section Title and Action Header
 */
export const SectionHeader = {
  render({ title, count = null, actionsHtml = "" }) {
    return `
      <div class="flex items-center justify-between" style="margin-bottom: var(--space-3);">
        <div class="flex items-center gap-2">
          <h2 style="font-size: var(--text-screen-title); font-weight: var(--weight-screen-title); color: var(--color-on-surface);">
            ${title}
          </h2>
          ${count !== null ? `<span class="badge badge-primary">${count}</span>` : ''}
        </div>
        <div class="flex items-center gap-2">
          ${actionsHtml}
        </div>
      </div>
    `;
  }
};
