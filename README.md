 ============================================================
                WHAT CHANGED — SIGNUP PAGE
 ============================================================

 1. FORM STATE FOR EVERY FIELD
    - Added useState hooks for: name, email, password,
      confirmPassword, specialty, licenseNumber, agreedToTerms.
    - All inputs are now "controlled" — React owns the values.

 2. FORM SUBMISSION HANDLER (`handleSubmit`)
    - Prevents default browser submit (page refresh).
    - Runs client-side validation first:
        • Password must be ≥ 8 characters
        • Password and confirm-password must match
        • Terms checkbox must be checked
    - If validation passes, calls `signup(...)` from AuthContext
      which sends a POST to /auth/signup.
    - On success → redirects to home page.
    - On failure → API error is shown in the red banner.

 3. AUTH CONTEXT INTEGRATION (`useAuth`)
    - `signup(data)` → sends the form to POST /auth/signup
    - `isLoading`    → spinner on submit button while request is in flight
    - `error`        → API error message (e.g. "Email already taken")
    - `fieldErrors`  → per-field API errors shown under each input
    - `clearError`   → resets all errors before a new submission

 4. CLIENT-SIDE VALIDATION (`localError`)
    - Catches obvious mistakes (short password, mismatch, unchecked
      terms) BEFORE hitting the API, giving instant feedback.
    - Combined with API errors in a single `displayError` variable.

 5. DOCTOR-SPECIFIC FIELDS
    - The specialty <select> and license number <input> now have
      value/onChange bindings.
    - These are only sent to the API when accountType === "doctor".

 6. LOADING STATE
    - "Create Account" button shows a spinner while isLoading is true.

 7. SOCIAL SIGNUP
    - Google and Facebook buttons redirect to the back-end's OAuth
      flow via socialLogin("google") / socialLogin("facebook").

 8. ACCOUNT TYPE BUTTONS
    - Added explicit type="button" to prevent accidental form
      submission when toggling patient/doctor.

 ADVANTAGE:
    - All form data is captured, validated, and sent to the API
      in the exact format the back-end expects (see src/types/auth.ts).
    - The back-end team can look at the SignupRequest type to know
      exactly what data they will receive.
    - No code changes needed when the back-end is ready — just set
      NEXT_PUBLIC_API_URL and it connects.
    - Client-side validation gives users immediate feedback even
      when the back-end is offline.
 ============================================================


 ============================================================
                WHAT CHANGED — LOGIN PAGE
 ============================================================

 1. FORM STATE MANAGEMENT
    - Added useState hooks for `email` and `password`.
    - Each <AnimatedInput> now receives `value` and `onChange` props
      so React controls the input values ("controlled components").
    - Before: inputs were uncontrolled — their values lived inside
      the DOM and we had no way to read them in JavaScript.
    - Now: we always know what the user typed and can send it to
      the back-end.

 2. FORM SUBMISSION HANDLER (`handleSubmit`)
    - Calls `e.preventDefault()` to stop the browser from
      refreshing the page on submit.
    - Calls `login({ email, password })` from the AuthContext,
      which sends a POST request to the back-end API.
    - On success → redirects the user to the home page ("/").
    - On failure → the error message from the API is automatically
      displayed above the form (via the `error` state).

 3. AUTH CONTEXT INTEGRATION (`useAuth`)
    - `login(data)` → sends credentials to POST /auth/login
    - `isLoading`   → true while the request is in flight
    - `error`       → the global error message (e.g. "Invalid credentials")
    - `fieldErrors` → per-field errors (e.g. { email: "not found" })
    - `clearError`  → resets errors before a new submission

 4. ERROR DISPLAY
    - A red banner appears above the form when `error` is set.
    - Each input shows its own error below it via the new `error`
      prop on <AnimatedInput>.

 5. LOADING STATE
    - The "Sign In" button shows a spinner and is disabled while
      `isLoading` is true, preventing double-submissions.

 6. SOCIAL LOGIN
    - Google and Facebook buttons now call `socialLogin("google")`
      / `socialLogin("facebook")` which redirects the browser to
      the back-end's OAuth flow.

 ADVANTAGE:
    - The front-end is now fully wired up. When the back-end team
      deploys their API, you only need to set the
      NEXT_PUBLIC_API_URL environment variable and everything
      will connect automatically — no code changes needed.
    - All API calls are centralized in src/lib/api.ts, so if the
      back-end changes an endpoint URL you only update ONE file.
    - TypeScript types in src/types/auth.ts serve as a "contract"
      between the two teams — share them with the back-end team.
 ============================================================



