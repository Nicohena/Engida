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


let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
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

  // Handle 401 Unauthorized -> attempt silent refresh token call
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    try {
      const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setAccessToken(refreshData.accessToken);

        // Retry original request with new access token
        headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
        response = await fetch(url, {
          ...restOptions,
          headers,
          credentials: 'include',
        });
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
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

export function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
