/**
 * ProjectAnalysisScreen.js - Project Analysis & Stack Inspection Screen (Phase 6.2 Gate 4 Live Integrated)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const ProjectAnalysisScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const project = isLive ? (params.project || data.sampleProject) : data.sampleProject;
    const analysis = isLive ? (params.analysis || {}) : {};
    const state = data.state || {};

    const path = (project && project.path) || params.path || "D:\\Projects\\academic_day_hub";
    const name = (project && project.name) || "Project Analysis";
    const type = (project && project.type) || analysis.projectType || "Full Stack Application";
    const confidence = (project && project.confidence !== null) ? `${project.confidence}%` : "N/A";

    const languages = (project && project.languages && project.languages.length > 0) ? project.languages.join(", ") : (analysis.detectedTechnologies ? analysis.detectedTechnologies.join(", ") : "Dart");
    const frontend = (project && project.frontend && project.frontend.length > 0) ? project.frontend.join(", ") : "Flutter";
    const backend = (project && project.backend && project.backend.length > 0) ? project.backend.join(", ") : "Supabase";
    const database = (project && project.database && project.database.length > 0) ? project.database.join(", ") : "PostgreSQL";
    const qa = (project && project.qa && project.qa.length > 0) ? project.qa.join(", ") : "Flutter Test";

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: `Project Analysis: ${name}`,
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-analysis-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back to Dashboard</span>
            </button>
            <button class="btn btn-primary" id="btn-analysis-rescan" data-path="${path}">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Re-Scan Project</span>
            </button>
          `
        })}

        <!-- Analysis Progress Radar Container -->
        <div class="card hidden flex flex-col gap-3" id="analysis-radar-container" style="padding: var(--space-4); background-color: var(--color-surface-container); border-color: var(--color-primary);">
          <div class="flex items-center justify-between">
            <span style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-primary);" id="analysis-radar-title">
              Analyzing ${name}...
            </span>
            <span class="badge badge-warning" id="analysis-radar-badge">Scanning</span>
          </div>
          <div style="width: 100%; height: 6px; background: var(--color-surface-high); border-radius: var(--radius-full); overflow: hidden;">
            <div id="analysis-radar-bar" style="width: 30%; height: 100%; background: var(--color-primary-accent); transition: width 0.3s;"></div>
          </div>
          <div class="flex flex-col gap-1 text-muted" style="font-size: var(--text-meta);" id="analysis-radar-steps">
            <span>● Detecting languages (Dart)</span>
            <span>● Detecting frameworks (Flutter)</span>
            <span>● Detecting database & backend (Supabase / PostgreSQL)</span>
            <span>● Calculating project classification...</span>
          </div>
        </div>

        <div class="bento-grid">
          <!-- Summary Card (12 Cols) -->
          <div class="col-12 card flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Target Project Path</span>
              <span class="code-pill" style="font-size: var(--text-body-sm);">${path}</span>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex flex-col items-end">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Detected Classification</span>
                <span class="badge badge-primary" style="font-size: var(--text-body-sm);">${type}</span>
              </div>
              <div class="flex flex-col items-end">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Working Mode</span>
                <span style="font-size: var(--text-body-sm); font-weight: 600; color: var(--color-outline);">Not Selected (Gate 5)</span>
              </div>
              <div class="flex flex-col items-end">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Confidence</span>
                <span style="font-size: var(--text-screen-title); font-weight: 700; color: var(--color-primary);">${confidence}</span>
              </div>
              ${StatusBadge.render("Ready")}
            </div>
          </div>

          <!-- Stack Layer Analysis (8 Cols) -->
          <div class="col-8 card flex flex-col gap-3">
            <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface); border-bottom: 1px solid var(--color-outline-variant); padding-bottom: var(--space-2);">
              Detected Stack Breakdown
            </h3>

            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Languages</span>
                <span class="code-pill">${languages}</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Frontend Framework</span>
                <span class="code-pill">${frontend}</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Backend Service</span>
                <span class="code-pill">${backend}</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Database System</span>
                <span class="code-pill">${database}</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0;">
                <span class="text-muted" style="font-size: var(--text-body-sm);">QA / Testing</span>
                <span class="code-pill">${qa}</span>
              </div>
            </div>
          </div>

          <!-- Analysis Markers Found (4 Cols) -->
          <div class="col-4 card flex flex-col gap-3">
            <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface); border-bottom: 1px solid var(--color-outline-variant); padding-bottom: var(--space-2);">
              Markers Found
            </h3>

            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-success);">check_circle</span>
                <span class="code-pill">pubspec.yaml</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-success);">check_circle</span>
                <span class="code-pill">android/ & ios/</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-success);">check_circle</span>
                <span class="code-pill">analysis_options.yaml</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-analysis-back')?.addEventListener('click', () => app.navigate('dashboard'));

    document.getElementById('btn-analysis-rescan')?.addEventListener('click', async (e) => {
      const path = e.currentTarget.getAttribute('data-path');
      const radar = document.getElementById('analysis-radar-container');
      const bar = document.getElementById('analysis-radar-bar');

      if (radar) radar.classList.remove('hidden');
      if (bar) bar.style.width = '60%';

      const res = await app.data.analyzeProject(path);

      if (bar) bar.style.width = '100%';
      setTimeout(() => {
        if (radar) radar.classList.add('hidden');
        if (res.success) {
          app.showToast("Project re-scanned and classification updated successfully.");
          app.navigate('project-analysis', { path, analysis: res.analysis });
        } else {
          app.showToast(`Analysis error: ${(res.error && res.error.message) || 'Failed to re-scan'}`);
        }
      }, 600);
    });
  }
};
