/**
 * LiveBridgeAdapter.js - Phase 6.2 Live Bridge Adapter
 *
 * Communicates directly with window.nexoraBridge IPC facade.
 * Normalizes backend PowerShell responses into structured renderer domain objects.
 * Production mode uses ONLY this adapter; zero fallback to mock sample data.
 */

export const MODE_TITLE_MAP = {
  "frontend": "Frontend Development",
  "backend": "Backend Development",
  "fullstack": "Full Stack Development",
  "qa": "QA / Debugging"
};

export const TARGET_TITLE_MAP = {
  "web_application": "Web Application",
  "website": "Website",
  "mobile_application": "Mobile Application",
  "web_backend": "Web/App Backend",
  "api_service": "API/Service",
  "database_layer": "Database/Data Layer",
  "full_project": "Full Project"
};

export const LiveBridgeAdapter = {
  mode: 'LIVE',
  isLiveMode: true,

  state: {
    isOffline: false,
    updateDismissed: false,
    appUpdateAvailable: false,
    engineStatus: 'starting',
    engineHealthy: false,
    version: '1.0.0',
    lastError: null,
    activeProjectId: null
  },

  /**
   * Check if window.nexoraBridge is available
   */
  isBridgeAvailable() {
    return typeof window !== 'undefined' && window.nexoraBridge && typeof window.nexoraBridge.invoke === 'function';
  },

  /**
   * Safe bridge invocation wrapper
   */
  async _invokeBridge(operation, payload = {}) {
    if (!this.isBridgeAvailable()) {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_unavailable',
        success: false,
        data: null,
        error: {
          code: 'BRIDGE_UNAVAILABLE',
          message: 'Nexora Desktop IPC bridge is unavailable in this environment.',
          retryable: true
        }
      };
    }

    try {
      return await window.nexoraBridge.invoke(operation, payload);
    } catch (err) {
      return {
        schemaVersion: '1.0.0',
        requestId: 'req_ipc_error',
        success: false,
        data: null,
        error: {
          code: 'BRIDGE_PROTOCOL_ERROR',
          message: err.message || 'IPC protocol communication failure.',
          retryable: true
        }
      };
    }
  },

  /**
   * Desktop folder picker dialog
   */
  async selectProjectFolder() {
    if (typeof window !== 'undefined' && window.nexoraBridge && typeof window.nexoraBridge.selectProjectFolder === 'function') {
      return await window.nexoraBridge.selectProjectFolder();
    }
    return { canceled: true, path: null };
  },

  /**
   * Live application.initialize
   */
  async initialize() {
    const res = await this._invokeBridge('application.initialize');
    if (res.success && res.data) {
      this.state.engineStatus = res.data.engineStatus || 'ready';
      this.state.engineHealthy = res.data.engineHealthy !== false;
      this.state.lastError = null;

      return {
        success: true,
        data: this.normalizeStatus(res.data)
      };
    }

    const err = res.error || { code: 'INITIALIZATION_FAILED', message: 'Failed to initialize Nexora backend engine.', retryable: true };
    this.state.engineStatus = 'error';
    this.state.engineHealthy = false;
    this.state.lastError = err;

    return {
      success: false,
      error: err
    };
  },

  /**
   * Live application.status
   */
  async getStatus() {
    const res = await this._invokeBridge('application.status');
    if (res.success && res.data) {
      this.state.engineStatus = res.data.engineStatus || 'ready';
      this.state.engineHealthy = res.data.engineHealthy !== false;
      return {
        success: true,
        data: this.normalizeStatus(res.data)
      };
    }
    return res;
  },

  /**
   * Live updates.status
   */
  async getUpdateStatus() {
    const res = await this._invokeBridge('updates.status');
    if (res.success && res.data) {
      return {
        currentVersion: res.data.currentVersion || '1.0.0',
        latestVersion: null,
        updateAvailable: null,
        checkedRemotely: false,
        channel: res.data.channel || 'stable'
      };
    }
    return {
      currentVersion: '1.0.0',
      latestVersion: null,
      updateAvailable: null,
      checkedRemotely: false,
      channel: 'stable'
    };
  },

  // =========================================================================
  // GATE 4: LIVE PROJECT MANAGEMENT OPERATIONS
  // =========================================================================

  /**
   * Live projects.list
   */
  async getProjectsList() {
    const res = await this._invokeBridge('projects.list');
    if (res.success && Array.isArray(res.data)) {
      return res.data.map(p => this.normalizeProjectProfile(p));
    }
    return [];
  },

  /**
   * Live projects.validate
   */
  async validateProjectPath(path) {
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      return {
        isValid: false,
        path: path || '',
        isDirectory: false,
        isAccessible: false,
        reason: "Path parameter must be a non-empty string"
      };
    }
    const res = await this._invokeBridge('projects.validate', { path: path.trim() });
    if (res.success && res.data) {
      return res.data;
    }
    return {
      isValid: false,
      path: path,
      isDirectory: false,
      isAccessible: false,
      reason: (res.error && res.error.message) || "Validation failed"
    };
  },

  /**
   * Live projects.add
   */
  async addProject(path) {
    const res = await this._invokeBridge('projects.add', { path: path.trim() });

    if (!res.success && res.error && res.error.code === 'BRIDGE_TIMEOUT_UNKNOWN_STATE') {
      const list = await this.getProjectsList();
      const existing = list.find(p => p.path && p.path.toLowerCase() === path.trim().toLowerCase());
      if (existing) {
        this.state.activeProjectId = existing.projectId;
        return {
          success: true,
          projectId: existing.projectId,
          project: existing,
          reconciledAfterTimeout: true
        };
      }
    }

    if (res.success && res.data) {
      const projId = res.data.projectId || (res.data.project && res.data.project.id);
      this.state.activeProjectId = projId;

      return {
        success: true,
        projectId: projId,
        project: this.normalizeProjectProfile(res.data.project || { id: projId, path }),
        analysis: res.data.analysis || null,
        message: res.data.message || 'Project added successfully'
      };
    }

    return {
      success: false,
      error: res.error || { code: 'ADD_PROJECT_FAILED', message: res.data ? res.data.message : 'Failed to add project', retryable: false }
    };
  },

  /**
   * Live projects.profile
   */
  async getProjectProfile(projectId) {
    if (!projectId || typeof projectId !== 'string') return null;
    const res = await this._invokeBridge('projects.profile', { projectId });
    if (res.success && res.data && res.data.project) {
      return this.normalizeProjectProfile(res.data.project, res.data);
    }
    return null;
  },

  /**
   * Live projects.analyze
   */
  async analyzeProject(path) {
    if (!path || typeof path !== 'string') {
      return { success: false, error: { code: 'INVALID_PATH', message: 'Path parameter must be a string' } };
    }
    const res = await this._invokeBridge('projects.analyze', { path });
    if (res.success && res.data) {
      return {
        success: true,
        analysis: res.data.analysis || res.data,
        recommendations: res.data.recommendations || []
      };
    }
    return {
      success: false,
      error: res.error || { code: 'ANALYSIS_FAILED', message: 'Failed to analyze project path' }
    };
  },

  /**
   * Live projects.remove (Removes project from Nexora projects.json registry ONLY; 0 source files deleted)
   */
  async removeProject(projectId) {
    if (!projectId || typeof projectId !== 'string') {
      return { success: false, error: { code: 'INVALID_PROJECT_ID', message: 'Project ID must be a string' } };
    }
    const res = await this._invokeBridge('projects.remove', { projectId });
    if (res.success && res.data) {
      if (this.state.activeProjectId === projectId) {
        this.state.activeProjectId = null;
      }
      return { success: true, message: 'Project removed from Nexora registry' };
    }
    return {
      success: false,
      error: res.error || { code: 'REMOVE_FAILED', message: res.data ? res.data.message : 'Failed to remove project' }
    };
  },

  // =========================================================================
  // GATE 5: LIVE WORKING CONTEXT & RECOMMENDATION OPERATIONS
  // =========================================================================

  /**
   * Live context.get
   */
  async getWorkingContext(projectId) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId || typeof projId !== 'string') {
      return { success: false, workingMode: null, target: null };
    }
    const res = await this._invokeBridge('context.get', { projectId: projId });
    if (res.success && res.data) {
      return {
        success: true,
        projectId: res.data.projectId || projId,
        workingMode: res.data.workingMode || res.data.mode || null,
        target: res.data.target || null
      };
    }
    return { success: false, workingMode: null, target: null };
  },

  /**
   * Live context.set (with mutating timeout reconciliation)
   */
  async setWorkingContext(projectId, workingMode = null, target = null) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId || typeof projId !== 'string') {
      return { success: false, error: { code: 'INVALID_PROJECT_ID', message: 'Project ID is required' } };
    }

    const payload = { projectId: projId, mode: workingMode, target };
    const res = await this._invokeBridge('context.set', payload);

    if (!res.success && res.error && res.error.code === 'BRIDGE_TIMEOUT_UNKNOWN_STATE') {
      const reconciled = await this.getWorkingContext(projId);
      if (reconciled.success && reconciled.workingMode === workingMode) {
        return {
          success: true,
          workingMode: reconciled.workingMode,
          target: reconciled.target,
          reconciledAfterTimeout: true
        };
      }
    }

    if (res.success && res.data) {
      return {
        success: true,
        workingMode: res.data.workingMode || res.data.mode || workingMode,
        target: res.data.target || target
      };
    }

    return {
      success: false,
      error: res.error || { code: 'CONTEXT_SET_FAILED', message: (res.data && res.data.message) || 'Failed to update working context' }
    };
  },

  /**
   * Live recommendations.get (Uses existing valid analysis + context; 0 project rescan)
   */
  async getRecommendedSkills(projectId = null, mode = null, target = null) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId) return [];

    const payload = { projectId: projId };
    if (mode) payload.mode = mode;
    if (target) payload.target = target;

    const res = await this._invokeBridge('recommendations.get', payload);

    if (!res.success && res.error && res.error.retryable) {
      const retryRes = await this._invokeBridge('recommendations.get', payload);
      if (retryRes.success && Array.isArray(retryRes.data)) {
        return retryRes.data.map(r => this.normalizeRecommendation(r));
      }
    }

    if (res.success && Array.isArray(res.data)) {
      return res.data.map(r => this.normalizeRecommendation(r));
    }
    return [];
  },

  /**
   * Normalization layer for single skill recommendation
   */
  normalizeRecommendation(rawRec) {
    if (!rawRec) return null;
    const skillId = rawRec.skillId || rawRec.SkillId || rawRec.id || 'unknown-skill';
    const scoreVal = typeof rawRec.score === 'number' ? rawRec.score : (typeof rawRec.Score === 'number' ? rawRec.Score : 70);

    return {
      skillId,
      id: skillId,
      name: rawRec.name || skillId,
      category: rawRec.category || rawRec.Pack || 'General',
      matchScore: scoreVal,
      matchReason: rawRec.matchReason || rawRec.MatchReason || 'Matches project stack and working context',
      compatibility: 'Compatible',
      conflicts: [],
      alreadyActive: false,
      recommended: true,
      preselected: false
    };
  },

  // =========================================================================
  // GATE 6: LIVE SKILL LIFECYCLE & PLATFORM OPERATIONS
  // =========================================================================

  /**
   * Live skills.catalog
   */
  async getSkillCatalog() {
    const res = await this._invokeBridge('skills.catalog');
    if (res.success && Array.isArray(res.data)) {
      return res.data.map(item => this.normalizeSkillCatalogItem(item));
    }
    return [];
  },

  /**
   * Normalization layer for skill catalog item
   */
  normalizeSkillCatalogItem(item) {
    if (!item) return null;
    const id = item.Id || item.id || item.skillId || 'unknown-skill';
    return {
      id,
      skillId: id,
      name: item.Name || item.name || id,
      description: item.Description || item.description || 'Installed Nexora agent skill',
      category: item.Category || item.category || item.Pack || 'General',
      version: item.Version || item.version || 'v1.0.0',
      source: item.Source || item.source || 'Local Installation',
      dependencies: item.Dependencies || item.dependencies || [],
      conflicts: item.Conflicts || item.conflicts || [],
      compatibility: 'Compatible',
      installed: true,
      active: false
    };
  },

  /**
   * Live skills.active
   */
  async getActiveSkills(projectId = null) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId || typeof projId !== 'string') return [];

    const res = await this._invokeBridge('skills.active', { projectId: projId });
    if (res.success && res.data) {
      const rawList = Array.isArray(res.data) ? res.data : (typeof res.data === 'string' ? [res.data] : []);
      const catalog = await this.getSkillCatalog();
      return rawList.map(item => {
        const id = typeof item === 'string' ? item : (item.id || item.skillId || item.Id);
        const catMatch = catalog.find(c => c.id === id);
        return {
          id,
          skillId: id,
          name: catMatch ? catMatch.name : (item.name || item.Name || id),
          category: catMatch ? catMatch.category : (item.category || item.Category || 'Active Skill'),
          version: catMatch ? catMatch.version : (item.version || item.Version || 'v1.0.0'),
          status: 'Active',
          platforms: item.platforms || item.Platforms || ['Google Antigravity'],
          activatedAt: item.activatedAt || item.ActivatedAt || null
        };
      });
    }
    return [];
  },

  /**
   * Live platforms.list (strictly approved platform definitions)
   */
  async getPlatformsList() {
    const res = await this._invokeBridge('platforms.list');
    const approvedMap = {
      'antigravity': { id: 'antigravity', name: 'Google Antigravity', description: 'Native Antigravity agent skills (.agents/skills/)' },
      'cursor': { id: 'cursor', name: 'Cursor', description: 'Cursor editor system prompt rules (.cursor/rules/)' },
      'copilot': { id: 'copilot', name: 'GitHub Copilot', description: 'GitHub Copilot repository instructions (.github/copilot-instructions.md)' }
    };

    if (res.success && Array.isArray(res.data)) {
      return res.data
        .map(p => typeof p === 'string' ? p.toLowerCase() : (p.id ? p.id.toLowerCase() : ''))
        .filter(id => approvedMap[id])
        .map(id => approvedMap[id]);
    }

    return Object.values(approvedMap);
  },

  /**
   * Live platforms.preferences.get
   */
  async getPlatformPreferences(projectId = null) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId) return ['antigravity', 'cursor'];

    const res = await this._invokeBridge('platforms.preferences.get', { projectId: projId });
    if (res.success && res.data && Array.isArray(res.data.platforms)) {
      return res.data.platforms;
    }
    return ['antigravity', 'cursor'];
  },

  /**
   * Live platforms.preferences.set (Updates preferences only; 0 skill activations or file deployments)
   */
  async setPlatformPreferences(projectId = null, platforms = []) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId) return { success: false, error: { code: 'INVALID_PROJECT_ID', message: 'Project ID is required' } };

    const cleanPlatforms = platforms.map(p => p.toLowerCase());
    const res = await this._invokeBridge('platforms.preferences.set', { projectId: projId, platforms: cleanPlatforms });
    if (res.success) {
      return { success: true, platforms: cleanPlatforms };
    }
    return { success: false, error: res.error || { code: 'PREFERENCES_SET_FAILED', message: 'Failed to update platform preferences' } };
  },

  /**
   * Live skills.activate (Explicit user activation only)
   */
  async activateSkills(projectId = null, skillIds = [], platforms = []) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId || typeof projId !== 'string') {
      return { success: false, overallStatus: 'failure', error: { code: 'INVALID_PROJECT_ID', message: 'Project ID is required' } };
    }
    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return { success: false, overallStatus: 'failure', error: { code: 'INVALID_SKILLS', message: 'At least one skill ID is required' } };
    }
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return { success: false, overallStatus: 'failure', error: { code: 'INVALID_PLATFORMS', message: 'At least one target platform is required' } };
    }

    const payload = { projectId: projId, skillIds, platforms };
    const res = await this._invokeBridge('skills.activate', payload);

    // Mutating Timeout Reconciliation: verify active skills if timeout occurred
    if (!res.success && res.error && res.error.code === 'BRIDGE_TIMEOUT_UNKNOWN_STATE') {
      const activeAfter = await this.getActiveSkills(projId);
      const activeIds = activeAfter.map(a => a.id);
      const allActivated = skillIds.every(id => activeIds.includes(id));
      if (allActivated) {
        return {
          success: true,
          overallStatus: 'success',
          activatedSkills: skillIds,
          failedSkills: [],
          reconciledAfterTimeout: true
        };
      }
    }

    if (res.success && res.data) {
      const data = res.data;
      const count = data.ActivatedCount || (data.activeSkills ? data.activeSkills.length : skillIds.length);
      const isSuccess = data.Success !== false;
      const isPartial = data.PartialSuccess === true || (count > 0 && count < skillIds.length);

      return {
        success: isSuccess,
        overallStatus: isSuccess ? (isPartial ? 'partial' : 'success') : 'failure',
        activatedSkills: data.ActiveSkills || skillIds,
        failedSkills: data.FailedSkills || [],
        platformResults: data.Results || platforms.map(p => ({ platform: p, status: isSuccess ? 'Success' : 'Failed' })),
        message: data.Message || 'Skill activation completed'
      };
    }

    return {
      success: false,
      overallStatus: 'failure',
      error: res.error || { code: 'ACTIVATION_FAILED', message: 'Failed to activate selected skills' }
    };
  },

  /**
   * Live skills.deactivate (Explicit user deactivation only)
   */
  async deactivateSkill(projectId = null, skillId = null, platforms = []) {
    const projId = projectId || this.state.activeProjectId;
    if (!projId || typeof projId !== 'string') {
      return { success: false, error: { code: 'INVALID_PROJECT_ID', message: 'Project ID is required' } };
    }
    if (!skillId || typeof skillId !== 'string') {
      return { success: false, error: { code: 'INVALID_SKILL_ID', message: 'Skill ID is required' } };
    }

    const payload = { projectId: projId, skillId, platforms };
    const res = await this._invokeBridge('skills.deactivate', payload);

    // Mutating Timeout Reconciliation: verify active skills if timeout occurred
    if (!res.success && res.error && res.error.code === 'BRIDGE_TIMEOUT_UNKNOWN_STATE') {
      const activeAfter = await this.getActiveSkills(projId);
      const activeIds = activeAfter.map(a => a.id);
      if (!activeIds.includes(skillId)) {
        return {
          success: true,
          deactivatedSkill: skillId,
          reconciledAfterTimeout: true
        };
      }
    }

    if (res.success && res.data) {
      return {
        success: true,
        deactivatedSkill: skillId,
        message: res.data.Message || 'Skill deactivated successfully'
      };
    }

    return {
      success: false,
      error: res.error || { code: 'DEACTIVATION_FAILED', message: 'Failed to deactivate skill' }
    };
  },

  // =========================================================================
  // GATE 7: CROSS-PROJECT SKILL USAGE & PROTECTED GLOBAL REMOVAL OPERATIONS
  // =========================================================================

  /**
   * Live skills.usage
   */
  async getSkillUsage(skillId) {
    if (!skillId || typeof skillId !== 'string') {
      return { skillId: '', projectCount: 0, projects: [] };
    }

    const res = await this._invokeBridge('skills.usage', { skillId });
    if (res.success && Array.isArray(res.data)) {
      return {
        skillId,
        projectCount: res.data.length,
        projects: res.data.map(p => ({
          projectId: p.id || p.projectId,
          name: p.name || 'Unnamed Project',
          path: p.path || '',
          type: p.type || 'Managed Project',
          active: true,
          platforms: p.platforms || ['Google Antigravity']
        }))
      };
    }
    return { skillId, projectCount: 0, projects: [] };
  },

  /**
   * Live skills.globalRemoval.preview
   */
  async previewGlobalRemoval(skillId) {
    if (!skillId || typeof skillId !== 'string') {
      return {
        success: false,
        error: { code: 'INVALID_SKILL_ID', message: 'Skill ID is required for global removal preview' }
      };
    }

    const res = await this._invokeBridge('skills.globalRemoval.preview', { skillId });
    if (res.success && res.data) {
      return {
        success: true,
        operationId: res.data.operationId,
        skillId: res.data.skillId || skillId,
        affectedProjectCount: typeof res.data.affectedProjectCount === 'number' ? res.data.affectedProjectCount : (res.data.affectedProjects ? res.data.affectedProjects.length : 0),
        affectedProjects: res.data.affectedProjects || []
      };
    }

    return {
      success: false,
      error: res.error || { code: 'PREVIEW_FAILED', message: 'Failed to generate global removal preview' }
    };
  },

  /**
   * Live skills.globalRemoval.execute (Sends ONLY operationId)
   */
  async executeGlobalRemoval(operationId) {
    if (!operationId || typeof operationId !== 'string') {
      return {
        success: false,
        overallStatus: 'failure',
        error: { code: 'INVALID_OPERATION_ID', message: 'Valid operationId is required for execution' }
      };
    }

    // Exact contract: payload contains strictly 1 key { operationId }
    const payload = { operationId };
    const res = await this._invokeBridge('skills.globalRemoval.execute', payload);

    // Mutating Timeout Reconciliation
    if (!res.success && res.error && res.error.code === 'BRIDGE_TIMEOUT_UNKNOWN_STATE') {
      return {
        success: false,
        overallStatus: 'timeout_reconcile_required',
        reconciledAfterTimeout: true,
        error: res.error
      };
    }

    if (res.success && res.data) {
      const data = res.data;
      const isSuccess = data.success !== false;
      const total = data.totalAffected || 0;
      const succ = data.successCount || 0;
      const fail = data.failureCount || 0;
      const isPartial = fail > 0 && succ > 0;

      return {
        success: isSuccess,
        overallStatus: isSuccess ? (isPartial ? 'partial' : 'success') : 'failure',
        totalAffected: total,
        succeededCount: succ,
        failedCount: fail,
        projectResults: data.results || [],
        message: data.message || 'Global removal completed'
      };
    }

    return {
      success: false,
      overallStatus: 'failure',
      error: res.error || { code: 'REMOVAL_FAILED', message: (res.data && res.data.message) || 'Global removal execution failed' }
    };
  },

  /**
   * Normalization layer for single project profile
   */
  normalizeProjectProfile(rawProj, rawProfile = null) {
    if (!rawProj) return null;
    const meta = (rawProfile && rawProfile.metadata) || {};
    const analysis = (rawProfile && rawProfile.analysis) || {};

    const tech = analysis.detectedTechnologies || rawProj.detectedTechnologies || [];
    const frameworks = analysis.detectedFrameworks || rawProj.detectedFrameworks || [];

    const isMissing = rawProj.status === 'missing' || rawProj.missing === true;

    return {
      projectId: rawProj.id || rawProj.projectId,
      name: rawProj.name || meta.name || 'Unnamed Project',
      path: rawProj.path,
      type: rawProj.primaryType || rawProj.type || analysis.projectType || 'Unknown Project Type',
      developmentMode: rawProj.developmentMode || analysis.developmentMode || 'Full Stack',
      status: isMissing ? 'Missing' : 'Ready',
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : null,
      languages: tech.filter(t => ['Dart', 'TypeScript', 'JavaScript', 'Python', 'Go', 'PHP'].includes(t)),
      frontend: frameworks.filter(f => ['Flutter', 'React', 'Next.js', 'Vue', 'HTML / CSS'].includes(f)),
      backend: frameworks.filter(f => ['Supabase', 'FastAPI', 'Node.js', 'Laravel'].includes(f)),
      database: tech.filter(t => ['PostgreSQL', 'SQLite', 'MongoDB', 'MySQL'].includes(t)),
      qa: (analysis.qaTools || []),
      tooling: (analysis.markersFound || []),
      lastAnalyzed: rawProj.lastScan || meta.lastScan || null,
      missing: isMissing,
      moved: false,
      accessible: !isMissing
    };
  },

  /**
   * Normalization layer: transforms raw PowerShell envelope to canonical renderer state
   */
  normalizeStatus(rawData) {
    const rawVer = rawData.version || (rawData.updateStatus && rawData.updateStatus.currentVersion) || '1.0.0';
    const formattedVer = rawVer.startsWith('v') ? rawVer : `v${rawVer}`;
    const upd = rawData.updateStatus || {};
    return {
      schemaVersion: '1.0.0',
      state: rawData.engineStatus || 'ready',
      health: rawData.engineHealthy !== false ? 'healthy' : 'attention',
      version: formattedVer,
      updateStatus: {
        currentVersion: upd.currentVersion || '1.0.0',
        latestVersion: null,
        updateAvailable: null,
        checkedRemotely: false
      },
      offline: null, // Internet connectivity is not evaluated by local engine
      message: rawData.engineHealthy !== false ? 'Engine ready' : 'Engine initialized with warnings'
    };
  },

  /**
   * Safe status pill text generation
   */
  getStatusPillText() {
    if (!this.isBridgeAvailable()) {
      return '● Bridge Unavailable';
    }
    if (this.state.engineStatus === 'error') {
      return '● Engine Error | Attention Required';
    }
    if (this.state.isOffline === true) {
      return '● Offline (Local Mode)';
    }
    const ver = this.state.version || 'v1.0.0';
    const formattedVer = ver.startsWith('v') ? ver : `v${ver}`;
    return `● Healthy | Version ${formattedVer}`;
  },

  // =========================================================================
  // GATE 8: LIVE DOCTOR DIAGNOSTICS & SYSTEM HEALTH REPAIR
  // =========================================================================

  /**
   * Live doctor.run
   */
  async getHealthChecks() {
    const res = await this._invokeBridge('doctor.run');
    if (res.success && res.data) {
      const data = res.data;
      const rawChecks = Array.isArray(data.checks) ? data.checks : [];
      const normalizedChecks = rawChecks.map(c => this.normalizeHealthCheck(c));

      // Compute overall status from authoritative checks
      let overall = 'healthy';
      if (normalizedChecks.some(c => c.status === 'Error')) {
        overall = 'error';
      } else if (normalizedChecks.some(c => c.status === 'Warning')) {
        overall = 'warning';
      } else if (normalizedChecks.some(c => c.status === 'Unknown')) {
        overall = 'unknown';
      }

      return {
        overallStatus: overall,
        healthy: data.healthy !== false && overall === 'healthy',
        runtimePath: data.runtimePath || '',
        checks: normalizedChecks,
        repairsApplied: data.repairsApplied || []
      };
    }

    return {
      overallStatus: 'unknown',
      healthy: false,
      runtimePath: '',
      checks: [],
      repairsApplied: [],
      error: res.error || { code: 'HEALTH_CHECK_FAILED', message: 'Health status unavailable' }
    };
  },

  /**
   * Normalization layer for diagnostic health check item
   */
  normalizeHealthCheck(c) {
    if (!c) return null;
    const rawStatus = (c.status || c.Status || 'UNKNOWN').toString().toUpperCase();
    let mappedStatus = 'Unknown';
    if (rawStatus === 'OK' || rawStatus === 'HEALTHY' || rawStatus === 'PASS') {
      mappedStatus = 'Healthy';
    } else if (rawStatus === 'WARN' || rawStatus === 'WARNING') {
      mappedStatus = 'Warning';
    } else if (rawStatus === 'FAIL' || rawStatus === 'ERROR') {
      mappedStatus = 'Error';
    }

    const id = c.id || c.Id || 'unknown_check';
    const label = c.label || c.name || c.Name || id;

    return {
      id,
      label,
      name: label,
      status: mappedStatus,
      detail: c.detail || c.Detail || '',
      repairable: c.repairable === true || c.Repairable === true
    };
  },

  /**
   * Live doctor.repair
   */
  async repairHealth(categoryId = null) {
    const payload = categoryId ? { categoryId } : {};
    const res = await this._invokeBridge('doctor.repair', payload);

    // Mutating Timeout Reconciliation: re-verify via doctor.run
    if (!res.success && res.error && res.error.code === 'BRIDGE_TIMEOUT_UNKNOWN_STATE') {
      const refreshed = await this.getHealthChecks();
      return {
        success: refreshed.overallStatus === 'healthy',
        reconciledAfterTimeout: true,
        health: refreshed,
        message: 'System state reconciled after timeout'
      };
    }

    if (res.success && res.data) {
      const refreshed = await this.getHealthChecks();
      return {
        success: true,
        repairsApplied: res.data.repairsApplied || [],
        health: refreshed,
        message: 'Diagnostics repaired successfully'
      };
    }

    return {
      success: false,
      error: res.error || { code: 'REPAIR_FAILED', message: 'Failed to apply diagnostic repairs' }
    };
  },

  // =========================================================================
  // GATE 9: LIVE ACTIVITY TIMELINE & LOCAL UPDATE CENTER
  // =========================================================================

  /**
   * Live activity.list
   */
  async getActivityLogs(projectId = null, limit = 50) {
    const payload = {};
    if (projectId) payload.projectId = projectId;
    if (typeof limit === 'number' && limit > 0) payload.limit = limit;

    const res = await this._invokeBridge('activity.list', payload);
    if (res.success && Array.isArray(res.data)) {
      return res.data.map(e => this.normalizeActivityLog(e)).filter(Boolean);
    }

    if (res.error) {
      return {
        error: res.error,
        message: 'Activity unavailable'
      };
    }

    return [];
  },

  /**
   * Normalization layer for activity log entry
   */
  normalizeActivityLog(e) {
    if (!e) return null;
    const cat = (e.eventType || 'SYSTEM').toUpperCase();
    let displayCategory = 'System';
    if (cat.includes('PROJECT')) displayCategory = 'Projects';
    else if (cat.includes('SKILL')) displayCategory = 'Skills';
    else if (cat.includes('ANALYZ') || cat.includes('ANALYSIS')) displayCategory = 'Analysis';
    else if (cat.includes('UPDATE')) displayCategory = 'Updates';

    const rawMeta = e.metadata || {};
    // Sanitize metadata: remove forbidden secret tokens or internal fields
    const safeMeta = {};
    const forbiddenKeys = ['confirmationtoken', 'token', 'operationid', 'projectfingerprint', 'fingerprint', 'ttl', 'expiresat'];
    for (const [k, v] of Object.entries(rawMeta)) {
      if (!forbiddenKeys.includes(k.toLowerCase())) {
        safeMeta[k] = v;
      }
    }

    return {
      id: e.eventId || e.id || 'act_event',
      eventId: e.eventId || e.id || 'act_event',
      projectId: e.projectId || null,
      projectName: e.projectName || 'Project',
      timestamp: e.timestamp || '',
      category: displayCategory,
      eventType: e.eventType || 'SYSTEM',
      title: e.userSafeMessage || e.title || e.message || 'Operation recorded',
      message: e.userSafeMessage || e.message || e.title || '',
      details: e.projectName ? `Project: ${e.projectName}` : '',
      source: e.source || 'engine',
      metadata: safeMeta
    };
  },

  /**
   * Live updates.status
   */
  async getUpdateStatus() {
    const res = await this._invokeBridge('updates.status');
    if (res.success && res.data) {
      return this.normalizeUpdateStatus(res.data);
    }

    return {
      currentVersion: 'v1.0.0',
      latestVersion: null,
      updateAvailable: null,
      checkedRemotely: false,
      channel: 'stable',
      status: 'Update status unavailable',
      message: 'Could not resolve local update metadata',
      error: res.error || { code: 'UPDATE_STATUS_FAILED', message: 'Update status unavailable' }
    };
  },

  /**
   * Normalization layer for update status
   */
  normalizeUpdateStatus(u) {
    if (!u) return null;
    const cur = u.currentVersion || '1.0.0';
    const formattedCur = cur.startsWith('v') ? cur : `v${cur}`;

    return {
      currentVersion: formattedCur,
      latestVersion: u.latestVersion || null,
      updateAvailable: u.updateAvailable === true ? true : (u.updateAvailable === false ? false : null),
      checkedRemotely: u.checkedRemotely === true,
      channel: u.channel || 'stable',
      status: u.status || 'Local installation verified',
      message: u.message || `Local ${formattedCur} verified. Remote update checks not performed.`,
      checkedAt: u.checkedAt || null
    };
  },

  /**
   * Local update modules presentation
   */
  async getUpdateModules() {
    const status = await this.getUpdateStatus();
    const ver = status.currentVersion || 'v1.0.0';

    return [
      {
        name: "Core Engine",
        installedVersion: ver,
        availableVersion: status.latestVersion,
        status: "Local verified",
        description: "PowerShell runtime engine, orchestrator, and registry facade."
      },
      {
        name: "Skill Library",
        installedVersion: ver,
        availableVersion: status.latestVersion,
        status: "Local verified",
        description: "Official 48 skill packages across 16 taxonomies."
      },
      {
        name: "Platform Adapters",
        installedVersion: ver,
        availableVersion: status.latestVersion,
        status: "Local verified",
        description: "Google Antigravity, Cursor, and GitHub Copilot deployment adapters."
      }
    ];
  },

  // Gate 3 Unintegrated Module Stubs
  sampleProject: null,
  allProjects: [],
  activeSkills: [],
  recommendedSkills: [],
  skillCatalog: [],
  healthChecks: [],
  updateModules: [],
  platforms: [],
  activityLogs: [],

  async getProject() {
    if (!this.state.activeProjectId) {
      const list = await this.getProjectsList();
      if (list.length > 0) this.state.activeProjectId = list[0].projectId;
    }
    if (this.state.activeProjectId) {
      return await this.getProjectProfile(this.state.activeProjectId);
    }
    return null;
  },
  async getPlatforms() { return this.getPlatformsList(); }
};
