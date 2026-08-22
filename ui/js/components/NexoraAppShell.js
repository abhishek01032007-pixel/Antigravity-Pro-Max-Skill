/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - REUSABLE SHELL COMPONENT (NexoraAppShell.js)
 * 240px Fixed Sidebar + 32px Fixed Top Bar
 * ============================================================================
 */

export const NexoraAppShell = {
  render(activeNav = "dashboard") {
    return `
      <!-- Fixed Sidebar (240px) -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo-hexagon">
            <span class="material-symbols-outlined" style="font-size: 18px;">hexagon</span>
          </div>
          <div class="brand-text">
            <span class="brand-title">Nexora</span>
            <span class="brand-version">v1.0.0</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-item ${activeNav === 'dashboard' ? 'active' : ''}" data-nav="dashboard">
            <span class="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a class="nav-item ${activeNav === 'projects' ? 'active' : ''}" data-nav="projects">
            <span class="material-symbols-outlined">folder_open</span>
            <span>Projects</span>
          </a>
          <a class="nav-item ${activeNav === 'skills' ? 'active' : ''}" data-nav="skills">
            <span class="material-symbols-outlined">school</span>
            <span>Skills</span>
          </a>
          <a class="nav-item ${activeNav === 'activity' ? 'active' : ''}" data-nav="activity">
            <span class="material-symbols-outlined">history</span>
            <span>Activity</span>
          </a>
          <a class="nav-item ${activeNav === 'maintenance' ? 'active' : ''}" data-nav="maintenance">
            <span class="material-symbols-outlined">build</span>
            <span>Maintenance</span>
          </a>
          <a class="nav-item nav-item-bottom ${activeNav === 'settings' ? 'active' : ''}" data-nav="settings">
            <span class="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </a>
        </nav>
      </aside>

      <!-- Main Wrapper -->
      <div class="main-wrapper">
        <!-- Top Status Bar (32px) -->
        <header class="topbar">
          <div class="topbar-left">
            <div class="topbar-status">
              <span class="status-dot status-dot-success"></span>
              <span>● Healthy | Up to date</span>
            </div>
          </div>
          <div class="topbar-right">
            <button class="topbar-icon-btn" title="Notifications">
              <span class="material-symbols-outlined" style="font-size: 16px;">notifications</span>
            </button>
            <button class="topbar-icon-btn" title="Settings" data-nav="settings">
              <span class="material-symbols-outlined" style="font-size: 16px;">settings</span>
            </button>
          </div>
        </header>

        <!-- Canvas Outlet -->
        <main class="content-canvas" id="canvas-outlet">
          <!-- Active Screen Content Injected Here -->
        </main>
      </div>
    `;
  }
};
