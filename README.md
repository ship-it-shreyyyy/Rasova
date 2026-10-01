# Rasova: Phase 1 design

Rasova is a restaurant POS and operations platform. This repository holds the Phase 1 design system and an interactive prototype built from it.

The visual direction is **light first, black for structure, orange as the signature**. A full dark theme exists as a secondary variant built on the same tokens.

Open `prototype/index.html` in a browser (or serve the folder with `python3 -m http.server`). Nothing needs to be installed or built.

## What's covered (steps 1–4)

| Step | Contents |
| --- | --- |
| 1 · Foundations | Light and dark color tokens, the orange and black usage rules, type scale, spacing, grid, radius, elevation, icons, and every component with its states: buttons, inputs, dropdowns, tabs, tables, pagination, cards, KPI cards, badges, alerts, modals, drawers, avatars, tooltips, empty and loading states, and the Phase 1 status sets. |
| 2 · Application shell | Expanded (248px) and collapsed (76px) sidebar with tooltips, navbar with breadcrumb, outlet selector, always-visible connection status, notifications, help and profile menu. |
| 3 · Authentication | Login, forgot password, SSO, MFA, POS PIN, device binding and session/logout, with their error, loading and success states. |
| 4 · First screens | POS billing (categories, item grid, order panel with KOT grouping, GST totals, payment) and the Home dashboard. |

Steps 5 and 6 (Tables & Orders, Kitchen, Menu, Online Orders, Reports, Admin, Devices, Onboarding, Support, Subscription) reuse this shell and component set. Their nav items currently open a placeholder.

## The prototype

The page has four tabs and a Light/Dark switch:

- **Prototype**: the live product on a 1440×900 desktop or 1280×800 tablet canvas. Side controls switch the viewport and the network, set each outcome (invalid credentials, expired code, IdP declines and so on), simulate an administrator approving a device, trigger sync failures and conflicts, and jump to any state.
- **State board**: every state side by side, plus a tablet set and a dark-theme set. Select a card to open it live.
- **Foundations** and **Components**: the design system, rendered from the same code as the screens.

Demo inputs: any work email and password, and POS PIN `2468`. Shortcuts in the shell: `N` starts a new order, `/` searches in POS, `[` collapses the sidebar. All names, outlets and figures are fictional sample data.

### Flows

```
Login ──► Additional verification required ──► MFA ──► Home
  ├──► Forgot password ──► Check your inbox ──► Sign in
  ├──► Continue with SSO ──► Redirecting ──► Waiting ──► Home
  └──► (offline) ──► Use PIN login

POS PIN (pick staff, 4 digits, auto-submits) ──► POS
  └──► Device not authorized ──► Secure this device ──► Pending ──► Paired ──► PIN
                                                               └──► Rejected

Shell ──► Profile menu ──► Sign out (warns about unsynced data) ──► Signed out / PIN
      └──► Session timeout ──► Session expired
POS ──► add items ──► Send KOT ──► Pay (Cash / UPI / Card / Split) ──► Payment received
```

## Design decisions

- **Orange is about 2% of a screen.** It marks the primary action, active navigation (soft orange fill, orange icon, and an orange marker on the sidebar edge), focus, selection, progress, new-item counts, and metrics that need action, such as pending approvals.
- **Black does the heavy lifting.** It's used for text, icons, and secondary actions that still need weight (New order, Send KOT, Approve), plus tooltips and the selected category chip.
- **Text on orange is black.** White on `#FF6A00` is 2.9:1, which fails contrast. Black is 7.2:1. When orange has to be text on light backgrounds, it uses `--orange-ink` (`#B34A00`, 5.4:1).
- **Status never relies on color alone.** Every status badge carries a dot or an icon. Offline uses a hollow ring, syncing uses a spinner, and errors use an icon.
- **Connection status is always visible**, in both the navbar and the sidebar. A slim alert bar appears only when sync fails or there's a conflict.
- **POS is denser than the dashboard.** The sidebar collapses automatically in POS. Sent items are locked, because voiding them needs approval. Items carry the Indian veg and non-veg marks, and totals show CGST and SGST at 2.5% each, rounded off.
- **Tablet is its own layout.** At 1280×800 the sidebar becomes a rail, POS categories become chips, and controls grow to 56px touch targets with 80px keypad keys.

## Files

```
prototype/
  index.html       page shell: tabs, theme switch, controls, stage
  tokens.css       light tokens (primary) and dark tokens (variant)
  components.css   rv-* components and their states
  screens.css      auth, POS terminal, shell, Home, POS billing, tablet rules
  studio.css       the prototype page around the screens
  icons.js         Lucide icon paths (ISC), inlined
  screens.js       component helpers and one render function per screen
  studio.js        state machine, interactions, controls, state board, sheets
```

Every screen is a pure function of one state object, so the prototype, the state board and the design-system sheets always match. Token and component names (`--orange-soft`, `rv-btn--black`, `nav-item.is-active`) are meant to map one-to-one onto Figma variables and components.

## Assumptions to confirm

- The Phase 1 UX Screen Inventory wasn't in the repository. Screen IDs (PA-01 to PA-06), navigation and states follow the written brief.
- Lockout and timer values are placeholders: 3 attempts each for password, MFA and PIN, a 30-minute account lock, a 5-minute PIN pause, a 30-minute reset link and a 10-minute pairing code.
- The "unknown email" state on password reset reveals whether an account exists. Production may prefer a neutral message.
- PIN login auto-submits on the fourth digit, for speed.
