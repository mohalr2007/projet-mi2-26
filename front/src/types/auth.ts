// ============================================================
// AUTH TYPES — Shared contracts between front-end and back-end
// ============================================================
// These types define the shape of data sent to and received from
// the back-end API. Share this file (or equivalent) with the
// back-end team so both sides agree on the data format.
// ============================================================

/** The user object returned by the API after login/signup or fetching profile. */
export interface User {
  id: string;
  name: string;
  email: string;
  accountType: "patient" | "doctor";
  /** Only present for doctor accounts */
  specialty?: string;
  /** Only present for doctor accounts */
  licenseNumber?: string;
  createdAt: string;
}

/** Payload sent to POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Payload sent to POST /api/auth/signup */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  accountType: "patient" | "doctor";
  /** Required when accountType is "doctor" */
  specialty?: string;
  /** Required when accountType is "doctor" */
  licenseNumber?: string;
}

/** Successful response from login/signup endpoints */
export interface AuthResponse {
  user: User;
  /** JWT or session token — stored in localStorage by the front-end */
  token: string;
}

/** Standard error envelope returned by the API on failure */
export interface ApiError {
  message: string;
  /** Optional field-level errors (e.g. { email: "already taken" }) */
  errors?: Record<string, string>;
}
