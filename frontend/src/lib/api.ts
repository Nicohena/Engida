const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth && inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include', // Include HttpOnly cookies (for refreshToken)
  });

  // Handle 401 Unauthorized -> attempt silent refresh token call
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
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
