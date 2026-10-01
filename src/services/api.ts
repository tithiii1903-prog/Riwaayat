export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...options });
  const payload = await response.json().catch(() => ({ success: false, message: 'Unexpected server response.' }));
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Something went wrong.');
  return payload as T;
}
