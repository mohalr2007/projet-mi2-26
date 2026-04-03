import { createBrowserClient } from '@supabase/ssr';

const REMEMBER_ME_STORAGE_KEY = 'mofid_remember_me';

const authStorage = {
    getItem(key: string): string | null {
        if (typeof window === 'undefined') {
            return null;
        }

        try {
            const rememberPreference = window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY);

            if (rememberPreference === 'false') {
                return window.sessionStorage.getItem(key);
            }

            return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem(key: string, value: string): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const rememberPreference = window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY);

            if (rememberPreference === 'false') {
                window.sessionStorage.setItem(key, value);
                window.localStorage.removeItem(key);
                return;
            }

            window.localStorage.setItem(key, value);
            window.sessionStorage.removeItem(key);
        } catch {
            // no-op
        }
    },
    removeItem(key: string): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.removeItem(key);
            window.sessionStorage.removeItem(key);
        } catch {
            // no-op
        }
    },
};

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                storage: authStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        }
    );
}

export const supabase = createClient();
