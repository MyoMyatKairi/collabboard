# 01 — Auth and session

## AUTH-001 — Sign up creates account

| Field | Content |
|-------|---------|
| **ID** | AUTH-001 |
| **Preconditions** | Supabase configured; email provider allows sign-up |
| **Steps** | 1. Open `/auth`. 2. Switch to sign-up. 3. Enter full name, email, password. 4. Submit. |
| **Expected** | Success toast; user returned to sign-in mode; no active session until sign-in (app signs out after sign-up). |
| **Notes** | If email confirmation is on, Supabase may require confirming mail before sign-in works. |

## AUTH-002 — Sign in with valid credentials

| Field | Content |
|-------|---------|
| **ID** | AUTH-002 |
| **Preconditions** | Existing user |
| **Steps** | 1. Open `/auth`. 2. Enter email/password. 3. Submit. |
| **Expected** | Success toast; redirect to `/` (Landing). |

## AUTH-003 — Sign in with wrong password

| Field | Content |
|-------|---------|
| **ID** | AUTH-003 |
| **Preconditions** | Existing user |
| **Steps** | Enter valid email, wrong password; submit. |
| **Expected** | Error toast; remain on `/auth`. |

## AUTH-004 — Unconfigured Supabase

| Field | Content |
|-------|---------|
| **ID** | AUTH-004 |
| **Preconditions** | Remove or blank `VITE_*` in `.env`; restart dev server |
| **Steps** | Open `/auth`; attempt sign-in. |
| **Expected** | Toast or message that Supabase is not configured; no crash. |

## AUTH-005 — Route guard: unauthenticated root

| Field | Content |
|-------|---------|
| **ID** | AUTH-005 |
| **Preconditions** | No session |
| **Steps** | Navigate to `/`. |
| **Expected** | Redirect to `/auth`. |

## AUTH-006 — Route guard: authenticated auth page

| Field | Content |
|-------|---------|
| **ID** | AUTH-006 |
| **Preconditions** | Signed in |
| **Steps** | Navigate to `/auth`. |
| **Expected** | Redirect to `/`. |

## AUTH-007 — Route guard: room requires auth

| Field | Content |
|-------|---------|
| **ID** | AUTH-007 |
| **Preconditions** | No session |
| **Steps** | Navigate to `/room/anycode`. |
| **Expected** | Redirect to `/auth`. |

## AUTH-008 — Sign out

| Field | Content |
|-------|---------|
| **ID** | AUTH-008 |
| **Preconditions** | Signed in on Landing |
| **Steps** | Click sign out. |
| **Expected** | Success toast; session cleared; accessing `/` sends you to `/auth`. |

## AUTH-009 — Session persistence after refresh

| Field | Content |
|-------|---------|
| **ID** | AUTH-009 |
| **Preconditions** | Signed in |
| **Steps** | Refresh browser on `/`. |
| **Expected** | Still authenticated; Landing loads without forced login. |
