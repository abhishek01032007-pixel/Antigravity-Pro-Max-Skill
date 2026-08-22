/**
 * ProjectCard.js - Project Carousel Item & Summary Card
 */
export const ProjectCard = {
  render(project, isSelected = false) {
    const fw = project.framework || (project.frontend && project.frontend[0]) || 'Flutter';
    const icon = (project.type && project.type.includes("Mobile")) ? "integration_instructions" : (fw.includes("HTML") ? "memory" : "folder");
    const containerClass = isSelected ? "card-selected" : "card-clickable";

    return `
      <div class="flex items-center gap-3 card ${containerClass}" data-project-id="${project.id || project.projectId}" style="padding: var(--space-3) var(--space-4); min-width: 230px; flex-shrink: 0;">
        <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background-color: ${isSelected ? 'var(--color-primary-container)' : 'var(--color-surface-high)'}; color: ${isSelected ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span class="material-symbols-outlined" style="font-size: 16px;">${icon}</span>
        </div>
        <div class="flex flex-col" style="overflow: hidden;">
          <span style="font-size: var(--text-body-sm); font-weight: ${isSelected ? '700' : '500'}; color: var(--color-on-surface); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
            ${project.name}
          </span>
          <span style="font-size: var(--text-meta); color: var(--color-on-surface-variant);">
            ${project.type || 'Project'} | ${fw}
          </span>
        </div>
      </div>
    `;
  }
};
