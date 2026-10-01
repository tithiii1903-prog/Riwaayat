import { request } from './api';

export function login<T>(username: string, password: string) { return request<T>('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); }
export function logout<T>() { return request<T>('/api/admin/logout', { method: 'POST' }); }
export function getSession<T>() { return request<T>('/api/admin/me'); }
