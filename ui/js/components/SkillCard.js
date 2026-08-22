/**
 * SkillCard.js - Interactive Skill Card for catalog and lists
 */
import { StatusBadge } from './StatusBadge.js';

export const SkillCard = {
  render(skill, { showCheckbox = false, isSelected = false, matchScore = null, reason = null } = {}) {
    return `
      <div class="card card-clickable" data-skill-id="${skill.id}" style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${showCheckbox ? `<input type="checkbox" class="checkbox-custom skill-select-cb" data-id="${skill.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();">` : ''}
            <span class="code-pill">${skill.id}</span>
          </div>
          <div class="flex items-center gap-2">
            ${matchScore ? `<span style="font-size: var(--text-meta); color: var(--color-primary); font-weight: bold;">${matchScore}% Match</span>` : ''}
            ${StatusBadge.render(skill.status || "Available")}
          </div>
        </div>

        <div class="flex items-center justify-between" style="margin-top: var(--space-1);">
          <span style="font-size: var(--text-body-md); font-weight: 600; color: var(--color-on-surface);">${skill.name}</span>
          <span class="badge badge-neutral">${skill.category}</span>
        </div>

        ${reason ? `
          <p style="font-size: var(--text-meta); color: var(--color-on-surface-variant); margin-top: 2px;">
            ${reason}
          </p>
        ` : ''}

        ${skill.description ? `
          <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); margin-top: 2px;">
            ${skill.description}
          </p>
        ` : ''}
      </div>
    `;
  }
};
