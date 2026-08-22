/**
 * MockBridgeAdapter.js - Phase 6.1 UI Mock & Test Adapter
 *
 * Provides deterministic mock sample data for automated UI tests and browser prototyping.
 */

export const MockBridgeAdapter = {
  mode: 'MOCK',
  isLiveMode: false,

  // Locked Sample Project Data (Baseline v1.0.0)
  sampleProject: {
    id: "proj_academic_hub",
    name: "Academic Day Hub",
    path: "D:\\Projects\\academic_day_hub",
    type: "Full Stack Application",
    developmentMode: "Full Stack",
    confidence: 96,
    status: "Ready",
    languages: ["Dart"],
    frontend: ["Flutter"],
    backend: ["Supabase"],
    database: ["PostgreSQL"],
    qa: ["Flutter Test", "Dart Analyzer"],
    tooling: ["Flutter CLI", "Gradle"],
    markers: ["pubspec.yaml", "android/", "ios/", "analysis_options.yaml", "supabase_flutter_dep"],
    activeSkillCount: 6
  },

  // In-Memory Workflow State
  state: {
    isOffline: false,
    updateDismissed: false,
    appUpdateAvailable: true,
    skillSyncStatus: "up-to-date",
    currentWorkingMode: null,
    currentTarget: null,
    selectedSkillsForActivation: [
      "flutter-build-responsive-layout",
      "flutter-add-widget-test"
    ],
    selectedPlatforms: ["Google Antigravity", "Cursor"]
  },

  async selectProjectFolder() {
    return Promise.resolve({ canceled: false, path: "D:\\Projects\\academic_day_hub" });
  },
  async validateProjectPath(path) {
    if (!path || path.includes('nonexistent') || path.includes('invalid')) {
      return Promise.resolve({ isValid: false, path, isDirectory: false, isAccessible: false, reason: "Directory does not exist" });
    }
    return Promise.resolve({ isValid: true, path, isDirectory: true, isAccessible: true, reason: null });
  },
  async addProject(path) {
    if (path && path.includes('academic_day_hub')) {
      return Promise.resolve({ success: false, error: { code: 'PROJECT_ALREADY_REGISTERED', message: 'Project is already registered in Nexora' } });
    }
    return Promise.resolve({ success: true, projectId: 'proj_new', project: this.sampleProject });
  },
  async getProjectProfile(projectId) {
    return Promise.resolve(this.sampleProject);
  },
  async analyzeProject(path) {
    return Promise.resolve({ success: true, analysis: { projectType: 'Full Stack Application', developmentMode: 'Full Stack', confidence: 96 } });
  },
  async getWorkingContext(projectId) {
    return Promise.resolve({
      success: true,
      projectId: projectId || "proj_academic_hub",
      workingMode: this.state.currentWorkingMode,
      target: this.state.currentTarget
    });
  },

  async setWorkingContext(projectId, workingMode = null, target = null) {
    this.state.currentWorkingMode = workingMode;
    this.state.currentTarget = target;
    return Promise.resolve({
      success: true,
      workingMode,
      target
    });
  },

  async getRecommendedSkills(projectId = null, mode = null, target = null) {
    return Promise.resolve(this.recommendedSkills || []);
  },

  async getSkillCatalog() {
    return Promise.resolve(this.skillCatalog || []);
  },

  async getActiveSkills(projectId = null) {
    return Promise.resolve(this.activeSkills || []);
  },

  async getPlatformsList() {
    return Promise.resolve(this.platforms || []);
  },

  async getPlatformPreferences(projectId = null) {
    return Promise.resolve(['antigravity', 'cursor']);
  },

  async setPlatformPreferences(projectId = null, platforms = []) {
    return Promise.resolve({ success: true, platforms });
  },

  async activateSkills(projectId = null, skillIds = [], platforms = []) {
    const activated = (this.skillCatalog || []).filter(s => skillIds.includes(s.id));
    this.activeSkills = [...(this.activeSkills || []), ...activated];
    return Promise.resolve({
      success: true,
      overallStatus: 'success',
      activatedSkills: skillIds,
      failedSkills: [],
      platformResults: platforms.map(p => ({ platform: p, status: 'Success' }))
    });
  },

  async deactivateSkill(projectId = null, skillId = null, platforms = []) {
    this.activeSkills = (this.activeSkills || []).filter(s => s.id !== skillId);
    return Promise.resolve({
      success: true,
      deactivatedSkill: skillId
    });
  },

  async getSkillUsage(skillId) {
    return Promise.resolve({
      skillId,
      projectCount: this.allProjects ? this.allProjects.length : 3,
      projects: this.allProjects || []
    });
  },

  async previewGlobalRemoval(skillId) {
    const projs = this.allProjects || [];
    return Promise.resolve({
      success: true,
      operationId: 'op_mock_removal_' + Date.now(),
      skillId,
      affectedProjectCount: projs.length,
      affectedProjects: projs
    });
  },

  async executeGlobalRemoval(operationId) {
    return Promise.resolve({
      success: true,
      overallStatus: 'success',
      totalAffected: (this.allProjects || []).length,
      succeededCount: (this.allProjects || []).length,
      failedCount: 0,
      projectResults: (this.allProjects || []).map(p => ({
        projectId: p.id,
        name: p.name,
        path: p.path,
        success: true,
        message: 'Deactivated successfully'
      })),
      message: 'Skill removed across all projects'
    });
  },

  async removeProject(projectId) {
    return Promise.resolve({ success: true, message: 'Project removed' });
  },

  allProjects: [
    {
      id: "proj_academic_hub",
      name: "Academic Day Hub",
      path: "D:\\Projects\\academic_day_hub",
      type: "Full Stack Application",
      framework: "Flutter",
      status: "Ready",
      activeSkillCount: 6,
      selected: true
    },
    {
      id: "proj_memorlume",
      name: "Memorlume",
      path: "D:\\Projects\\memorlume",
      type: "Web Application",
      framework: "HTML / CSS",
      status: "Ready",
      activeSkillCount: 3,
      selected: false
    },
    {
      id: "proj_smart_cart",
      name: "Smart Cart",
      path: "D:\\Projects\\smart_cart",
      type: "Mobile Application",
      framework: "Python",
      status: "Ready",
      activeSkillCount: 4,
      selected: false
    }
  ],

  activeSkills: [
    { id: "flutter-build-responsive-layout", name: "Flutter Responsive Layout", category: "Frontend", version: "v1.0.0", status: "Active", platforms: ["Google Antigravity", "Cursor"], description: "Responsive layouts using LayoutBuilder, MediaQuery, and Expanded/Flexible widgets for multi-screen Flutter apps." },
    { id: "flutter-add-widget-test", name: "Flutter Widget Testing", category: "QA", version: "v1.0.0", status: "Active", platforms: ["Google Antigravity"], description: "Component-level UI and interaction tests using WidgetTester for Flutter." },
    { id: "dart-add-unit-test", name: "Dart Unit Testing", category: "QA", version: "v1.0.0", status: "Active", platforms: ["Google Antigravity", "GitHub Copilot"], description: "Unit test suites for Dart classes, models, and utility functions using package:test." },
    { id: "frontend_design", name: "Frontend Design System", category: "Frontend", version: "v1.0.0", status: "Active", platforms: ["Google Antigravity", "Cursor"], description: "Production-grade UI tokens, component architecture, and modern layout principles." },
    { id: "architecture-patterns", name: "Architecture Patterns", category: "Architecture", version: "v1.0.0", status: "Active", platforms: ["Google Antigravity", "Cursor", "GitHub Copilot"], description: "Clean Architecture, repository patterns, and domain-driven design separation." },
    { id: "test_runner", name: "Test Runner", category: "Tooling", version: "v1.0.0", status: "Active", platforms: ["Google Antigravity"], description: "Automated test execution, diagnostic output analysis, and failure triage." }
  ],

  recommendedSkills: [
    { id: "flutter-build-responsive-layout", name: "Flutter Responsive Layout", matchScore: 92, reason: "Matches Flutter UI framework detection and multi-device requirements.", category: "Frontend", preselected: true },
    { id: "flutter-add-widget-test", name: "Flutter Widget Testing", matchScore: 85, reason: "Matches flutter_test and Flutter widget architecture in pubspec.yaml.", category: "QA", preselected: true },
    { id: "dart-add-unit-test", name: "Dart Unit Testing", matchScore: 78, reason: "Matches Dart language and test dependencies.", category: "QA", preselected: false },
    { id: "security_audit", name: "Security Audit", matchScore: 74, reason: "Supabase backend integration and authentication security best practices.", category: "Security", preselected: false },
    { id: "debug_issue", name: "Scientific Debugging", matchScore: 70, reason: "Multi-tier application diagnostics protocol.", category: "QA", preselected: false }
  ],

  skillCatalog: [
    { id: "agent-orchestration-multi-agent-optimize", name: "Multi-Agent Optimization", category: "AI & Agents", version: "v1.0.0", status: "Available" },
    { id: "agy-customizations", name: "Antigravity Customizations", category: "Tooling", version: "v1.0.0", status: "Available" },
    { id: "android-cli", name: "Android CLI Suite", category: "Mobile", version: "v1.0.0", status: "Available" },
    { id: "antigravity-guide", name: "Antigravity Guide", category: "Documentation", version: "v1.0.0", status: "Available" },
    { id: "api-design-principles", name: "API Design Principles", category: "Backend", version: "v1.0.0", status: "Available" },
    { id: "architect-review", name: "Architect Review", category: "Architecture", version: "v1.0.0", status: "Available" },
    { id: "architecture-patterns", name: "Architecture Patterns", category: "Architecture", version: "v1.0.0", status: "Active" },
    { id: "backend-architect", name: "Backend Architect", category: "Backend", version: "v1.0.0", status: "Available" },
    { id: "backend-security-coder", name: "Backend Security Coder", category: "Security", version: "v1.0.0", status: "Available" },
    { id: "code_review", name: "Code Review", category: "Code Quality", version: "v1.0.0", status: "Available" },
    { id: "code-review-excellence", name: "Code Review Excellence", category: "Code Quality", version: "v1.0.0", status: "Available" },
    { id: "dart-add-unit-test", name: "Dart Unit Testing", category: "QA", version: "v1.0.0", status: "Active" },
    { id: "dart-build-cli-app", name: "Dart CLI App Builder", category: "Tooling", version: "v1.0.0", status: "Available" },
    { id: "dart-collect-coverage", name: "Dart Coverage Collector", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "dart-fix-runtime-errors", name: "Dart Fix Runtime Errors", category: "Debugging", version: "v1.0.0", status: "Available" },
    { id: "dart-generate-test-mocks", name: "Dart Test Mock Generator", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "dart-migrate-to-checks-package", name: "Dart Checks Migrator", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "dart-resolve-package-conflicts", name: "Dart Conflict Resolver", category: "Tooling", version: "v1.0.0", status: "Available" },
    { id: "dart-run-static-analysis", name: "Dart Static Analysis", category: "Code Quality", version: "v1.0.0", status: "Available" },
    { id: "dart-setup-ffi-assets", name: "Dart FFI Native Assets", category: "Tooling", version: "v1.0.0", status: "Available" },
    { id: "dart-use-ffigen", name: "Dart FFI Binding Generator", category: "Tooling", version: "v1.0.0", status: "Available" },
    { id: "dart-use-pattern-matching", name: "Dart Pattern Matching", category: "Language", version: "v1.0.0", status: "Available" },
    { id: "dart-use-primary-constructors", name: "Dart Primary Constructors", category: "Language", version: "v1.0.0", status: "Available" },
    { id: "debug_issue", name: "Scientific Debugging", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "debugger", name: "Debugger Specialist", category: "Debugging", version: "v1.0.0", status: "Available" },
    { id: "document_api", name: "API Documentation", category: "Documentation", version: "v1.0.0", status: "Available" },
    { id: "e2e-testing-patterns", name: "E2E Testing Patterns", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "enhance_ui", name: "UI Enhancer & Verifier", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "error-handling-patterns", name: "Error Handling Patterns", category: "Architecture", version: "v1.0.0", status: "Available" },
    { id: "find-skills", name: "Skill Discovery Assistant", category: "AI & Agents", version: "v1.0.0", status: "Available" },
    { id: "flutter-add-integration-test", name: "Flutter Integration Test", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "flutter-add-widget-preview", name: "Flutter Widget Previews", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "flutter-add-widget-test", name: "Flutter Widget Testing", category: "QA", version: "v1.0.0", status: "Active" },
    { id: "flutter-apply-architecture-best-practices", name: "Flutter Architecture Practices", category: "Architecture", version: "v1.0.0", status: "Available" },
    { id: "flutter-build-responsive-layout", name: "Flutter Responsive Layout", category: "Frontend", version: "v1.0.0", status: "Active" },
    { id: "flutter-fix-layout-issues", name: "Flutter Layout Fixer", category: "Debugging", version: "v1.0.0", status: "Available" },
    { id: "flutter-implement-json-serialization", name: "Flutter JSON Serialization", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "flutter-setup-declarative-routing", name: "Flutter Declarative Routing", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "flutter-setup-localization", name: "Flutter Localization", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "flutter-use-http-package", name: "Flutter HTTP Package", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "frontend-developer", name: "React / Next Frontend Developer", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "frontend_design", name: "Frontend Design System", category: "Frontend", version: "v1.0.0", status: "Active" },
    { id: "full-stack-orchestration-full-stack-feature", name: "Full Stack Feature Orchestration", category: "Full Stack", version: "v1.0.0", status: "Available" },
    { id: "git-advanced-workflows", name: "Advanced Git Workflows", category: "Tooling", version: "v1.0.0", status: "Available" },
    { id: "mobile-developer", name: "Cross-Platform Mobile Developer", category: "Mobile", version: "v1.0.0", status: "Available" },
    { id: "optimize_codebase", name: "Monolithic Code Refactoring", category: "Code Quality", version: "v1.0.0", status: "Available" },
    { id: "scaffold_tests", name: "Test Scaffolder", category: "QA", version: "v1.0.0", status: "Available" },
    { id: "security-auditor", name: "Enterprise Security Auditor", category: "Security", version: "v1.0.0", status: "Available" },
    { id: "security_audit", name: "OWASP Security Audit", category: "Security", version: "v1.0.0", status: "Available" },
    { id: "software_architecture", name: "Software Architecture", category: "Architecture", version: "v1.0.0", status: "Available" },
    { id: "test_runner", name: "Test Runner", category: "Tooling", version: "v1.0.0", status: "Active" },
    { id: "ui_ux_pro_max", name: "UI/UX Intelligence", category: "Frontend", version: "v1.0.0", status: "Available" },
    { id: "web_performance_optimization", name: "Web Performance Optimizer", category: "Performance", version: "v1.0.0", status: "Available" }
  ],

  healthChecks: [
    { name: "Core Engine", status: "Healthy", detail: "v1.0.0", icon: "terminal" },
    { name: "Skill Library", status: "Healthy", detail: "48 / 48 skills", icon: "school" },
    { name: "CLI", status: "Healthy", detail: "nexora available", icon: "code" },
    { name: "Project Registry", status: "Healthy", detail: "projects.json valid", icon: "folder_open" },
    { name: "Installation Metadata", status: "Healthy", detail: "install.json verified", icon: "verified" },
    { name: "Platform Adapters", status: "Healthy", detail: "Antigravity, Cursor, Copilot", icon: "hub" }
  ],

  updateModules: [
    { name: "Core Engine", installedVersion: "v1.0.0", availableVersion: "v1.0.0", status: "Up to date", description: "PowerShell runtime engine, orchestrator, and registry facade." },
    { name: "Skill Library", installedVersion: "v1.0.0", availableVersion: "v1.0.0", status: "Up to date", description: "Official 48 skill packages across 16 taxonomies." },
    { name: "Platform Adapters", installedVersion: "v1.0.0", availableVersion: "v1.0.0", status: "Up to date", description: "Google Antigravity, Cursor, and GitHub Copilot deployment adapters." }
  ],

  platforms: [
    { id: "antigravity", name: "Google Antigravity", status: "Available", compatible: true, activeSkills: 6, selected: true },
    { id: "cursor", name: "Cursor", status: "Available", compatible: true, activeSkills: 4, selected: true },
    { id: "copilot", name: "GitHub Copilot", status: "Available", compatible: true, activeSkills: 2, selected: false }
  ],

  activityLogs: [
    { id: "act_1", title: "Project added: Academic Day Hub", category: "Projects", timestamp: "Today, 10:14 AM", details: "Registered at D:\\Projects\\academic_day_hub" },
    { id: "act_2", title: "Academic Day Hub analyzed", category: "Analysis", timestamp: "Today, 10:15 AM", details: "96% confidence | Full Stack Mobile Application" },
    { id: "act_3", title: "flutter-build-responsive-layout activated", category: "Skills", timestamp: "Today, 10:18 AM", details: "Deployed to Academic Day Hub (Google Antigravity, Cursor)" },
    { id: "act_4", title: "architecture-patterns updated", category: "Updates", timestamp: "Yesterday, 4:32 PM", details: "v1.0.0 → v1.1.0 in Academic Day Hub" },
    { id: "act_5", title: "Nexora Doctor completed", category: "System", timestamp: "Yesterday, 2:00 PM", details: "All 6 diagnostic health checks passed" }
  ],

  async initialize() {
    return Promise.resolve({
      success: true,
      data: {
        schemaVersion: '1.0.0',
        state: 'ready',
        health: 'healthy',
        version: 'v1.0.0',
        updateStatus: { currentVersion: '1.0.0', latestVersion: '1.0.0', updateAvailable: false },
        offline: false,
        message: 'Mock Engine ready'
      }
    });
  },

  async getStatus() {
    return Promise.resolve({
      success: true,
      data: {
        schemaVersion: '1.0.0',
        state: 'ready',
        health: 'healthy',
        version: 'v1.0.0',
        updateStatus: { currentVersion: '1.0.0', latestVersion: '1.0.0', updateAvailable: false },
        offline: false,
        message: 'Mock Engine ready'
      }
    });
  },

  async getUpdateStatus() {
    return Promise.resolve({
      currentVersion: "v1.0.0",
      updateStatus: "Up to date",
      modules: this.updateModules
    });
  },

  getStatusPillText() {
    if (this.state.isOffline) return '● Offline (Local Mode)';
    return '● Healthy | Up to date';
  },

  getDevelopmentModes() {
    return [
      { id: "frontend", title: "Frontend Development", desc: "UI, layouts, screens, components and client-side workflows.", icon: "devices" },
      { id: "backend", title: "Backend Development", desc: "APIs, server logic, database and backend services.", icon: "dns" },
      { id: "fullstack", title: "Full Stack Development", desc: "Frontend and backend work together.", icon: "layers" },
      { id: "qa", title: "QA / Debugging", desc: "Testing, debugging, validation and regression work.", icon: "bug_report" }
    ];
  },

  getDevelopmentTargets(modeId) {
    const map = {
      frontend: ["Web Application", "Website", "Mobile Application"],
      backend: ["Web / App Backend", "API / Service", "Database / Data Layer"],
      fullstack: ["Web Application", "Mobile Application"],
      qa: ["Web Application", "Mobile Application", "Backend / API", "Full Project"]
    };
    return map[modeId] || map.frontend;
  },

  setWorkingMode(modeTitle, targetName) {
    this.state.currentWorkingMode = modeTitle;
    this.state.currentTarget = targetName;
    return Promise.resolve({ success: true, mode: modeTitle, target: targetName });
  },

  refreshRecommendations(modeTitle, targetName) {
    return Promise.resolve({
      mode: modeTitle,
      target: targetName,
      recommendations: [
        { id: "flutter-build-responsive-layout", name: "Flutter Responsive Layout", matchScore: 96, reason: `Ranked #1 for ${modeTitle} (${targetName})`, category: "Frontend", preselected: true },
        { id: "flutter-add-widget-test", name: "Flutter Widget Testing", matchScore: 89, reason: `Component UI testing for ${targetName}`, category: "QA", preselected: true },
        { id: "dart-add-unit-test", name: "Dart Unit Testing", matchScore: 82, reason: "Dart core logic test coverage", category: "QA", preselected: false }
      ]
    });
  },

  simulateActivation(skills, platforms, scenario = "success") {
    return Promise.resolve({
      status: scenario,
      activatedSkills: skills,
      deployments: platforms.map(p => ({
        platform: p,
        status: scenario === "failure" ? "Failed" : (scenario === "partial" && p.toLowerCase().includes("cursor") ? "Failed" : "Success")
      }))
    });
  },

  toggleOffline() {
    this.state.isOffline = !this.state.isOffline;
    return this.state.isOffline;
  },

  async getProject() { return Promise.resolve(this.sampleProject); },
  async getProjectsList() { return Promise.resolve(this.allProjects); },
  async getActiveSkills() { return Promise.resolve(this.activeSkills); },
  async getRecommendedSkills() { return Promise.resolve(this.recommendedSkills); },
  async getSkillCatalog() { return Promise.resolve(this.skillCatalog); },
  async getHealthChecks() { return Promise.resolve(this.healthChecks); },
  async repairHealth(categoryId = null) {
    return Promise.resolve({
      success: true,
      repairsApplied: ["CLI registration verified", "Installation metadata verified"],
      health: {
        overallStatus: "healthy",
        healthy: true,
        checks: this.healthChecks
      }
    });
  },
  async getPlatforms() { return Promise.resolve(this.platforms); },
  async getActivityLogs() { return Promise.resolve(this.activityLogs); },
  async getUpdateStatus() {
    return Promise.resolve({
      currentVersion: "v1.0.0",
      latestVersion: "v1.0.0",
      updateAvailable: false,
      checkedRemotely: false,
      channel: "stable",
      status: "Up to date",
      message: "All components and skill packages are on the verified stable release."
    });
  },
  async getUpdateModules() { return Promise.resolve(this.updateModules); }
};
