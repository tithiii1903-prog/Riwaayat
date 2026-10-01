import { request } from './api';

export function getListings<T>(query: string) { return request<T>(`/api/listings${query}`); }
export function getListing<T>(slug: string) { return request<T>(`/api/listings/${slug}`); }
export function getCategories<T>() { return request<T>('/api/categories'); }
