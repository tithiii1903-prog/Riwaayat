import { request } from './api';

export function getDashboard<T>() { return request<T>('/api/admin/dashboard'); }
export function getAdminListings<T>() { return request<T>('/api/admin/listings'); }
export function getAdminListing<T>(id: string) { return request<T>(`/api/admin/listings/${id}`); }
export function deleteAdminListing<T>(id: string) { return request<T>(`/api/admin/listings/${id}`, { method: 'DELETE' }); }
export function updateAdminStatus<T>(id: string, status: string) { return request<T>(`/api/admin/listings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); }
