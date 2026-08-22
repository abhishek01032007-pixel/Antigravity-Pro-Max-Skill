/**
 * StartupScreen.js - Initial Startup / Loading Screen (Phase 6.2 Live Bridge Connected)
 */
import { LoadingState } from '../components/LoadingState.js';

export const StartupScreen = {
  render(data, params = {}) {
    const status = params.status || 'initializing';
    const errorMsg = params.errorMsg || 'Failed to communicate with Nexora Engine Bridge.';
    const errorCode = params.errorCode || 'BRIDGE_ERROR';

    if (status === 'error') {
      return `
        <div class="content-container" style="height: 100%; display: flex; align-items: center; justify-content: center;">
          <div class="card" style="padding: var(--space-8); max-width: 480px; width: 100%; text-align: center; border-color: var(--color-error);">
            <div style="font-size: 48px; color: var(--color-error); margin-bottom: var(--space-4);">
              <span class="material-symbols-outlined" style="font-size: 48px;">warning</span>
            </div>
            <h2 style="font-size: var(--text-section-header); font-weight: 700; color: var(--color-on-surface); margin-bottom: var(--space-2);">
              Initialization Error
            </h2>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); margin-bottom: var(--space-4);">
              ${errorMsg}
            </p>
            <div class="code-pill" style="margin-bottom: var(--space-6); background-color: rgba(239, 68, 68, 0.1); color: var(--color-error);">
              Code: ${errorCode}
            </div>
            <div>
              <button class="btn btn-primary w-full" id="btn-retry-initialization">
                <span class="material-symbols-outlined" style="font-size: 16px;">refresh</span>
                <span>Retry Initialization</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (status === 'ready') {
      return `
        <div class="content-container" style="height: 100%; display: flex; align-items: center; justify-content: center;">
          <div class="card" style="padding: var(--space-8); max-width: 480px; width: 100%; text-align: center; border-color: var(--color-primary-container);">
            <div style="font-size: 48px; color: var(--color-primary); margin-bottom: var(--space-4);">
              <span class="material-symbols-outlined" style="font-size: 48px;">check_circle</span>
            </div>
            <h2 style="font-size: var(--text-section-header); font-weight: 700; color: var(--color-on-surface); margin-bottom: var(--space-2);">
              Nexora Engine Ready
            </h2>
            <p style="font-size: var(--text-body-sm); color: var(--color-on-surface-variant); margin-bottom: var(--space-6);">
              PowerShell runtime persistent worker initialized successfully.
            </p>
            <div>
              <button class="btn btn-primary w-full" id="btn-enter-dashboard">
                Enter Dashboard <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="content-container" style="height: 100%; display: flex; align-items: center; justify-content: center;">
        <div class="card" style="padding: var(--space-8); max-width: 480px; width: 100%; text-align: center; border-color: var(--color-primary-container);">
          ${LoadingState.render({ message: "Initializing Nexora Desktop Core...", progress: 85 })}
          <div style="margin-top: var(--space-6);">
            <button class="btn btn-primary w-full" id="btn-enter-dashboard">
              Enter Dashboard <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  attachEvents(app) {
    const btnEnter = document.getElementById('btn-enter-dashboard');
    if (btnEnter) {
      btnEnter.addEventListener('click', () => app.navigate('dashboard'));
    }

    const btnRetry = document.getElementById('btn-retry-initialization');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        app.runStartupFlow();
      });
    }
  }
};
