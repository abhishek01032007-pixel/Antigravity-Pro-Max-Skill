/**
 * ============================================================================
 * NEXORA SKILLS MANAGER - MAIN APP CONTROLLER (app.js)
 * Phase 6.2 Gate 3: Live Application Lifecycle + Status Integration
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
import { SettingsAboutScreen } from './screens/SettingsAboutScreen.js';

class NexoraApp {
  constructor() {
    this.data = BridgeService;
    this.currentView = "startup";
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
      "settings": SettingsAboutScreen
    };
  }

  async init() {
    const root = document.getElementById('app-root');
    if (!root) return;

    // Render Shell with initial state
    root.innerHTML = NexoraAppShell.render(this.currentView, {
      isOffline: this.data.state ? !!this.data.state.isOffline : false,
      hasUpdate: this.data.state ? (!!this.data.state.appUpdateAvailable && !this.data.state.updateDismissed) : false,
      showDevControls: !this.data.isLiveMode
    });
    this.attachShellEvents();

    // Start live startup lifecycle
    await this.runStartupFlow();
  }

  async runStartupFlow() {
    if (this.isInitializing) return this.initPromise;
    this.isInitializing = true;

    this.initPromise = (async () => {
      await this.navigate("startup", { status: "initializing" });

      try {
        const initRes = await this.data.initialize();
        if (initRes && initRes.success) {
          await this.data.getStatus();
          this.refreshShell();
          await this.navigate("startup", { status: "ready" });
        } else {
          const err = (initRes && initRes.error) || { message: "Failed to initialize Nexora backend engine.", code: "INITIALIZATION_FAILED" };
          await this.navigate("startup", { status: "error", errorMsg: err.message, errorCode: err.code });
        }
      } catch (err) {
        await this.navigate("startup", { status: "error", errorMsg: err.message || "Bridge communication error.", errorCode: "BRIDGE_UNAVAILABLE" });
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
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
      btn.addEventListener('click', () => this.navigate('settings'));
    });

    // Offline Toggle
    document.getElementById('btn-topbar-offline-toggle')?.addEventListener('click', () => {
      if (this.data.toggleOffline) {
        const isOff = this.data.toggleOffline();
        this.showToast(isOff ? "Offline Mode enabled." : "Offline Mode disabled. Online.");
      }
      this.refreshShell();
      this.navigate(this.currentView);
    });

    // Top bar notifications
    document.getElementById('btn-topbar-notifications')?.addEventListener('click', () => {
      this.navigate('activity');
    });
  }

  refreshShell() {
    if (typeof document === 'undefined') return;
    const root = document.getElementById('app-root');
    if (!root) return;

    let statusPillText = '● Healthy | Up to date';
    if (this.data.getStatusPillText) {
      statusPillText = this.data.getStatusPillText();
    }

    root.innerHTML = NexoraAppShell.render(this.currentView, {
      isOffline: this.data.state ? !!this.data.state.isOffline : false,
      hasUpdate: this.data.state ? (!!this.data.state.appUpdateAvailable && !this.data.state.updateDismissed) : false,
      showDevControls: !this.data.isLiveMode
    });
    this.attachShellEvents();
  }

  async navigate(viewName, params = {}) {
    this.currentView = viewName;
    this.viewParams = params;

    if (typeof document !== 'undefined') {
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
      if (outlet) {
        let renderParams = { ...params };
        if (this.data.isLiveMode) {
          if (!renderParams.projectsList && this.data.getProjectsList) {
            const liveProjects = await this.data.getProjectsList();
            renderParams.projectsList = liveProjects;
          }
          if (renderParams.projectsList && renderParams.projectsList.length > 0 && !renderParams.activeProject) {
            renderParams.activeProject = renderParams.projectsList[0];
          }
          if (renderParams.activeProject && !renderParams.workingContext && this.data.getWorkingContext) {
            renderParams.workingContext = await this.data.getWorkingContext(renderParams.activeProject.projectId);
            renderParams.workingMode = renderParams.workingContext.workingMode;
            renderParams.target = renderParams.workingContext.target;
          }
          if (renderParams.activeProject && !renderParams.recommendations && this.data.getRecommendedSkills) {
            renderParams.recommendations = await this.data.getRecommendedSkills(
              renderParams.activeProject.projectId,
              renderParams.workingMode,
              renderParams.target
            );
          }
          if (viewName === 'skill-library' && !renderParams.catalog && this.data.getSkillCatalog) {
            renderParams.catalog = await this.data.getSkillCatalog();
          }
          if (viewName === 'active-skills' && renderParams.activeProject && !renderParams.activeSkills && this.data.getActiveSkills) {
            renderParams.activeSkills = await this.data.getActiveSkills(renderParams.activeProject.projectId);
          }
          if (viewName === 'platform-selection' && renderParams.activeProject) {
            if (!renderParams.platforms && this.data.getPlatformsList) {
              renderParams.platforms = await this.data.getPlatformsList();
            }
            if (!renderParams.savedPlatforms && this.data.getPlatformPreferences) {
              renderParams.savedPlatforms = await this.data.getPlatformPreferences(renderParams.activeProject.projectId);
            }
          }
          if (viewName === 'skill-detail' && renderParams.activeProject) {
            if (!renderParams.catalog && this.data.getSkillCatalog) renderParams.catalog = await this.data.getSkillCatalog();
            if (!renderParams.activeSkills && this.data.getActiveSkills) renderParams.activeSkills = await this.data.getActiveSkills(renderParams.activeProject.projectId);
          }
          if (viewName === 'cross-project') {
            const sId = renderParams.skillId || (params && params.skillId) || 'flutter-build-responsive-layout';
            renderParams.skillId = sId;
            if (!renderParams.usage && this.data.getSkillUsage) {
              renderParams.usage = await this.data.getSkillUsage(sId);
            }
          }
          if (viewName === 'system-health') {
            if (!renderParams.health && this.data.getHealthChecks) {
              renderParams.health = await this.data.getHealthChecks();
            }
          }
          if (viewName === 'recent-activity') {
            if (!renderParams.activityLogs && this.data.getActivityLogs) {
              renderParams.activityLogs = await this.data.getActivityLogs();
            }
          }
          if (viewName === 'update-center') {
            if (!renderParams.updateStatus && this.data.getUpdateStatus) {
              renderParams.updateStatus = await this.data.getUpdateStatus();
            }
            if (!renderParams.updateModules && this.data.getUpdateModules) {
              renderParams.updateModules = await this.data.getUpdateModules();
            }
          }
        }

        const screen = this.screens[viewName] || DashboardScreen;
        outlet.innerHTML = screen.render(this.data, renderParams);

        if (screen.attachEvents) {
          screen.attachEvents(this);
        }
      }
    }
  }

  // =========================================================================
  // WORKFLOW ITEM 1, 2, 3, 4: DEVELOPMENT MODE & TARGET SELECTION WIZARD
  // =========================================================================

  startModeSelectionWizard() {
    let selectedModeId = null;
    let selectedModeTitle = null;

    const sampleType = (this.data.sampleProject && this.data.sampleProject.type) || "Full Stack Application";
    const currentMode = (this.data.state && this.data.state.currentWorkingMode) || null;

    const html = WorkflowDialog.renderModeSelection(sampleType, currentMode);
    this.renderModal(html);

    document.querySelectorAll('.card-mode-option, .mode-option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.card-mode-option, .mode-option-card').forEach(c => c.style.borderColor = 'var(--color-outline-variant)');
        card.style.borderColor = 'var(--color-primary)';
        selectedModeId = card.getAttribute('data-mode-id');
        selectedModeTitle = card.getAttribute('data-mode-title');
        const nextBtn = document.getElementById('btn-wizard-next') || document.getElementById('btn-mode-continue');
        if (nextBtn) nextBtn.disabled = false;
      });
    });

    const handleNext = () => {
      if (selectedModeId) {
        this.startTargetSelectionWizard(selectedModeId, selectedModeTitle);
      }
    };

    document.getElementById('btn-wizard-next')?.addEventListener('click', handleNext);
    document.getElementById('btn-mode-continue')?.addEventListener('click', handleNext);
    document.getElementById('btn-wizard-cancel')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  startTargetSelectionWizard(modeId, modeTitle) {
    let selectedTarget = null;
    const targetMap = {
      "frontend": ["Web Application", "Website", "Mobile Application"],
      "backend": ["Web/App Backend", "API/Service", "Database/Data Layer"],
      "fullstack": ["Web Application", "Mobile Application"],
      "qa": ["Web Application", "Mobile Application", "Backend/API", "Full Project"]
    };
    const targets = targetMap[modeId] || (this.data.getDevelopmentTargets ? this.data.getDevelopmentTargets(modeId) : ["Web Application"]);

    const html = WorkflowDialog.renderTargetSelection(modeTitle, targets);
    this.renderModal(html);

    document.querySelectorAll('.chip-target-option, .target-option-card, .card-target-option').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip-target-option, .target-option-card, .card-target-option').forEach(c => {
          c.style.borderColor = 'var(--color-outline-variant)';
          c.style.backgroundColor = 'transparent';
        });
        chip.style.borderColor = 'var(--color-primary)';
        chip.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        selectedTarget = chip.getAttribute('data-target');
        const confirmBtn = document.getElementById('btn-wizard-confirm') || document.getElementById('btn-target-confirm');
        if (confirmBtn) confirmBtn.disabled = false;
      });
    });

    const handleConfirm = async () => {
      if (selectedTarget) {
        this.showRecalculationLoader(modeId, modeTitle, selectedTarget);
      }
    };

    document.getElementById('btn-wizard-confirm')?.addEventListener('click', handleConfirm);
    document.getElementById('btn-target-confirm')?.addEventListener('click', handleConfirm);
    document.getElementById('btn-wizard-back')?.addEventListener('click', () => this.startModeSelectionWizard());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  async showRecalculationLoader(modeId, modeTitle, targetName) {
    const html = InlineNotice.renderRecalculationLoader(modeTitle, targetName);
    this.renderModal(html);

    setTimeout(async () => {
      if (this.data.isLiveMode && this.data.setWorkingContext) {
        const targetBackendIdMap = {
          "Web Application": "web_application",
          "Website": "website",
          "Mobile Application": "mobile_application",
          "Web/App Backend": "web_backend",
          "API/Service": "api_service",
          "Database/Data Layer": "database_layer",
          "Backend/API": "api_service",
          "Full Project": "full_project"
        };
        const backendTargetId = targetBackendIdMap[targetName] || targetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await this.data.setWorkingContext(null, modeId, backendTargetId);
      } else if (this.data.setWorkingMode) {
        await this.data.setWorkingMode(modeTitle, targetName);
      }

      this.closeModal();
      this.showToast(`Working Mode updated to ${modeTitle} (${targetName}). Recommendations recalculated.`);
      this.navigate('dashboard');
    }, 600);
  }

  startAppUpdateFlow() {
    const html = UpdateProgressModal.renderAppUpdateModal("v1.1.0", "14.2 MB");
    this.renderModal(html);

    document.getElementById('btn-update-now')?.addEventListener('click', () => {
      document.getElementById('update-action-footer').innerHTML = `
        <div class="flex items-center gap-2 text-primary" style="font-size: var(--text-body-sm);">
          <span class="material-symbols-outlined spin">sync</span>
          <span>Downloading update package... (45%)</span>
        </div>
      `;
      setTimeout(() => {
        if (this.data.state) this.data.state.appUpdateAvailable = false;
        this.closeModal();
        this.showToast("Nexora Desktop updated successfully to v1.1.0!");
        this.refreshShell();
      }, 2000);
    });

    document.getElementById('btn-update-later')?.addEventListener('click', () => this.closeModal());
  }

  // =========================================================================
  // GATE 6: EXPLICIT ACTIVATION & DEACTIVATION MODAL HANDLERS
  // =========================================================================

  async showActivationConfirmationModal() {
    const proj = (this.viewParams && this.viewParams.activeProject) || (this.data.sampleProject ? this.data.sampleProject : { name: "Current Project", type: "Full Stack" });
    const mode = (this.viewParams && this.viewParams.workingMode) || (this.data.state && this.data.state.currentWorkingMode) || "General";
    const target = (this.viewParams && this.viewParams.target) || (this.data.state && this.data.state.currentTarget) || "Default";
    const selectedSkills = (this.data.state && this.data.state.selectedSkillIds) || [];
    const selectedPlatforms = (this.data.state && this.data.state.selectedPlatforms) || ["Google Antigravity", "Cursor"];
    const selectedPlatformIds = (this.data.state && this.data.state.selectedPlatformIds) || ["antigravity", "cursor"];

    if (selectedSkills.length === 0 || selectedPlatforms.length === 0) {
      this.showToast("Cannot activate: At least one skill and one AI platform must be selected.");
      return;
    }

    const html = WorkflowDialog.renderActivationConfirmation({
      project: proj,
      workingMode: mode,
      target: target,
      selectedSkills,
      selectedPlatforms
    });
    this.renderModal(html);

    document.getElementById('btn-confirm-activation')?.addEventListener('click', async () => {
      this.closeModal();

      let result = null;
      if (this.data.isLiveMode && this.data.activateSkills) {
        result = await this.data.activateSkills(proj.projectId, selectedSkills, selectedPlatformIds);
      } else {
        result = {
          success: true,
          overallStatus: "success",
          activatedSkills: selectedSkills,
          platformResults: selectedPlatforms.map(p => ({ platform: p, status: "Success" }))
        };
      }

      this.data.state.selectedSkillIds = [];
      const resHtml = WorkflowDialog.renderActivationResult({
        status: result.overallStatus || (result.success ? "success" : "failure"),
        activatedSkills: result.activatedSkills || selectedSkills,
        deployments: result.platformResults || selectedPlatforms.map(p => ({ platform: p, status: "Success" }))
      });
      this.renderModal(resHtml);

      document.getElementById('btn-result-done')?.addEventListener('click', () => {
        this.closeModal();
        this.navigate('dashboard');
      });
      document.getElementById('btn-result-view-active')?.addEventListener('click', () => {
        this.closeModal();
        this.navigate('active-skills');
      });
      document.getElementById('btn-result-retry')?.addEventListener('click', () => {
        this.closeModal();
        this.showActivationConfirmationModal();
      });
      document.getElementById('btn-result-retry-failed')?.addEventListener('click', () => {
        this.closeModal();
        this.showActivationConfirmationModal();
      });
      document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
      document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
    });

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  async showDeactivateModal(skillId, projectName = "Current Project") {
    const projId = (this.viewParams && this.viewParams.activeProject && this.viewParams.activeProject.projectId) || null;
    const selectedPlatformIds = (this.data.state && this.data.state.selectedPlatformIds) || ["antigravity", "cursor"];
    const confirmTitle = `Deactivate Skill: ${skillId}`;
    const confirmMsg = `Are you sure you want to deactivate '${skillId}' from '${projectName}'? This will undeploy the skill files from configured AI platform workspaces.`;

    if (confirm(`${confirmTitle}\n\n${confirmMsg}`)) {
      let res = null;
      if (this.data.isLiveMode && this.data.deactivateSkill) {
        res = await this.data.deactivateSkill(projId, skillId, selectedPlatformIds);
      } else {
        res = { success: true, message: `Skill ${skillId} deactivated` };
      }

      if (res && res.success) {
        this.showToast(`Skill '${skillId}' deactivated and undeployed successfully.`);
        if (this.currentView === 'active-skills' || this.currentView === 'dashboard') {
          this.navigate(this.currentView);
        } else {
          this.navigate('active-skills');
        }
      } else {
        this.showToast(`Failed to deactivate '${skillId}': ${(res && res.error && res.error.message) || 'Unknown error'}`);
      }
    }
  }

  // =========================================================================
  // GATE 7: PROTECTED GLOBAL REMOVAL WORKFLOW
  // =========================================================================

  async startGlobalRemovalFlow(skillId) {
    if (!skillId) return;

    let preview = null;
    if (this.data.isLiveMode && this.data.previewGlobalRemoval) {
      preview = await this.data.previewGlobalRemoval(skillId);
      if (!preview.success) {
        this.showToast(`Failed to generate global removal preview: ${(preview.error && preview.error.message) || 'Unknown error'}`);
        return;
      }
    } else {
      preview = {
        success: true,
        operationId: "op_mock_" + Date.now(),
        skillId,
        affectedProjectCount: (this.data.allProjects || []).length,
        affectedProjects: this.data.allProjects || []
      };
    }

    const html = WorkflowDialog.renderGlobalRemovalConfirmation({
      skillId: preview.skillId || skillId,
      affectedProjectCount: preview.affectedProjectCount,
      affectedProjects: preview.affectedProjects
    });
    this.renderModal(html);

    document.getElementById('btn-confirm-remove-all')?.addEventListener('click', async () => {
      this.closeModal();

      let result = null;
      if (this.data.isLiveMode && this.data.executeGlobalRemoval) {
        result = await this.data.executeGlobalRemoval(preview.operationId);
      } else {
        result = {
          success: true,
          overallStatus: "success",
          totalAffected: preview.affectedProjectCount,
          succeededCount: preview.affectedProjectCount,
          failedCount: 0,
          projectResults: (preview.affectedProjects || []).map(p => ({ name: p.name, success: true }))
        };
      }

      const resHtml = WorkflowDialog.renderGlobalRemovalResult({
        status: result.overallStatus || (result.success ? "success" : "failure"),
        skillId: preview.skillId || skillId,
        totalAffected: result.totalAffected || preview.affectedProjectCount,
        succeededCount: result.succeededCount || 0,
        failedCount: result.failedCount || 0,
        projectResults: result.projectResults || []
      });
      this.renderModal(resHtml);

      document.getElementById('btn-global-result-done')?.addEventListener('click', () => {
        this.closeModal();
        if (this.currentView === 'cross-project') {
          this.navigate('cross-project', { skillId });
        } else if (this.currentView === 'skill-detail') {
          this.navigate('skill-detail', { skillId });
        } else {
          this.navigate('dashboard');
        }
      });
      document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
    });

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  // =========================================================================
  // GATE 8: SYSTEM HEALTH REFRESH & REPAIR WORKFLOW
  // =========================================================================

  async refreshHealthStatus() {
    if (this._isRefreshingHealth) return;
    this._isRefreshingHealth = true;
    try {
      const health = this.data.getHealthChecks ? await this.data.getHealthChecks() : null;
      this.showToast("System health status refreshed.");
      this.navigate('system-health', { health });
    } finally {
      this._isRefreshingHealth = false;
    }
  }

  async startHealthRepairFlow(categoryId = null, categoryName = "All Diagnostic Warnings") {
    const html = WorkflowDialog.renderHealthRepairConfirmation({ categoryId, categoryName });
    this.renderModal(html);

    document.getElementById('btn-confirm-health-repair')?.addEventListener('click', async (e) => {
      this.closeModal();
      const id = e.currentTarget.getAttribute('data-id') || null;
      let res = null;
      if (this.data.repairHealth) {
        res = await this.data.repairHealth(id);
      } else {
        res = { success: true, repairsApplied: ["Environment shims verified", "Metadata verified"] };
      }

      const resHtml = WorkflowDialog.renderHealthRepairResult(res);
      this.renderModal(resHtml);

      document.getElementById('btn-health-repair-done')?.addEventListener('click', () => {
        this.closeModal();
        this.navigate('system-health', { health: res.health });
      });
      document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
    });

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  // =========================================================================
  // GATE 9: ACTIVITY TIMELINE & LOCAL UPDATE REFRESH
  // =========================================================================

  async refreshActivityTimeline(projectId = null) {
    if (this._isRefreshingActivity) return;
    this._isRefreshingActivity = true;
    try {
      const logs = this.data.getActivityLogs ? await this.data.getActivityLogs(projectId) : [];
      this.showToast("Activity history refreshed.");
      this.navigate('recent-activity', { activityLogs: logs });
    } finally {
      this._isRefreshingActivity = false;
    }
  }

  async refreshLocalUpdateStatus() {
    if (this._isRefreshingUpdates) return;
    this._isRefreshingUpdates = true;
    try {
      const status = this.data.getUpdateStatus ? await this.data.getUpdateStatus() : null;
      const modules = this.data.getUpdateModules ? await this.data.getUpdateModules() : [];
      this.showToast("Local update status refreshed.");
      this.navigate('update-center', { updateStatus: status, updateModules: modules });
    } finally {
      this._isRefreshingUpdates = false;
    }
  }

  showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'card';
    toast.style.cssText = 'padding: 12px 16px; background-color: var(--color-surface-container-high); border-color: var(--color-primary); color: var(--color-on-surface); font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    toast.innerHTML = `<div class="flex items-center gap-2"><span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 18px;">info</span><span>${message}</span></div>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  renderModal(htmlContent) {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 9000; display: flex; align-items: center; justify-content: center;';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = htmlContent;
  }

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  }
}

// Global App Initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.nexoraApp = new NexoraApp();
    window.nexoraApp.init();
  });
}

export { NexoraApp };
