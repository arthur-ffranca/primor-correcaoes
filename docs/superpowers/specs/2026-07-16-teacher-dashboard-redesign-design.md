# Teacher Dashboard Redesign Design

## Goal

Replace the raw HTML prototype look with a credible, teacher-facing correction workspace. The product should feel like a calm editorial desk: secure, focused, legible, and premium enough to show to the professor without apology.

## Visual Direction

- Warm paper background with subtle radial texture instead of a flat default page.
- Editorial typography: a refined serif for headings and a readable sans-serif for interface text.
- Ink, clay, oxblood, sage, and gold accents. Avoid generic AI purple/blue gradients.
- Card-based layout with clear sections, spacious rhythm, rounded corners, and quiet depth.
- Dense enough for batch correction, but not visually noisy.

## Screens

- Login: centered access card, security note, product promise, and clear email/password form.
- Dashboard: hero summary, metric cards, and a polished correction table with status pills and action buttons.
- New essay: form inside a guided upload card with a clear privacy/quality note.
- Review: two-column correction desk with transcription, largest-discount issues, score card, and approval action.

## Interaction And States

- All links/actions should look clickable and keyboard-focusable.
- Status should be human-readable: "Em revisão", "Aprovada", "Reenviar foto", etc.
- Empty states should be presented as cards, not loose paragraphs.
- Mobile should collapse to a single-column layout with horizontal scrolling only for tables when necessary.

## Acceptance Criteria

- No unstyled tables, naked links, default buttons, or Arial-only interface.
- Dashboard screenshot should immediately communicate "product" rather than "HTML exercise".
- Existing auth, dashboard, review, approval, and download flows must keep working.
- Playwright screenshot must be regenerated after the redesign.
