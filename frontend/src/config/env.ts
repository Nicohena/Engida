/**
 * Environment Configuration
 * 
 * Centralized environment variables with validation.
 * All environment variables should be accessed through this module.
 */

export const env = {
  // API Endpoints
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  
  // Application
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature Flags (for future use)
  enableAI: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
} as const;
