/**
 * SettingsAboutScreen.js - Unified Settings, Preferences, Runtime & About Screen
 * Part of Nexora Skills Manager Release Polish (Phase 9.2)
 */

import { SectionHeader } from '../components/SectionHeader.js';
import { PlatformCard } from '../components/PlatformCard.js';

export const SettingsAboutScreen = {
  render(data, params = {}) {
    const isLive = !!data.isLiveMode;
    const version = (data.state && (data.state.installedVersion || data.state.currentVersion || (data.state.status && data.state.status.version))) || params.version || "1.0.0";
    const channel = "Stable";
    const platformDisplay = "Windows x64";
    const engineHealthy = data.state ? (data.state.engineHealthy !== false) : true;

    // Platform preferences
    const defaultPlatforms = [
      { id: 'antigravity', name: 'Google Antigravity', description: 'Native Antigravity skill directory integration (.agents/skills/)', icon: 'smart_toy', color: '#4285F4' },
      { id: 'cursor', name: 'Cursor', description: 'Cursor IDE rules and instructions integration (.cursor/rules/)', icon: 'edit_square', color: '#00D8FF' },
      { id: 'copilot', name: 'GitHub Copilot', description: 'GitHub Copilot workspace instructions (.github/copilot-instructions.md)', icon: 'terminal', color: '#6e40c9' }
    ];
    const platforms = (params.platforms && params.platforms.length > 0) ? params.platforms : ((data.platforms && data.platforms.length > 0) ? data.platforms : defaultPlatforms);
    const savedPrefs = params.savedPlatforms || (data.state && data.state.selectedPlatforms) || ['antigravity', 'cursor'];

    // Runtime metadata
    const runtimeRoot = (data.state && data.state.runtimeRoot) || params.runtimeRoot || "%LOCALAPPDATA%\\NexoraSkillsManager\\runtime";
    const stateRoot = (data.state && data.state.stateRoot) || params.stateRoot || "%LOCALAPPDATA%\\NexoraSkillsManager";

    return `
      <div class="content-container">
        ${SectionHeader.render({
          title: "Settings & About",
          actionsHtml: `
            <button class="btn btn-secondary" id="btn-settings-health">
              <span class="material-symbols-outlined" style="font-size: 16px;">health_and_safety</span>
              <span>System Health</span>
            </button>
            <button class="btn btn-primary" id="btn-settings-updates">
              <span class="material-symbols-outlined" style="font-size: 16px;">update</span>
              <span>Update Center</span>
            </button>
          `
        })}

        <div class="bento-grid">
          <!-- 1. Product & Version Card -->
          <div class="col-6">
            <div class="card" style="padding: var(--space-5); height: 100%;">
              <div class="flex items-center gap-3 mb-4">
                <div class="logo-hexagon" style="width: 36px; height: 36px;">
                  <span class="material-symbols-outlined" style="font-size: 22px; color: var(--color-primary);">hexagon</span>
                </div>
                <div>
                  <h2 style="font-size: var(--text-h3); margin: 0; font-weight: 700;">Nexora Skills Manager</h2>
                  <div style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);">Desktop Host & Runtime</div>
                </div>
              </div>

              <div class="flex flex-col gap-3">
                <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--color-outline-variant);">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Version</span>
                  <span class="badge badge-neutral" id="settings-version-badge">v${version}</span>
                </div>
                <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--color-outline-variant);">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Update Channel</span>
                  <span class="badge badge-primary">${channel}</span>
                </div>
                <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--color-outline-variant);">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Platform & Architecture</span>
                  <span style="font-family: var(--font-mono); font-size: var(--text-body-sm);">${platformDisplay}</span>
                </div>
                <div class="flex justify-between items-center py-2">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Execution Model</span>
                  <span style="font-size: var(--text-body-sm); color: var(--color-success);">Local-First (Sandboxed)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Installation & Runtime Summary Card -->
          <div class="col-6">
            <div class="card" style="padding: var(--space-5); height: 100%;">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 22px;">terminal</span>
                  <h3 style="font-size: var(--text-h3); margin: 0; font-weight: 600;">Installation & Runtime</h3>
                </div>
                <span class="badge ${engineHealthy ? 'badge-success' : 'badge-error'}">
                  ${engineHealthy ? 'Runtime Healthy' : 'Runtime Attention'}
                </span>
              </div>

              <div class="flex flex-col gap-3">
                <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--color-outline-variant);">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Primary CLI</span>
                  <code style="font-family: var(--font-mono); font-size: var(--text-body-sm); color: var(--color-primary);">nexora</code>
                </div>
                <div class="flex justify-between items-center py-2" style="border-bottom: 1px solid var(--color-outline-variant);">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Legacy Alias</span>
                  <span style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant);"><code style="font-family: var(--font-mono);">agpm</code> (Compatibility forwarder)</span>
                </div>
                <div class="flex justify-between items-center py-2">
                  <span style="color: var(--color-on-surface-variant); font-size: var(--text-body-sm);">Diagnostics</span>
                  <button class="btn btn-secondary btn-sm" id="btn-open-health-details" style="padding: 4px 10px; font-size: 12px;">
                    <span class="material-symbols-outlined" style="font-size: 14px;">stethoscope</span>
                    <span>Run Diagnostics</span>
                  </button>
                </div>
              </div>

              <details style="margin-top: var(--space-3); font-size: var(--text-caption);">
                <summary style="cursor: pointer; color: var(--color-primary); font-weight: 500;">Advanced Technical Details</summary>
                <div style="margin-top: var(--space-2); padding: var(--space-3); background-color: var(--color-surface-container); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 11px; word-break: break-all;">
                  <div><strong>Runtime Root:</strong> ${runtimeRoot}</div>
                  <div style="margin-top: 4px;"><strong>State Root:</strong> ${stateRoot}</div>
                </div>
              </details>
            </div>
          </div>

          <!-- 3. AI Platform Preferences (Full Width) -->
          <div class="col-12">
            <div class="card" style="padding: var(--space-5);">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 22px;">hub</span>
                  <h3 style="font-size: var(--text-h3); margin: 0; font-weight: 600;">AI Platform Integration</h3>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-save-settings-platforms">
                  <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
                  <span>Save Preferences</span>
                </button>
              </div>

              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); margin-bottom: var(--space-4);">
                Select the AI code assistants you use. When you activate skills for a project, Nexora deploys corresponding instructions and tool configurations to your selected platform workspaces.
              </p>

              <div id="settings-platform-feedback" style="display: none; margin-bottom: var(--space-3);"></div>

              <div class="bento-grid">
                ${platforms.map(p => {
                  const isChecked = savedPrefs.includes(p.id) || savedPrefs.includes(p.name);
                  return `
                    <div class="col-4">
                      ${PlatformCard.render(p, isChecked)}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- 4. About & Open Source Legal Information -->
          <div class="col-12">
            <div class="card" style="padding: var(--space-5);">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 22px;">info</span>
                <h3 style="font-size: var(--text-h3); margin: 0; font-weight: 600;">About Nexora Skills Manager</h3>
              </div>

              <p style="font-size: var(--text-body-sm); color: var(--color-on-surface); line-height: 1.6; margin-bottom: var(--space-4);">
                Nexora Skills Manager provides local-first developer skill management and orchestration for supported AI coding platforms (Google Antigravity, Cursor, and GitHub Copilot). All workspace analysis and skill deployments execute locally on your machine without transmitting project contents or telemetry.
              </p>

              <div class="flex items-center gap-4 flex-wrap" style="padding-top: var(--space-3); border-top: 1px solid var(--color-outline-variant);">
                <a href="https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager" target="_blank" class="btn btn-secondary btn-sm" id="link-github-repo">
                  <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
                  <span>GitHub Repository</span>
                </a>
                <a href="https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/blob/main/LICENSE" target="_blank" class="btn btn-secondary btn-sm" id="link-license">
                  <span class="material-symbols-outlined" style="font-size: 16px;">description</span>
                  <span>MIT License</span>
                </a>
                <a href="https://github.com/abhishek01032007-pixel/Nexora-Skills-Manager/releases" target="_blank" class="btn btn-secondary btn-sm" id="link-release-notes">
                  <span class="material-symbols-outlined" style="font-size: 16px;">history_edu</span>
                  <span>Release Notes</span>
                </a>
                <span style="font-size: var(--text-caption); color: var(--color-on-surface-variant); margin-left: auto;">
                  Open Source under MIT License
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachEvents(app) {
    // Navigation handlers
    document.getElementById('btn-settings-health')?.addEventListener('click', () => {
      app.navigate('maintenance');
    });

    document.getElementById('btn-open-health-details')?.addEventListener('click', () => {
      app.navigate('maintenance');
    });

    document.getElementById('btn-settings-updates')?.addEventListener('click', () => {
      app.navigate('update-center');
    });

    // Platform preferences saving
    document.getElementById('btn-save-settings-platforms')?.addEventListener('click', async () => {
      const selectedPlatformIds = [];
      const selectedPlatformNames = [];
      document.querySelectorAll('.platform-cb:checked').forEach(cb => {
        const id = cb.getAttribute('data-id');
        selectedPlatformIds.push(id);
        selectedPlatformNames.push(id);
      });

      const feedbackDiv = document.getElementById('settings-platform-feedback');

      if (selectedPlatformIds.length === 0) {
        if (feedbackDiv) {
          feedbackDiv.style.display = 'block';
          feedbackDiv.innerHTML = `
            <div class="card" style="padding: var(--space-3); background-color: rgba(239, 68, 68, 0.1); border-color: var(--color-error); color: var(--color-error-accent); font-size: var(--text-body-sm);">
              Please select at least one AI platform.
            </div>
          `;
        }
        return;
      }

      try {
        if (app.data && app.data.setPlatformPreferences) {
          const res = await app.data.setPlatformPreferences(null, selectedPlatformIds);
          if (!res || !res.success) {
            throw new Error((res && res.error && res.error.message) || 'Failed to save preferences');
          }
        }

        if (app.data.state) {
          app.data.state.selectedPlatforms = selectedPlatformNames;
          app.data.state.selectedPlatformIds = selectedPlatformIds;
        }

        if (feedbackDiv) {
          feedbackDiv.style.display = 'block';
          feedbackDiv.innerHTML = `
            <div class="card" style="padding: var(--space-3); background-color: rgba(34, 197, 94, 0.1); border-color: var(--color-success); color: var(--color-success); font-size: var(--text-body-sm);">
              ✓ AI platform preferences saved successfully.
            </div>
          `;
          setTimeout(() => {
            if (feedbackDiv) feedbackDiv.style.display = 'none';
          }, 3000);
        }

        if (app.showToast) {
          app.showToast("Preferences saved.");
        }
      } catch (err) {
        if (feedbackDiv) {
          feedbackDiv.style.display = 'block';
          feedbackDiv.innerHTML = `
            <div class="card" style="padding: var(--space-3); background-color: rgba(239, 68, 68, 0.1); border-color: var(--color-error); color: var(--color-error-accent); font-size: var(--text-body-sm);">
              Failed to save preferences: ${err.message || 'Unknown error'}
            </div>
          `;
        }
      }
    });
  }
};
