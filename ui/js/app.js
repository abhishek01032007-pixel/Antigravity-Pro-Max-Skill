/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - MAIN APP CONTROLLER (app.js)
 * Coordinates Client-Side Navigation, Shell Rendering, Workflows & Modals
 * ============================================================================
 */

import { BridgeService } from './bridge/BridgeService.js';
import { NexoraAppShell } from './components/NexoraAppShell.js';
import { ConfirmationDialog } from './components/ConfirmationDialog.js';
import { WorkflowDialog } from './components/WorkflowDialog.js';
import { SideSheet } from './components/SideSheet.js';
import { InlineNotice } from './components/InlineNotice.js';
import { UpdateProgressModal } from './components/UpdateProgressModal.js';

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

    // Render Shell with initial state
    root.innerHTML = NexoraAppShell.render(this.currentView, {
      isOffline: this.data.state.isOffline,
      hasUpdate: this.data.state.appUpdateAvailable && !this.data.state.updateDismissed
    });
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

    // Mock Offline Toggle
    document.getElementById('btn-topbar-offline-toggle')?.addEventListener('click', () => {
      const isOff = this.data.toggleOffline();
      this.showToast(isOff ? "Mock Offline Mode enabled." : "Mock Offline Mode disabled. Online.");
      this.refreshShell();
      this.navigate(this.currentView);
    });

    // Top bar notifications
    document.getElementById('btn-topbar-notifications')?.addEventListener('click', () => {
      this.navigate('activity');
    });
  }

  refreshShell() {
    const root = document.getElementById('app-root');
    if (!root) return;
    root.innerHTML = NexoraAppShell.render(this.currentView, {
      isOffline: this.data.state.isOffline,
      hasUpdate: this.data.state.appUpdateAvailable && !this.data.state.updateDismissed
    });
    this.attachShellEvents();
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

  // =========================================================================
  // WORKFLOW ITEM 1, 2, 3, 4: DEVELOPMENT MODE & TARGET SELECTION WIZARD
  // =========================================================================

  startModeSelectionWizard() {
    let selectedModeId = null;
    let selectedModeTitle = null;

    const html = WorkflowDialog.renderModeSelection(
      this.data.sampleProject.type,
      this.data.state.currentWorkingMode
    );

    this.renderModal(html);

    // Card selection event
    document.querySelectorAll('.mode-option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-option-card').forEach(c => {
          c.classList.remove('card-selected');
          c.querySelector('.mode-check-icon').style.display = 'none';
        });
        card.classList.add('card-selected');
        card.querySelector('.mode-check-icon').style.display = 'inline-block';

        selectedModeId = card.getAttribute('data-mode-id');
        selectedModeTitle = card.getAttribute('data-mode-title');
        const continueBtn = document.getElementById('btn-mode-continue');
        if (continueBtn) continueBtn.removeAttribute('disabled');
      });
    });

    // Continue to Target Selection (Step 2)
    document.getElementById('btn-mode-continue')?.addEventListener('click', () => {
      if (selectedModeId && selectedModeTitle) {
        this.startTargetSelectionWizard(selectedModeId, selectedModeTitle);
      }
    });
  }

  startTargetSelectionWizard(modeId, modeTitle) {
    const targets = this.data.getDevelopmentTargets(modeId);
    let selectedTarget = null;

    const html = WorkflowDialog.renderTargetSelection(modeTitle, targets, selectedTarget);
    this.renderModal(html);

    document.querySelectorAll('.target-option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.target-option-card').forEach(c => {
          c.classList.remove('card-selected');
          c.querySelector('.target-check-icon').style.display = 'none';
        });
        card.classList.add('card-selected');
        card.querySelector('.target-check-icon').style.display = 'inline-block';

        selectedTarget = card.getAttribute('data-target-name');
        const continueBtn = document.getElementById('btn-target-continue');
        if (continueBtn) continueBtn.removeAttribute('disabled');
      });
    });

    document.getElementById('btn-target-back')?.addEventListener('click', () => {
      this.startModeSelectionWizard();
    });

    document.getElementById('btn-target-continue')?.addEventListener('click', () => {
      if (selectedTarget) {
        // If mode is changing from an already configured mode -> Show Change Confirmation (Item 3)
        if (this.data.state.currentWorkingMode && this.data.state.currentWorkingMode !== modeTitle) {
          this.showChangeModeConfirmation(modeTitle, selectedTarget);
        } else {
          this.applyWorkingMode(modeTitle, selectedTarget);
        }
      }
    });
  }

  showChangeModeConfirmation(newMode, newTarget) {
    const html = WorkflowDialog.renderChangeModeConfirmation({
      currentMode: this.data.state.currentWorkingMode,
      currentTarget: this.data.state.currentTarget,
      newMode: newMode,
      newTarget: newTarget
    });

    this.renderModal(html);

    document.getElementById('btn-apply-change-mode')?.addEventListener('click', () => {
      this.applyWorkingMode(newMode, newTarget);
    });
  }

  applyWorkingMode(modeTitle, targetName) {
    this.data.setWorkingMode(modeTitle, targetName);
    this.closeModal();
    this.showToast(`Working Mode set to ${modeTitle} (${targetName}).`);

    // Route to Recommended Skills with inline recalculation loader (Item 4)
    this.navigate('recommended-skills');

    setTimeout(() => {
      const loaderOutlet = document.getElementById('rec-recalc-outlet');
      const list = document.getElementById('recommended-skills-list');
      if (loaderOutlet && list) {
        loaderOutlet.innerHTML = InlineNotice.renderRecalculationLoader(modeTitle, targetName);
        loaderOutlet.classList.remove('hidden');
        list.classList.add('hidden');

        setTimeout(() => {
          loaderOutlet.classList.add('hidden');
          list.classList.remove('hidden');
        }, 700);
      }
    }, 50);
  }

  // =========================================================================
  // WORKFLOW ITEM 5: SIDE SHEET CATALOG SEARCH & ADD DRAWER
  // =========================================================================

  openCatalogSideSheet() {
    this.closeSideSheet();
    const div = document.createElement('div');
    div.id = 'active-side-sheet-wrapper';
    div.innerHTML = SideSheet.render({
      title: "Add Compatible Skills",
      catalog: this.data.skillCatalog
    });
    document.body.appendChild(div);

    document.getElementById('side-sheet-close-btn')?.addEventListener('click', () => this.closeSideSheet());
    document.getElementById('side-sheet-done-btn')?.addEventListener('click', () => this.closeSideSheet());

    // Search input
    const searchInput = document.getElementById('side-sheet-search-input');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#side-sheet-skills-list .card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });

    // Add button handler
    document.querySelectorAll('.action-add-to-rec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        btn.textContent = "Added";
        btn.classList.replace('btn-secondary', 'btn-primary');
        this.showToast(`Skill '${id}' added to recommendations list.`);
      });
    });
  }

  closeSideSheet() {
    document.getElementById('active-side-sheet-wrapper')?.remove();
  }

  // =========================================================================
  // WORKFLOW ITEM 6 & 7: ACTIVATION CONFIRMATION & RESULT STATES
  // =========================================================================

  showActivationConfirmationModal() {
    const html = WorkflowDialog.renderActivationConfirmation({
      project: this.data.sampleProject,
      workingMode: this.data.state.currentWorkingMode,
      target: this.data.state.currentTarget,
      selectedSkills: this.data.state.selectedSkillsForActivation,
      selectedPlatforms: this.data.state.selectedPlatforms
    });

    this.renderModal(html);

    document.getElementById('btn-confirm-activation')?.addEventListener('click', async () => {
      this.closeModal();
      // Simulate mock activation result (Item 7)
      const res = await this.data.simulateActivation(
        this.data.state.selectedSkillsForActivation,
        this.data.state.selectedPlatforms,
        "success"
      );

      const resultHtml = WorkflowDialog.renderActivationResult(res);
      this.renderModal(resultHtml);

      document.getElementById('btn-result-done')?.addEventListener('click', () => {
        this.closeModal();
        this.navigate('active-skills');
      });
    });
  }

  // =========================================================================
  // WORKFLOW ITEM 11: SKILL UPDATE AVAILABLE POPUP
  // =========================================================================

  showSkillUpdateModal(skillId) {
    const html = UpdateProgressModal.renderSkillUpdate({
      skillName: skillId,
      currentVersion: "v1.0.0",
      availableVersion: "v1.1.0"
    });

    this.renderModal(html);

    document.getElementById('btn-confirm-skill-update')?.addEventListener('click', () => {
      const progress = document.getElementById('skill-updating-progress');
      if (progress) {
        progress.classList.remove('hidden');
        setTimeout(() => {
          this.closeModal();
          this.showToast(`Skill '${skillId}' successfully updated to v1.1.0.`);
        }, 800);
      }
    });
  }

  // =========================================================================
  // WORKFLOW ITEM 12: REGISTERED PROJECT LIFECYCLE EDGE CASES
  // =========================================================================

  showProjectLifecycleModal(type, projectName, path) {
    const html = UpdateProgressModal.renderProjectLifecycleDialog({ type, projectName, path });
    this.renderModal(html);

    document.getElementById('btn-edge-open-existing')?.addEventListener('click', () => {
      this.closeModal();
      this.navigate('dashboard');
    });

    document.getElementById('btn-edge-locate')?.addEventListener('click', () => {
      this.closeModal();
      this.navigate('add-project');
    });
  }

  // =========================================================================
  // WORKFLOW ITEM 13: APPLICATION UPDATE SIMULATION WIZARD (13A–13J)
  // =========================================================================

  startAppUpdateFlow() {
    let currentStep = "13A";
    const updateModal = (step, progress = 45) => {
      currentStep = step;
      const html = UpdateProgressModal.renderAppUpdateFlow(step, { version: "v1.1.0", progress });
      this.renderModal(html);

      if (step === "13A") {
        document.getElementById('btn-update-later')?.addEventListener('click', () => {
          this.closeModal();
          this.data.state.updateDismissed = true;
          this.refreshShell();
          this.showToast("Update deferred. You can update anytime from Update Center.");
        });

        document.getElementById('btn-update-download-now')?.addEventListener('click', () => {
          updateModal("13C", 30);
          setTimeout(() => updateModal("13C", 75), 400);
          setTimeout(() => updateModal("13D"), 800);
          setTimeout(() => updateModal("13E"), 1400);
        });
      } else if (step === "13C") {
        document.getElementById('btn-update-cancel-download')?.addEventListener('click', () => {
          this.closeModal();
          this.showToast("Download cancelled.");
        });
      } else if (step === "13E") {
        document.getElementById('btn-update-install-exit')?.addEventListener('click', () => {
          this.closeModal();
          this.showToast("Update will be installed when Nexora closes.");
        });

        document.getElementById('btn-update-restart-now')?.addEventListener('click', () => {
          updateModal("13G");
        });
      } else if (step === "13G") {
        document.getElementById('btn-update-finish')?.addEventListener('click', () => {
          this.closeModal();
          this.showToast("Running Nexora v1.1.0 update simulation.");
        });
      }
    };

    updateModal("13A");
  }

  // =========================================================================
  // GENERAL MODAL & TOAST MANAGERS
  // =========================================================================

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
    document.getElementById('active-modal-wrapper')?.remove();
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
