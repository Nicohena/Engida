/**
 * Application Constants
 * 
 * Centralized constants for the ENGIDA frontend application.
 */

export const APP_NAME = 'ENGIDA';
export const APP_DESCRIPTION = 'Ethiopian Property Marketplace';

// API Routes
export const API_ROUTES = {
  AUTH: '/auth',
  PROPERTIES: '/properties',
  LISTINGS: '/listings',
  USERS: '/users',
} as const;

// UI Constants
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;
