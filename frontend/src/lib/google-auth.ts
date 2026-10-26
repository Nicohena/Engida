/**
 * Maps the error codes returned by the backend Google callback to
 * human readable messages.
 */
const MESSAGES: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled. Please try again.',
  google_not_configured:
    'Google sign-in is not available right now. Please use your email and password.',
  google_invalid_response: 'Google sign-in returned an invalid response. Please try again.',
  google_failed: 'Google sign-in failed. Please try again.',
  'Your Google email address is not verified':
    'Your Google email address is not verified. Verify it with Google and try again.',
  'Your Google account does not expose an email address':
    'Your Google account does not share an email address. Use a different account or sign in with a password.',
  'An account with this email already exists. Please sign in with your password first, then use "Continue with Google" to link it.':
    'An account already uses this email address. Sign in with your password first, then use "Continue with Google" to link your Google account to it.',
  'This email address is already linked to a different Google account':
    'This email address is already linked to a different Google account. Sign in with your password instead.',
};

export function googleErrorMessage(code: string): string {
  return (
    MESSAGES[code] ||
    'Google sign-in could not be completed. Please try again or use your email and password.'
  );
}
