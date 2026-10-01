const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const baseUrl = (env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const response = await fetch(url, { credentials: 'include', ...options });
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
