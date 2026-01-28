/**
 * Configuration management for state management system.
 */

import { SessionStoreConfig } from './types.js';

/**
 * Load configuration from environment variables.
 *
 * @returns SessionStoreConfig from environment or defaults
 */
export function loadConfig(): SessionStoreConfig {
  const config: SessionStoreConfig = {};

  // Max sessions
  if (process.env.SESSION_STORE_MAX_SESSIONS) {
    const value = parseInt(process.env.SESSION_STORE_MAX_SESSIONS, 10);
    if (!isNaN(value) && value > 0) {
      config.maxSessions = value;
    }
  }

  // Max messages per session
  if (process.env.SESSION_STORE_MAX_MESSAGES_PER_SESSION) {
    const value = parseInt(process.env.SESSION_STORE_MAX_MESSAGES_PER_SESSION, 10);
    if (!isNaN(value) && value > 0) {
      config.maxMessagesPerSession = value;
    }
  }

  // Session TTL (in hours, converted to ms)
  if (process.env.SESSION_STORE_TTL_HOURS) {
    const hours = parseFloat(process.env.SESSION_STORE_TTL_HOURS);
    if (!isNaN(hours) && hours > 0) {
      config.sessionTTL = hours * 60 * 60 * 1000;
    }
  }

  // Cleanup interval (in minutes, converted to ms)
  if (process.env.SESSION_STORE_CLEANUP_INTERVAL_MINUTES) {
    const minutes = parseFloat(process.env.SESSION_STORE_CLEANUP_INTERVAL_MINUTES);
    if (!isNaN(minutes) && minutes > 0) {
      config.cleanupInterval = minutes * 60 * 1000;
    }
  }

  return config;
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: Required<SessionStoreConfig> = {
  maxSessions: 1000,
  maxMessagesPerSession: 1000,
  sessionTTL: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000,  // 1 hour
};
