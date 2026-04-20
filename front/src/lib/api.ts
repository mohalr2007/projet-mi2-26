import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  ApiError,
  User,
} from "../types/auth";

// ============================================================
// API SERVICE LAYER
// ============================================================
// Central place for ALL back-end communication.
//
// HOW TO USE:
//   1. Copy `.env.local.example` → `.env.local`
//   2. Set NEXT_PUBLIC_API_URL to the back-end server URL
//      (e.g. http://localhost:8000/api  or  https://api.mofid.com)
//   3. The back-end team only needs to implement the endpoints
//      listed below; the front-end will "just work".
//
// While the back-end is unavailable you can still develop the
// front-end — every call will fail gracefully with an error
// message shown to the user.
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ─── Generic fetch wrapper ────────────────────────────────────
/**
 * Thin wrapper around `fetch` that:
 *  • Prepends the BASE_URL
 *  • Attaches the auth token (if present)
 *  • Sends/receives JSON
 *  • Throws a typed ApiError on non-2xx responses
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Try to parse the body regardless of status
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const error: ApiError = body ?? { message: "Something went wrong" };
    throw error;
  }

  return body as T;
}

// ─── Auth endpoints ───────────────────────────────────────────

/** POST /auth/login */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** POST /auth/signup */
export async function signup(data: SignupRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** POST /auth/logout (optional — may just clear token client-side) */
export async function logout(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }
}

/** GET /auth/me — fetch the currently logged-in user profile */
export async function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

// ─── Social auth helpers ──────────────────────────────────────

/**
 * Redirect the user to the back-end OAuth flow.
 * The back-end should handle the callback and redirect back to
 * the front-end with a token (e.g. /auth/callback?token=xxx).
 */
export function socialLogin(provider: "google" | "facebook") {
  window.location.href = `${BASE_URL}/auth/${provider}`;
}
