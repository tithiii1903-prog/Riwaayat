const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const baseUrl = (env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

const TOKEN_KEY = 'riwaayat_admin_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restrictive environments
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers || {});

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { credentials: 'include', ...options, headers });
  const text = await response.text();
  let payload: { success?: boolean; message?: string; data?: unknown };
  try {
    payload = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Not Found / Service Error'}). Please verify the API URL.`);
    }
    throw new Error('Unexpected server response.');
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Something went wrong.');
  }
  return payload as T;
}
