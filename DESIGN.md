# DevSpace Manager Design System

## 0. Research Log

- Embedded refs: shortlisted Linear, Sentry, Warp; picked native Paseo tokens with Linear-style restraint because this is a compact developer control panel.
- Lazyweb: skipped because network access was unavailable and installed Paseo plugins provide stronger host-native references.
- Imagen drafts: skipped because no bitmap or branded illustration is needed.
- Local references: inspected `dev-control-center`, `environment-manager`, `dev-ports`, and `paseo-link` for panel, process, link, and accessibility patterns.

## 1. Atmosphere & Identity

Quiet deployment cockpit. State, action, logs, and URLs stay readable without visual noise. Signature: one status block moves clearly from unavailable to starting, running, stopping, or failed.

## 2. Color

All colors come from `PluginTheme.colors`: `surface0`, `surface1`, `surface2`, `border`, `foreground`, `foregroundMuted`, `accent`, `accentForeground`, `statusSuccess`, `statusWarning`, and `statusDanger`. No hardcoded colors.

## 3. Typography

Host system font. Title 20–24/700, section title 15/600, body 14, metadata and logs 12–13. Logs use monospace. Body text never falls below 12.

## 4. Spacing & Layout

4px base. Screen padding is 24px wide and 16px compact. Major gap 16px, card gap 8–12px. Every action has a minimum 44px touch target. Compact clients stack actions and links.

## 5. Components

- Status card: detected config, runtime state, PID, and contextual message.
- Primary action: Play while stopped or failed; disabled while transitioning.
- Stop action: visible only while starting or running; uses warning styling because it interrupts work.
- Link row: exact URL plus explicit open action.
- Log viewer: latest process lines, bounded and selectable by screen readers.
- Empty and error states: direct explanation and next action.

## 6. Motion & Interaction

Native pressed opacity only. Query polling reflects process transitions. No decorative animation.

## 7. Depth & Surface

`surface0` is canvas, `surface1` is status and content cards, `surface2` is nested rows and secondary controls, and `border` separates regions. No shadows.

## 8. Accessibility Constraints & Accepted Debt

WCAG 2.2 AA target. State always appears as text, never color alone. Actions expose button or link roles and descriptive labels. Feedback uses live regions. Compact layout supports narrow windows and mobile. Accepted debt: Kubernetes and DevSpace availability cannot be simulated visually; runtime errors remain visible through message and logs.
