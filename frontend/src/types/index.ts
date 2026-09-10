/**
 * Shared TypeScript Type Definitions
 * 
 * Centralized type definitions for the ENGIDA frontend.
 * Keep types organized by domain (user, property, listing, etc.)
 */

// Common types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Future: Add domain-specific types
// export interface User { ... }
// export interface Property { ... }
// export interface Listing { ... }
