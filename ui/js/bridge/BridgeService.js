/**
 * BridgeService.js - Nexora Desktop Bridge Facade (Phase 6.2)
 * 
 * Delegates to LiveBridgeAdapter in Production mode or MockBridgeAdapter when explicitly configured.
 * Production NEVER falls back silently to mock sample data if window.nexoraBridge is absent.
 */

import { LiveBridgeAdapter } from './LiveBridgeAdapter.js';
import { MockBridgeAdapter } from './MockBridgeAdapter.js';

export function selectAdapter() {
  if (typeof window !== 'undefined' && window.__NEXORA_MOCK_MODE__ === true) {
    return MockBridgeAdapter;
  }
  return LiveBridgeAdapter;
}

export const BridgeService = new Proxy({}, {
  get(target, prop) {
    const adapter = selectAdapter();
    const val = adapter[prop];

    if (typeof val === 'function') {
      return val.bind(adapter);
    }
    return val;
  }
});
