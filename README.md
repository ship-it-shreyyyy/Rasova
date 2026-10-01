# Rasova: Phase 1 design

Rasova is a restaurant POS and operations platform. This repository holds the Phase 1 design work, starting with:

- **00 Foundations**: tokens, type, color, spacing, icons and reusable components
- **01 Authentication**: an interactive prototype covering PA-01 to PA-06, with every error, empty, loading and success state

Open `prototype/index.html` in a browser (or serve the folder with `python3 -m http.server`). Nothing needs to be installed or built.

## What's in the prototype

The page has four tabs:

| Tab | Contents |
| --- | --- |
| **Prototype** | Live, connected auth flows on a 1440×900 desktop or 1280×800 tablet canvas. Side controls switch the viewport and the network, set each outcome (for example "Invalid credentials" or "IdP declines"), simulate the administrator approving a device, and jump to any state. |
| **State board** | Every state rendered side by side from the same code, plus a tablet set. Select a card to open it live. |
| **Foundations** | Principles, color tokens and the orange-usage rules, type scale, operational numbers, spacing, radius, control heights, elevation, icons, and the 00–14 file map. |
| **Components** | Buttons (each variant with its default, hover, focus, disabled and loading states), inputs, cards, status pills, sync card, banners, navigation, app shell, step indicator, password field, SSO button, OTP field, PIN dots and keypad. |

### Flows and how they connect

```
Login ──► (MFA required) ──► MFA ──► Signing in ──► App shell
  │  └──► (no MFA) ─────────────────► Signing in ──► App shell
  ├──► Forgot password ──► Check your inbox ──► Back to sign in
  ├──► Continue with SSO ──► Redirecting ──► Waiting for IdP ──► App shell
  └──► (offline) ──► Use PIN login

PIN login ──► App shell (POS)
  └──► Device not authorized ──► Secure this device ──► Pending ──► Paired ──► PIN login
                                                              └──► Rejected ──► Request again

App shell ──► Account menu ──► Sign out (warns about unsynced transactions) ──► Signed out / PIN
          └──► Session timeout ──► Session expired
```

### State coverage

| Requirement | States |
| --- | --- |
| PA-01 Login | Default, focused input, filled, loading, invalid credentials (with attempts left), account locked, service error, no connection |
| Forgot password | Reset request, invalid email, unknown email, sending, service error, reset email sent with a resend cooldown |
| PA-02 SSO login | Organization entry, invalid identifier, SSO not set up for the domain, redirecting, waiting for the IdP, sign-in not confirmed |
| PA-03 MFA | Enter code (active digit in orange), code entered, verifying, incorrect code, expired code, too many attempts, choose another method, verified |
| PA-04 PIN login | Enter PIN, entering, incorrect PIN, too many attempts (5-minute pause), PIN locked by an administrator, device not authorized, PIN accepted |
| PA-05 Device binding | Device details, pending approval (pairing code and QR), paired, rejected with the administrator's note |
| PA-06 Session / logout | Signing in, session expired, sign-out confirmation, sign out with unsynced data, signed out |
| System states (shell) | Online, offline, syncing, sync success, sync failure, conflict, permission denied |

Demo inputs: any work email and password; demo POS PIN `2468`. All names, outlets and figures are fictional sample data.

## Visual language

- **Dark first.** The canvas is black (`#080808`, `#0D0D0D`, `#111111`) and surfaces step up through charcoal (`#151515` to `#202020`) with 1px hairlines (`#292929`, `#333333`). There is no light theme.
- **Orange as identity.** `#FF6A00` marks the primary action, active navigation, focus, selection, progress and the headline number. It covers about 3% of a screen. Text on orange is black (7.6:1), never white.
- **Semantic color is separate.** Success, warning, error and info never reuse orange, and every state also has its own icon or shape (a hollow dot for offline, a spinner for syncing, an icon for errors), so color is never the only signal.
- **Type.** Manrope for headings and operational numbers (800 weight, tabular figures), Inter for interface text, JetBrains Mono for codes, IDs and KOT numbers.
- **Shape.** Radius 10 for controls, 12 for cards, 14 for panels. Shadows stay restrained, and an orange glow appears only on focus, active navigation, the primary CTA and selection.
- **Touch.** POS and tablet controls are at least 56px tall and keypad keys are 72px (84px on tablet). The PIN screen also takes physical keyboard input for Windows terminals.
- **Tablet is its own layout.** At 1280×800 the brand panel narrows, inputs and buttons grow to touch height, and the sidebar becomes a labelled icon rail.

## Files

```
prototype/
  index.html       page shell: tabs, controls, stage
  tokens.css       00 Foundations: every color, type, space, radius, size and shadow token
  components.css   reusable rv-* components and their states
  screens.css      auth layouts (web split, POS console), app shell, tablet adaptations
  studio.css       the prototype page around the screens
  icons.js         Lucide icon paths (ISC), inlined so nothing loads at runtime
  screens.js       component helpers and one render function per screen
  studio.js        state machine, interactions, controls, state board, sheets
```

Every screen is a pure function of one state object, so the live prototype, the state board and the component sheet always match. These tokens and component names (`rv-btn--primary`, `rv-input.is-error` and so on) are meant to map one-to-one onto Figma variables and components.

## Assumptions

- The Phase 1 UX Screen Inventory wasn't included with this repository, so the PA-01 to PA-06 IDs, terminology and states follow the written brief.
- Lockout rules (3 password attempts, 3 MFA attempts, 3 PIN attempts, 30-minute account lock, 5-minute PIN pause, 30-minute reset link, 10-minute pairing code) are placeholders until product and security confirm them.
- SSO uses generic language with no named providers.
- The "unknown email" state on password reset follows the brief. Production may prefer a neutral message so the form can't be used to find out which emails have accounts.
