/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - MAIN APP CONTROLLER (app.js)
 * Coordinates Client-Side Navigation, Shell Rendering, and Screen Lifecycles
 * ============================================================================
 */

import { BridgeService } from './bridge/BridgeService.js';
import { NexoraAppShell } from './components/NexoraAppShell.js';
import { ConfirmationDialog } from './components/ConfirmationDialog.js';

// Screens
import { StartupScreen } from './screens/StartupScreen.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { RecommendedSkillsScreen } from './screens/RecommendedSkillsScreen.js';
import { ProjectAnalysisScreen } from './screens/ProjectAnalysisScreen.js';
import { ActiveSkillsScreen } from './screens/ActiveSkillsScreen.js';
import { SkillLibraryScreen } from './screens/SkillLibraryScreen.js';
import { SkillDetailScreen } from './screens/SkillDetailScreen.js';
import { CrossProjectUsageScreen } from './screens/CrossProjectUsageScreen.js';
import { AddProjectScreen } from './screens/AddProjectScreen.js';
import { PlatformSelectionScreen } from './screens/PlatformSelectionScreen.js';
import { RecentActivityScreen } from './screens/RecentActivityScreen.js';
import { SystemHealthScreen } from './screens/SystemHealthScreen.js';
import { UpdateCenterScreen } from './screens/UpdateCenterScreen.js';

class NexoraApp {
  constructor() {
    this.data = BridgeService;
    this.currentView = "dashboard";
    this.viewParams = {};
    this.screens = {
      "startup": StartupScreen,
      "dashboard": DashboardScreen,
      "recommended-skills": RecommendedSkillsScreen,
      "project-analysis": ProjectAnalysisScreen,
      "active-skills": ActiveSkillsScreen,
      "skill-library": SkillLibraryScreen,
      "skill-detail": SkillDetailScreen,
      "cross-project-usage": CrossProjectUsageScreen,
      "add-project": AddProjectScreen,
      "platform-selection": PlatformSelectionScreen,
      "activity": RecentActivityScreen,
      "maintenance": SystemHealthScreen,
      "update-center": UpdateCenterScreen,
      "projects": DashboardScreen,
      "skills": SkillLibraryScreen,
      "settings": PlatformSelectionScreen
    };
  }

  async init() {
    const root = document.getElementById('app-root');
    if (!root) return;

    // Render Shell
    root.innerHTML = NexoraAppShell.render(this.currentView);
    this.attachShellEvents();

    // Route to default view (Dashboard)
    await this.navigate("dashboard");
  }

  attachShellEvents() {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetNav = item.getAttribute('data-nav');
        if (targetNav) {
          this.navigate(targetNav);
        }
      });
    });

    document.querySelectorAll('[data-nav="settings"]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate('platform-selection'));
    });
  }

  async navigate(viewName, params = {}) {
    this.currentView = viewName;
    this.viewParams = params;

    // Update active nav state in sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      const navKey = item.getAttribute('data-nav');
      if (navKey === viewName || (viewName === 'skill-library' && navKey === 'skills') || (viewName === 'project-analysis' && navKey === 'projects') || (viewName === 'platform-selection' && navKey === 'settings')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const outlet = document.getElementById('canvas-outlet');
    if (!outlet) return;

    const screen = this.screens[viewName] || DashboardScreen;
    outlet.innerHTML = screen.render(this.data, params);

    if (screen.attachEvents) {
      screen.attachEvents(this);
    }
  }

  showDeactivateModal(skillId, projectName) {
    const modalHtml = ConfirmationDialog.render({
      title: "Deactivate Skill",
      message: `Are you sure you want to deactivate this skill from ${projectName}? It will be safely removed from the project's active context without affecting other projects.`,
      skillId: skillId,
      projectName: projectName,
      confirmText: "Deactivate",
      isDestructive: true,
      onConfirmAction: "confirm-deactivate"
    });

    this.renderModal(modalHtml, () => {
      this.showToast(`Skill '${skillId}' deactivated from ${projectName}.`);
    });
  }

  showRemoveAllModal(skillId, affectedProjects) {
    const modalHtml = ConfirmationDialog.render({
      title: "Remove Skill From All Projects",
      message: `This will deactivate '${skillId}' from all associated projects in your registry. This action cannot be undone automatically.`,
      skillId: skillId,
      projectCount: affectedProjects.length,
      projectList: affectedProjects,
      confirmText: "Remove From All Projects",
      isDestructive: true,
      onConfirmAction: "confirm-remove-all"
    });

    this.renderModal(modalHtml, () => {
      this.showToast(`Skill '${skillId}' removed from all ${affectedProjects.length} projects.`);
      this.navigate('skill-library');
    });
  }

  renderModal(html, onConfirm) {
    this.closeModal();
    const div = document.createElement('div');
    div.id = 'active-modal-wrapper';
    div.innerHTML = html;
    document.body.appendChild(div);

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
      this.closeModal();
      if (onConfirm) onConfirm();
    });
  }

  closeModal() {
    const existing = document.getElementById('active-modal-wrapper');
    if (existing) {
      existing.remove();
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'card';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 200;
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-surface-high);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-level-2);
      font-size: var(--text-body-sm);
      color: var(--color-on-surface);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      animation: fadeIn 0.2s ease;
    `;
    toast.innerHTML = `
      <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 16px;">info</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Instantiate and attach to window
window.NexoraApp = new NexoraApp();
document.addEventListener('DOMContentLoaded', () => {
  window.NexoraApp.init();
});
