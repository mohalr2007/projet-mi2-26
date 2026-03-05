import { supabase } from './client';

export type AccountType = 'patient' | 'doctor';

export interface SignupData {
    email: string;
    passwordHash: string; // Ideally raw password for auth, hash if stored manually (Supabase handles raw for Auth)
    password: string;
    name: string;
    accountType: AccountType;
    specialty?: string;
    license?: string;
}

// ==========================================
// Authentication Functions (Backend Logic)
// ==========================================

/**
 * Sign up a new user with email and password
 * Includes additional metadata (name, role, etc.)
 */
export async function signUpUser(data: SignupData) {
    try {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.name,
                    account_type: data.accountType,
                    specialty: data.specialty || null,
                    license_number: data.license || null,
                },
            },
        });

        if (error) {
            console.error("Signup error:", error.message);
            return { success: false, error: error.message };
        }

        return { success: true, user: authData.user };
    } catch (err: any) {
        console.error("Unexpected signup error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Log in an existing user with email and password
 */
export async function logInUser(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("Login error:", error.message);
            return { success: false, error: error.message };
        }

        return { success: true, user: data.user, session: data.session };
    } catch (err: any) {
        console.error("Unexpected login error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Log in with Google OAuth Provider
 */
export async function logInWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Automatically redirect back to the app after Google auth
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error("Google Auth error:", error.message);
            return { success: false, error: error.message };
        }

        return { success: true, url: data.url };
    } catch (err: any) {
        console.error("Unexpected Google Auth error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Sign out the current user
 */
export async function logOutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Logout error:", error.message);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err: any) {
        console.error("Unexpected logout error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Get the current logged-in user (e.g. after Google OAuth)
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// made by mohamed
/**
 * Update user profile metadata (used after Google OAuth to complete profile)
 * Saves account_type, full_name, specialty, license_number to Supabase user metadata
 * Also sets the password so the user can log in via email/password afterwards
 */
export async function updateUserProfile(data: {
    name: string;
    accountType: AccountType;
    specialty?: string;
    license?: string;
    password?: string;
}) {
    try {
        // Update metadata (name, role, etc.)
        const { error: metaError } = await supabase.auth.updateUser({
            data: {
                full_name: data.name,
                account_type: data.accountType,
                specialty: data.specialty || null,
                license_number: data.license || null,
            }
        });

        if (metaError) {
            console.error("Profile update error:", metaError.message);
            return { success: false, error: metaError.message };
        }

        // Also set the password so the user can log in via email/password
        if (data.password) {
            const { error: passError } = await supabase.auth.updateUser({
                password: data.password,
            });
            if (passError) {
                console.error("Password update error:", passError.message);
                return { success: false, error: passError.message };
            }
        }

        return { success: true };
    } catch (err: any) {
        console.error("Unexpected profile update error:", err);
        return { success: false, error: err.message };
    }
}
// made by mohamed
