/**
 * Singleton instance of SessionStore for application use.
 */

import { SessionStore } from './session-store.js';
import { loadConfig } from './config.js';

/**
 * Singleton SessionStore instance.
 * Initialized with configuration from environment variables.
 */
let instance: SessionStore | null = null;

/**
 * Get the singleton SessionStore instance.
 * Creates and initializes the instance on first call.
 *
 * @returns The singleton SessionStore instance
 */
export function getSessionStore(): SessionStore {
  if (!instance) {
    const config = loadConfig();
    instance = new SessionStore(config);
    instance.startCleanup();
  }
  return instance;
}

/**
 * Reset the singleton instance.
 * Useful for testing or hot-reloading scenarios.
 * Stops cleanup before resetting.
 */
export function resetSessionStore(): void {
  if (instance) {
    instance.stopCleanup();
    instance.clear();
    instance = null;
  }
}

/**
 * Check if singleton instance has been initialized.
 *
 * @returns True if instance exists
 */
export function hasSessionStore(): boolean {
  return instance !== null;
}
