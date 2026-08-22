/**
 * StartupScreen.js - Initial Startup / Loading Screen (Stitch Reference)
 */
import { LoadingState } from '../components/LoadingState.js';

export const StartupScreen = {
  render() {
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
    const btn = document.getElementById('btn-enter-dashboard');
    if (btn) {
      btn.addEventListener('click', () => app.navigate('dashboard'));
    }
  }
};
