# 03 — Whiteboard tools and UI

Assume a signed-in user in `/room/:roomCode` and **admitted** to the socket room (see file 04 if wait screens appear).

## WB-001 — Room loads or not found

| Field | Content |
|-------|---------|
| **ID** | WB-001 |
| **Preconditions** | Valid session |
| **Steps** | Open valid `room_code`; then invalid code via URL. |
| **Expected** | Valid: board loads after loading state. Invalid: toast “Room not found”, redirect home. |

## WB-002 — Pen drawing

| Field | Content |
|-------|---------|
| **ID** | WB-002 |
| **Preconditions** | Admitted to canvas |
| **Steps** | Select pen; drag on canvas. |
| **Expected** | Stroke appears; releasing mouse/touch ends stroke. |

## WB-003 — Shapes: rectangle, circle, arrow, line

| Field | Content |
|-------|---------|
| **ID** | WB-003 |
| **Preconditions** | Admitted |
| **Steps** | Each shape tool: create object on canvas. |
| **Expected** | Correct geometry; transformer visible where applicable. |

## WB-004 — Text and sticky note

| Field | Content |
|-------|---------|
| **ID** | WB-004 |
| **Preconditions** | Admitted |
| **Steps** | Add text; add sticky; double-click edit if supported. |
| **Expected** | Text editable; sticky shows content. |

## WB-005 — Eraser

| Field | Content |
|-------|---------|
| **ID** | WB-005 |
| **Preconditions** | Existing strokes/shapes |
| **Steps** | Select eraser; interact with elements per app behavior. |
| **Expected** | Target elements removed or modified per design. |

## WB-006 — Color and stroke width

| Field | Content |
|-------|---------|
| **ID** | WB-006 |
| **Preconditions** | Admitted |
| **Steps** | Change color and stroke width; draw new pen stroke. |
| **Expected** | New stroke uses selected color/width. |

## WB-007 — Selection and move

| Field | Content |
|-------|---------|
| **ID** | WB-007 |
| **Preconditions** | Object on canvas |
| **Steps** | Select tool / click object; drag. |
| **Expected** | Object moves; transformer updates. |

## WB-008 — Delete selection

| Field | Content |
|-------|---------|
| **ID** | WB-008 |
| **Preconditions** | Object selected |
| **Steps** | Use delete/backspace or UI delete control per app. |
| **Expected** | Element removed from canvas. |

## WB-009 — Clear board

| Field | Content |
|-------|---------|
| **ID** | WB-009 |
| **Preconditions** | Multiple elements (confirm role allows clear) |
| **Steps** | Trigger clear-board action. |
| **Expected** | Canvas empty locally; synced for peers (see 04). |

## WB-010 — Export PNG / PDF

| Field | Content |
|-------|---------|
| **ID** | WB-010 |
| **Preconditions** | Canvas has content |
| **Steps** | Use export controls (PNG/PDF as implemented). |
| **Expected** | File downloads; content roughly matches canvas. |

## WB-011 — Mobile vs desktop toolbar

| Field | Content |
|-------|---------|
| **ID** | WB-011 |
| **Preconditions** | Admitted |
| **Steps** | Resize below 768px width vs desktop. |
| **Expected** | Toolbar layout switches (e.g. bottom vs side) without losing tools. |

## WB-012 — Banned user cannot open board

| Field | Content |
|-------|---------|
| **ID** | WB-012 |
| **Preconditions** | `participants.role = banned` |
| **Steps** | Navigate directly to `/room/{code}`. |
| **Expected** | Toast banned message; redirect home. |
