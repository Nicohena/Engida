/**
 * Class Name Utility
 * 
 * Helper function for conditionally joining class names.
 * Useful for dynamic Tailwind CSS classes.
 */

type ClassValue = string | number | boolean | undefined | null;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
