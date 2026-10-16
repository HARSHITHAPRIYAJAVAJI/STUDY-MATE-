import { supabase } from './supabase';

// API Base URL Configuration
// In development, empty string allows relative URLs (e.g. /api/chat) to be proxied by Vite,
// avoiding all CORS and browser "Failed to fetch" cross-origin issues.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Perform an authenticated API request forwarding the active Supabase JWT session token.
 * This guarantees the backend can verify the user and access user-owned documents under RLS.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let authHeader = '';
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            authHeader = `Bearer ${session.access_token}`;
        }
    } catch (_) {}

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (authHeader) {
        headers['Authorization'] = authHeader;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
