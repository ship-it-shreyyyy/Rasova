/* ==========================================================================
   RASOVA — component helpers and screen renderers.
   Every screen is a pure function of the prototype state object, so the
   live prototype, the state board and the component sheet share one source.
   ========================================================================== */
(function () {
  "use strict";

  const ICONS = window.RASOVA_ICONS;
  let STATIC = false; // true while rendering non-interactive thumbnails (no ids)

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, cls = "") =>
    `<svg class="rv-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
  const idAttr = (id) => (STATIC || !id ? "" : ` id="${id}"`);

  /* ---------- Sample data (fictional) ---------- */
  const ORG = "Spice Trail Hospitality";
  const OUTLET = "Downtown Delhi";
  const TERMINAL = "Cashier Terminal 01";
  const DEVICE_ID = "RSV-WIN-7F3A-92C1";
  const STAFF = [
    { n: "Aarav Mehta", i: "AM", r: "Cashier" },
    { n: "Neha Kapoor", i: "NK", r: "Captain" },
    { n: "Rohan Das", i: "RD", r: "Outlet manager" },
  ];
  const DEMO_PIN = "2468";

  /* ---------- Timers ---------- */
  const remaining = (S, name) => Math.max(0, Math.ceil(((S.timers[name] || 0) - S.now()) / 1000));
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const timer = (S, name) => `<span data-timer="${name}">${fmt(remaining(S, name))}</span>`;

  /* ---------- Primitives ---------- */
  const mark = (cls = "rv-logo__mark") =>
    `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#FF6A00"/><path d="M11 24V8.5h6.4a4.85 4.85 0 0 1 0 9.7H11" fill="none" stroke="#0A0A0A" stroke-width="3.2" stroke-linejoin="round"/><path d="M16.6 18.2 22.4 24" stroke="#0A0A0A" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="9.5" r="1.9" fill="#0A0A0A"/></svg>`;
  const logo = (sm) => `<span class="rv-logo ${sm ? "rv-logo--sm" : ""}">${mark()}<span class="rv-logo__word">RASOVA</span></span>`;

  function btn(o) {
    const c = ["rv-btn", `rv-btn--${o.v || "secondary"}`, o.size && `rv-btn--${o.size}`, o.block && "rv-btn--block", o.loading && "is-loading", o.cls].filter(Boolean).join(" ");
    const data = (o.act ? ` data-act="${o.act}"` : "") + (o.go ? ` data-go="${o.go}"` : "") + (o.cta ? " data-cta" : "") + (o.attrs ? " " + o.attrs : "");
    const inner = o.loading
      ? `${ic("loader-circle", "rv-spin")}<span>${esc(o.loading === true ? o.label : o.loading)}</span>`
      : `${o.icon ? ic(o.icon) : ""}${o.label ? `<span>${o.label}</span>` : ""}${o.iconR ? ic(o.iconR) : ""}`;
    return `<button type="${o.type || "button"}" class="${c}"${data}${o.disabled || o.loading ? " disabled" : ""}${o.loading ? ' aria-busy="true"' : ""}${o.aria ? ` aria-label="${esc(o.aria)}"` : ""}>${inner}</button>`;
  }

  function field(o) {
    const st = [o.error || o.state === "error" ? "is-error" : "", o.state === "focus" ? "is-focus" : "", o.state === "hover" ? "is-hover" : "", o.disabled ? "is-disabled" : "", o.readonly ? "is-readonly" : "", o.mono ? "rv-input--mono" : ""].join(" ");
    const desc = o.error ? `${o.id}-err` : o.hint ? `${o.id}-hint` : "";
    const a = (k, v) => (v ? ` ${k}="${esc(v)}"` : "");
    return `<div class="rv-field">
      <div class="rv-field__top"><label class="rv-label"${STATIC ? "" : ` for="${o.id}"`}>${esc(o.label)}</label>${o.aside || ""}</div>
      <div class="rv-input ${st}">${o.icon ? ic(o.icon) : ""}<input${idAttr(o.id)} name="${o.id}" type="${o.type || "text"}" value="${esc(o.value)}"${a("placeholder", o.ph)}${a("autocomplete", o.autocomplete)}${a("inputmode", o.inputmode)}${o.error || o.state === "error" ? ' aria-invalid="true"' : ""}${desc && !STATIC ? ` aria-describedby="${desc}"` : ""}${o.readonly ? " readonly" : ""}${o.disabled ? " disabled" : ""}${o.autofocus ? " data-autofocus" : ""} spellcheck="false">${o.action || ""}</div>
      ${o.error ? `<div class="rv-hint is-error"${idAttr(o.id + "-err")}>${ic("circle-alert")}<span>${o.error}</span></div>` : o.hint ? `<div class="rv-hint"${idAttr(o.id + "-hint")}><span>${o.hint}</span></div>` : ""}
    </div>`;
  }

  const banner = (o) =>
    `<div class="rv-banner rv-banner--${o.tone} enter" role="${o.tone === "error" || o.tone === "warning" ? "alert" : "status"}">${ic(o.icon)}<div class="rv-banner__title">${o.title}</div><div class="rv-banner__body">${o.body}</div>${o.actions ? `<div class="rv-banner__actions">${o.actions}</div>` : ""}</div>`;

  const STATUS = {
    online: { lead: '<i class="rv-dot"></i>', label: "Online" },
    offline: { lead: '<i class="rv-dot"></i>', label: "Offline" },
    syncing: { lead: ic("refresh-cw", "rv-spin"), label: "Syncing" },
    success: { lead: ic("circle-check"), label: "Synced" },
    warning: { lead: ic("triangle-alert"), label: "Conflict" },
    error: { lead: ic("circle-x"), label: "Sync failed" },
    info: { lead: ic("info"), label: "Update ready" },
  };
  const status = (kind, label, meta) => {
    const s = STATUS[kind];
    return `<span class="rv-status rv-status--${kind}" role="status">${s.lead}<span>${label || s.label}</span>${meta ? `<span class="rv-status__meta">${meta}</span>` : ""}</span>`;
  };

  function steps(cur, labels = ["Sign in", "Verify", "Workspace"]) {
    return `<ol class="rv-steps" aria-label="Sign-in progress">${labels
      .map((l, i) => {
        const n = i + 1;
        const cls = n < cur ? "is-done" : n === cur ? "is-current" : "";
        return `${i ? `<li aria-hidden="true" class="rv-step__bar ${n <= cur ? "is-done" : ""}"></li>` : ""}<li class="rv-step ${cls}"${n === cur ? ' aria-current="step"' : ""}><span class="rv-step__n">${n < cur ? ic("check") : n}</span>${l}</li>`;
      })
      .join("")}</ol>`;
  }

  function otp(values, o = {}) {
    const firstEmpty = values.findIndex((d) => !d);
    const cell = (i) =>
      `<input class="rv-otp-cell ${values[i] ? "is-filled" : ""} ${o.showActive && i === firstEmpty ? "is-active" : ""}"${idAttr("otp-" + i)} data-otp="${i}" inputmode="numeric" autocomplete="${i === 0 ? "one-time-code" : "off"}" aria-label="Digit ${i + 1} of 6" value="${esc(values[i])}"${o.disabled ? " disabled" : ""}${o.autofocusIndex === i ? " data-autofocus" : ""}>`;
    return `<div class="rv-otp ${o.state ? "is-" + o.state : ""}" role="group" aria-label="6-digit verification code">${cell(0)}${cell(1)}${cell(2)}<i class="rv-otp__sep" aria-hidden="true"></i>${cell(3)}${cell(4)}${cell(5)}</div>`;
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

  function navItem(id, label, icon, o = {}) {
    return `<button type="button" class="rv-nav-item ${o.active ? "is-active" : ""} ${o.hover ? "is-hover" : ""}" data-nav="${id}"${o.active ? ' aria-current="page"' : ""}>${ic(icon)}<span>${label}</span>${o.badge ? `<span class="rv-nav-item__badge">${o.badge}</span>` : ""}</button>`;
  }

  function qr(seed = 7) {
    const N = 25;
    let r = seed;
    const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#0A0A0A"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#F5F5F5"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0A0A0A"/>`;
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    let cells = "";
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.52) cells += `M${x} ${y}h1v1h-1z`;
    return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="Pairing QR code"><path d="${cells}" fill="#0A0A0A"/>${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</svg>`;
  }

  /* ---------- Brand panel visual: floor plan, KOT ticket, service timeline ---------- */
  function brandVisual() {
    const O = "#FF6A00";
    const tables = [
      [72, 40, 72, 48, "T01", "free"], [192, 40, 72, 48, "T02", "seated"], [312, 40, 72, 48, "T03", "free"], [458, 64, 26, 0, "T04", "seated"],
      [72, 136, 120, 48, "T05", "seated"], [240, 136, 72, 48, "T06", "billing"], [360, 136, 96, 48, "T07", "selected"],
      [72, 232, 72, 48, "T08", "free"], [192, 232, 72, 48, "T09", "seated"], [312, 232, 120, 48, "T10", "free"], [482, 256, 26, 0, "T11", "seated"],
    ];
    const style = {
      free: ['fill="#101010" stroke="#2E2E2E"', "#5A5A5A"],
      seated: ['fill="rgba(255,106,0,0.08)" stroke="rgba(255,106,0,0.45)"', "#FF8A3D"],
      billing: [`fill="${O}" stroke="${O}"`, "#0A0A0A"],
      selected: [`fill="rgba(255,106,0,0.16)" stroke="${O}" stroke-width="1.5" filter="url(#rvGlow)"`, "#F5F5F5"],
    };
    let t = "";
    for (const [x, y, w, h, label, s] of tables) {
      const [attrs, tc] = style[s];
      if (h === 0) {
        t += `<circle cx="${x}" cy="${y}" r="${w}" ${attrs}/>`;
        t += `<text x="${x}" y="${y + 3.5}" text-anchor="middle" fill="${tc}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600">${label}</text>`;
      } else {
        const seats = Math.round(w / 36);
        for (let i = 0; i < seats; i++) {
          const cx = x + (w / seats) * (i + 0.5) - 7;
          t += `<rect x="${cx}" y="${y - 7}" width="14" height="3" rx="1.5" fill="#262626"/><rect x="${cx}" y="${y + h + 4}" width="14" height="3" rx="1.5" fill="#262626"/>`;
        }
        t += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${attrs}/>`;
        t += `<text x="${x + 10}" y="${y + 19}" fill="${tc}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600">${label}</text>`;
        if (s === "seated" || s === "selected") t += `<text x="${x + 10}" y="${y + 36}" fill="${s === "selected" ? "#A3A3A3" : "#6F6F6F"}" font-family="Inter, sans-serif" font-size="9.5">${s === "selected" ? "4 guests · 38m" : "seated"}</text>`;
        if (s === "billing") t += `<text x="${x + 10}" y="${y + 36}" fill="#0A0A0A" font-family="Inter, sans-serif" font-size="9.5" font-weight="600">billing</text>`;
      }
    }
    // service timeline: covers per 30 min, 12:00 to 23:30
    const covers = [6, 10, 18, 26, 30, 22, 14, 8, 6, 5, 7, 9, 12, 18, 26, 34, 42, 48, 44, 38, 30, 22, 14, 8];
    const now = 15; // 19:30 slot
    let bars = "";
    const bx = 72, bw = 14, gap = 8.6, base = 382;
    covers.forEach((c, i) => {
      const h = c * 1.15;
      const x = bx + i * (bw + gap);
      const fill = i === now ? O : i > now ? "#1A1A1A" : i >= now - 3 ? "rgba(255,106,0,0.38)" : "#262626";
      bars += `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="2" fill="${fill}"/>`;
    });
    const labels = [[0, "12:00"], [6, "15:00"], [12, "18:00"], [18, "21:00"], [23, "23:30"]]
      .map(([i, l]) => `<text x="${bx + i * (bw + gap) + bw / 2}" y="${base + 14}" text-anchor="middle" fill="#5A5A5A" font-family="JetBrains Mono, monospace" font-size="9.5">${l}</text>`).join("");
    const nx = bx + now * (bw + gap) + bw / 2;
    return `<svg viewBox="0 0 792 400" preserveAspectRatio="xMinYMax meet" aria-hidden="true">
      <defs><filter id="rvGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="rvFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#151515"/><stop offset="1" stop-color="#111"/></linearGradient></defs>
      <text x="72" y="14" fill="#5A5A5A" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.5">FLOOR · MAIN HALL</text>
      ${t}
      <path d="M456 160 H560 V96 H600" fill="none" stroke="${O}" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.8"/>
      <circle cx="456" cy="160" r="3" fill="${O}"/><circle cx="600" cy="96" r="3" fill="${O}"/>
      <g transform="translate(604 52)">
        <rect width="168" height="92" rx="9" fill="url(#rvFade)" stroke="#333"/>
        <text x="14" y="24" fill="#FF8A3D" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="600">KOT #1042</text>
        <text x="154" y="24" text-anchor="end" fill="#6F6F6F" font-family="JetBrains Mono, monospace" font-size="10">04:12</text>
        <text x="14" y="46" fill="#F5F5F5" font-family="Inter, sans-serif" font-size="12" font-weight="600">Table 07 · 4 items</text>
        <text x="14" y="63" fill="#6F6F6F" font-family="Inter, sans-serif" font-size="10.5">Tandoor · Main course</text>
        <rect x="14" y="74" width="140" height="3" rx="1.5" fill="#262626"/><rect x="14" y="74" width="92" height="3" rx="1.5" fill="${O}"/>
      </g>
      <g transform="translate(604 160)" opacity="0.55">
        <rect width="168" height="56" rx="9" fill="#121212" stroke="#2A2A2A"/>
        <text x="14" y="23" fill="#A3A3A3" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="600">KOT #1041</text>
        <circle cx="150" cy="20" r="3.5" fill="#22C55E"/>
        <text x="14" y="41" fill="#6F6F6F" font-family="Inter, sans-serif" font-size="10.5">Table 02 · Ready to serve</text>
      </g>
      <text x="72" y="320" fill="#5A5A5A" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.5">COVERS / 30 MIN</text>
      <line x1="72" y1="${base}" x2="${bx + 24 * (bw + gap)}" y2="${base}" stroke="#262626"/>
      ${bars}
      <line x1="${nx}" y1="300" x2="${nx}" y2="${base}" stroke="${O}" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="${nx + 6}" y="306" fill="${O}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="600">NOW 19:42</text>
      ${labels}
    </svg>`;
  }

  /* ---------- Web auth split ---------- */
  function authSplit(S, form, o = {}) {
    const online = S.network === "online";
    return `<div class="auth">
      <section class="auth__brand" aria-label="Rasova">
        <div class="auth__grid"></div><div class="auth__glow"></div>
        <div class="auth__brand-top">${logo()}<span class="rv-tag">Restaurant OS</span></div>
        <div class="auth__statement">
          <div class="auth__eyebrow">Billing · Orders · Kitchen · Menus</div>
          <h1>Run every outlet<em>.</em><br><span>Without the chaos.</span></h1>
          <p>One operating system for billing, orders, kitchen, menus and restaurant operations.</p>
        </div>
        <div class="auth__visual">${brandVisual()}</div>
        <div class="auth__brand-foot">
          ${online ? status("online", "All systems operational") : status("offline", "No connection", "Check network")}
          <span class="meta"><span>v1.0.4</span><span>© 2026 Rasova</span></span>
        </div>
      </section>
      <section class="auth__panel">
        <div class="auth__panel-top">${o.step ? steps(o.step) : "<span></span>"}${btn({ v: "ghost", label: "Need help?", icon: "life-buoy", act: "help" })}</div>
        <div class="auth__panel-main">${form}</div>
        <div class="auth__panel-foot"><span>Workspace · ${esc(ORG)}</span><nav>${["Privacy", "Terms", "System status"].map((l) => `<button type="button" class="rv-btn rv-btn--quiet-link" style="font-size:12px">${l}</button>`).join("")}</nav></div>
      </section>
    </div>`;
  }

  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());
  const maskEmail = (e) => {
    const [u, d] = String(e).split("@");
    return d ? `${u[0]}${"•".repeat(Math.min(6, Math.max(3, u.length - 1)))}@${d}` : e;
  };
  const orgFrom = (id) => {
    const v = String(id).trim().toLowerCase();
    if (v.includes("spicetrail") || v.includes("spice-trail")) return ORG;
    const base = v.includes("@") ? v.split("@")[1].split(".")[0] : v;
    return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const domainOf = (id) => (String(id).includes("@") ? String(id).split("@")[1] : String(id));

  /* ---------- PA-01 Login (+ PA-06 session states) ---------- */
  function loginScreen(S) {
    const v = S.v;
    const locked = v === "locked";
    const busy = v === "loading";
    const emailErr = S.emailTouched && S.email && !emailOk(S.email) ? "Enter a work email in the format <strong>name@company.com</strong>." : "";
    const credErr = v === "invalid";
    const can = emailOk(S.email) && S.password.length > 0 && !locked;
    const banners = {
      invalid: banner({ tone: "error", icon: "circle-alert", title: "Email or password is incorrect", body: `Check both and try again. ${S.attemptsLeft} ${S.attemptsLeft === 1 ? "attempt" : "attempts"} left before this account is locked for 30 minutes.` }),
      locked: banner({ tone: "error", icon: "lock-keyhole", title: "This account is locked", body: "There were too many unsuccessful sign-in attempts. It unlocks in 30 minutes, or sooner if your administrator unlocks it.", actions: btn({ v: "link", label: "Reset password", go: "forgot/default" }) + btn({ v: "quiet-link", label: "Contact support", act: "help" }) }),
      "service-error": banner({ tone: "error", icon: "cloud-off", title: "Sign-in service isn't responding", body: "Nothing was submitted. Try again in a moment. If this keeps happening, check System status.", actions: btn({ v: "link", label: "Try again", icon: "rotate-ccw", act: "submitLogin" }) }),
      offline: banner({ tone: "warning", icon: "wifi-off", title: "No internet connection", body: "Email sign-in needs a connection. A POS terminal that's already set up can keep billing offline with PIN login.", actions: btn({ v: "link", label: "Use PIN login", go: "pin/default" }) }),
      "session-expired": banner({ tone: "info", icon: "timer", title: "Your session expired", body: "You were signed out after 30 minutes of inactivity. Sign in again to continue." }),
      "signed-out": banner({ tone: "success", icon: "circle-check", title: "You're signed out", body: "Your session on this device has ended." }),
    };
    const eye = `<button type="button" class="rv-input__action" data-act="togglePw" aria-label="${S.showPw ? "Hide password" : "Show password"}" aria-pressed="${S.showPw}"${locked ? " disabled" : ""}>${ic(S.showPw ? "eye-off" : "eye")}</button>`;
    const form = `<form class="auth__form" data-form="login" novalidate>
      <div class="auth__head"><h2>Welcome back</h2><p>Sign in to your Rasova workspace.</p></div>
      ${banners[v] || ""}
      <div class="auth__fields">
        ${field({ id: "email", label: "Work email", type: "email", icon: "mail", value: S.email, ph: "name@company.com", autocomplete: "username", state: v === "focus" ? "focus" : credErr ? "error" : "", error: emailErr, disabled: locked, readonly: busy, autofocus: !credErr })}
        ${field({ id: "password", label: "Password", type: S.showPw ? "text" : "password", icon: "lock", value: S.password, ph: "Enter your password", autocomplete: "current-password", state: credErr ? "error" : "", disabled: locked, readonly: busy, action: eye, autofocus: credErr, aside: btn({ v: "link", label: "Forgot password?", go: "forgot/default" }) })}
      </div>
      <div class="auth__actions">
        ${btn({ v: "primary", size: "lg", block: true, type: "submit", label: "Sign in", iconR: "arrow-right", disabled: !can, loading: busy ? "Signing in…" : false, cta: true })}
        <div class="rv-divider">or</div>
        ${btn({ v: "secondary", size: "lg", block: true, label: "Continue with SSO", icon: "building-2", go: "sso/default", disabled: busy })}
      </div>
      <p class="auth__note">Don't have access? <strong>Contact your administrator.</strong></p>
    </form>`;
    return authSplit(S, form, { step: 1 });
  }

  /* ---------- Forgot password ---------- */
  function forgotScreen(S) {
    const v = S.v;
    const back = btn({ v: "quiet-link", label: "Back to sign in", icon: "arrow-left", go: "login/default", cls: "back" });
    if (v === "sent") {
      const cd = remaining(S, "resend");
      const form = `<div class="auth__form">
        <div class="auth__head">${back}<div class="auth__icon-tile">${ic("mail")}</div><h2>Check your inbox</h2><p>Password reset instructions have been sent to your registered email.</p></div>
        <div><span class="chip-value">${ic("mail")}${esc(maskEmail(S.forgotEmail))}</span></div>
        <div class="rv-banner rv-banner--neutral">${ic("info")}<div class="rv-banner__title">The link expires in 30 minutes</div><div class="rv-banner__body">Nothing in your inbox? Check spam, or resend the email after the timer runs out.</div></div>
        <div class="auth__actions">
          ${btn({ v: "primary", size: "lg", block: true, label: "Back to sign in", go: "login/default" })}
          ${cd > 0 ? `<button type="button" class="rv-btn rv-btn--secondary rv-btn--lg rv-btn--block" disabled>${ic("timer")}<span>Resend email in ${timer(S, "resend")}</span></button>` : btn({ v: "secondary", size: "lg", block: true, label: "Resend email", icon: "rotate-ccw", act: "resendReset" })}
        </div>
      </div>`;
      return authSplit(S, form);
    }
    const errs = {
      "invalid-email": "Enter a work email in the format <strong>name@company.com</strong>.",
      unknown: `No Rasova account uses <strong>${esc(S.forgotEmail)}</strong>. Check the spelling, or ask your administrator to invite you.`,
    };
    const form = `<form class="auth__form" data-form="forgot" novalidate>
      <div class="auth__head">${back}<h2>Reset your password</h2><p>Enter your work email and we'll send you a link to set a new password.</p></div>
      ${v === "service-error" ? banner({ tone: "error", icon: "cloud-off", title: "We couldn't send the email", body: "The email service didn't respond. Your password hasn't changed. Try again in a moment.", actions: btn({ v: "link", label: "Try again", icon: "rotate-ccw", act: "submitForgot" }) }) : ""}
      ${field({ id: "forgotEmail", label: "Work email", type: "email", icon: "mail", value: S.forgotEmail, ph: "name@company.com", autocomplete: "username", error: errs[v], readonly: v === "loading", autofocus: true })}
      ${btn({ v: "primary", size: "lg", block: true, type: "submit", label: "Send reset link", disabled: !S.forgotEmail.trim(), loading: v === "loading" ? "Sending…" : false, cta: true })}
      <p class="auth__note">Signs in with SSO? <strong>Reset your password with your organization instead.</strong></p>
    </form>`;
    return authSplit(S, form);
  }

  /* ---------- PA-02 SSO ---------- */
  function ssoScreen(S) {
    const v = S.v;
    const back = btn({ v: "quiet-link", label: "Back to sign in", icon: "arrow-left", go: "login/default", cls: "back" });
    if (v === "redirecting" || v === "waiting") {
      const org = orgFrom(S.ssoId);
      const st2 = v === "redirecting" ? "is-current" : "is-done";
      const st3 = v === "waiting" ? "is-current" : "";
      const form = `<div class="auth__form">
        <div class="auth__head"><h2>Signing in with ${esc(org)}</h2><p>Finish signing in on your organization's page. You'll come back here automatically.</p></div>
        <ol class="seq" aria-live="polite">
          <li class="is-done"><span class="ic">${ic("check")}</span><div><div class="tt">Organization found</div><div class="sub">${esc(org)} · ${esc(domainOf(S.ssoId))}</div></div></li>
          <li class="${st2}"><span class="ic">${v === "redirecting" ? ic("loader-circle", "rv-spin") : ic("check")}</span><div><div class="tt">Redirecting to your identity provider</div><div class="sub">Secure connection</div></div></li>
          <li class="${st3}"><span class="ic">${v === "waiting" ? ic("loader-circle", "rv-spin") : ic("log-in")}</span><div><div class="tt">Waiting for your organization to confirm</div><div class="sub">Usually takes a few seconds</div></div></li>
        </ol>
        <div class="rv-progress is-indeterminate"><i></i></div>
        ${btn({ v: "ghost", block: true, label: "Cancel and go back", act: "cancelSso" })}
      </div>`;
      return authSplit(S, form, { step: v === "waiting" ? 2 : 1 });
    }
    const invalid = v === "invalid" ? "Enter a work email (<strong>name@company.com</strong>) or an organization ID such as <strong>spice-trail</strong>." : "";
    const banners = {
      "not-configured": banner({ tone: "warning", icon: "building-2", title: `Single sign-on isn't set up for ${esc(domainOf(S.ssoId))}`, body: "Sign in with your email and password instead, or ask your administrator to turn on SSO for your organization.", actions: btn({ v: "link", label: "Sign in with email", go: "login/default" }) }),
      denied: banner({ tone: "error", icon: "shield-alert", title: "Your organization didn't confirm the sign-in", body: "The identity provider declined or cancelled the request. Try again, or ask your administrator to check that your account has access to Rasova." }),
    };
    const form = `<form class="auth__form" data-form="sso" novalidate>
      <div class="auth__head">${back}<h2>Sign in with your organization</h2><p>Use your company's single sign-on. Enter your work email or organization ID.</p></div>
      ${banners[v] || ""}
      ${field({ id: "ssoId", label: "Work email or organization ID", icon: "building-2", value: S.ssoId, ph: "name@company.com or org ID", autocomplete: "username", error: invalid, readonly: v === "loading", autofocus: true })}
      ${btn({ v: "primary", size: "lg", block: true, type: "submit", label: "Continue", iconR: "arrow-right", disabled: !S.ssoId.trim(), loading: v === "loading" ? "Finding your organization…" : false, cta: true })}
      <div class="rv-banner rv-banner--neutral">${ic("info")}<div class="rv-banner__title">How SSO works</div><div class="rv-banner__body">You'll sign in on your organization's page, then return to Rasova. Your Rasova password isn't used.</div></div>
    </form>`;
    return authSplit(S, form, { step: 1 });
  }

  /* ---------- PA-03 MFA ---------- */
  const METHODS = {
    sms: { icon: "message-square-text", t: "Text message", sub: "+91 ••••• •••42", chip: "SMS to +91 ••••• •••42" },
    app: { icon: "smartphone", t: "Authenticator app", sub: "Registered phone", chip: "Authenticator app on your registered phone" },
    email: { icon: "mail", t: "Email", sub: "a••••••@spicetrail.in", chip: "Email to a••••••@spicetrail.in" },
  };
  function mfaScreen(S) {
    const v = S.v;
    const back = btn({ v: "quiet-link", label: "Back to sign in", icon: "arrow-left", go: "login/default", cls: "back" });
    if (v === "methods") {
      const form = `<div class="auth__form">
        <div class="auth__head">${btn({ v: "quiet-link", label: "Back", icon: "arrow-left", go: "mfa/default", cls: "back" })}<h2>Choose another method</h2><p>Pick where we should send your verification code.</p></div>
        <div class="methods" role="radiogroup" aria-label="Verification method">${Object.entries(METHODS)
          .map(([k, m]) => `<button type="button" class="method ${S.mfaPick === k ? "is-selected" : ""}" role="radio" aria-checked="${S.mfaPick === k}" data-method="${k}"><span class="ic">${ic(m.icon)}</span><span><span class="tt">${m.t}</span><span class="sub" style="display:block">${m.sub}</span></span>${S.mfaPick === k ? ic("circle-check") : ic("chevron-right")}</button>`)
          .join("")}</div>
        ${btn({ v: "primary", size: "lg", block: true, label: S.mfaPick === "app" ? "Use authenticator code" : "Send code", act: "sendMethod" })}
        <p class="auth__note">Lost access to all methods? <strong>Your administrator can reset verification.</strong></p>
      </div>`;
      return authSplit(S, form, { step: 2 });
    }
    const m = METHODS[S.mfaMethod];
    const full = S.otp.every(Boolean);
    const otpState = { incorrect: "error", expired: "error", "too-many": "disabled", success: "success" }[v] || "";
    const stopped = v === "too-many" || v === "success";
    let msg = "";
    if (v === "incorrect") msg = `<div class="rv-hint is-error" role="alert">${ic("circle-alert")}<span>That code doesn't match. ${S.mfaAttempts} ${S.mfaAttempts === 1 ? "attempt" : "attempts"} left.</span></div>`;
    if (v === "expired") msg = `<div class="rv-hint is-error" role="alert">${ic("timer")}<span>This code has expired. Send a new code to continue.</span></div>`;
    if (v === "success") msg = `<div class="rv-hint is-success" role="status">${ic("circle-check")}<span>Identity verified. Opening your workspace…</span></div>`;
    const resendCd = remaining(S, "mfaResend");
    const form = `<form class="auth__form" data-form="mfa" novalidate>
      <div class="auth__head">${back}<div class="auth__icon-tile ${v === "success" ? "is-success" : v === "too-many" ? "is-error" : ""}">${ic(v === "success" ? "circle-check" : v === "too-many" ? "shield-alert" : "shield-check")}</div><h2>Verify your identity</h2><p>Enter the verification code sent to your registered device.</p></div>
      <div><span class="chip-value">${ic(m.icon)}${m.chip}</span></div>
      ${v === "too-many" ? banner({ tone: "error", icon: "lock-keyhole", title: "Too many incorrect codes", body: "Verification is paused for 15 minutes to protect this account. Try again later, or ask your administrator for help.", actions: btn({ v: "link", label: "Back to sign in", go: "login/default" }) }) : ""}
      <div class="stack" style="display:grid;gap:12px">
        ${otp(S.otp, { state: otpState, disabled: stopped || v === "expired", showActive: STATIC && !stopped && v !== "expired" && v !== "incorrect", autofocusIndex: stopped ? -1 : Math.max(0, S.otp.findIndex((d) => !d) === -1 ? 5 : S.otp.findIndex((d) => !d)) })}
        ${msg}
        ${stopped ? "" : `<div class="meta-row"><span>${v === "expired" ? "Code expired" : `Code expires in <span class="t">${timer(S, "mfaExpire")}</span>`}</span>${resendCd > 0 ? `<span>Resend in <span class="t">${timer(S, "mfaResend")}</span></span>` : btn({ v: "link", label: "Resend code", icon: "rotate-ccw", act: "resendOtp" })}</div>`}
      </div>
      <div class="auth__actions">
        ${v === "expired" ? btn({ v: "primary", size: "lg", block: true, label: "Send new code", icon: "rotate-ccw", act: "resendOtp" }) : btn({ v: "primary", size: "lg", block: true, type: "submit", label: "Verify", disabled: !full || stopped, loading: v === "verifying" ? "Verifying…" : false, cta: true })}
        ${btn({ v: "ghost", size: "lg", block: true, label: "Use another method", go: "mfa/methods", disabled: stopped })}
      </div>
    </form>`;
    return authSplit(S, form, { step: v === "success" ? 3 : 2 });
  }

  /* ---------- POS frame (PA-04, PA-05) ---------- */
  function posBar(S, ctx) {
    const online = S.network === "online";
    return `<header class="pos__bar">${logo(true)}<span class="pos__sep"></span>
      <span class="pos__ctx">${ic("map-pin")}${OUTLET}</span>
      <span class="pos__ctx">${ic("monitor")}${ctx || TERMINAL}</span>
      <span class="pos__clock">7:42<small>PM · Thu 1 Oct</small></span>
      ${online ? status("online", "Online", "Synced 12 sec ago") : status("offline", "Offline", "3 pending sync")}
    </header>`;
  }
  const posFoot = (left) => `<footer class="pos__foot"><nav>${left}</nav><span>Device <span style="font-family:var(--font-mono)">${DEVICE_ID}</span> · Rasova POS 1.0.4</span></footer>`;

  function pinScreen(S) {
    const v = S.v;
    const u = STAFF[S.user];
    const len = 4;
    const blocked = ["too-many", "locked", "unauthorized"].includes(v);
    const dotState = { incorrect: "error", success: "success" }[v] || (blocked ? "disabled" : "");
    const msgs = {
      default: `<div><div class="line">Enter your ${len}-digit PIN</div>${S.network === "offline" ? `<div class="sub">Offline: your PIN is checked on this device.</div>` : `<div class="sub">Demo PIN ${DEMO_PIN}</div>`}</div>`,
      entering: `<div><div class="line">${S.pin.length} of ${len} digits</div><div class="sub">Press Continue or Enter</div></div>`,
      verifying: `<div><div class="line">${ic("loader-circle", "rv-spin")}Checking PIN…</div></div>`,
      incorrect: `<div role="alert"><div class="line is-error">${ic("circle-alert")}Incorrect PIN</div><div class="sub">${S.pinAttempts} ${S.pinAttempts === 1 ? "attempt" : "attempts"} left before PIN entry is paused.</div></div>`,
      success: `<div role="status"><div class="line is-success">${ic("circle-check")}PIN accepted. Opening POS…</div></div>`,
      "too-many": `<div role="alert"><div class="line is-warning">${ic("timer")}PIN entry paused</div></div>`,
      locked: `<div role="alert"><div class="line is-error">${ic("lock-keyhole")}PIN locked</div></div>`,
      unauthorized: `<div role="alert"><div class="line is-error">${ic("shield-alert")}Device not authorized</div></div>`,
    };
    let right;
    if (v === "too-many") {
      right = `<div class="lock-panel">${ic("timer")}<h3>Too many incorrect PINs</h3><div class="big-timer">${timer(S, "pinLock")}</div><p>PIN entry for ${u.n} is paused. Wait for the timer, or ask an outlet manager to unlock it now.</p><div class="actions">${btn({ v: "secondary", size: "touch", label: "Switch user", icon: "user", act: "switchUser" })}</div></div>`;
    } else if (v === "locked") {
      right = `<div class="lock-panel"><div class="auth__icon-tile is-error">${ic("lock-keyhole")}</div><h3>This PIN is locked</h3><p>An administrator locked the PIN for ${u.n}. Ask an outlet manager or administrator to reset it before signing in.</p><div class="actions">${btn({ v: "secondary", size: "touch", label: "Switch user", icon: "user", act: "switchUser" })}${btn({ v: "ghost", size: "touch", label: "Sign in with email", go: "login/default" })}</div></div>`;
    } else if (v === "unauthorized") {
      right = `<div class="lock-panel"><div class="auth__icon-tile is-error">${ic("shield-alert")}</div><h3>This device isn't authorized</h3><p>Rasova POS only runs on devices an administrator has approved for ${OUTLET}. Authorize this terminal to continue.</p><dl class="kv" style="width:100%;margin:0"><div><dt>Device ID</dt><dd class="mono">${DEVICE_ID}</dd><span></span></div><div><dt>Status</dt><dd>${status("warning", "Not paired")}</dd><span></span></div></dl><div class="actions">${btn({ v: "primary", size: "touch", label: "Authorize this device", icon: "shield-check", go: "device/start" })}</div></div>`;
    } else {
      right = `${keypad(v === "success" || v === "verifying", S.pressed)}
        ${btn({ v: "primary", size: "touch", block: true, label: "Continue", iconR: "arrow-right", act: "pinSubmit", disabled: S.pin.length < len || v === "incorrect" || v === "success", loading: v === "verifying" ? "Checking…" : false, cls: "", attrs: 'style="height:64px;font-size:17px"' })}
        <div class="meta-row" style="justify-content:center"><span>Keyboard works too</span><span class="rv-kbd">0–9</span><span class="rv-kbd">⌫</span><span class="rv-kbd">Enter</span></div>`;
    }
    return `<div class="pos">${posBar(S)}
      <main class="pos__body"><div class="console">
        <section class="console__left">
          <div class="auth__eyebrow">POS sign-in</div>
          <h2 style="margin-top:14px">Enter your POS PIN</h2>
          <p class="lead">Sign in to ${TERMINAL} at ${OUTLET}.</p>
          <div class="who" style="margin-top:28px"><span class="rv-avatar">${u.i}</span><div><div class="nm">${u.n}</div><div class="rl">${u.r} · ${OUTLET}</div></div>${btn({ v: "ghost", label: "Switch user", icon: "refresh-cw", act: "switchUser" })}</div>
          <div class="pin-block">${pinDots(len, v === "too-many" || v === "locked" || v === "unauthorized" ? 0 : S.pin.length, dotState)}<div class="pin-msg" aria-live="polite">${msgs[v] || msgs.default}</div></div>
        </section>
        <section class="console__right">${right}</section>
      </div></main>
      ${posFoot(btn({ v: "quiet-link", label: "Sign in with email", icon: "mail", go: "login/default" }) + btn({ v: "quiet-link", label: "Need help?", icon: "life-buoy", act: "help" }))}
    </div>`;
  }

  /* ---------- PA-05 Device binding ---------- */
  function deviceScreen(S) {
    const v = S.v;
    const stepN = { start: 1, pending: 2, paired: 3, rejected: 2 }[v];
    const editable = v === "start";
    const copy = `<button type="button" class="rv-input__action" data-act="copyId" aria-label="Copy device ID">${ic("copy")}</button>`;
    const details = editable
      ? `<div style="display:grid;gap:14px">
          ${field({ id: "devName", label: "Device name", icon: "monitor", value: S.devName, hint: "Staff see this name on the PIN screen and in reports.", autofocus: true })}
          <div class="rv-field"><div class="rv-field__top"><span class="rv-label">Outlet</span></div><div class="rv-input" role="button" tabindex="0" aria-label="Outlet: ${OUTLET}">${ic("store")}<span class="rv-input__value">${OUTLET} · Connaught Place</span>${ic("chevron-down")}</div></div>
          <dl class="kv" style="margin:0"><div><dt>Device ID</dt><dd class="mono">${DEVICE_ID}</dd>${STATIC ? "<span></span>" : copy}</div><div><dt>Platform</dt><dd>Windows 11 · Rasova POS 1.0.4</dd><span></span></div></dl>
        </div>`
      : `<dl class="kv" style="margin:0">
          <div><dt>Device name</dt><dd>${esc(S.devName)}</dd><span></span></div>
          <div><dt>Outlet</dt><dd>${OUTLET} · Connaught Place</dd><span></span></div>
          <div><dt>Device ID</dt><dd class="mono">${DEVICE_ID}</dd>${STATIC ? "<span></span>" : copy}</div>
          <div><dt>Platform</dt><dd>Windows 11 · Rasova POS 1.0.4</dd><span></span></div>
          <div><dt>Status</dt><dd>${{ pending: status("syncing", "Pending approval"), paired: status("success", "Paired"), rejected: status("error", "Rejected") }[v]}</dd><span></span></div>
        </dl>`;
    let right;
    if (v === "start") {
      right = `<div class="result"><h3>Request authorization</h3><p>Sending a request creates a one-time pairing code. An administrator approves it in <strong style="color:var(--text-1)">Admin › Devices</strong>, then staff can sign in here with their POS PIN.</p></div>
        <ol class="seq"><li class="is-current"><span class="ic">1</span><div><div class="tt">Confirm the device name and outlet</div></div><span></span></li><li><span class="ic">2</span><div><div class="tt">Send the authorization request</div></div><span></span></li><li><span class="ic">3</span><div><div class="tt">Administrator approves the pairing code</div></div><span></span></li></ol>
        ${btn({ v: "primary", size: "touch", block: true, label: "Request authorization", iconR: "arrow-right", act: "requestDevice", disabled: !S.devName.trim(), cta: true })}`;
    } else if (v === "pending") {
      right = `<div class="rv-label">Pairing code</div>
        <div class="pair-code" aria-label="Pairing code K7Q 4M2"><span>K</span><span>7</span><span>Q</span><i></i><span>4</span><span>M</span><span>2</span></div>
        <div class="pair-row"><div class="qr">${qr()}</div><p>Ask an administrator to approve <b>K7Q-4M2</b> in <b>Admin › Devices</b>, or scan this code from an administrator's signed-in session.</p></div>
        <div class="wait" role="status">${ic("loader-circle", "rv-spin")}<div><div class="tt">Waiting for administrator approval</div><div class="sub">This screen updates on its own.</div></div><span class="t">${timer(S, "deviceCode")}</span></div>
        ${btn({ v: "secondary", size: "touch", block: true, label: "Cancel request", go: "device/start" })}`;
    } else if (v === "paired") {
      right = `<div class="result"><div class="auth__icon-tile is-success">${ic("shield-check")}</div><h3>Device authorized</h3><p>${esc(S.devName)} is now bound to ${OUTLET}. Staff can sign in here with their POS PIN.</p></div>
        <dl class="kv" style="margin:0;width:100%"><div><dt>Approved by</dt><dd>Rohan Das · Outlet manager</dd><span></span></div><div><dt>Approved at</dt><dd>1 Oct 2026, 7:44 PM</dd><span></span></div></dl>
        ${btn({ v: "primary", size: "touch", block: true, label: "Continue to PIN login", iconR: "arrow-right", act: "toPin" })}`;
    } else {
      right = `<div class="result"><div class="auth__icon-tile is-error">${ic("circle-x")}</div><h3>Authorization rejected</h3><p>An administrator declined this request. Check that the outlet is correct, then send a new request.</p></div>
        <div class="rv-banner rv-banner--neutral">${ic("message-square-text")}<div class="rv-banner__title">Note from Rohan Das</div><div class="rv-banner__body">This terminal belongs to the Connaught Place outlet, not Downtown Delhi.</div></div>
        <div style="display:grid;gap:10px">${btn({ v: "primary", size: "touch", block: true, label: "Request again", icon: "rotate-ccw", go: "device/start" })}${btn({ v: "secondary", size: "touch", block: true, label: "Contact support", icon: "life-buoy", act: "help" })}</div>`;
    }
    return `<div class="pos">${posBar(S, "Unpaired device")}
      <main class="pos__body"><div class="console console--device">
        <section class="console__left" style="gap:0">
          ${steps(stepN, ["Details", "Approval", "Ready"])}
          <h2 style="margin-top:24px">Secure this device</h2>
          <p class="lead">This device needs to be authorized before it can access Rasova POS.</p>
          <div style="margin-top:24px">${details}</div>
        </section>
        <section class="console__right" style="justify-content:flex-start;padding-top:36px">${right}</section>
      </div></main>
      ${posFoot(btn({ v: "quiet-link", label: "Sign in with email", icon: "mail", go: "login/default" }) + btn({ v: "quiet-link", label: "Need help?", icon: "life-buoy", act: "help" }))}
    </div>`;
  }

  /* ---------- Transition ---------- */
  function transitScreen(S) {
    return `<div class="transit"><div class="transit__box" role="status">${mark("transit__mark")}<div><h2>${esc(S.transit.title)}</h2><p>${esc(S.transit.sub)}</p></div><div class="rv-progress is-indeterminate"><i></i></div></div></div>`;
  }

  /* ---------- Application shell ---------- */
  const NAV = [
    [null, [["home", "Home", "house"]]],
    ["Sell", [["pos", "POS", "monitor"], ["online", "Online Orders", "bike", 3]]],
    ["Run the outlet", [["kitchen", "Kitchen", "chef-hat"], ["menu", "Menu", "book-open"]]],
    ["Control the business", [["reports", "Reports", "chart-column-big"], ["admin", "Admin", "shield"]]],
    ["Keep the system running", [["devices", "Devices", "cpu"], ["support", "Support", "life-buoy"]]],
  ];
  const MODULE_SECTION = { pos: "02 — POS", online: "06 — Online Orders", kitchen: "04 — Kitchen / KOT", menu: "05 — Menu", reports: "07 — Reports", admin: "08 — Platform / Admin", devices: "09 — Devices", support: "11 — Support" };
  const RESTRICTED = { Cashier: ["reports", "admin", "devices"], Captain: ["reports", "admin", "devices"] };

  const SYNC = {
    online: ["is-online", '<i class="rv-dot"></i>Online', "Last synced 12 sec ago"],
    offline: ["is-offline", '<i class="rv-dot"></i>Offline', "3 transactions pending sync"],
    syncing: ["is-syncing", ic("refresh-cw", "rv-spin") + "Syncing", "Sending 3 transactions"],
    synced: ["is-online", '<i class="rv-dot"></i>Online', "Synced just now"],
    failed: ["is-failed", ic("circle-x") + "Sync failed", "2 transactions need attention"],
    conflict: ["is-conflict", ic("git-compare-arrows") + "Conflict", "1 change needs review"],
  };
  const HEADER_STATUS = {
    online: () => status("online", "Online", "12s ago"),
    offline: () => status("offline", "Offline", "3 pending"),
    syncing: () => status("syncing", "Syncing", "3 of 3"),
    synced: () => status("success", "Synced", "just now"),
    failed: () => status("error", "Sync failed"),
    conflict: () => status("warning", "Conflict"),
  };
  function sysbar(st) {
    const b = {
      offline: [ic("wifi-off"), "<b>You're offline.</b> Billing continues on this device. 3 transactions will sync when the connection returns.", ""],
      syncing: [ic("refresh-cw", "rv-spin"), "<b>Syncing 3 transactions…</b> Keep billing. Nothing is blocked.", `<div class="rv-progress bar"><i style="width:62%"></i></div>`],
      synced: [ic("circle-check"), "<b>All transactions synced.</b> This outlet is up to date as of 7:44 PM.", btn({ v: "ghost", label: "Dismiss", act: "dismissBar" })],
      failed: [ic("circle-x"), "<b>2 transactions didn't sync.</b> They're saved on this device. Retry, or contact support if it fails again.", btn({ v: "secondary", label: "View details" }) + btn({ v: "primary", label: "Retry sync", icon: "refresh-cw", act: "retrySync" })],
      conflict: [ic("git-compare-arrows"), "<b>Sync conflict:</b> Paneer Tikka was priced <b>₹340</b> here and <b>₹360</b> on another device.", btn({ v: "secondary", label: "Keep ₹340", act: "resolveConflict" }) + btn({ v: "primary", label: "Use ₹360", act: "resolveConflict" })],
    }[st];
    if (!b) return "<div></div>";
    return `<div class="sysbar sysbar--${st}" role="${st === "failed" || st === "conflict" ? "alert" : "status"}">${b[0]}<span>${b[1]}</span><span class="acts">${b[2]}</span></div>`;
  }

  function appScreen(S) {
    const st = S.appState;
    const sc = SYNC[st];
    const user = S.via === "pin" ? STAFF[S.user] : { n: "Aarav Mehta", i: "AM", r: "Area manager" };
    const denied = (RESTRICTED[user.r] || []).includes(S.nav);
    const nav = NAV.map(([label, items]) => `${label ? `<div class="rv-nav-label">${label}</div>` : ""}${items.map(([id, l, icn, badge]) => navItem(id, l, icn, { active: S.nav === id, badge })).join("")}`).join("");
    const navLabel = NAV.flatMap((g) => g[1]).find((n) => n[0] === S.nav)[1];
    let content;
    if (denied) {
      content = `<div class="module-ph" style="border-style:solid;background:var(--bg-1)"><div class="inner"><div class="auth__icon-tile is-error">${ic("lock-keyhole")}</div><h2>You don't have access to ${navLabel}</h2><p>Your role (${user.r}) doesn't include ${navLabel}. Ask an outlet manager or administrator to update your role.</p>${status("error", "Permission denied")}${btn({ v: "secondary", label: "Back to Home", icon: "house", act: "navHome" })}</div></div>`;
    } else if (S.nav === "home") {
      content = `<div class="content__head"><div><h1>Good evening, ${user.n.split(" ")[0]}</h1><p>Thursday, 1 October · Dinner service · ${OUTLET}</p></div><span class="rv-tag">Sample data</span></div>
        <div class="kpis">
          <div class="kpi kpi--lead"><div class="lb">Net sales today ${ic("receipt")}</div><div class="rv-num">₹84,520</div><div class="dl">▲ 12% vs last Thursday</div></div>
          <div class="kpi"><div class="lb">Orders</div><div class="rv-num">128</div><div class="dl mut">31 dine-in open · 6 online</div></div>
          <div class="kpi"><div class="lb">Tables occupied</div><div class="rv-num">23<small> / 32</small></div><div class="meter"><i style="width:72%"></i></div></div>
          <div class="kpi"><div class="lb">KOTs on time</div><div class="rv-num">94%</div><div class="dl">Target 90%</div></div>
        </div>
        <div class="panels">
          <div class="panel"><h3>Live orders <span class="rv-tag">02 — POS</span></h3>${[1, 2, 3, 4, 5].map((i) => `<div class="skel"><i class="${i === 1 ? "o" : ""}"></i><i style="width:${90 - i * 9}%"></i><i></i></div>`).join("")}</div>
          <div class="panel"><h3>Kitchen queue <span class="rv-tag">04 — KOT</span></h3>${[1, 2, 3, 4].map((i) => `<div class="skel"><i class="${i < 3 ? "o" : ""}"></i><i style="width:${80 - i * 10}%"></i><i></i></div>`).join("")}</div>
        </div>`;
    } else {
      content = `<div class="module-ph"><div class="inner"><span class="rv-tag rv-tag--orange">${MODULE_SECTION[S.nav]}</span><h2>${navLabel}</h2><p>This module is designed in its own section. This iteration covers the foundations, authentication and the application shell.</p>${btn({ v: "secondary", label: "Back to Home", icon: "house", act: "navHome" })}</div></div>`;
    }
    return `<div class="shell">
      <aside class="side">
        <div class="side__logo">${logo()}</div>
        <nav class="side__nav" aria-label="Main">${nav}</nav>
        <div class="side__bottom">
          <div class="sync-card ${sc[0]}" role="status"><div class="row">${sc[1]}</div><div class="meta">${sc[2]}</div></div>
          <button type="button" class="side__outlet"><span class="ic">${ic("store")}</span><span><span class="tt">${OUTLET}</span><span class="sub">${S.via === "pin" ? TERMINAL : "6 outlets"}</span></span>${ic("chevron-down")}</button>
          <button type="button" class="side__user" data-act="signout" aria-label="Account: ${user.n}. Sign out"><span class="rv-avatar">${user.i}</span><div><div class="tt">${user.n}</div><div class="sub">${user.r}</div></div>${ic("log-out")}</button>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <button type="button" class="top__outlet">${ic("map-pin")}${OUTLET}${ic("chevron-down")}</button>
          <span class="top__ctx"><b>Thu, 1 Oct 2026</b> · Dinner service</span>
          <div class="top__right">${HEADER_STATUS[st]()}
            <button type="button" class="rv-btn rv-btn--icon top__bell" aria-label="Notifications, 2 new">${ic("bell")}</button>
            <button type="button" class="rv-btn rv-btn--icon" aria-label="Help" data-act="help">${ic("circle-help")}</button>
            <button type="button" class="rv-btn rv-btn--icon" style="border-radius:50%;padding:0;border:0;background:none" data-act="signout" aria-label="Account menu"><span class="rv-avatar">${user.i}</span></button>
          </div>
        </header>
        ${sysbar(st)}
        <main class="content">${content}</main>
      </div>
    </div>`;
  }

  /* ---------- Overlays ---------- */
  function overlay(S) {
    let o = "";
    if (S.modal === "signout") {
      const pending = S.appState === "offline" || S.appState === "failed";
      o = `<div class="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h3${idAttr("dlg-t")}>Sign out of Rasova?</h3><p>You'll need your ${S.via === "pin" ? "POS PIN" : "password"} to sign in again on this device.</p>
        ${pending ? `<div class="rv-banner rv-banner--warning">${ic("triangle-alert")}<div class="rv-banner__title">${S.appState === "offline" ? "3 transactions haven't synced" : "2 transactions failed to sync"}</div><div class="rv-banner__body">They stay saved on this device and sync after the next sign-in. Don't uninstall Rasova or reset this device.</div></div>` : ""}
        <div class="acts">${btn({ v: "ghost", label: "Cancel", act: "closeModal" })}${btn({ v: "danger", label: "Sign out", icon: "log-out", act: "confirmSignout" })}</div></div></div>`;
    }
    if (S.modal === "help") {
      o = `<div class="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-h"><h3${idAttr("dlg-h")}>Get help signing in</h3>
        <div class="methods">
          <button type="button" class="method" data-go="forgot/default"><span class="ic">${ic("key-round")}</span><span><span class="tt">Forgot your password</span><span class="sub" style="display:block">Get a reset link by email</span></span>${ic("chevron-right")}</button>
          <button type="button" class="method" data-go="sso/default"><span class="ic">${ic("building-2")}</span><span><span class="tt">Your company uses single sign-on</span><span class="sub" style="display:block">Sign in with your organization</span></span>${ic("chevron-right")}</button>
          <div class="method" style="cursor:default"><span class="ic">${ic("lock-keyhole")}</span><span><span class="tt">Locked out or no access</span><span class="sub" style="display:block">Your Rasova administrator can unlock accounts, reset PINs and send invites.</span></span><span></span></div>
        </div>
        <div class="acts">${btn({ v: "secondary", label: "Close", act: "closeModal" })}</div></div></div>`;
    }
    if (S.toast) o += `<div class="toast" role="status">${ic("circle-check")}${esc(S.toast)}</div>`;
    return o;
  }

  /* ---------- Frame ---------- */
  const SCREENS = { login: loginScreen, forgot: forgotScreen, sso: ssoScreen, mfa: mfaScreen, pin: pinScreen, device: deviceScreen, transit: transitScreen, app: appScreen };
  const frameInner = (S) => SCREENS[S.screen](S) + overlay(S);
  const frameHTML = (S) => {
    STATIC = true;
    try {
      return `<div class="rv-frame ${S.device === "tablet" ? "is-tablet" : ""}" inert aria-hidden="true">${frameInner(S)}</div>`;
    } finally {
      STATIC = false;
    }
  };

  window.Rasova = { ic, esc, btn, field, banner, status, steps, otp, pinDots, keypad, navItem, logo, mark, qr, sysbar, SYNC, frameInner, frameHTML, emailOk, remaining, fmt, orgFrom, STAFF, DEMO_PIN, METHODS, ORG };
})();
