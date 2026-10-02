import { request, setStoredToken } from './api';

export async function login<T = { data: { username: string; token?: string } }>(username: string, password: string) {
  const payload = await request<T>('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = (payload as { data?: { token?: string } })?.data;
  if (data?.token) {
    setStoredToken(data.token);
  }
  return payload;
}

export async function logout<T = { data: { loggedOut: boolean } }>() {
  setStoredToken(null);
  try {
    return await request<T>('/api/admin/logout', { method: 'POST' });
  } catch {
    return { success: true } as unknown as T;
  }
}

export function getSession<T>() {
  return request<T>('/api/admin/me');
}
