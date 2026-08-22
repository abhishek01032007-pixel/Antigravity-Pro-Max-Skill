/**
 * StatusBadge.js - Semantic status chip component
 */
export const StatusBadge = {
  render(status = "Ready", type = "neutral") {
    let badgeClass = "badge-neutral";
    let dotClass = "status-dot-primary";

    switch (status.toLowerCase()) {
      case "ready":
      case "healthy":
      case "active":
      case "completed":
        badgeClass = "badge-success";
        dotClass = "status-dot-success";
        break;
      case "warning":
      case "update available":
      case "available":
        badgeClass = "badge-warning";
        dotClass = "status-dot-warning";
        break;
      case "error":
      case "failed":
      case "deactivated":
        badgeClass = "badge-error";
        dotClass = "status-dot-error";
        break;
      default:
        badgeClass = "badge-neutral";
        dotClass = "status-dot-primary";
    }

    return `
      <span class="badge ${badgeClass}">
        <span class="status-dot ${dotClass}"></span>
        ${status}
      </span>
    `;
  }
};
