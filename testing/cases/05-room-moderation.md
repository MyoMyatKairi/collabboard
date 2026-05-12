# 05 — Room moderation

Requires **owner** socket in room. Use two browsers: **Owner (O)** and **Guest (G)**.

## MOD-001 — Approve pending guest

| Field | Content |
|-------|---------|
| **ID** | MOD-001 |
| **Preconditions** | G not in `participants`; O in room as owner |
| **Steps** | G joins → pending; O approves from UI. |
| **Expected** | G admitted; `participants` upsert as editor (per app); G sees canvas. |

## MOD-002 — Reject pending guest

| Field | Content |
|-------|---------|
| **ID** | MOD-002 |
| **Preconditions** | G pending |
| **Steps** | O rejects. |
| **Expected** | G gets `join-denied` `rejected`; not admitted. |

## MOD-003 — Kick non-owner

| Field | Content |
|-------|---------|
| **ID** | MOD-003 |
| **Preconditions** | Member B admitted (not owner) |
| **Steps** | O kicks B from roster/participants UI. |
| **Expected** | B receives `kicked`, toast, redirect home; removed from room roster. |

## MOD-004 — Cannot kick owner

| Field | Content |
|-------|---------|
| **ID** | MOD-004 |
| **Preconditions** | O owner present |
| **Steps** | Attempt kick targeting owner (if UI exposes). |
| **Expected** | Server ignores or UI prevents; owner stays. |

## MOD-005 — Ban user

| Field | Content |
|-------|---------|
| **ID** | MOD-005 |
| **Preconditions** | B admitted non-owner |
| **Steps** | O bans B. |
| **Expected** | B gets `banned`, toast, redirect; future join from Landing blocked for banned user. |

## MOD-006 — Roster accuracy

| Field | Content |
|-------|---------|
| **ID** | MOD-006 |
| **Preconditions** | Multiple members online |
| **Steps** | Open participants/roster panel. |
| **Expected** | Lists match connected users; updates on join/leave. |

## MOD-007 — Pending list only for owner

| Field | Content |
|-------|---------|
| **ID** | MOD-007 |
| **Preconditions** | Pending request exists |
| **Steps** | Log in as non-owner member; check UI. |
| **Expected** | Pending approval controls not shown or non-functional for non-owner. |

## MOD-008 — Owner-only decide-join (server)

| Field | Content |
|-------|---------|
| **ID** | MOD-008 |
| **Preconditions** | Malicious client attempt (optional advanced) |
| **Steps** | Non-owner socket tries to emit `decide-join` (devtools / custom client). |
| **Expected** | Server ignores; no admission change. |
