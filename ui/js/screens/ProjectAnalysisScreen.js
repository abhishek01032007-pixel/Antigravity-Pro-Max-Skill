/**
 * ProjectAnalysisScreen.js - Project Analysis & Stack Inspection Screen (Stitch Reference)
 */
import { SectionHeader } from '../components/SectionHeader.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const ProjectAnalysisScreen = {
  render(data) {
    const project = data.sampleProject;

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Project Analysis: Academic Day Hub",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-analysis-back">
              <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
              <span>Back to Dashboard</span>
            </button>
            <button class="btn btn-primary" id="btn-analysis-rescan">
              <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
              <span>Re-Scan Project</span>
            </button>
          `
        })}

        <div class="bento-grid">
          <!-- Summary Card (12 Cols) -->
          <div class="col-12 card flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Target Project Path</span>
              <span class="code-pill" style="font-size: var(--text-body-sm);">${project.path}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-end">
                <span style="font-size: var(--text-meta); color: var(--color-outline);">Classification Confidence</span>
                <span style="font-size: var(--text-screen-title); font-weight: 700; color: var(--color-primary);">${project.confidence}%</span>
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
                <span class="text-muted" style="font-size: var(--text-body-sm);">Primary Language</span>
                <span class="code-pill">Dart</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Frontend Framework</span>
                <span class="code-pill">Flutter</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Backend Service</span>
                <span class="code-pill">Supabase</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Database System</span>
                <span class="code-pill">PostgreSQL</span>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0; border-bottom: 1px solid rgba(70, 69, 84, 0.4);">
                <span class="text-muted" style="font-size: var(--text-body-sm);">QA & Testing Suites</span>
                <div class="flex gap-1">
                  <span class="code-pill">Flutter Test</span>
                  <span class="code-pill">Dart Analyzer</span>
                </div>
              </div>
              <div class="flex items-center justify-between" style="padding: var(--space-2) 0;">
                <span class="text-muted" style="font-size: var(--text-body-sm);">Build & Tooling</span>
                <div class="flex gap-1">
                  <span class="code-pill">Flutter CLI</span>
                  <span class="code-pill">Gradle</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Markers Card (4 Cols) -->
          <div class="col-4 card flex flex-col gap-3">
            <h3 style="font-size: var(--text-section-header); font-weight: 600; color: var(--color-on-surface); border-bottom: 1px solid var(--color-outline-variant); padding-bottom: var(--space-2);">
              Filesystem Markers Found
            </h3>

            <div class="flex flex-col gap-2">
              ${project.markers.map(m => `
                <div class="flex items-center gap-2" style="font-size: var(--text-body-sm);">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-success);">check_circle</span>
                  <span class="font-mono text-muted">${m}</span>
                </div>
              `).join('')}
            </div>

            <div style="margin-top: auto; padding-top: var(--space-3); border-top: 1px solid var(--color-outline-variant);">
              <span style="font-size: var(--text-meta); color: var(--color-outline);">Mode: Full Stack (Mobile + Backend)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  attachEvents(app) {
    document.getElementById('btn-analysis-back')?.addEventListener('click', () => app.navigate('dashboard'));
    document.getElementById('btn-analysis-rescan')?.addEventListener('click', () => {
      app.showToast("Analysis refreshed for Academic Day Hub.");
    });
  }
};
