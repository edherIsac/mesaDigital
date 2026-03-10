export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3200';
export const API_PREFIX = '/api/v1';

/**
 * Builds a fully qualified API URL using API_BASE + API_PREFIX.
 * Example: apiUrl('/auth/login') -> 'http://localhost:3200/api/v1/auth/login'
 */
export const apiUrl = (path: string) => `${API_BASE}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
