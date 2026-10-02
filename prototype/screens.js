/* ==========================================================================
   RASOVA — component helpers and screen renderers.
   Every screen is a pure function of one prototype state object, so the
   live prototype, the state board and the design-system sheets share it.
   ========================================================================== */
(function () {
  "use strict";

  const ICONS = window.RASOVA_ICONS;
  let STATIC = false; // true while rendering non-interactive thumbnails (no ids)

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, cls = "") => `<svg class="rv-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
  const idAttr = (id) => (STATIC || !id ? "" : ` id="${id}"`);
  const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const inr2 = (n) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- Sample data (fictional) ---------- */
  const ORG = "Spice Trail Hospitality";
  const TERMINAL = "Cashier Terminal 01";
  const DEVICE_ID = "RSV-WIN-7F3A-92C1";
  const DEMO_PIN = "2468";
  const MANAGER = { n: "Sana Siddiqui", i: "SS", r: "Outlet manager", e: "sana.siddiqui@spicetrail.in" };
  const STAFF = [
    { n: "Aarav Mehta", i: "AM", r: "Cashier" },
    { n: "Neha Kapoor", i: "NK", r: "Captain" },
    { n: "Priya Nair", i: "PN", r: "Cashier" },
    { n: "Rohan Das", i: "RD", r: "Outlet manager" },
  ];
  const OUTLETS = [
    { n: "Downtown Delhi", a: "Connaught Place", s: "online" },
    { n: "Gurugram", a: "Cyber Hub", s: "online" },
    { n: "Noida", a: "Sector 18", s: "offline" },
    { n: "South Delhi", a: "Hauz Khas", s: "syncing" },
  ];
  const CATS = [["starters", "Starters"], ["tandoor", "Tandoor"], ["mains", "Mains"], ["breads", "Breads"], ["rice", "Rice & Biryani"], ["desserts", "Desserts"], ["beverages", "Beverages"]];
  const MENU = [
    ["ST-01", "starters", "Paneer Tikka", 340, 1], ["ST-02", "starters", "Hara Bhara Kabab", 260, 1], ["ST-03", "starters", "Amritsari Fish", 420, 0], ["ST-04", "starters", "Chilli Paneer", 320, 1], ["ST-05", "starters", "Chicken 65", 360, 0],
    ["TN-01", "tandoor", "Chicken Tikka", 380, 0], ["TN-02", "tandoor", "Tandoori Mushroom", 300, 1, "na"], ["TN-03", "tandoor", "Seekh Kebab", 420, 0], ["TN-04", "tandoor", "Malai Broccoli", 320, 1],
    ["MN-01", "mains", "Dal Makhani", 320, 1], ["MN-02", "mains", "Butter Chicken", 460, 0], ["MN-03", "mains", "Paneer Lababdar", 380, 1], ["MN-04", "mains", "Rogan Josh", 520, 0], ["MN-05", "mains", "Kadhai Veg", 300, 1], ["MN-06", "mains", "Chana Masala", 280, 1],
    ["BR-01", "breads", "Butter Naan", 70, 1], ["BR-02", "breads", "Garlic Naan", 90, 1], ["BR-03", "breads", "Tandoori Roti", 40, 1], ["BR-04", "breads", "Laccha Paratha", 80, 1],
    ["RC-01", "rice", "Jeera Rice", 220, 1], ["RC-02", "rice", "Veg Biryani", 340, 1], ["RC-03", "rice", "Chicken Biryani", 420, 0],
    ["DS-01", "desserts", "Gulab Jamun", 140, 1], ["DS-02", "desserts", "Rasmalai", 160, 1], ["DS-03", "desserts", "Kulfi", 150, 1, "na"],
    ["BV-01", "beverages", "Masala Chaas", 90, 1], ["BV-02", "beverages", "Sweet Lassi", 120, 1], ["BV-03", "beverages", "Fresh Lime Soda", 110, 1], ["BV-04", "beverages", "Masala Chai", 60, 1],
  ].map(([id, cat, name, price, veg, na]) => ({ id, cat, name, price, veg: !!veg, na: na === "na" }));
  const ITEM = Object.fromEntries(MENU.map((m) => [m.id, m]));
  const START_CART = () => [{ id: "ST-01", qty: 1, sent: true }, { id: "MN-02", qty: 1, sent: true }, { id: "MN-01", qty: 1, sent: true }, { id: "BR-01", qty: 4, sent: false }, { id: "BV-02", qty: 2, sent: false }];

  /* ---------- Timers ---------- */
  const remaining = (S, name) => Math.max(0, Math.ceil(((S.timers[name] || 0) - Date.now()) / 1000));
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const timer = (S, name) => `<span data-timer="${name}">${fmt(remaining(S, name))}</span>`;

  /* ---------- Primitives ---------- */
  const mark = (cls = "rv-logo__mark") =>
    `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#FF6A00"/><path d="M11 24V8.5h6.4a4.85 4.85 0 0 1 0 9.7H11" fill="none" stroke="#171717" stroke-width="3.2" stroke-linejoin="round"/><path d="M16.6 18.2 22.4 24" stroke="#171717" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="9.5" r="1.9" fill="#171717"/></svg>`;
  const logo = (o = {}) => `<span class="rv-logo">${mark()}${o.word === false ? "" : '<span class="rv-logo__word">RASOVA</span>'}${o.desc ? '<span class="rv-logo__desc">Restaurant<br>operating system</span>' : ""}</span>`;

  function btn(o) {
    const c = ["rv-btn", `rv-btn--${o.v || "secondary"}`, o.size && `rv-btn--${o.size}`, o.block && "rv-btn--block", o.loading && "is-loading", o.cls].filter(Boolean).join(" ");
    const data = (o.act ? ` data-act="${o.act}"` : "") + (o.go ? ` data-go="${o.go}"` : "") + (o.cta ? " data-cta" : "") + (o.attrs ? " " + o.attrs : "");
    const inner = o.loading ? `${ic("loader-circle", "rv-spin")}<span>${o.loading === true ? o.label : o.loading}</span>` : `${o.icon ? ic(o.icon) : ""}${o.label ? `<span>${o.label}</span>` : ""}${o.iconR ? ic(o.iconR) : ""}`;
    return `<button type="${o.type || "button"}" class="${c}"${data}${o.disabled || o.loading ? " disabled" : ""}${o.loading ? ' aria-busy="true"' : ""}${o.aria ? ` aria-label="${esc(o.aria)}"` : ""}>${inner}</button>`;
  }

  function field(o) {
    const st = [o.error || o.state === "error" ? "is-error" : "", o.state === "focus" ? "is-focus" : "", o.state === "hover" ? "is-hover" : "", o.disabled ? "is-disabled" : "", o.readonly ? "is-readonly" : "", o.mono ? "rv-input--mono" : "", o.size ? "rv-input--" + o.size : ""].join(" ");
    const a = (k, v) => (v ? ` ${k}="${esc(v)}"` : "");
    return `<div class="rv-field">
      ${o.label ? `<div class="rv-field__top"><label class="rv-label"${STATIC ? "" : ` for="${o.id}"`}>${esc(o.label)}</label>${o.aside || ""}</div>` : ""}
      <div class="rv-input ${st}">${o.icon ? ic(o.icon) : ""}<input${idAttr(o.id)} name="${o.id}" type="${o.type || "text"}" value="${esc(o.value)}"${a("placeholder", o.ph)}${a("autocomplete", o.autocomplete)}${a("aria-label", o.label ? "" : o.ph)}${o.error || o.state === "error" ? ' aria-invalid="true"' : ""}${o.error && !STATIC ? ` aria-describedby="${o.id}-err"` : ""}${o.readonly ? " readonly" : ""}${o.disabled ? " disabled" : ""}${o.autofocus ? " data-autofocus" : ""} spellcheck="false">${o.action || ""}</div>
      ${o.error ? `<div class="rv-hint is-error"${idAttr(o.id + "-err")}>${ic("circle-alert")}<span>${o.error}</span></div>` : o.hint ? `<div class="rv-hint">${o.hint}</div>` : ""}
    </div>`;
  }

  const note = (tone, icon, text, sub, action) =>
    `<div class="rv-note rv-note--${tone}" role="${tone === "error" || tone === "warning" ? "alert" : "status"}">${ic(icon, icon === "loader-circle" ? "rv-spin" : "")}<div>${text}${sub ? `<span class="sub">${sub}</span>` : ""}${action ? `<div style="margin-top:6px;display:flex;gap:14px">${action}</div>` : ""}</div></div>`;
  const badge = (tone, label, o = {}) => `<span class="rv-badge rv-badge--${tone}">${o.dot ? '<i class="rv-dot"></i>' : ""}${o.icon ? ic(o.icon) : ""}${label}</span>`;

  const CONN = {
    online: ["online", '<i class="rv-dot"></i>', "Online", "", "Synced 12 sec ago"],
    offline: ["offline", '<i class="rv-dot"></i>', "Offline", "3 pending", "3 transactions pending"],
    syncing: ["syncing", ic("refresh-cw", "rv-spin"), "Syncing…", "", "Sending 3 transactions"],
    synced: ["synced", ic("circle-check"), "Synced", "", "Up to date · just now"],
    failed: ["failed", ic("circle-x"), "Sync failed", "", "2 transactions need attention"],
    conflict: ["conflict", ic("git-compare-arrows"), "Conflict", "", "1 change needs review"],
  };
  const conn = (st) => { const c = CONN[st]; return `<span class="rv-conn rv-conn--${c[0]}" role="status">${c[1]}${c[2]}${c[3] ? `<span class="meta">· ${c[3]}</span>` : ""}</span>`; };

  function otp(values, o = {}) {
    const firstEmpty = values.findIndex((d) => !d);
    let h = "";
    for (let i = 0; i < 6; i++) h += `<input class="rv-otp-cell ${values[i] ? "is-filled" : ""} ${o.showActive && i === firstEmpty ? "is-active" : ""}"${idAttr("otp-" + i)} data-otp="${i}" inputmode="numeric" autocomplete="${i === 0 ? "one-time-code" : "off"}" aria-label="Digit ${i + 1} of 6" value="${esc(values[i])}"${o.disabled ? " disabled" : ""}${o.autofocusIndex === i ? " data-autofocus" : ""}>`;
    return `<div class="rv-otp ${o.state ? "is-" + o.state : ""}" role="group" aria-label="6-digit verification code">${h}</div>`;
  }
  function pinDots(len, filled, state) {
    let h = "";
    for (let i = 0; i < len; i++) h += `<i class="rv-pin-dot ${i < filled ? "is-filled" : ""} ${i === filled && !state ? "is-next" : ""}"></i>`;
    return `<div class="rv-pin-dots ${state ? "is-" + state : ""}" role="img" aria-label="${filled} of ${len} digits entered">${h}</div>`;
  }
  function keypad(disabled, pressed) {
    const k = (d) => `<button type="button" class="rv-key ${pressed === d ? "is-pressed" : ""}" data-key="${d}"${disabled ? " disabled" : ""}>${d}</button>`;
    return `<div class="rv-keypad" role="group" aria-label="PIN keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k).join("")}<button type="button" class="rv-key rv-key--fn" data-act="pinClear"${disabled ? " disabled" : ""}>Clear</button>${k(0)}<button type="button" class="rv-key rv-key--fn" data-act="pinBack" aria-label="Delete last digit"${disabled ? " disabled" : ""}>${ic("delete")}</button></div>`;
  }
  function qr(seed = 7) {
    const N = 25; let r = seed;
    const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#171717"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#FFF"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#171717"/>`;
    const inF = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    let d = "";
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inF(x, y) && rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`;
    return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="Pairing QR code"><path d="${d}" fill="#171717"/>${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</svg>`;
  }

  /* ---------- Authentication environment ----------
     One persistent environment (grid, light, orbit, floating cards) with a
     glass panel in the middle. Screens only swap the panel contents, so the
     ambient motion never restarts between login, MFA, reset and SSO. */
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());
  const maskEmail = (e) => { const [u, d] = String(e).split("@"); return d ? `${u[0]}${"•".repeat(5)}@${d}` : e; };
  const domainOf = (id) => (String(id).includes("@") ? String(id).split("@")[1] : String(id));
  const orgFrom = (id) => { const v = String(id).toLowerCase(); if (v.includes("spicetrail") || v.includes("spice-trail")) return ORG; const b = v.includes("@") ? v.split("@")[1].split(".")[0] : v; return b.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); };
  const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) { return false; } };

  // Orbit: three rings around the panel; orange nodes travel slowly (orders, tables, kitchen).
  function orbit() {
    const cx = 720, cy = 462, still = STATIC || reduced();
    const ring = (rx, ry) => `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`;
    const at = (rx, ry, t) => [cx + rx * Math.sin(2 * Math.PI * t), cy - ry * Math.cos(2 * Math.PI * t)];
    const node = (rx, ry, dur, t, o = {}) => {
      const [x, y] = at(rx, ry, t);
      const body = `<circle r="${o.r || 4}" fill="${o.muted ? "var(--ink-3)" : "#FF6A00"}"/>${o.muted ? "" : `<circle r="11" fill="#FF6A00" opacity="0.14" class="orbit__halo"/>`}${o.label ? `<text x="10" y="-8" class="orbit__label">${o.label}</text>` : ""}`;
      return still ? `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${body}</g>`
        : `<g>${body}<animateMotion dur="${dur}s" begin="-${(t * dur).toFixed(1)}s" repeatCount="indefinite" path="${ring(rx, ry)}"/></g>`;
    };
    return `<svg class="env__orbit" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><radialGradient id="rvCore" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF6A00" stop-opacity="0.10"/><stop offset="1" stop-color="#FF6A00" stop-opacity="0"/></radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="300" fill="url(#rvCore)"/>
      <g transform="rotate(-9 ${cx} ${cy})">
        <path d="${ring(780, 470)}" fill="none" stroke="var(--orbit-muted)" stroke-width="1"/>
        <path d="${ring(560, 352)}" fill="none" stroke="var(--orbit-muted)" stroke-width="1" stroke-dasharray="2 6"/>
        ${node(780, 470, 120, 0.62, { muted: true, r: 3 })}${node(560, 352, 80, 0.12, { label: "ORDER" })}${node(560, 352, 80, 0.55)}
      </g>
      <path class="orbit__main" d="${ring(372, 372)}" fill="none" stroke="var(--orbit)" stroke-width="1" stroke-dasharray="1 7" stroke-linecap="round"/>
      ${node(372, 372, 54, 0.08, { label: "KOT" })}${node(372, 372, 54, 0.4)}${node(372, 372, 54, 0.78, { label: "T12" })}
    </svg>`;
  }

  function spark() {
    const pts = [6, 9, 7, 12, 10, 15, 13, 18].map((v, i) => `${i * 10},${22 - v}`).join(" ");
    return `<svg class="fcard__spark" viewBox="0 0 70 22" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="#FF6A00" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="70" cy="4" r="2.4" fill="#FF6A00"/></svg>`;
  }
  // Floating operational fragments. Position in %, parallax depth, float timing.
  const FLOAT_CARDS = [
    { cls: "c-table", x: 14.5, y: 22, depth: 0.9, dur: 5.5, delay: 0, body: `<div class="fcard__k"><i class="fdot"></i>Table</div><div class="fcard__v">12</div><div class="fcard__s">4 guests · 38 min</div>` },
    { cls: "c-order", x: 74, y: 15, depth: 0.6, dur: 4.5, delay: -1.2, body: `<div class="fcard__k">Order #184</div><div class="fcard__v">₹2,840</div><div class="fcard__bar"><i style="width:68%"></i></div><div class="fcard__s">Dine-in · 6 items</div>` },
    { cls: "c-kot", x: 78.5, y: 57, depth: 1.1, dur: 6, delay: -2.4, body: `<div class="fcard__k">KOT #1042</div><div class="fcard__v fcard__v--ok">${ic("circle-check")}Ready</div><div class="fcard__s">Tandoor · Table 07</div>` },
    { cls: "c-online", x: 9.5, y: 61, depth: 0.7, dur: 5, delay: -0.8, body: `<div class="fcard__k">Online</div><div class="fcard__row"><span class="fcard__v">14</span>${spark()}</div><div class="fcard__s">orders this hour</div>` },
    { cls: "c-sync is-dark", x: 70, y: 84, depth: 0.5, dur: 6.5, delay: -3, body: `<i class="fdot fdot--ok"></i>Synced<span>3 outlets · just now</span>` },
  ];
  function floatCards(S) {
    return FLOAT_CARDS.map((c, i) => `<div class="fwrap ${c.cls}" style="left:${c.x}%;top:${c.y}%;--depth:${c.depth};${S.anim === "intro" ? `--d:${320 + i * 90}ms` : ""}">
      <div class="fcard ${c.cls.includes("is-dark") ? "rv-glass rv-glass--dark" : "rv-glass"} anim-float" style="--dur:${c.dur}s;--delay:${c.delay}s">${c.body}</div></div>`).join("");
  }

  function env(S, kind) {
    return `<div class="env" aria-hidden="true"><div class="env__grid"></div><div class="env__atmos env__atmos--a anim-drift"></div><div class="env__atmos env__atmos--b anim-drift"></div>${orbit()}${kind === "web" ? floatCards(S) : ""}</div>`;
  }

  // Shell for every pre-app screen. kind: "web" (email, SSO, MFA) or "terminal" (POS PIN, device binding).
  function authLayout(S, panel, o = {}) {
    const kind = o.kind || "web";
    const offline = S.network === "offline";
    const intro = S.anim === "intro" ? " is-intro" : "";
    const swap = S.anim === "swap" ? " anim-swap" : S.anim === "swap-back" ? " anim-swap-back" : "";
    const top = kind === "web"
      ? `<header class="auth__top">
          <div class="auth__brand">${logo()}<span class="auth__desc">Restaurant operating system</span></div>
          <span class="auth__meta ${offline ? "is-offline" : ""}"><i class="rv-dot"></i>${offline ? "Offline · no connection" : "Secure connection"}</span>
          <div class="auth__top-right"><span class="auth__meta auth__meta--plain">Rasova OS / 1.0</span>${btn({ v: "text", label: "Need help?", act: "help" })}</div>
        </header>`
      : `<header class="auth__top auth__top--term">
          <div class="auth__brand">${logo()}</div>
          <span class="auth__ctx">${ic("monitor")}<b>${esc(o.ctx || TERMINAL)}</b><span>Downtown Delhi</span></span>
          <div class="auth__top-right"><span class="auth__clock">7:42<small>PM</small></span>${conn(offline ? "offline" : "online")}</div>
        </header>`;
    return `<div class="auth auth--${kind}" data-kind="${kind}">${env(S, kind)}
      <div class="auth__ui${intro}">
        ${top}
        <main class="auth__center"><div class="auth__panel rv-glass ${o.wide ? "auth__panel--wide" : ""} ${o.panelCls || ""}${swap}">${panel}</div></main>
        <footer class="auth__foot"><span>© 2026 Rasova</span><nav>${["Privacy", "Terms", "Status"].map((l) => `<button type="button" class="auth__foot-link">${l}</button>`).join("")}</nav></footer>
      </div></div>`;
  }
  const back = (go = "login/default", label = "Back to sign in") => btn({ v: "text", label, icon: "arrow-left", go, cls: "auth__back", attrs: 'data-dir="back"' });
  const xlField = (o) => field(Object.assign({ size: "xl" }, o));
  const cta = (o) => btn(Object.assign({ v: "primary", size: "xl", block: true }, o, o.arrow === false ? {} : { label: o.loading ? o.label : `${o.label}<span class="arr">${ic("arrow-right")}</span>` }));

  function loginScreen(S) {
    const v = S.v, locked = v === "locked", busy = v === "loading" || v === "mfa-required";
    const emailErr = S.emailTouched && S.email && !emailOk(S.email) ? "Enter a work email, like name@company.com." : "";
    const can = emailOk(S.email) && S.password.length > 0 && !locked;
    const notes = {
      invalid: note("error", "circle-alert", "Email or password is incorrect.", `${S.attemptsLeft} ${S.attemptsLeft === 1 ? "attempt" : "attempts"} left before the account is locked.`),
      locked: note("error", "lock-keyhole", "Your account has been temporarily locked.", "Try again in 30 minutes, or ask your administrator to unlock it.", btn({ v: "link", label: "Reset password", go: "forgot/default" })),
      "mfa-required": note("orange", "shield-check", "Additional verification required.", "Taking you to verification…"),
      "service-error": note("error", "cloud-off", "We couldn't reach Rasova.", "Nothing was submitted. Try again in a moment.", btn({ v: "link", label: "Try again", act: "submitLogin" })),
      offline: note("warning", "wifi-off", "You're offline.", "Email sign-in needs a connection. Set-up POS terminals can use PIN login.", btn({ v: "link", label: "Use PIN login", go: "pin/default" })),
      "session-expired": note("info", "timer", "Your session expired.", "Sign in again to continue where you left off."),
      "signed-out": note("success", "circle-check", "You're signed out."),
    };
    const eye = `<button type="button" class="rv-input__action" data-act="togglePw" aria-label="${S.showPw ? "Hide password" : "Show password"}" aria-pressed="${S.showPw}"${locked ? " disabled" : ""}>${ic(S.showPw ? "eye-off" : "eye")}</button>`;
    return authLayout(S, `<form class="auth__box" data-form="login" novalidate>
      <div class="auth__head"><h1>Welcome back.</h1><p>Sign in to your Rasova workspace.</p></div>
      ${notes[v] || ""}
      ${xlField({ id: "email", label: "Work email", type: "email", value: S.email, ph: "name@company.com", autocomplete: "username", state: v === "focus" ? "focus" : v === "invalid" ? "error" : "", error: emailErr, disabled: locked, readonly: busy, autofocus: v !== "invalid" })}
      ${xlField({ id: "password", label: "Password", type: S.showPw ? "text" : "password", value: S.password, ph: "Enter your password", autocomplete: "current-password", state: v === "invalid" ? "error" : "", disabled: locked, readonly: busy, action: eye, autofocus: v === "invalid", aside: btn({ v: "link", label: "Forgot password?", go: "forgot/default" }) })}
      ${cta({ type: "submit", label: "Sign in", disabled: !can, loading: busy ? "Signing in…" : false, cta: true })}
      <div class="rv-divider">OR</div>
      ${btn({ v: "glass", size: "xl", block: true, label: "Continue with SSO", icon: "building-2", go: "sso/default", disabled: busy })}
      <p class="auth__aside">Need access?<b>Contact your administrator.</b></p>
    </form>`);
  }

  function forgotScreen(S) {
    const v = S.v;
    if (v === "sent") {
      const cd = remaining(S, "resend");
      return authLayout(S, `<div class="auth__box">
        <div class="auth__head">${back()}<div class="auth__mark is-orange">${ic("mail")}</div><h1>Check your inbox.</h1><p>Password reset instructions have been sent to your registered email.</p></div>
        <div><span class="auth__chip">${ic("mail")}${esc(maskEmail(S.forgotEmail))}</span></div>
        ${cta({ label: "Back to sign in", go: "login/default", attrs: 'data-dir="back"' })}
        ${cd > 0 ? `<button type="button" class="rv-btn rv-btn--glass rv-btn--xl rv-btn--block" disabled>Resend email in ${timer(S, "resend")}</button>` : btn({ v: "glass", size: "xl", block: true, label: "Resend email", act: "resendReset" })}
        <p class="auth__aside auth__aside--muted">The link expires in 30 minutes. Check spam if it hasn't arrived.</p>
      </div>`);
    }
    const errs = { "invalid-email": "Enter a work email, like name@company.com.", unknown: `No Rasova account uses ${esc(S.forgotEmail)}. Check the spelling or ask your administrator.` };
    return authLayout(S, `<form class="auth__box" data-form="forgot" novalidate>
      <div class="auth__head">${back()}<h1>Reset your password.</h1><p>Enter your work email and we'll send you a password reset link.</p></div>
      ${v === "service-error" ? note("error", "cloud-off", "We couldn't send the email.", "Your password hasn't changed. Try again in a moment.", btn({ v: "link", label: "Try again", act: "submitForgot" })) : ""}
      ${xlField({ id: "forgotEmail", label: "Work email", type: "email", value: S.forgotEmail, ph: "name@company.com", autocomplete: "username", error: errs[v], readonly: v === "loading", autofocus: true })}
      ${cta({ type: "submit", label: "Send reset link", disabled: !S.forgotEmail.trim(), loading: v === "loading" ? "Sending…" : false, cta: true })}
    </form>`);
  }

  function ssoScreen(S) {
    const v = S.v;
    if (v === "redirecting" || v === "waiting") {
      const org = orgFrom(S.ssoId);
      const row = (st, t) => `<div class="row is-${st}">${st === "now" ? ic("loader-circle", "rv-spin") : st === "done" ? ic("circle-check") : ic("circle-dot")}${t}</div>`;
      return authLayout(S, `<div class="auth__box">
        <div class="auth__head"><div class="auth__mark is-orange">${ic("building-2")}</div><h1>Signing in with ${esc(org)}.</h1><p>Finish on your organization's page. You'll return here automatically.</p></div>
        <div class="auth__redirect" aria-live="polite">${row("done", "Organization found")}${row(v === "redirecting" ? "now" : "done", "Redirecting to your identity provider")}${row(v === "waiting" ? "now" : "next", "Waiting for confirmation")}</div>
        <div class="rv-progress is-indeterminate"><i></i></div>
        ${btn({ v: "glass", size: "xl", block: true, label: "Cancel", act: "cancelSso" })}
      </div>`);
    }
    const notes = {
      "not-configured": note("warning", "building-2", `Single sign-on isn't set up for ${esc(domainOf(S.ssoId))}.`, "Sign in with email and password, or ask your administrator.", btn({ v: "link", label: "Sign in with email", go: "login/default" })),
      denied: note("error", "shield-alert", "Your organization didn't confirm the sign-in.", "Try again, or ask your administrator to check your access."),
    };
    return authLayout(S, `<form class="auth__box" data-form="sso" novalidate>
      <div class="auth__head">${back()}<h1>Sign in with your organization.</h1><p>Use your company's single sign-on.</p></div>
      ${notes[v] || ""}
      ${xlField({ id: "ssoId", label: "Work email or organization ID", value: S.ssoId, ph: "name@company.com", autocomplete: "username", error: v === "invalid" ? "Enter a work email or an organization ID, like spice-trail." : "", readonly: v === "loading", autofocus: true })}
      ${cta({ type: "submit", label: "Continue", disabled: !S.ssoId.trim(), loading: v === "loading" ? "Finding your organization…" : false, cta: true })}
    </form>`);
  }

  const METHODS = {
    sms: { icon: "message-square-text", t: "Text message", sub: "+91 ••••• •••42", chip: "Sent by SMS to +91 ••••• •••42" },
    app: { icon: "smartphone", t: "Authenticator app", sub: "Your registered phone", chip: "Authenticator app" },
    email: { icon: "mail", t: "Email", sub: "s•••••@spicetrail.in", chip: "Sent to s•••••@spicetrail.in" },
  };
  function mfaScreen(S) {
    const v = S.v;
    if (v === "methods") {
      return authLayout(S, `<div class="auth__box">
        <div class="auth__head">${back("mfa/default", "Back")}<h1>Use another method.</h1><p>Choose where to get your verification code.</p></div>
        <div class="methods" role="radiogroup" aria-label="Verification method">${Object.entries(METHODS).map(([k, m]) => `<button type="button" class="method ${S.mfaPick === k ? "is-selected" : ""}" role="radio" aria-checked="${S.mfaPick === k}" data-method="${k}"><span class="ic">${ic(m.icon)}</span><span><span class="tt">${m.t}</span><span class="sub">${m.sub}</span></span>${S.mfaPick === k ? ic("circle-check") : ic("chevron-right")}</button>`).join("")}</div>
        ${cta({ label: "Continue", act: "sendMethod" })}
      </div>`);
    }
    const m = METHODS[S.mfaMethod];
    const stopped = v === "too-many" || v === "success";
    const state = { incorrect: "error", expired: "error", success: "success" }[v] || "";
    const fi = S.otp.findIndex((d) => !d);
    const msg = {
      incorrect: note("error", "circle-alert", "That code doesn't match.", `${S.mfaAttempts} ${S.mfaAttempts === 1 ? "attempt" : "attempts"} left.`),
      expired: note("error", "timer", "This code has expired.", "Send a new code to continue."),
      "too-many": note("error", "lock-keyhole", "Too many incorrect codes.", "Verification is paused for 15 minutes. Try again later or contact your administrator."),
      success: note("success", "circle-check", "Identity verified.", "Opening your workspace…"),
    }[v] || "";
    const cd = remaining(S, "mfaResend");
    return authLayout(S, `<form class="auth__box" data-form="mfa" novalidate>
      <div class="auth__head">${back()}<div class="auth__mark ${v === "success" ? "is-success" : "is-orange"}">${ic(v === "success" ? "circle-check" : "shield-check")}</div><h1>Verify your identity.</h1><p>Enter the 6-digit verification code.</p></div>
      <div><span class="auth__chip">${ic(m.icon)}${m.chip}</span></div>
      <div class="auth__otp">
        ${otp(S.otp, { state, disabled: stopped || v === "expired", showActive: STATIC && !stopped && !state, autofocusIndex: stopped ? -1 : fi === -1 ? 5 : fi })}
        ${msg}
        ${stopped ? "" : `<div class="auth__meta-row"><span>${v === "expired" ? "Code expired" : `Expires in <span class="t">${timer(S, "mfaExpire")}</span>`}</span>${cd > 0 ? `<span>Resend code in <span class="t">${timer(S, "mfaResend")}</span></span>` : btn({ v: "link", label: "Resend code", act: "resendOtp" })}</div>`}
      </div>
      ${v === "expired" ? cta({ label: "Send new code", act: "resendOtp", arrow: false }) : cta({ type: "submit", label: "Verify", disabled: !S.otp.every(Boolean) || stopped, loading: v === "verifying" ? "Verifying…" : false, cta: true })}
      ${btn({ v: "text", label: "Use another method", go: "mfa/methods", disabled: stopped, attrs: 'style="justify-self:center"' })}
    </form>`);
  }

  /* ---------- POS terminal: PIN + device binding ---------- */
  function pinScreen(S) {
    const v = S.v, u = STAFF[S.user];
    const lockedOut = ["too-many", "locked", "unauthorized"].includes(v);
    const dotState = { incorrect: "error", success: "success" }[v] || (lockedOut ? "disabled" : "");
    const msg = {
      incorrect: ["is-error", "circle-alert", `Incorrect PIN · ${S.pinAttempts} ${S.pinAttempts === 1 ? "attempt" : "attempts"} left`],
      verifying: ["", "loader-circle", "Checking…"],
      success: ["is-success", "circle-check", `Welcome, ${u.n.split(" ")[0]}`],
      "too-many": ["is-warning", "timer", "PIN entry paused"],
      locked: ["is-error", "lock-keyhole", "PIN locked"],
      unauthorized: ["is-error", "shield-alert", "Device not authorized"],
    }[v] || ["", S.network === "offline" ? "wifi-off" : "", S.network === "offline" ? "Offline · PIN is checked on this device" : "4-digit PIN"];
    let pad;
    if (v === "too-many") pad = `<div class="pinbox__lock">${ic("timer")}<h2>Too many attempts</h2><div class="big">${timer(S, "pinLock")}</div><p>Try again when the timer ends, or ask a manager to unlock your PIN.</p>${btn({ v: "glass", size: "touch", block: true, label: "Switch user", act: "switchUser" })}</div>`;
    else if (v === "locked") pad = `<div class="pinbox__lock"><div class="auth__mark is-error">${ic("lock-keyhole")}</div><h2>Your PIN is locked</h2><p>Ask a manager or administrator to reset your PIN.</p>${btn({ v: "glass", size: "touch", block: true, label: "Switch user", act: "switchUser" })}${btn({ v: "text", label: "Sign in with email", go: "login/default", attrs: 'style="justify-self:center"' })}</div>`;
    else if (v === "unauthorized") pad = `<div class="pinbox__lock"><div class="auth__mark is-error">${ic("shield-alert")}</div><h2>This device isn't authorized</h2><p>Rasova POS only runs on devices approved for this outlet.</p>${cta({ label: "Authorize this device", go: "device/start" })}</div>`;
    else pad = keypad(v === "success" || v === "verifying", S.pressed);
    return authLayout(S, `<div class="pinbox">
        <div class="shift" role="radiogroup" aria-label="Staff on shift">${STAFF.map((s, i) => `<button type="button" role="radio" aria-checked="${i === S.user}" class="${i === S.user ? "is-selected" : ""}" data-user="${i}"><span class="rv-avatar">${s.i}</span>${s.n.split(" ")[0]}</button>`).join("")}</div>
        <div class="pinbox__head"><h1>Enter your PIN</h1><p>${u.n} · ${u.r}</p></div>
        ${pinDots(4, lockedOut ? 0 : S.pin.length, dotState)}
        <div class="pinbox__msg ${msg[0]}" aria-live="polite">${msg[1] ? ic(msg[1], msg[1] === "loader-circle" ? "rv-spin" : "") : ""}${msg[2]}</div>
        ${pad}
        ${lockedOut ? "" : btn({ v: "text", label: "Sign in with email instead", go: "login/default" })}
      </div>`, { kind: "terminal", panelCls: "auth__panel--pin" });
  }

  function deviceScreen(S) {
    const v = S.v;
    const copy = STATIC ? "<span></span>" : `<button type="button" class="rv-input__action" data-act="copyId" aria-label="Copy device ID">${ic("copy")}</button>`;
    const kv = (rows) => `<dl class="kv">${rows.map(([k, val, x]) => `<div><dt>${k}</dt><dd${x === "mono" ? ' class="mono"' : ""}>${val}</dd>${x === "copy" ? copy : "<span></span>"}</div>`).join("")}</dl>`;
    let body;
    if (v === "start") body = `
      <div class="auth__head"><div class="auth__mark">${ic("shield-check")}</div><h1>Secure this device.</h1><p>This device needs to be authorized before it can access Rasova POS.</p></div>
      ${xlField({ id: "devName", label: "Device name", value: S.devName, autofocus: true })}
      <div class="rv-field"><span class="rv-label">Outlet</span><div class="rv-input rv-input--xl rv-select" role="button" tabindex="0">${ic("store")}<span class="rv-input__value">Downtown Delhi · Connaught Place</span>${ic("chevron-down")}</div></div>
      ${kv([["Device ID", `<span style="font-family:var(--font-mono)">${DEVICE_ID}</span>`, "copy"], ["Platform", "Windows 11 · Rasova POS 1.0.4"]])}
      ${cta({ label: "Request authorization", act: "requestDevice", disabled: !S.devName.trim(), cta: true })}`;
    else if (v === "pending") body = `
      <div class="auth__head"><div class="auth__mark is-orange">${ic("qr-code")}</div><h1>Waiting for approval.</h1><p>Ask an administrator to approve this code in Admin › Devices.</p></div>
      <div class="pair"><div class="qr">${qr()}</div><div><div class="pair__code" aria-label="Pairing code K7Q 4M2"><span>K</span><span>7</span><span>Q</span><i></i><span>4</span><span>M</span><span>2</span></div><p>Or scan from an administrator's signed-in session. <b>${esc(S.devName)}</b> · Downtown Delhi</p></div></div>
      ${note("orange", "loader-circle", "Waiting for administrator approval", `Code expires in ${timer(S, "deviceCode")}`)}
      ${btn({ v: "glass", size: "xl", block: true, label: "Cancel request", go: "device/start", attrs: 'data-dir="back"' })}`;
    else if (v === "paired") body = `
      <div class="auth__head"><div class="auth__mark is-success">${ic("circle-check")}</div><h1>Device paired.</h1><p>${esc(S.devName)} can now be used at Downtown Delhi.</p></div>
      ${kv([["Device ID", DEVICE_ID, "mono"], ["Approved by", "Rohan Das · Outlet manager"], ["Status", badge("success", "Connected", { dot: true })]])}
      ${cta({ label: "Continue to PIN login", act: "toPin" })}`;
    else body = `
      <div class="auth__head"><div class="auth__mark is-error">${ic("circle-x")}</div><h1>Request rejected.</h1><p>An administrator declined this device. Check the outlet, then request again.</p></div>
      ${note("neutral", "message-square-text", "Note from Rohan Das", "This terminal belongs to the Connaught Place outlet, not Downtown Delhi.")}
      ${cta({ label: "Request again", go: "device/start", arrow: false })}${btn({ v: "glass", size: "xl", block: true, label: "Contact support", act: "help" })}`;
    return authLayout(S, `<div class="auth__box">${body}</div>`, { kind: "terminal", ctx: "Unpaired device", wide: true });
  }

  function transitScreen(S) {
    return authLayout(S, `<div class="transit" role="status">${mark("transit__mark")}<div><h2>${esc(S.transit.title)}</h2><p>${esc(S.transit.sub)}</p></div><div class="rv-progress is-indeterminate"><i></i></div></div>`, { kind: S.via === "pin" ? "terminal" : "web", panelCls: "auth__panel--transit" });
  }

  /* ---------- Application shell ---------- */
  const NAV = [
    ["Operate", [["home", "Home", "house"], ["pos", "POS", "monitor"], ["tables", "Tables & Orders", "layout-grid", { count: "23" }], ["kitchen", "Kitchen", "chef-hat", { count: "12" }], ["online", "Online Orders", "bike", { badge: 3 }]]],
    ["Manage", [["menu", "Menu", "book-open"], ["reports", "Reports", "chart-column-big"], ["devices", "Devices", "cpu", { count: "8" }]]],
    ["Administration", [["admin", "Admin", "shield"], ["support", "Support", "life-buoy"]]],
  ];
  const NAV_LABEL = Object.fromEntries(NAV.flatMap((g) => g[1]).map((n) => [n[0], n[1]]));
  const NEXT = { tables: "03 — Tables & Orders", kitchen: "04 — Kitchen / KOT", menu: "05 — Menu", online: "06 — Online Orders", reports: "07 — Reports", admin: "08 — Platform / Admin", devices: "09 — Devices", support: "11 — Support" };
  const RESTRICTED = { Cashier: ["reports", "admin", "devices"], Captain: ["reports", "admin", "devices"] };
  const currentUser = (S) => (S.via === "pin" ? STAFF[S.user] : MANAGER);

  function navItem(id, label, icon, o = {}, active) {
    const tail = o.badge ? `<span class="rv-count-badge is-orange">${o.badge}</span><i class="nav-item__dot"></i>` : o.count ? `<span class="nav-item__count">${o.count}</span>` : "";
    return `<button type="button" class="nav-item ${active ? "is-active" : ""}" data-nav="${id}" data-tip="${label}"${active ? ' aria-current="page"' : ""}>${ic(icon)}<span class="nav-item__label">${label}</span>${tail}</button>`;
  }

  function profileMenu(S, where) {
    const u = currentUser(S);
    return `<div class="pop ${where}" role="menu"><div class="rv-menu">
      <div class="menu-user"><span class="rv-avatar rv-avatar--black">${u.i}</span><div><div class="tt">${u.n}</div><div class="sub">${u.r} · Downtown Delhi</div></div></div>
      <div class="rv-menu__sep"></div>
      <button type="button" class="rv-menu__item" role="menuitem" data-act="closeMenu">${ic("user-round")}Profile</button>
      <button type="button" class="rv-menu__item" role="menuitem" data-act="closeMenu">${ic("settings")}Account settings</button>
      <button type="button" class="rv-menu__item" role="menuitem" data-act="openOutlet">${ic("arrow-left-right")}Switch outlet</button>
      <div class="rv-menu__sep"></div>
      <button type="button" class="rv-menu__item is-danger" role="menuitem" data-act="signout">${ic("log-out")}Sign out</button>
    </div></div>`;
  }
  function outletMenu(S) {
    const st = { online: ["success", "Online"], offline: ["warning", "Offline · 2 pending"], syncing: ["orange", "Syncing"] };
    return `<div class="pop pop--below outlet-menu" role="menu"><div class="rv-menu"><div class="rv-menu__label">Switch outlet</div>
      ${OUTLETS.map((o, i) => `<button type="button" class="rv-menu__item ${i === S.outlet ? "is-selected" : ""}" role="menuitemradio" aria-checked="${i === S.outlet}" data-outlet="${i}">${ic("store")}<span><span>${o.n}</span><small>${o.a}</small></span><span class="meta" style="color:var(--${st[o.s][0]}${st[o.s][0] === "orange" ? "-ink" : "-ink"})"><i class="rv-dot"></i>${st[o.s][1]}</span></button>`).join("")}
    </div></div>`;
  }

  function sidebar(S) {
    const u = currentUser(S);
    const c = CONN[S.appState];
    const nav = NAV.map(([label, items]) => `<div class="nav-label">${label}</div>${items.map(([id, l, i, o]) => navItem(id, l, i, o, S.nav === id)).join("")}`).join("");
    return `<aside class="side" aria-label="Main navigation">
      <div class="side__head">${logo()}</div>
      <button type="button" class="side__toggle" data-act="toggleSide" aria-label="${S.collapsed ? "Expand sidebar" : "Collapse sidebar"}" aria-expanded="${!S.collapsed}">${ic(S.collapsed ? "chevron-right" : "chevron-left")}</button>
      <button type="button" class="side__cta" data-act="newOrder" data-tip="New order · N">${ic("plus")}<span>New order</span><kbd>N</kbd></button>
      <nav class="side__nav">${nav}</nav>
      <div class="side__foot">
        <div class="side-conn is-${c[0]}" role="status" data-tip="${c[2]} · ${c[4]}"><span class="ind">${c[1]}</span><span class="txt">${c[2]}<span class="meta">${c[4]}</span></span></div>
        <div class="anchor">${S.menu === "profile-side" ? profileMenu(S, "pop--above") : ""}<button type="button" class="side-user ${S.menu === "profile-side" ? "is-open" : ""}" data-act="profileSide" data-tip="${u.n}" aria-haspopup="menu" aria-expanded="${S.menu === "profile-side"}"><span class="rv-avatar rv-avatar--black">${u.i}</span><span class="txt"><span class="tt">${u.n}</span><span class="sub">${u.r}</span></span>${ic("chevrons-up-down")}</button></div>
      </div>
    </aside>`;
  }

  function navbar(S) {
    const o = OUTLETS[S.outlet], u = currentUser(S);
    return `<header class="navbar">
      <div class="crumb"><span>Rasova</span><span class="sl">/</span><b>${NAV_LABEL[S.nav]}</b></div>
      <span class="navbar__sep"></span>
      <div class="anchor">
        <button type="button" class="outlet ${S.menu === "outlet" ? "is-open" : ""}" data-act="toggleOutlet" aria-haspopup="menu" aria-expanded="${S.menu === "outlet"}"><span class="ic">${ic("store")}<i class="rv-dot ${o.s === "offline" ? "is-offline" : ""}"></i></span><span><span class="tt">${o.n}</span><span class="sub">${o.a}</span></span>${ic("chevron-down")}</button>
        ${S.menu === "outlet" ? outletMenu(S) : ""}
      </div>
      <div class="navbar__right">
        ${conn(S.appState)}
        <button type="button" class="rv-btn rv-btn--icon bell" aria-label="Notifications, 2 new">${ic("bell")}</button>
        <button type="button" class="rv-btn rv-btn--icon" aria-label="Help" data-act="help">${ic("circle-help")}</button>
        <div class="anchor"><button type="button" class="navbar__avatar" data-act="profileTop" aria-label="Account menu" aria-haspopup="menu" aria-expanded="${S.menu === "profile-top"}"><span class="rv-avatar rv-avatar--black">${u.i}</span></button>${S.menu === "profile-top" ? profileMenu(S, "pop--below-right") : ""}</div>
      </div>
    </header>`;
  }

  function sysAlert(st) {
    if (st === "failed") return `<div class="rv-alert rv-alert--error" role="alert">${ic("circle-x")}<span><b>2 transactions didn't sync.</b> They're saved on this device.</span><span class="acts">${btn({ v: "secondary", size: "sm", label: "Details" })}${btn({ v: "black", size: "sm", label: "Retry sync", icon: "refresh-cw", act: "retrySync" })}</span></div>`;
    if (st === "conflict") return `<div class="rv-alert rv-alert--warning" role="alert">${ic("git-compare-arrows")}<span><b>Price conflict:</b> Paneer Tikka is ₹340 here and ₹360 on another device.</span><span class="acts">${btn({ v: "secondary", size: "sm", label: "Keep ₹340", act: "resolveConflict" })}${btn({ v: "black", size: "sm", label: "Use ₹360", act: "resolveConflict" })}</span></div>`;
    return "<div></div>";
  }

  /* ---------- Home dashboard ---------- */
  function homePage(S) {
    const u = currentUser(S);
    const orders = [
      ["A-1046", "Table 12", "Dine-in", 5, 1840, "New", "1 min"], ["O-3391", "Online", "Delivery", 3, 960, "Accepted", "4 min"], ["A-1045", "Table 03", "Dine-in", 7, 2410, "Accepted", "9 min"],
      ["T-218", "Counter", "Takeaway", 2, 540, "Completed", "12 min"], ["O-3390", "Online", "Delivery", 4, 720, "Rejected", "15 min"], ["A-1041", "Table 09", "Dine-in", 3, 1280, "Cancelled", "21 min"],
    ];
    const tone = { New: "orange", Accepted: "info", Completed: "success", Rejected: "error", Cancelled: "neutral" };
    const tstate = Array(40).fill("o");
    [3, 20, 36].forEach((i) => (tstate[i] = "b")); [4, 13].forEach((i) => (tstate[i] = "a")); [10, 19, 31].forEach((i) => (tstate[i] = "r"));
    [7, 8, 14, 16, 22, 24, 25, 27, 29, 33, 35, 37, 38, 39].forEach((i) => (tstate[i] = "-"));
    const cell = (c, i) => `<div class="tcell ${{ o: "is-occupied", b: "is-billing", r: "is-reserved", a: "is-attention" }[c] || ""}">${String(i + 1).padStart(2, "0")}</div>`;
    return `<div class="page">
      <div class="page__head"><div><h1>Good evening, ${u.n.split(" ")[0]}</h1><p>Thursday, 1 October · Dinner service · ${OUTLETS[S.outlet].n}</p></div>
        <div class="acts">${badge("neutral", "Sample data")}${btn({ v: "secondary", label: "Today", icon: "calendar", iconR: "chevron-down" })}</div></div>
      <div class="kpis">
        <div class="rv-card rv-kpi"><div class="rv-kpi__label">Today's sales ${ic("receipt")}</div><div class="rv-kpi__value">₹84,520</div><div class="rv-kpi__meta"><span class="rv-delta">▲ 8.4%</span>vs last Thursday</div></div>
        <div class="rv-card rv-kpi"><div class="rv-kpi__label">Orders</div><div class="rv-kpi__value">184</div><div class="rv-kpi__meta">142 dine-in · 42 online</div></div>
        <div class="rv-card rv-kpi"><div class="rv-kpi__label">Active tables</div><div class="rv-kpi__value">23<small> / 40</small></div><div class="rv-meter"><i style="width:57.5%"></i></div></div>
        <div class="rv-card rv-kpi"><div class="rv-kpi__label">Pending approvals ${btn({ v: "link", label: "Review" })}</div><div class="rv-kpi__value is-accent">06</div><div class="rv-kpi__meta">2 older than 10 min</div></div>
      </div>
      <div class="dash">
        <div class="dash__col">
          <section class="rv-card"><div class="rv-card__head"><span class="rv-card__title">Live orders ${badge("neutral", "31 open")}</span>${btn({ v: "ghost", size: "sm", label: "View all", iconR: "arrow-right" })}</div>
            <div style="overflow:hidden"><table class="rv-table"><thead><tr><th>Order</th><th>Source</th><th class="num">Items</th><th class="num">Amount</th><th>Status</th><th class="num">Age</th></tr></thead><tbody>
            ${orders.map((o) => `<tr${o[5] === "New" ? ' class="is-selected"' : ""}><td class="mono">#${o[0]}</td><td>${o[1]} <span class="sub">· ${o[2]}</span></td><td class="num">${o[3]}</td><td class="num">${inr(o[4])}</td><td>${badge(tone[o[5]], o[5], { dot: true })}</td><td class="num sub">${o[6]}</td></tr>`).join("")}
            </tbody></table></div></section>
          <section class="rv-card"><div class="rv-card__head"><span class="rv-card__title">Table status</span><span style="font:500 12px var(--font-ui);color:var(--ink-3)">Main hall · Terrace</span></div>
            <div class="tables-grid">${tstate.map(cell).join("")}</div>
            <div class="legend"><span><i></i>Free 14</span><span><i class="o"></i>Occupied 18</span><span><i class="b"></i>Billing 3</span><span><i class="r"></i>Reserved 3</span><span><i class="a"></i>Needs attention 2</span></div></section>
        </div>
        <div class="dash__col">
          <section class="rv-card"><div class="rv-card__head"><span class="rv-card__title">Pending approvals ${badge("orange", "6")}</span></div><div class="list">
            ${[["percent", "15% discount", "#A-1045 · Neha K. · ₹362"], ["ban", "Void Butter Chicken", "#A-1042 · Aarav M. · sent"], ["rotate-ccw", "Refund ₹420", "#T-214 · Priya N. · wrong item"]]
              .map(([i, t, s]) => `<div class="list__row"><span class="ic">${ic(i)}</span><div style="min-width:0"><div class="tt">${t}</div><div class="sub">${s}</div></div><div class="acts">${btn({ v: "icon", icon: "x", aria: "Reject", cls: "rv-btn--sm", attrs: 'style="width:32px"' })}${btn({ v: "black", size: "sm", label: "Approve" })}</div></div>`).join("")}
          </div></section>
          <section class="rv-card"><div class="rv-card__head"><span class="rv-card__title">Menu alerts</span></div><div class="list">
            ${[["Kulfi", "Desserts · out of stock", badge("neutral", "Unavailable")], ["Paneer Tikka", "₹340 → ₹360 at this outlet", badge("orange", "Override")], ["menu_update.csv", "3 rows failed to import", badge("error", "Import error")]]
              .map(([t, s, b]) => `<div class="list__row" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="tt">${t}</div><div class="sub">${s}</div></div>${b}</div>`).join("")}
          </div></section>
          <section class="rv-card"><div class="rv-card__head"><span class="rv-card__title">Quick actions</span></div><div class="quick">
            <button type="button" class="is-primary" data-act="newOrder">${ic("plus")}New order</button><button type="button" data-nav="tables">${ic("layout-grid")}Open tables</button>
            <button type="button" data-nav="online">${ic("bike")}Online · 3 new</button><button type="button">${ic("clock")}Close shift</button>
          </div></section>
        </div>
      </div>
    </div>`;
  }

  /* ---------- POS billing ---------- */
  function orderTotals(cart) {
    const sub = cart.reduce((s, l) => s + ITEM[l.id].price * l.qty, 0);
    const cgst = Math.round(sub * 2.5) / 100, sgst = cgst;
    const raw = sub + cgst + sgst, grand = Math.round(raw);
    return { sub, cgst, sgst, round: grand - raw, grand, items: cart.reduce((s, l) => s + l.qty, 0) };
  }
  function posGrid(S) {
    const q = S.query.trim().toLowerCase();
    const list = MENU.filter((m) => (q ? m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) : m.cat === S.cat));
    if (!list.length) return `<div class="rv-empty" style="grid-column:1/-1"><span class="rv-empty__icon">${ic("search")}</span><h4>No items match "${esc(S.query)}"</h4><p>Search by item name or code, like MN-02.</p></div>`;
    const inCart = (id) => S.cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);
    return list.map((m) => { const n = inCart(m.id); return `<button type="button" class="item ${n ? "is-in" : ""}" data-add="${m.id}"${m.na ? " disabled" : ""} aria-label="${esc(m.name)}, ${inr(m.price)}${m.na ? ", unavailable" : ""}">
      <span class="item__top"><i class="rv-food ${m.veg ? "" : "is-nonveg"}" title="${m.veg ? "Veg" : "Non-veg"}"></i>${m.id}</span>
      <span class="item__name">${m.name}</span>
      <span class="item__foot"><span class="item__price">${inr(m.price)}</span>${m.na ? badge("neutral", "Unavailable") : `<span class="item__add">${ic("plus")}</span>`}</span>
      ${n ? `<span class="item__qty">${n}</span>` : ""}</button>`; }).join("");
  }
  function posLines(S) {
    if (!S.cart.length) return `<div class="rv-empty" style="padding-top:80px"><span class="rv-empty__icon">${ic("receipt")}</span><h4>No items yet</h4><p>Tap an item to add it to this order.</p></div>`;
    const row = (l, i) => { const m = ITEM[l.id]; return `<div class="line"><div style="min-width:0"><div class="line__name"><i class="rv-food ${m.veg ? "" : "is-nonveg"}"></i><span>${m.name}</span></div>${l.sent ? "" : `<div class="line__sub">${inr(m.price)} each</div>`}</div>
      ${l.sent ? `<span class="stepper is-locked" title="Sent items need manager approval to void"><span>× ${l.qty}</span></span>` : `<span class="stepper"><button type="button" data-dec="${i}" aria-label="Remove one ${esc(m.name)}">${ic("minus")}</button><span>${l.qty}</span><button type="button" data-inc="${i}" aria-label="Add one ${esc(m.name)}">${ic("plus")}</button></span>`}
      <span class="line__amt">${inr(m.price * l.qty)}</span></div>`; };
    const sent = S.cart.map((l, i) => [l, i]).filter(([l]) => l.sent), fresh = S.cart.map((l, i) => [l, i]).filter(([l]) => !l.sent);
    return (sent.length ? `<div class="kot-group">${ic("check")}Sent · KOT #1041 · 7:31 PM</div>${sent.map(([l, i]) => row(l, i)).join("")}` : "") +
      (fresh.length ? `<div class="kot-group is-new"><i class="rv-dot"></i>New · not sent to kitchen</div>${fresh.map(([l, i]) => row(l, i)).join("")}` : "");
  }
  function posPage(S) {
    const t = orderTotals(S.cart);
    const hasNew = S.cart.some((l) => !l.sent);
    const title = { dine: "Table 07", take: "Takeaway", delivery: "Delivery" }[S.orderType];
    const meta = { dine: "<span><b>4 guests</b></span><span>Captain <b>Neha K.</b></span>", take: "<span>Counter pickup</span>", delivery: "<span>Own delivery · <b>Lajpat Nagar</b></span>" }[S.orderType];
    return `<div class="pos">
      <nav class="pos-cats" aria-label="Menu categories"><div class="nav-label">Categories</div>${CATS.map(([id, l]) => `<button type="button" class="cat ${S.cat === id && !S.query ? "is-active" : ""}" data-cat="${id}">${l}<span class="n">${MENU.filter((m) => m.cat === id).length}</span></button>`).join("")}</nav>
      <section class="pos-items">
        <div class="pos-items__head">
          <div class="rv-input">${ic("search")}<input${idAttr("posSearch")} type="search" placeholder="Search items or codes" value="${esc(S.query)}" aria-label="Search menu" autocomplete="off"><span class="rv-kbd">/</span></div>
          <div class="rv-seg" role="group" aria-label="Order type">${[["dine", "Dine-in", "utensils-crossed"], ["take", "Takeaway", "package"], ["delivery", "Delivery", "bike"]].map(([k, l, i]) => `<button type="button" data-otype="${k}" aria-pressed="${S.orderType === k}">${ic(i)}${l}</button>`).join("")}</div>
        </div>
        <div class="pos-chips">${CATS.map(([id, l]) => `<button type="button" class="${S.cat === id && !S.query ? "is-active" : ""}" data-cat="${id}">${l}</button>`).join("")}</div>
        <div class="pos-grid">${posGrid(S)}</div>
      </section>
      <aside class="pos-order" aria-label="Current order">
        <div class="pos-order__head">
          <div class="pos-order__title"><h2>${title}</h2>${badge(S.cart.length ? "orange" : "neutral", S.cart.length ? "Open" : "Empty", { dot: true })}<div class="acts">${btn({ v: "icon", icon: "arrow-left-right", aria: "Change table" })}${btn({ v: "icon", icon: "ellipsis", aria: "More actions" })}</div></div>
          <div class="pos-order__meta">${meta}<span style="font-family:var(--font-mono)">#A-1042</span></div>
        </div>
        <div class="pos-lines">${posLines(S)}</div>
        <div class="pos-order__foot">
          <div class="totals"><div><span>Subtotal · ${t.items} items</span><span>${inr2(t.sub)}</span></div><div><span>CGST 2.5%</span><span>${inr2(t.cgst)}</span></div><div><span>SGST 2.5%</span><span>${inr2(t.sgst)}</span></div><div><span>Round off</span><span>${t.round >= 0 ? "" : "−"}${inr2(Math.abs(t.round))}</span></div>
            <div class="grand"><span>Total</span><span>${inr(t.grand)}</span></div></div>
          <div class="pos-order__acts">
            ${btn({ v: "secondary", size: "lg", label: "Hold", icon: "pause", act: "holdOrder", disabled: !S.cart.length })}
            ${btn({ v: "black", size: "lg", label: "Send KOT", icon: "send", act: "sendKot", disabled: !hasNew })}
            ${btn({ v: "primary", label: `Pay ${inr(t.grand)}`, act: "openPay", disabled: !S.cart.length, cls: "pay" })}
          </div>
        </div>
      </aside>
    </div>`;
  }

  function appScreen(S) {
    const u = currentUser(S);
    const denied = (RESTRICTED[u.r] || []).includes(S.nav);
    let page;
    if (denied) page = `<div class="page"><div class="module-ph"><div class="rv-empty"><span class="rv-empty__icon" style="color:var(--error)">${ic("lock-keyhole")}</span><h4>You don't have access to ${NAV_LABEL[S.nav]}</h4><p>Your role (${u.r}) is restricted for this area. Ask an outlet manager or administrator to update it.</p>${badge("error", "Restricted", { icon: "lock" })}${btn({ v: "secondary", label: "Back to Home", act: "navHome" })}</div></div></div>`;
    else if (S.nav === "home") page = homePage(S);
    else if (S.nav === "pos") page = posPage(S);
    else page = `<div class="page"><div class="page__head"><div><h1>${NAV_LABEL[S.nav]}</h1><p>${OUTLETS[S.outlet].n} · ${OUTLETS[S.outlet].a}</p></div></div><div class="module-ph"><div class="rv-empty"><span class="rv-empty__icon">${ic("layout-grid")}</span><h4>Designed in the next step</h4><p>${NEXT[S.nav]} reuses this sidebar, navbar and component set.</p>${badge("orange", NEXT[S.nav])}</div></div></div>`;
    if (S.device === "mobile") return authLayout(S, `<div class="auth__box"><div class="auth__head"><div class="auth__mark">${ic("monitor")}</div><h1>Open Rasova on a larger screen.</h1><p>In Phase 1 the workspace runs on Windows desktops and Android POS tablets. You're signed in as ${u.n}.</p></div>${btn({ v: "glass", size: "xl", block: true, label: "Sign out", icon: "log-out", act: "confirmSignout" })}</div>`);
    const fixed = S.nav === "pos" && !denied;
    return `<div class="shell ${S.collapsed ? "is-collapsed" : ""}${S.anim === "app-in" ? " is-entering" : ""}"><div class="shell__bg" aria-hidden="true"></div>${sidebar(S)}<div class="main">${navbar(S)}<div class="main__scroll ${fixed ? "is-fixed" : ""}">${sysAlert(S.appState)}${page}</div></div></div>`;
  }

  /* ---------- Overlays ---------- */
  function overlay(S) {
    let o = "";
    if (S.modal === "signout") {
      const pending = S.appState === "offline" || S.appState === "failed";
      o = `<div class="rv-scrim"><div class="rv-modal" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="rv-modal__head"><h3${idAttr("dlg-t")}>Sign out of Rasova?</h3><p>You'll need your ${S.via === "pin" ? "PIN" : "password"} to sign in again on this device.</p></div>
        ${pending ? `<div class="rv-modal__body">${note("warning", "triangle-alert", S.appState === "offline" ? "3 transactions haven't synced." : "2 transactions failed to sync.", "They stay saved on this device and sync after the next sign-in.")}</div>` : '<div style="height:16px"></div>'}
        <div class="rv-modal__foot">${btn({ v: "ghost", label: "Cancel", act: "closeModal" })}${btn({ v: "danger", label: "Sign out", icon: "log-out", act: "confirmSignout" })}</div></div></div>`;
    }
    if (S.modal === "help") {
      o = `<div class="rv-scrim"><div class="rv-modal" role="dialog" aria-modal="true" aria-labelledby="dlg-h"><div class="rv-modal__head"><h3${idAttr("dlg-h")}>Help signing in</h3><p>Pick what's stopping you.</p></div><div class="rv-modal__body"><div class="methods">
        <button type="button" class="method" data-go="forgot/default"><span class="ic">${ic("key-round")}</span><span><span class="tt">I forgot my password</span><span class="sub">Get a reset link by email</span></span>${ic("chevron-right")}</button>
        <button type="button" class="method" data-go="sso/default"><span class="ic">${ic("building-2")}</span><span><span class="tt">My company uses SSO</span><span class="sub">Sign in with your organization</span></span>${ic("chevron-right")}</button>
        <div class="method" style="cursor:default"><span class="ic">${ic("lock-keyhole")}</span><span><span class="tt">I'm locked out</span><span class="sub">Your Rasova administrator can unlock accounts and reset PINs.</span></span><span></span></div>
      </div></div><div class="rv-modal__foot">${btn({ v: "secondary", label: "Close", act: "closeModal" })}</div></div></div>`;
    }
    if (S.modal === "pay") {
      const t = orderTotals(S.cart), p = S.pay;
      const body = p.stage === "done"
        ? `<div class="pay-done"><span class="ic">${ic("circle-check")}</span><h3>Payment received</h3><p>${inr(t.grand)} by ${{ cash: "cash", upi: "UPI", card: "card", split: "split payment" }[p.method]} · Receipt sent to printer</p></div>`
        : `<div class="pay-due"><span>Amount due · Table 07</span><b>${inr(t.grand)}</b></div>
           <div class="pay-methods" role="radiogroup" aria-label="Payment method">${[["cash", "Cash", "banknote"], ["upi", "UPI", "qr-code"], ["card", "Card", "credit-card"], ["split", "Split", "split"]].map(([k, l, i]) => `<button type="button" role="radio" aria-checked="${p.method === k}" class="${p.method === k ? "is-selected" : ""}" data-pay="${k}"${p.stage === "processing" ? " disabled" : ""}>${ic(i)}${l}</button>`).join("")}</div>
           ${p.stage === "processing" ? note("orange", "loader-circle", p.method === "upi" ? "Waiting for UPI confirmation…" : "Processing payment…") : ""}`;
      o = `<div class="rv-scrim"><div class="rv-modal" role="dialog" aria-modal="true" aria-labelledby="dlg-p"><div class="rv-modal__head"><h3${idAttr("dlg-p")}>${p.stage === "done" ? "Order settled" : "Take payment"}</h3></div><div class="rv-modal__body">${body}</div>
        <div class="rv-modal__foot">${p.stage === "done" ? btn({ v: "primary", label: "Start new order", act: "finishPay" }) : btn({ v: "ghost", label: "Cancel", act: "closeModal", disabled: p.stage === "processing" }) + btn({ v: "primary", label: `Charge ${inr(t.grand)}`, act: "charge", loading: p.stage === "processing" ? "Charging…" : false })}</div></div></div>`;
    }
    return o;
  }

  /* ---------- Frame ---------- */
  const SCREENS = { login: loginScreen, forgot: forgotScreen, sso: ssoScreen, mfa: mfaScreen, pin: pinScreen, device: deviceScreen, transit: transitScreen, app: appScreen };
  const frameInner = (S) => SCREENS[S.screen](S) + overlay(S);
  const frameHTML = (S) => {
    STATIC = true;
    try { return `<div class="rv-frame ${S.device === "tablet" ? "is-tablet" : S.device === "mobile" ? "is-mobile" : ""}" data-rv-theme="${S.theme}" inert aria-hidden="true">${frameInner(S)}</div>`; }
    finally { STATIC = false; }
  };
  const withStatic = (fn) => { STATIC = true; try { return fn(); } finally { STATIC = false; } };

  window.Rasova = { authLayout, ic, esc, btn, field, note, badge, conn, CONN, otp, pinDots, keypad, logo, mark, qr, navItem, NAV, sidebar, navbar, outletMenu, profileMenu, frameInner, frameHTML, withStatic, posGrid, emailOk, remaining, fmt, orgFrom, STAFF, OUTLETS, MENU, START_CART, DEMO_PIN, METHODS, inr };
})();
