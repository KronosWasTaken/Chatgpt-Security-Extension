// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Application Configuration
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'Cybercept AI Governance Platform',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
};

// Feature Flags
export const FEATURE_FLAGS = {
  REAL_TIME_ALERTS: true,
  ADVANCED_ANALYTICS: true,
  MULTI_TENANT: true,
  AUDIT_LOGGING: true,
};

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  REFRESH_INTERVAL: 30000,
  TOAST_DURATION: 5000, 
  DEBOUNCE_DELAY: 300, 
};
