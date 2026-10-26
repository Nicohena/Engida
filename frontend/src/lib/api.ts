export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // When accessing via localhost/127.0.0.1, always target localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // When accessing via LAN IP or hostname on port 3001, dynamically match port 3000
    if (window.location.hostname) {
      const configured = process.env.NEXT_PUBLIC_API_URL;
      if (!configured || (!configured.includes('localhost') && !configured.includes(window.location.hostname))) {
        return `http://${window.location.hostname}:3000`;
      }
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}


const TOKEN_STORAGE_KEY = 'engida_access_token';

let inMemoryToken: string | null = null;

// Initialize token from localStorage if in browser environment
if (typeof window !== 'undefined') {
  try {
    inMemoryToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    inMemoryToken = null;
  }
}

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage write failures
    }
  }
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

// Deduplication singleton promise for concurrent token refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function executeTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const baseUrl = getApiBaseUrl();
  refreshPromise = (async () => {
    try {
      const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newToken = (refreshData.accessToken as string) || null;
        setAccessToken(newToken);
        return newToken;
      } else {
        setAccessToken(null);
        return null;
      }
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const isFormData = typeof FormData !== 'undefined' && restOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth && inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include', // Include HttpOnly cookies (for refreshToken)
  });

  // Handle 401 Unauthorized -> attempt silent refresh token call with deduplication
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    const newToken = await executeTokenRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restOptions,
        headers,
        credentials: 'include',
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'An error occurred during API request';
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Build the URL that starts the Google Sign-In flow on the backend.
 * The backend owns the OAuth client, verifies the identity and then hands the
 * session back to the app through an HttpOnly refresh cookie.
 */
export function getGoogleAuthUrl(nextPath?: string): string {
  const baseUrl = getApiBaseUrl();
  const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
  return `${baseUrl}/auth/google${query}`;
}

export function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

