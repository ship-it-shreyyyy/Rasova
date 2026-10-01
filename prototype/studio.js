/* ==========================================================================
   RASOVA — prototype controller
   Live state machine for authentication, the application shell and POS;
   scenario controls; the state board; foundations and component sheets.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.Rasova;
  const { ic, esc, btn, field, note, badge, conn, otp, pinDots, keypad, emailOk, remaining, fmt } = R;
  const $ = (s, el = document) => el.querySelector(s);
  const E = "sana.siddiqui@spicetrail.in";

  /* ---------- State ---------- */
  const base = () => ({
    theme: "light", device: "desktop", network: "online", screen: "login", v: "default",
    email: "", password: "", showPw: false, emailTouched: false, attemptsLeft: 3,
    forgotEmail: "", ssoId: "", otp: ["", "", "", "", "", ""], mfaAttempts: 3, mfaMethod: "sms", mfaPick: "sms",
    pin: "", pinAttempts: 3, user: 0, pressed: null, devName: "Cashier Terminal 01",
    appState: "online", nav: "home", via: "web", modal: null, menu: null, outlet: 0, collapsed: false, prefCollapsed: false,
    cart: R.START_CART(), cat: "mains", query: "", orderType: "dine", pay: { method: "upi", stage: "choose" },
    transit: { title: "", sub: "" }, timers: {}, fired: {},
    scen: { login: "mfa", forgot: "sent", sso: "redirect", mfa: "accept", pin: "check" },
  });
  const startTimer = (S, name, sec) => { S.timers[name] = Date.now() + sec * 1000; S.fired[name] = sec <= 0; };

  const STATES = [
    { id: "PA-01", g: "Login", items: [["login", "default", "Default"], ["login", "focus", "Focused input"], ["login", "filled", "Filled"], ["login", "loading", "Signing in"], ["login", "invalid", "Invalid credentials"], ["login", "locked", "Locked"], ["login", "mfa-required", "MFA required"], ["login", "service-error", "Service error"], ["login", "offline", "Offline"]] },
    { id: "PA-01", g: "Forgot password", items: [["forgot", "default", "Reset request"], ["forgot", "invalid-email", "Invalid email"], ["forgot", "unknown", "Unknown email"], ["forgot", "loading", "Sending"], ["forgot", "service-error", "Service error"], ["forgot", "sent", "Check your inbox"]] },
    { id: "PA-02", g: "SSO", items: [["sso", "default", "Organization"], ["sso", "invalid", "Invalid ID"], ["sso", "not-configured", "SSO not set up"], ["sso", "redirecting", "Redirecting"], ["sso", "waiting", "Waiting"], ["sso", "denied", "Not confirmed"]] },
    { id: "PA-03", g: "MFA", items: [["mfa", "default", "Enter code"], ["mfa", "filled", "Code entered"], ["mfa", "verifying", "Verifying"], ["mfa", "incorrect", "Incorrect code"], ["mfa", "expired", "Expired"], ["mfa", "too-many", "Too many attempts"], ["mfa", "methods", "Another method"], ["mfa", "success", "Verified"]] },
    { id: "PA-04", g: "POS PIN", items: [["pin", "default", "Enter PIN"], ["pin", "entering", "Entering"], ["pin", "incorrect", "Incorrect PIN"], ["pin", "too-many", "Too many attempts"], ["pin", "locked", "PIN locked"], ["pin", "unauthorized", "Device not authorized"], ["pin", "success", "Accepted"]] },
    { id: "PA-05", g: "Device binding", items: [["device", "start", "Secure this device"], ["device", "pending", "Pending"], ["device", "paired", "Paired"], ["device", "rejected", "Rejected"]] },
    { id: "PA-06", g: "Session", items: [["transit", "signin", "Signing in"], ["login", "session-expired", "Session expired"], ["app", "signout", "Sign out"], ["app", "signout-offline", "Sign out, unsynced"], ["login", "signed-out", "Signed out"]] },
    { id: "SHELL", g: "Application shell", items: [["app", "home", "Home, expanded"], ["app", "collapsed", "Collapsed sidebar"], ["app", "outlet-menu", "Outlet selector"], ["app", "profile-menu", "Profile menu"], ["app", "denied", "Restricted"]] },
    { id: "SYNC", g: "Connectivity", items: [["app", "online", "Online"], ["app", "offline", "Offline"], ["app", "syncing", "Syncing"], ["app", "synced", "Sync success"], ["app", "failed", "Sync failure"], ["app", "conflict", "Conflict"]] },
    { id: "02", g: "POS", items: [["app", "pos", "Order in progress"], ["app", "pos-empty", "New order"], ["app", "pay", "Take payment"], ["app", "paid", "Payment received"]] },
  ];
  const TABLET_SET = [["login", "default", "Login"], ["mfa", "filled", "MFA"], ["pin", "entering", "PIN login"], ["device", "pending", "Device binding"], ["app", "home", "Home, collapsed rail"], ["app", "pos", "POS, touch layout"]];
  const DARK_SET = [["login", "default", "Login"], ["pin", "entering", "PIN login"], ["app", "home", "Home"], ["app", "pos", "POS"]];

  function preset(S, screen, v) {
    S.screen = screen; S.v = v; S.modal = null; S.menu = null;
    S.network = /offline/.test(v) ? "offline" : "online";
    switch (screen) {
      case "login":
        S.email = ["default", "focus", "signed-out"].includes(v) ? "" : E;
        S.password = ["filled", "loading", "service-error", "offline", "mfa-required"].includes(v) ? "tandoor@2026" : "";
        if (v === "invalid") S.attemptsLeft = 2;
        break;
      case "forgot":
        S.forgotEmail = { default: "", "invalid-email": "sana.siddiqui@spicetrail", unknown: "sana@spicetrial.in" }[v] ?? E;
        if (v === "sent") startTimer(S, "resend", 30);
        break;
      case "sso": S.ssoId = { default: "", invalid: "spice trail!", "not-configured": "ops@tandoorhouse.in" }[v] ?? E; break;
      case "mfa":
        S.otp = (["filled", "verifying", "incorrect", "expired", "success"].includes(v) ? (v === "incorrect" ? "482931" : "482913") : "").padEnd(6, " ").split("").map((c) => c.trim());
        S.mfaAttempts = v === "incorrect" ? 2 : 3;
        startTimer(S, "mfaExpire", v === "expired" ? 0 : 287); startTimer(S, "mfaResend", v === "expired" ? 0 : 24);
        if (v === "methods") S.mfaPick = "app";
        break;
      case "pin":
        S.pin = { entering: "24", incorrect: "1357", success: "2468" }[v] || "";
        S.pinAttempts = v === "incorrect" ? 2 : 3;
        if (v === "too-many") startTimer(S, "pinLock", 300);
        break;
      case "device": if (v === "pending") startTimer(S, "deviceCode", 600); break;
      case "transit": S.transit = { title: "Opening Spice Trail workspace", sub: "Loading outlets, menus and permissions" }; break;
      case "app":
        S.nav = "home"; S.via = "web"; S.collapsed = S.device === "tablet"; S.prefCollapsed = S.collapsed;
        S.appState = R.CONN[v] ? v : "online";
        if (v === "collapsed") S.collapsed = S.prefCollapsed = true;
        if (v === "outlet-menu") S.menu = "outlet";
        if (v === "profile-menu") S.menu = "profile-side";
        if (v === "denied") { S.via = "pin"; S.user = 0; S.nav = "reports"; }
        if (v === "signout") S.modal = "signout";
        if (v === "signout-offline") { S.modal = "signout"; S.appState = "offline"; }
        if (["pos", "pos-empty", "pay", "paid"].includes(v)) { S.nav = "pos"; S.collapsed = true; }
        if (v === "pos-empty") S.cart = [];
        if (v === "pay") { S.modal = "pay"; S.pay = { method: "upi", stage: "choose" }; }
        if (v === "paid") { S.modal = "pay"; S.pay = { method: "upi", stage: "done" }; }
        break;
    }
    return S;
  }

  let S = base();
  let seq = 0, booted = false, currentView = "prototype";
  const later = (ms, fn) => { const t = seq; setTimeout(() => { if (t === seq) fn(); }, ms); };

  /* ---------- Stage ---------- */
  const stage = $("#stage");
  const frame = document.createElement("div");
  stage.appendChild(frame);
  function fit() {
    const W = S.device === "tablet" ? 1280 : 1440, H = S.device === "tablet" ? 800 : 900;
    const s = Math.min(1, stage.clientWidth / W);
    frame.style.transform = `scale(${s})`;
    frame.style.left = `${Math.max(0, Math.round((stage.clientWidth - W * s) / 2))}px`;
    stage.style.height = `${Math.round(H * s)}px`;
    $("#stage-size").textContent = `${W} × ${H} · ${Math.round(s * 100)}%`;
  }
  new ResizeObserver(fit).observe(stage);

  function render(opt = {}) {
    const active = document.activeElement;
    const keepId = opt.focus !== undefined ? opt.focus : frame.contains(active) && active.id ? active.id : null;
    frame.className = "rv-frame" + (S.device === "tablet" ? " is-tablet" : "");
    frame.setAttribute("data-rv-theme", S.theme);
    frame.innerHTML = R.frameInner(S);
    fit();
    if (booted && currentView === "prototype") {
      const t = (keepId && frame.querySelector("#" + CSS.escape(keepId))) || frame.querySelector(".rv-modal .rv-btn--primary:not(:disabled), .rv-modal .rv-btn") || frame.querySelector("[data-autofocus]:not([disabled])");
      if (t) { t.focus({ preventScroll: true }); if (t.tagName === "INPUT" && !["email", "search"].includes(t.type)) { try { t.setSelectionRange(t.value.length, t.value.length); } catch (_) {} } }
    }
    syncControls();
  }
  function go(screen, v) { seq++; S.screen = screen; S.v = v; S.modal = null; S.menu = null; render({ focus: null }); }
  function jump(screen, v) {
    seq++;
    S = Object.assign(base(), { device: S.device, theme: S.theme, scen: S.scen });
    preset(S, screen, v);
    const focusEmail = screen === "login" && v === "focus";
    if (focusEmail) S.v = "default";
    render({ focus: null });
    if (focusEmail) frame.querySelector("#email")?.focus({ preventScroll: true });
  }
  function toast(msg) {
    frame.querySelector(".toast")?.remove();
    frame.insertAdjacentHTML("beforeend", `<div class="toast" role="status">${ic("circle-check")}${esc(msg)}</div>`);
    const el = frame.querySelector(".toast");
    setTimeout(() => el?.remove(), 2400);
  }
  function signedIn(title, sub) {
    S.transit = { title, sub }; go("transit", "signin");
    later(1300, () => {
      S.appState = S.network === "offline" ? "offline" : "online";
      S.collapsed = S.prefCollapsed = S.device === "tablet";
      if (S.via === "pin") { S.nav = "pos"; S.collapsed = true; S.cart = R.START_CART(); } else S.nav = "home";
      go("app", S.nav);
    });
  }
  function startMfa() { S.otp = ["", "", "", "", "", ""]; S.mfaAttempts = 3; startTimer(S, "mfaExpire", 300); startTimer(S, "mfaResend", 30); }
  const ssoValid = (v) => emailOk(v) || /^[a-z0-9][a-z0-9-]{2,}$/i.test(v.trim());

  /* ---------- Actions ---------- */
  const A = {
    help() { S.menu = null; S.modal = "help"; render(); },
    closeModal() { S.modal = null; render({ focus: null }); },
    togglePw() { S.showPw = !S.showPw; render({ focus: "password" }); },

    submitLogin() {
      if (S.v === "locked") return;
      if (S.network === "offline") { S.v = "offline"; return render({ focus: null }); }
      if (!emailOk(S.email) || !S.password) return;
      S.v = "loading"; render({ focus: null });
      later(1000, () => {
        const r = S.scen.login;
        if (r === "invalid") { S.attemptsLeft--; S.password = ""; S.v = S.attemptsLeft <= 0 ? "locked" : "invalid"; return render({ focus: S.v === "invalid" ? "password" : null }); }
        if (r === "locked") { S.v = "locked"; S.password = ""; return render({ focus: null }); }
        if (r === "error") { S.v = "service-error"; return render({ focus: null }); }
        S.via = "web"; S.attemptsLeft = 3;
        if (r === "mfa") { S.v = "mfa-required"; render({ focus: null }); return later(1000, () => { S.password = ""; startMfa(); go("mfa", "default"); }); }
        S.password = ""; signedIn("Opening Spice Trail workspace", "Loading outlets, menus and permissions");
      });
    },
    submitForgot() {
      if (!emailOk(S.forgotEmail)) { S.v = "invalid-email"; return render({ focus: "forgotEmail" }); }
      S.v = "loading"; render({ focus: null });
      later(900, () => {
        const r = S.network === "offline" ? "error" : S.scen.forgot;
        if (r === "sent") { startTimer(S, "resend", 30); S.v = "sent"; } else S.v = r === "unknown" ? "unknown" : "service-error";
        render({ focus: S.v === "unknown" ? "forgotEmail" : null });
      });
    },
    resendReset() { startTimer(S, "resend", 30); render({ focus: null }); toast("Reset email sent again"); },
    submitSso() {
      if (!ssoValid(S.ssoId)) { S.v = "invalid"; return render({ focus: "ssoId" }); }
      S.v = "loading"; render({ focus: null });
      later(900, () => {
        const r = S.scen.sso;
        if (r === "not-configured") { S.v = "not-configured"; return render({ focus: null }); }
        S.v = "redirecting"; render({ focus: null });
        later(1400, () => { S.v = "waiting"; render({ focus: null });
          later(1400, () => { if (r === "denied") { S.v = "denied"; return render({ focus: null }); } S.via = "web"; signedIn(`Opening ${R.orgFrom(S.ssoId)} workspace`, "Signed in with single sign-on"); }); });
      });
    },
    cancelSso() { go("sso", "default"); },
    verify() {
      if (!S.otp.every(Boolean) || S.v === "verifying") return;
      S.v = "verifying"; render({ focus: null });
      later(800, () => {
        const r = S.scen.mfa;
        if (r === "accept") { S.v = "success"; render({ focus: null }); return later(1000, () => signedIn("Opening Spice Trail workspace", "Identity verified")); }
        if (r === "expired") { S.v = "expired"; return render({ focus: null }); }
        S.mfaAttempts--; S.v = S.mfaAttempts <= 0 ? "too-many" : "incorrect"; render({ focus: S.v === "incorrect" ? "otp-0" : null });
      });
    },
    resendOtp() { startMfa(); S.v = "default"; render({ focus: "otp-0" }); toast("New code sent"); },
    sendMethod() { S.mfaMethod = S.mfaPick; startMfa(); S.v = "default"; render({ focus: "otp-0" }); toast(S.mfaPick === "app" ? "Open your authenticator app" : "Code sent"); },

    pinKey(d) {
      if (["too-many", "locked", "unauthorized", "success", "verifying"].includes(S.v)) return;
      if (S.v === "incorrect") S.pin = "";
      if (S.pin.length < 4) S.pin += d;
      S.v = S.pin.length ? "entering" : "default";
      render({ focus: null });
      if (S.pin.length === 4) later(160, () => A.pinSubmit());
    },
    pinBack() { if (S.v === "incorrect") S.pin = ""; S.pin = S.pin.slice(0, -1); S.v = S.pin.length ? "entering" : "default"; render({ focus: null }); },
    pinClear() { S.pin = ""; S.v = "default"; render({ focus: null }); },
    pinSubmit() {
      if (S.pin.length < 4 || S.v !== "entering") return;
      if (S.scen.pin === "unauthorized") { S.v = "unauthorized"; S.pin = ""; return render({ focus: null }); }
      if (S.scen.pin === "locked") { S.v = "locked"; S.pin = ""; return render({ focus: null }); }
      S.v = "verifying"; render({ focus: null });
      later(500, () => {
        if (S.pin === R.DEMO_PIN) { S.v = "success"; render({ focus: null }); return later(800, () => { S.via = "pin"; signedIn("Opening POS", `${R.STAFF[S.user].n} · Cashier Terminal 01`); }); }
        S.pinAttempts--;
        if (S.pinAttempts <= 0) { S.v = "too-many"; S.pin = ""; startTimer(S, "pinLock", 300); } else S.v = "incorrect";
        render({ focus: null });
      });
    },
    selectUser(i) { seq++; S.user = i; S.pin = ""; S.pinAttempts = 3; S.v = "default"; delete S.timers.pinLock; render({ focus: null }); },
    switchUser() { A.selectUser((S.user + 1) % R.STAFF.length); },

    requestDevice() { if (!S.devName.trim()) return; startTimer(S, "deviceCode", 600); S.v = "pending"; render({ focus: null }); },
    approve() { if (S.screen === "device" && S.v === "pending") { S.v = "paired"; render({ focus: null }); } },
    reject() { if (S.screen === "device" && S.v === "pending") { S.v = "rejected"; render({ focus: null }); } },
    toPin() { S.scen.pin = "check"; $("#sc-pin").value = "check"; S.pin = ""; S.pinAttempts = 3; go("pin", "default"); },
    copyId() { const done = () => toast("Device ID copied"); try { navigator.clipboard.writeText("RSV-WIN-7F3A-92C1").then(done, done); } catch (_) { done(); } },

    // shell
    toggleSide() {
      S.collapsed = !S.collapsed;
      if (S.nav !== "pos") S.prefCollapsed = S.collapsed;
      S.menu = null;
      const shell = frame.querySelector(".shell");
      if (!shell) return render();
      frame.querySelector(".pop")?.remove();
      shell.classList.toggle("is-collapsed", S.collapsed);
      const t = frame.querySelector(".side__toggle");
      t.innerHTML = ic(S.collapsed ? "chevron-right" : "chevron-left");
      t.setAttribute("aria-label", S.collapsed ? "Expand sidebar" : "Collapse sidebar");
      t.setAttribute("aria-expanded", String(!S.collapsed));
    },
    nav(id) { S.menu = null; S.nav = id; S.collapsed = id === "pos" ? true : S.prefCollapsed; render({ focus: null }); },
    navHome() { A.nav("home"); },
    newOrder() { S.cart = []; S.query = ""; S.orderType = "dine"; A.nav("pos"); toast("New order started"); },
    toggleOutlet() { S.menu = S.menu === "outlet" ? null : "outlet"; render({ focus: null }); },
    openOutlet() { S.menu = "outlet"; render({ focus: null }); },
    profileSide() { S.menu = S.menu === "profile-side" ? null : "profile-side"; render({ focus: null }); },
    profileTop() { S.menu = S.menu === "profile-top" ? null : "profile-top"; render({ focus: null }); },
    closeMenu() { S.menu = null; render({ focus: null }); },
    signout() { S.menu = null; S.modal = "signout"; render({ focus: null }); },
    confirmSignout() { S.password = ""; S.pin = ""; if (S.via === "pin") go("pin", "default"); else go("login", "signed-out"); },
    retrySync() { S.appState = "syncing"; render({ focus: null }); later(1500, () => { S.appState = "synced"; render({ focus: null }); }); },
    resolveConflict() { A.retrySync(); },

    // POS
    sendKot() { S.cart.forEach((l) => (l.sent = true)); render({ focus: null }); toast("KOT #1043 sent to kitchen"); },
    holdOrder() { toast("Order held · find it in Tables & Orders"); },
    openPay() { S.modal = "pay"; S.pay = { method: "upi", stage: "choose" }; render({ focus: null }); },
    charge() { S.pay.stage = "processing"; render({ focus: null }); later(1400, () => { S.pay.stage = "done"; render({ focus: null }); }); },
    finishPay() { S.cart = []; S.modal = null; render({ focus: null }); toast("Table 07 settled and released"); },

    // simulation
    simOffline() { setNetwork("offline"); },
    simOnline() { setNetwork("online"); },
    simFail() { S.appState = "failed"; render({ focus: null }); },
    simConflict() { S.appState = "conflict"; render({ focus: null }); },
    simDenied() { S.via = "pin"; S.user = 0; S.nav = "reports"; S.collapsed = S.prefCollapsed; render({ focus: null }); },
    simExpire() { S.password = ""; go("login", "session-expired"); },
  };

  function goFrom(s, v) {
    if (s === "forgot" && emailOk(S.email) && !S.forgotEmail) S.forgotEmail = S.email;
    if (s === "sso" && !S.ssoId && emailOk(S.email)) S.ssoId = S.email;
    if (s === "login") { S.password = ""; S.showPw = false; if (S.network === "offline") v = "offline"; }
    if (s === "pin") { S.pin = ""; if (S.pinAttempts <= 0) S.pinAttempts = 3; }
    if (s === "mfa" && v === "methods") S.mfaPick = S.mfaMethod;
    if (s === "mfa" && v === "default" && S.screen === "mfa") { S.v = "default"; return render({ focus: "otp-0" }); }
    go(s, v);
  }
  function setNetwork(n) {
    S.network = n;
    if (S.screen === "app") {
      if (n === "offline") S.appState = "offline";
      else if (S.appState === "offline") { S.appState = "syncing"; later(1600, () => { S.appState = "synced"; render({ focus: null }); }); }
    }
    if (S.screen === "login") {
      if (n === "offline" && ["default", "service-error"].includes(S.v)) S.v = "offline";
      if (n === "online" && S.v === "offline") S.v = "default";
    }
    render();
  }

  /* ---------- Frame events ---------- */
  function ctaOk() {
    switch (S.screen) {
      case "login": return emailOk(S.email) && S.password.length > 0 && S.v !== "locked";
      case "forgot": return !!S.forgotEmail.trim();
      case "sso": return !!S.ssoId.trim();
      case "device": return !!S.devName.trim();
      case "mfa": return S.otp.every(Boolean);
    }
    return true;
  }
  function setEmailError(show) {
    const input = frame.querySelector("#email"); if (!input) return;
    const wrap = input.closest(".rv-field"), box = wrap.querySelector(".rv-input"), existing = wrap.querySelector("#email-err");
    if (show && !existing) { box.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "email-err"); box.insertAdjacentHTML("afterend", `<div class="rv-hint is-error" id="email-err">${ic("circle-alert")}<span>Enter a work email, like name@company.com.</span></div>`); }
    if (!show && existing) { existing.remove(); input.removeAttribute("aria-describedby"); if (S.v !== "invalid") { box.classList.remove("is-error"); input.removeAttribute("aria-invalid"); } }
  }
  function refreshPosGrid() {
    const g = frame.querySelector(".pos-grid"); if (!g) return;
    g.innerHTML = R.posGrid(S);
    frame.querySelectorAll("[data-cat]").forEach((b) => b.classList.toggle("is-active", !S.query && b.dataset.cat === S.cat));
  }

  frame.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.otp !== undefined) return onOtpInput(t);
    if (t.id === "posSearch") { S.query = t.value; return refreshPosGrid(); }
    if (["email", "password", "forgotEmail", "ssoId", "devName"].includes(t.id)) {
      S[t.id] = t.value;
      if (t.id === "email" && S.emailTouched && emailOk(S.email)) setEmailError(false);
      const cta = frame.querySelector("[data-cta]");
      if (cta && !cta.classList.contains("is-loading")) cta.disabled = !ctaOk();
    }
  });
  frame.addEventListener("focusout", (e) => { if (e.target.id === "email" && S.screen === "login") { S.emailTouched = true; setEmailError(!!S.email && !emailOk(S.email)); } });
  frame.addEventListener("submit", (e) => { e.preventDefault(); ({ login: A.submitLogin, forgot: A.submitForgot, sso: A.submitSso, mfa: A.verify })[e.target.dataset.form]?.(); });
  frame.addEventListener("click", (e) => {
    if (S.menu && !e.target.closest(".anchor")) { S.menu = null; render({ focus: null }); if (!e.target.closest("[data-nav],[data-act],[data-add],[data-cat]")) return; }
    const el = e.target.closest("[data-go],[data-act],[data-key],[data-nav],[data-method],[data-user],[data-outlet],[data-add],[data-inc],[data-dec],[data-cat],[data-otype],[data-pay]");
    if (!el || el.disabled) return;
    const d = el.dataset;
    if (d.go) { const [s, v] = d.go.split("/"); return goFrom(s, v); }
    if (d.key !== undefined) return A.pinKey(d.key);
    if (d.nav) return A.nav(d.nav);
    if (d.method) { S.mfaPick = d.method; return render({ focus: null }); }
    if (d.user !== undefined) return A.selectUser(+d.user);
    if (d.outlet !== undefined) { S.outlet = +d.outlet; S.menu = null; render({ focus: null }); return toast(`Switched to ${R.OUTLETS[S.outlet].n}`); }
    if (d.add) { const line = S.cart.find((l) => l.id === d.add && !l.sent); if (line) line.qty++; else S.cart.push({ id: d.add, qty: 1, sent: false }); return render({ focus: null }); }
    if (d.inc !== undefined) { S.cart[+d.inc].qty++; return render({ focus: null }); }
    if (d.dec !== undefined) { const l = S.cart[+d.dec]; l.qty--; if (!l.qty) S.cart.splice(+d.dec, 1); return render({ focus: null }); }
    if (d.cat) { S.cat = d.cat; S.query = ""; return render({ focus: null }); }
    if (d.otype) { S.orderType = d.otype; return render({ focus: null }); }
    if (d.pay) { S.pay.method = d.pay; return render({ focus: null }); }
    A[d.act]?.(el);
  });

  function paintOtp(focusIdx) {
    frame.querySelectorAll("[data-otp]").forEach((c) => { const i = +c.dataset.otp; c.value = S.otp[i]; c.classList.toggle("is-filled", !!S.otp[i]); });
    const cta = frame.querySelector("[data-cta]"); if (cta) cta.disabled = !ctaOk();
    if (focusIdx !== undefined) frame.querySelector(`#otp-${focusIdx}`)?.focus();
  }
  function onOtpInput(t) {
    let i = +t.dataset.otp; const digits = t.value.replace(/\D/g, ""); let rerender = false;
    if (S.v === "incorrect") { S.otp = ["", "", "", "", "", ""]; S.v = "default"; i = 0; rerender = true; }
    if (!digits) S.otp[i] = "";
    for (let k = 0; k < digits.length && i + k < 6; k++) S.otp[i + k] = digits[k];
    const next = Math.min(i + digits.length, 5);
    if (rerender) render({ focus: `otp-${digits ? next : 0}` }); else paintOtp(digits ? next : i);
    if (digits && S.otp.every(Boolean)) A.verify();
  }
  frame.addEventListener("keydown", (e) => {
    const t = e.target; if (t.dataset?.otp === undefined) return;
    const i = +t.dataset.otp;
    if (e.key === "Backspace" && !t.value && i > 0) { e.preventDefault(); S.otp[i - 1] = ""; paintOtp(i - 1); }
    if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); frame.querySelector(`#otp-${i - 1}`)?.focus(); }
    if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); frame.querySelector(`#otp-${i + 1}`)?.focus(); }
  });
  document.addEventListener("keydown", (e) => {
    if (currentView !== "prototype" || S.modal) return;
    if (e.key === "Escape" && S.menu) { S.menu = null; return render({ focus: null }); }
    if (e.target.matches("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (S.screen === "pin") {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); S.pressed = +e.key; A.pinKey(e.key); setTimeout(() => { S.pressed = null; frame.querySelector(".rv-key.is-pressed")?.classList.remove("is-pressed"); }, 140); }
      else if (e.key === "Backspace") { e.preventDefault(); A.pinBack(); }
      else if (e.key === "Escape") A.pinClear();
    }
    if (S.screen === "app") {
      if (e.key === "/" && S.nav === "pos") { e.preventDefault(); frame.querySelector("#posSearch")?.focus(); }
      if (e.key.toLowerCase() === "n" && !e.target.closest(".controls")) { e.preventDefault(); A.newOrder(); }
      if (e.key === "[") A.toggleSide();
    }
  });

  setInterval(() => {
    frame.querySelectorAll("[data-timer]").forEach((el) => { el.textContent = fmt(remaining(S, el.dataset.timer)); });
    for (const name of Object.keys(S.timers)) {
      if (S.fired[name] || remaining(S, name) > 0) continue;
      S.fired[name] = true;
      if (name === "resend" && S.screen === "forgot") render();
      if (name === "mfaResend" && S.screen === "mfa") render();
      if (name === "mfaExpire" && S.screen === "mfa" && ["default", "incorrect"].includes(S.v)) { S.v = "expired"; render({ focus: null }); }
      if (name === "pinLock" && S.screen === "pin" && S.v === "too-many") { S.pinAttempts = 3; S.v = "default"; render({ focus: null }); }
      if (name === "deviceCode" && S.screen === "device" && S.v === "pending") { S.v = "start"; render({ focus: null }); toast("Pairing code expired. Request a new one."); }
    }
  }, 1000);

  /* ---------- Controls ---------- */
  const SIM = {
    login: () => `<p class="hint">Any work email and password. The result follows <b>Sign-in result</b>; three invalid attempts lock the account.</p>`,
    forgot: () => `<p class="hint">Any valid email. The result follows <b>Reset email</b>.</p>`,
    sso: () => `<p class="hint">Try <code>${E}</code> or <code>spice-trail</code>.</p>`,
    mfa: () => `<p class="hint">Type or paste 6 digits. The sixth digit verifies automatically.</p>`,
    pin: () => `<p class="hint">Demo PIN <code>${R.DEMO_PIN}</code>. Tap or type; the fourth digit submits. Three misses pause entry for 5 minutes.</p>`,
    device: () => S.v === "pending" ? `<p class="hint">Act as the administrator in Admin › Devices.</p><div class="row">${btn({ v: "black", size: "sm", label: "Approve", icon: "check", act: "approve" })}${btn({ v: "danger", size: "sm", label: "Reject", icon: "x", act: "reject" })}</div>` : `<p class="hint">Request authorization to generate a pairing code.</p>`,
    transit: () => `<p class="hint">Loading the workspace…</p>`,
    app: () => `<p class="hint">Collapse the sidebar with its edge button or <span class="rv-kbd">[</span>. <span class="rv-kbd">N</span> starts a new order, <span class="rv-kbd">/</span> searches in POS.</p>
      <div class="row">${btn({ v: "secondary", size: "sm", label: "Offline", icon: "wifi-off", act: "simOffline" })}${btn({ v: "secondary", size: "sm", label: "Back online", icon: "wifi", act: "simOnline" })}</div>
      <div class="row">${btn({ v: "secondary", size: "sm", label: "Sync fails", icon: "circle-x", act: "simFail" })}${btn({ v: "secondary", size: "sm", label: "Conflict", icon: "git-compare-arrows", act: "simConflict" })}</div>
      <div class="row">${btn({ v: "secondary", size: "sm", label: "Cashier, no access", icon: "lock-keyhole", act: "simDenied" })}${btn({ v: "secondary", size: "sm", label: "Expire session", icon: "timer", act: "simExpire" })}</div>`,
  };
  const SCREEN_NAME = { login: "PA-01 Login", forgot: "Forgot password", sso: "PA-02 SSO", mfa: "PA-03 MFA", pin: "PA-04 POS PIN", device: "PA-05 Device binding", transit: "PA-06 Session", app: "Application shell" };
  function currentKey() {
    if (S.screen !== "app") return `${S.screen}/${S.v}`;
    if (S.modal === "signout") return S.appState === "offline" ? "app/signout-offline" : "app/signout";
    if (S.modal === "pay") return S.pay.stage === "done" ? "app/paid" : "app/pay";
    if (S.nav === "pos") return S.cart.length ? "app/pos" : "app/pos-empty";
    if (S.via === "pin" && ["reports", "admin", "devices"].includes(S.nav)) return "app/denied";
    if (S.menu === "outlet") return "app/outlet-menu";
    if (S.menu) return "app/profile-menu";
    if (S.appState !== "online") return `app/${S.appState}`;
    return S.collapsed ? "app/collapsed" : "app/home";
  }
  function buildControls() {
    const sel = (id, label, opts, val) => `<label class="sel" for="${id}">${label}<select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? " selected" : ""}>${l}</option>`).join("")}</select></label>`;
    $("#controls").innerHTML = `
      <div class="ctl"><h3>Viewport</h3>
        <div class="rv-seg" data-ctl="device"><button type="button" data-val="desktop">${ic("monitor")}Desktop</button><button type="button" data-val="tablet">${ic("tablet")}Tablet</button></div>
        <h3>Network</h3>
        <div class="rv-seg" data-ctl="network"><button type="button" data-val="online">${ic("wifi")}Online</button><button type="button" data-val="offline">${ic("wifi-off")}Offline</button></div>
      </div>
      <div class="ctl ctl--sim"><h3>This screen <span id="sim-name"></span></h3><div id="sim" class="sim"></div></div>
      <div class="ctl"><h3>Outcomes</h3>
        ${sel("sc-login", "Sign-in result", [["mfa", "MFA required"], ["success", "Success, no MFA"], ["invalid", "Invalid credentials"], ["locked", "Account locked"], ["error", "Service error"]], S.scen.login)}
        ${sel("sc-forgot", "Reset email", [["sent", "Email sent"], ["unknown", "Unknown email"], ["error", "Service error"]], S.scen.forgot)}
        ${sel("sc-sso", "SSO result", [["redirect", "Redirect and sign in"], ["not-configured", "SSO not set up"], ["denied", "IdP declines"]], S.scen.sso)}
        ${sel("sc-mfa", "MFA code", [["accept", "Correct"], ["incorrect", "Incorrect"], ["expired", "Expired"]], S.scen.mfa)}
        ${sel("sc-pin", "PIN login", [["check", "Check demo PIN"], ["locked", "PIN locked"], ["unauthorized", "Device not authorized"]], S.scen.pin)}
      </div>
      <div class="ctl"><h3>Jump to state ${btn({ v: "text", label: "Restart", icon: "rotate-ccw", attrs: 'id="restart"' })}</h3>
        <div class="jump">${STATES.map((g) => `<div class="jump__g"><div class="jump__h"><span class="rv-badge rv-badge--outline">${g.id}</span>${g.g}</div><div class="jump__list">${g.items.map(([s, v, l]) => `<button type="button" data-jump="${s}/${v}">${l}</button>`).join("")}</div></div>`).join("")}</div>
      </div>`;
    $("#controls").addEventListener("click", (e) => {
      const seg = e.target.closest("[data-ctl] button");
      if (seg) {
        const ctl = seg.parentElement.dataset.ctl;
        if (ctl === "device") { S.device = seg.dataset.val; if (S.screen === "app" && S.nav !== "pos") S.collapsed = S.prefCollapsed = S.device === "tablet"; render({ focus: null }); }
        if (ctl === "network") setNetwork(seg.dataset.val);
        return;
      }
      const j = e.target.closest("[data-jump]");
      if (j) { const [s, v] = j.dataset.jump.split("/"); return jump(s, v); }
      if (e.target.closest("#restart")) return jump("login", "default");
      const a = e.target.closest("[data-act]");
      if (a && !a.disabled) A[a.dataset.act]?.();
    });
    $("#controls").addEventListener("change", (e) => { const k = e.target.id.replace("sc-", ""); if (k in S.scen) S.scen[k] = e.target.value; });
  }
  function syncControls() {
    document.querySelectorAll('[data-ctl="device"] button').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.val === S.device)));
    document.querySelectorAll('[data-ctl="network"] button').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.val === S.network)));
    const key = currentKey();
    document.querySelectorAll("[data-jump]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.jump === key)));
    const simKey = S.screen + (S.screen === "device" ? S.v : "");
    const sim = $("#sim");
    if (sim && sim.dataset.k !== simKey) { sim.innerHTML = SIM[S.screen](); sim.dataset.k = simKey; }
    $("#sim-name").textContent = SCREEN_NAME[S.screen];
    $("#stage-title").textContent = SCREEN_NAME[S.screen];
    const label = STATES.flatMap((g) => g.items).find(([s, v]) => `${s}/${v}` === key);
    $("#stage-state").textContent = label ? label[2] : "";
  }

  /* ---------- State board ---------- */
  function buildBoard() {
    const card = (s, v, l, device, theme) => {
      const st = preset(Object.assign(base(), { device, theme }), s, v);
      return `<div class="board-card" data-board="${s}/${v}" data-device="${device}" data-theme="${theme}"><div class="board-thumb">${R.frameHTML(st)}</div><div class="board-cap"><span>${l}</span>${btn({ v: "text", label: "Open", iconR: "arrow-right" })}</div></div>`;
    };
    const group = (id, title, sub, items, device, theme) => `<section class="board-group"><h2><span class="rv-badge rv-badge--orange">${id}</span>${title}<span class="c">${sub}</span></h2><div class="board-grid">${items.map(([s, v, l]) => card(s, v, l, device, theme)).join("")}</div></section>`;
    $("#board").innerHTML =
      STATES.map((g) => group(g.id, g.g, `${g.items.length} states`, g.items, "desktop", "light")).join("") +
      group("1280×800", "Tablet and Android POS", "Touch layout, not a scaled desktop", TABLET_SET, "tablet", "light") +
      group("DARK", "Dark theme variant", "Same components, dark tokens", DARK_SET, "desktop", "dark");
    scaleThumbs();
  }
  $("#board").addEventListener("click", (e) => {
    const c = e.target.closest("[data-board]"); if (!c) return;
    const [s, v] = c.dataset.board.split("/");
    S.device = c.dataset.device; S.theme = c.dataset.theme; applyTheme();
    setView("prototype"); jump(s, v); window.scrollTo({ top: 0 });
  });
  function scaleThumbs() {
    document.querySelectorAll(".board-thumb").forEach((t) => { const f = t.firstElementChild; if (f) t.style.setProperty("--thumb-scale", String(t.clientWidth / (f.classList.contains("is-tablet") ? 1280 : 1440))); });
  }
  new ResizeObserver(() => scaleThumbs()).observe(document.body);

  /* ---------- Foundations ---------- */
  const sec = (title, sub, body) => `<section class="sec"><div class="sec__h"><h2>${title}</h2><p>${sub}</p></div>${body}</section>`;
  const spec = (title, small, body, cls = "") => `<div class="spec ${cls}"><h3>${title}${small ? `<small>${small}</small>` : ""}</h3>${body}</div>`;
  function buildFoundations() {
    const tokens = [
      ["bg", "#F7F6F2", "#0B0B0B", "App canvas, content background"], ["surface", "#FFFFFF", "#141414", "Cards, forms, sidebar, navbar"], ["surface-2", "#F2F1ED", "#1B1B1B", "Secondary surface, hover, wells"],
      ["border", "#E5E3DE", "#292929", "Default 1px border"], ["ink", "#171717", "#F5F5F5", "Text, icons, headings"], ["ink-2", "#666666", "#B5B5B5", "Secondary text"], ["ink-3", "#929292", "#999999", "Muted text, metadata"],
      ["orange", "#FF6A00", "#FF6A00", "CTA, active, focus, progress"], ["orange-hover", "#E85F00", "#FF7A1A", "Primary hover"], ["orange-soft", "#FFF0E5", "rgba(255,106,0,.12)", "Active nav, selected rows"], ["orange-ink", "#B34A00", "#FF8A3D", "Orange text on light (5.4:1)"],
      ["success", "#16A34A", "#22C55E", "Online, paid, approved"], ["warning", "#F59E0B", "#F59E0B", "Offline, conflict, pending"], ["error", "#DC2626", "#EF4444", "Failed, rejected, restricted"], ["info", "#2563EB", "#60A5FA", "Accepted, reserved, notices"],
    ];
    const sw = (c) => `<span class="tok-sw" style="background:${c}"></span><code>${c}</code>`;
    const principles = [["Calm", "Neutral canvas, white surfaces, one accent."], ["Fast", "Fewest taps to bill. Keypad, keyboard and shortcuts."], ["Precise", "Tight spacing, aligned numbers, 1px borders."], ["Premium", "Quality comes from type and spacing, not effects."], ["Operational", "Status is always visible. States are shown in words and shape, not color alone."]];
    const icons = ["house", "monitor", "layout-grid", "chef-hat", "bike", "book-open", "chart-column-big", "cpu", "shield", "life-buoy", "bell", "circle-help", "store", "search", "plus", "receipt", "send", "banknote", "qr-code", "credit-card", "wifi", "wifi-off", "refresh-cw", "git-compare-arrows", "circle-check", "circle-alert", "triangle-alert", "circle-x", "lock-keyhole", "log-out"];
    const sections = [["00", "Foundations / Design System", "now"], ["01", "Authentication", "now"], ["02", "POS", "now"], ["03", "Tables & Orders"], ["04", "Kitchen / KOT"], ["05", "Menu"], ["06", "Online Orders"], ["07", "Reports"], ["08", "Platform / Admin"], ["09", "Devices"], ["10", "Onboarding & Migration"], ["11", "Support"], ["12", "Subscription"], ["13", "Prototypes", "now"], ["14", "Edge Cases & System States", "part"]];
    $("#foundations").innerHTML = `
      <div class="sheet-intro"><span class="rv-badge rv-badge--orange">00</span><h1>Foundations</h1><p>Light first, black for structure, orange as the signature. Tokens live in <code>prototype/tokens.css</code>; the dark theme redefines the same names, so every component works in both. Use the theme switch at the top to check.</p></div>
      <div class="sheet">
        ${sec("Principles", "Less decoration, more product", `<div class="principles">${principles.map(([t, d]) => `<div class="principle"><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>`)}
        ${sec("Color", "Approximate screen ratio: 70% light neutral, 20% white, 8% black, 2% orange", `
          <div class="ratio"><div class="ratio__bar"><i style="width:70%;background:#F7F6F2"></i><i style="width:20%;background:#FFFFFF"></i><i style="width:8%;background:#171717"></i><i style="width:2%;background:#FF6A00"></i></div>
          <div class="ratio__legend"><span>Neutral 70%</span><span>White 20%</span><span>Black 8%</span><span class="o">Orange 2%</span></div></div>
          <div class="table-wrap"><table class="rv-table tok-table"><thead><tr><th>Token</th><th>Light (primary)</th><th>Dark (variant)</th><th>Use</th></tr></thead><tbody>
          ${tokens.map(([t, l, d, u]) => `<tr><td class="mono">--${t}</td><td>${sw(l)}</td><td>${sw(d)}</td><td class="sub">${u}</td></tr>`).join("")}
          </tbody></table></div>
          <div class="dodont"><div class="do"><h3>Orange is for</h3><ul><li>The one primary action per view</li><li>Active navigation and selected items</li><li>Focus rings and the active OTP digit</li><li>Progress, small status dots, new-item counts</li><li>A metric that needs action, like pending approvals</li></ul></div>
          <div><h3>Black is for</h3><ul><li>Text, icons and headings</li><li>Secondary actions that still need weight: Send KOT, Approve, New order</li><li>Tooltips and the selected category chip</li></ul><h3 style="margin-top:14px">Keep orange off</h3><ul><li>Backgrounds, cards and large fills</li><li>Errors and warnings (use semantic colors)</li><li>Body text: use orange-ink when orange must be text</li></ul></div></div>`)}
        ${sec("Typography", "Inter for interface text, Manrope for headings and numbers, JetBrains Mono for codes", `<div class="type-rows">
          ${[["Page title", "Manrope 700 · 28/1.1", `<span style="font:700 28px/1.1 var(--font-display);letter-spacing:-0.025em">Good evening, Sana</span>`], ["Auth heading", "Manrope 700 · 32/1.1", `<span style="font:700 32px/1.1 var(--font-display);letter-spacing:-0.03em">Welcome back</span>`],
             ["Section heading", "Manrope 700 · 18–22", `<span style="font:700 20px/1.2 var(--font-display)">Pending approvals</span>`], ["Body", "Inter 400 · 14–15/1.5", `<span style="font:400 15px/1.5 var(--font-ui);color:var(--ink-2)">Sign in to your Rasova workspace.</span>`],
             ["Navigation", "Inter 500 · 13.5", `<span style="font:500 13.5px var(--font-ui)">Tables &amp; Orders</span>`], ["Label", "Inter 500 · 13", `<span style="font:500 13px var(--font-ui)">Work email</span>`], ["Metadata", "Inter 400 · 12", `<span style="font:400 12px var(--font-ui);color:var(--ink-3)">Synced 12 sec ago</span>`],
             ["Section label", "Inter 600 · 10.5 caps +12%", `<span style="font:600 10.5px var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)">Operate</span>`], ["KPI", "Manrope 800 · 28 tabular", `<span class="rv-kpi__value">₹84,520</span>`], ["Mono", "JetBrains Mono 500 · 12–13", `<span style="font:500 13px var(--font-mono)">#A-1042 · KOT #1041 · MN-02</span>`]]
            .map(([n, s, x]) => `<div class="type-row"><div class="spec-l"><b>${n}</b>${s}</div><div class="sample">${x}</div></div>`).join("")}</div>`)}
        ${sec("Space, grid, radius, elevation", "4px base · 8–10px controls · 10–14px cards and dialogs", `<div class="spec-grid">
          ${spec("Spacing", "4px base", `<div class="scale-rows">${[4, 8, 12, 16, 20, 24, 32, 40, 48].map((p, i) => `<div class="scale-row"><span>s-${[1, 2, 3, 4, 5, 6, 8, 10, 12][i]}</span><span>${p}</span><i style="width:${p * 2.4}px"></i></div>`).join("")}</div>`)}
          ${spec("Grid", "desktop · tablet", `<div class="grid-demo"><div class="gd-side">248</div><div class="gd-main"><div class="gd-nav">Navbar 64</div><div class="gd-cols">${Array(12).fill("<i></i>").join("")}</div></div></div><p class="spec-p">Desktop 1440: sidebar 248 (76 collapsed), 12 columns, 12px gutter, 28px page margin. Tablet 1280: rail 76, 8 columns, 20px margin, 56px touch targets.</p>`)}
          ${spec("Radius", "", `<div class="radii">${[[4, "Badges"], [6, "Small controls"], [8, "Buttons, inputs"], [10, "Cards"], [14, "Modals, drawers"]].map(([r, l]) => `<div class="radius-s" style="border-radius:${r}px"><b>${r}px</b>${l}</div>`).join("")}</div>`)}
          ${spec("Elevation", "very subtle", `<div class="elev">${[["xs", "Cards"], ["sm", "Selected seg"], ["md", "Tooltips"], ["lg", "Menus, modals"]].map(([k, l]) => `<div class="elev-s" style="box-shadow:var(--shadow-${k})"><b>shadow-${k}</b>${l}</div>`).join("")}</div>`)}
        </div>`)}
        ${sec("Iconography", "Lucide, 1.75 stroke, 16–18px in UI, 24px on the keypad. Black by default, orange only when active.", `<div class="icon-grid">${icons.map((n, i) => `<div class="icon-cell ${i === 0 ? "is-accent" : ""}">${ic(n)}<span>${n}</span></div>`).join("")}</div>`)}
        ${sec("Product structure", "Mirrors the Figma page order", `<div class="sections-map">${sections.map(([n, t, s]) => `<div class="${s === "now" ? "is-now" : ""}"><b>${n}</b><span>${t}</span>${s === "now" ? badge("orange", "This step") : s === "part" ? badge("neutral", "Connectivity + auth") : ""}</div>`).join("")}</div>`)}
      </div>`;
  }

  /* ---------- Components ---------- */
  function buildComponents() {
    const st = (html) => html.replace(/ id="[^"]*"/g, "").replace(/ for="[^"]*"/g, "");
    const bRow = (name, specTxt, v) => `<tr><td>${name}<small>${specTxt}</small></td><td>${btn({ v, label: "Sign in" })}</td><td>${btn({ v, label: "Sign in", cls: "is-hover" })}</td><td>${btn({ v, label: "Sign in", cls: "is-focus" })}</td><td>${btn({ v, label: "Sign in", disabled: true })}</td><td>${v === "primary" ? btn({ v, label: "Sign in", loading: "Signing in…" }) : '<span class="sub">n/a</span>'}</td></tr>`;
    const demo = preset(base(), "app", "home");
    const demoC = Object.assign(preset(base(), "app", "collapsed"), { nav: "kitchen" });
    const states = [
      ["Connectivity", [conn("online"), conn("offline"), conn("syncing"), conn("synced"), conn("failed"), conn("conflict")]],
      ["Orders", [badge("orange", "New", { dot: true }), badge("info", "Accepted", { dot: true }), badge("error", "Rejected", { dot: true }), badge("neutral", "Cancelled", { dot: true }), badge("success", "Completed", { dot: true })]],
      ["Payments", [badge("warning", "Pending", { icon: "clock" }), badge("success", "Success", { icon: "check" }), badge("error", "Failed", { icon: "x" }), badge("info", "Partial", { icon: "split" }), badge("neutral", "Refund", { icon: "rotate-ccw" })]],
      ["Approvals", [badge("warning", "Pending", { dot: true }), badge("success", "Approved", { icon: "check" }), badge("error", "Rejected", { icon: "x" })]],
      ["Menu", [badge("success", "Available", { dot: true }), badge("neutral", "Unavailable"), badge("orange", "Override", { icon: "pencil" }), badge("error", "Import error", { icon: "triangle-alert" })]],
      ["Devices", [badge("success", "Connected", { icon: "plug" }), badge("neutral", "Disconnected", { icon: "unplug" }), badge("warning", "Degraded", { icon: "activity" }), badge("error", "Diagnostic required", { icon: "gauge" })]],
      ["Permissions", [badge("success", "Allowed", { icon: "check" }), badge("info", "Read-only", { icon: "eye" }), badge("error", "Restricted", { icon: "lock" }), badge("black", "Outlet-scoped", { icon: "store" })]],
    ];
    $("#components").innerHTML = `
      <div class="sheet-intro"><span class="rv-badge rv-badge--orange">00</span><h1>Components</h1><p>Every Phase 1 component with its states. The shell, POS and authentication screens are built only from these. Switch the theme at the top to see the dark variant.</p></div>
      <div class="sheet">
        ${sec("Buttons", "8px radius · 40 default, 44 auth, 56 touch · black text on orange (7.2:1)", `<div class="table-wrap"><table class="rv-table spec-table"><thead><tr><th>Variant</th><th>Default</th><th>Hover</th><th>Focus</th><th>Disabled</th><th>Loading</th></tr></thead><tbody>
          ${bRow("Primary", "orange · one per view", "primary")}${bRow("Secondary", "white · dark border", "secondary")}${bRow("Black", "weighty secondary", "black")}${bRow("Ghost", "transparent", "ghost")}${bRow("Destructive", "light red · red text", "danger")}
          </tbody></table></div>
          <div class="spec-grid">${spec("Sizes", "32 · 40 · 44 · 56", `<div class="inline">${btn({ v: "primary", size: "sm", label: "Small" })}${btn({ v: "primary", label: "Default" })}${btn({ v: "primary", size: "lg", label: "Large" })}${btn({ v: "primary", size: "touch", label: "Touch" })}</div>`)}
          ${spec("Icon and text buttons", "", `<div class="inline">${btn({ v: "icon", icon: "bell", aria: "Notifications" })}${btn({ v: "icon", icon: "circle-help", aria: "Help", cls: "is-hover" })}${btn({ v: "secondary", label: "Retry sync", icon: "refresh-cw" })}${btn({ v: "link", label: "Forgot password?" })}${btn({ v: "text", label: "Back", icon: "arrow-left" })}</div>`)}</div>`)}
        ${sec("Inputs and dropdowns", "White · 1px border · 8px radius · orange border and ring on focus", `<div class="spec-grid">
          ${spec("Default", "", st(field({ id: "a", label: "Work email", ph: "name@company.com" })))}
          ${spec("Focus", "", st(field({ id: "a", label: "Work email", ph: "name@company.com", state: "focus" })))}
          ${spec("Filled", "", st(field({ id: "a", label: "Work email", value: E })))}
          ${spec("Error", "icon + text", st(field({ id: "a", label: "Work email", value: "sana.siddiqui@spicetrail", error: "Enter a work email, like name@company.com." })))}
          ${spec("Disabled", "", st(field({ id: "a", label: "Work email", value: E, disabled: true })))}
          ${spec("Password", "visibility toggle", st(field({ id: "a", label: "Password", type: "password", value: "tandoor@2026", action: `<button type="button" class="rv-input__action" aria-label="Show password">${ic("eye")}</button>` })))}
          ${spec("Dropdown", "closed and open", `<div class="rv-field"><span class="rv-label">Outlet</span><div class="rv-input rv-select">${ic("store")}<span class="rv-input__value">Downtown Delhi</span>${ic("chevron-down")}</div></div><div class="rv-menu" style="margin-top:8px"><button type="button" class="rv-menu__item is-selected">Downtown Delhi${ic("check")}</button><button type="button" class="rv-menu__item is-hover">Gurugram</button><button type="button" class="rv-menu__item">Noida</button></div>`)}
          ${spec("Search", "with shortcut", `<div class="rv-input">${ic("search")}<input type="search" placeholder="Search items or codes" aria-label="Search"><span class="rv-kbd">/</span></div>`)}
        </div>`)}
        ${sec("Tabs, tables, pagination", "Dense and readable · tabular numbers · 2px orange underline for the active tab", `<div class="spec-grid">
          ${spec("Tabs and segmented control", "", `<div class="rv-tabs"><button type="button" class="rv-tab is-active">All <span class="rv-count">184</span></button><button type="button" class="rv-tab">Dine-in <span class="rv-count">142</span></button><button type="button" class="rv-tab">Online <span class="rv-count">42</span></button></div><div style="margin-top:16px" class="rv-seg"><button type="button" aria-pressed="true">${ic("utensils-crossed")}Dine-in</button><button type="button">${ic("package")}Takeaway</button><button type="button">${ic("bike")}Delivery</button></div>`)}
          ${spec("Table", "selected row in soft orange", `<div class="table-wrap" style="border:1px solid var(--border);border-radius:10px"><table class="rv-table"><thead><tr><th>Order</th><th>Source</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>
            <tr class="is-selected"><td class="mono">#A-1046</td><td>Table 12</td><td class="num">₹1,840</td><td>${badge("orange", "New", { dot: true })}</td></tr><tr><td class="mono">#O-3391</td><td>Online</td><td class="num">₹960</td><td>${badge("info", "Accepted", { dot: true })}</td></tr><tr><td class="mono">#T-218</td><td>Takeaway</td><td class="num">₹540</td><td>${badge("success", "Completed", { dot: true })}</td></tr></tbody></table></div>
            <div class="rv-pager" style="margin-top:12px"><span class="info">1–20 of 184</span><button type="button" aria-label="Previous">${ic("chevron-left")}</button><button type="button" class="is-active">1</button><button type="button">2</button><button type="button">3</button><span>…</span><button type="button">10</button><button type="button" aria-label="Next">${ic("chevron-right")}</button></div>`, "wide")}
        </div>`)}
        ${sec("Cards, badges, avatars, tooltips", "", `<div class="spec-grid">
          ${spec("KPI cards", "orange only when action is needed", `<div class="kpi-pair"><div class="rv-card rv-kpi"><div class="rv-kpi__label">Today's sales</div><div class="rv-kpi__value">₹84,520</div><div class="rv-kpi__meta"><span class="rv-delta">▲ 8.4%</span>vs last Thu</div></div><div class="rv-card rv-kpi"><div class="rv-kpi__label">Pending approvals</div><div class="rv-kpi__value is-accent">06</div><div class="rv-kpi__meta">2 older than 10 min</div></div></div>`)}
          ${spec("Card", "white · 1px border · 10px radius", `<div class="rv-card"><div class="rv-card__head"><span class="rv-card__title">Menu alerts</span>${btn({ v: "ghost", size: "sm", label: "View all" })}</div><div class="rv-card__body" style="font-size:13px;color:var(--ink-2)">Kulfi is unavailable at Downtown Delhi.</div></div>`)}
          ${spec("Avatars and tooltip", "", `<div class="inline"><span class="rv-avatar rv-avatar--sm">AM</span><span class="rv-avatar">NK</span><span class="rv-avatar rv-avatar--black">SS</span><span class="rv-avatar rv-avatar--orange">PN</span><span class="rv-avatar rv-avatar--lg">RD</span><span class="rv-tooltip">New order <kbd>N</kbd></span></div>`)}
        </div>`)}
        ${sec("Phase 1 states", "Small and compact. Each status carries an icon or dot as well as a color.", `<div class="state-rows">${states.map(([g, items]) => `<div class="state-row"><b>${g}</b><div class="inline">${items.join("")}</div></div>`).join("")}</div>`)}
        ${sec("Alerts, modals, drawers", "Inline notes for most messages; a slim alert bar only when the shell needs action", `<div class="spec-grid">
          ${spec("Inline notes", "", `<div class="stack">${note("error", "circle-alert", "Email or password is incorrect.")}${note("warning", "wifi-off", "You're offline.", "3 transactions will sync when you reconnect.")}${note("success", "circle-check", "Payment received.")}${note("orange", "shield-check", "Additional verification required.")}${note("info", "timer", "Your session expired.")}</div>`)}
          ${spec("Shell alert bar", "failure and conflict only", `<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden"><div class="rv-alert rv-alert--error" style="padding:10px 14px;border:0">${ic("circle-x")}<span><b>2 transactions didn't sync.</b></span><span class="acts">${btn({ v: "black", size: "sm", label: "Retry" })}</span></div></div>`)}
          ${spec("Modal", "", `<div class="rv-modal" style="width:100%"><div class="rv-modal__head"><h3>Sign out of Rasova?</h3><p>You'll need your password to sign in again.</p></div><div class="rv-modal__body">${note("warning", "triangle-alert", "3 transactions haven't synced.")}</div><div class="rv-modal__foot">${btn({ v: "ghost", label: "Cancel" })}${btn({ v: "danger", label: "Sign out", icon: "log-out" })}</div></div>`)}
          ${spec("Drawer", "edit panels slide in from the right", `<div class="rv-drawer" style="border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow-md)"><div class="rv-drawer__head"><h3>Edit item</h3>${btn({ v: "icon", icon: "x", aria: "Close" })}</div><div class="rv-drawer__body">${st(field({ id: "d1", label: "Item name", value: "Paneer Tikka" }))}${st(field({ id: "d2", label: "Price at this outlet", value: "360", icon: "tag", hint: "Base price ₹340. This creates an outlet override." }))}</div><div class="rv-drawer__foot">${btn({ v: "ghost", label: "Cancel" })}${btn({ v: "primary", label: "Save" })}</div></div>`)}
        </div>`)}
        ${sec("Empty and loading states", "", `<div class="spec-grid">
          ${spec("Empty", "", `<div class="rv-empty"><span class="rv-empty__icon">${ic("receipt")}</span><h4>No items yet</h4><p>Tap an item to add it to this order.</p></div>`)}
          ${spec("Loading", "skeleton · progress · spinner", `<div class="stack"><span class="rv-skel" style="width:70%"></span><span class="rv-skel" style="width:90%"></span><span class="rv-skel" style="width:50%"></span><div class="rv-progress is-indeterminate" style="margin-top:8px"><i></i></div>${btn({ v: "primary", label: "Signing in", loading: "Signing in…" })}</div>`)}
          ${spec("Restricted", "permission state", `<div class="rv-empty"><span class="rv-empty__icon" style="color:var(--error)">${ic("lock-keyhole")}</span><h4>You don't have access to Reports</h4><p>Ask an outlet manager to update your role.</p></div>`)}
        </div>`)}
        ${sec("Navigation", "Expanded 248px and collapsed 76px. Orange edge marker, soft orange fill and orange icon for the active item; tooltips when collapsed.", `<div class="nav-specs">
          <div class="nav-spec"><div class="shell spec-shell">${R.withStatic(() => R.sidebar(demo))}</div><span>Expanded</span></div>
          <div class="nav-spec"><div class="shell is-collapsed spec-shell" style="grid-template-columns:76px">${R.withStatic(() => R.sidebar(demoC)).replace('class="nav-item is-active"', 'class="nav-item is-active is-tip"')}</div><span>Collapsed, tooltip on hover</span></div>
          <div class="nav-spec grow"><div class="spec-navbar">${R.withStatic(() => R.navbar(Object.assign(preset(base(), "app", "home"), { nav: "pos", menu: "outlet" })))}</div><span>Navbar with outlet selector open</span>
            <div class="spec-navbar" style="margin-top:220px">${R.withStatic(() => R.navbar(Object.assign(preset(base(), "app", "offline"), { nav: "kitchen" })))}</div><span>Offline status</span>
            <div style="position:relative;height:300px;margin-top:12px">${R.withStatic(() => R.profileMenu(preset(base(), "app", "home"), ""))}</div><span>Profile menu</span></div>
        </div>`)}
        ${sec("Authentication", "OTP, PIN dots and keypad", `<div class="spec-grid">
          ${spec("OTP", "active · filled · error · success", `<div class="stack">${st(otp(["4", "8", "", "", "", ""], { showActive: true }))}${st(otp("482913".split("")))}${st(otp("482931".split(""), { state: "error" }))}${st(otp("482913".split(""), { state: "success" }))}</div>`)}
          ${spec("PIN dots", "empty · partial · error · success", `<div class="stack" style="gap:18px;padding:6px 0">${pinDots(4, 0)}${pinDots(4, 2)}${pinDots(4, 4, "error")}${pinDots(4, 4, "success")}</div>`)}
          ${spec("Keypad", "72px keys · pressed", `<div style="max-width:300px">${keypad(false, 5)}</div>`)}
        </div>`)}
      </div>`;
  }

  /* ---------- Views + theme ---------- */
  const VIEWS = ["prototype", "states", "foundations", "components"];
  const built = {};
  function applyTheme() {
    document.documentElement.setAttribute("data-rv-theme", S.theme);
    document.querySelectorAll("[data-theme-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeBtn === S.theme)));
  }
  function setView(v) {
    if (!VIEWS.includes(v)) v = "prototype";
    currentView = v;
    VIEWS.forEach((x) => { $("#view-" + x).hidden = x !== v; $(`[data-tab="${x}"]`).setAttribute("aria-selected", String(x === v)); });
    if (!built[v]) { ({ states: buildBoard, foundations: buildFoundations, components: buildComponents })[v]?.(); built[v] = true; }
    requestAnimationFrame(() => { scaleThumbs(); fit(); });
    try { history.replaceState(null, "", "#" + v); } catch (_) {}
  }
  document.querySelector(".tabs").addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) setView(t.dataset.tab); });
  document.querySelector(".theme-switch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-btn]"); if (!b) return;
    S.theme = b.dataset.themeBtn; applyTheme(); render({ focus: null });
  });

  buildControls();
  applyTheme();
  render();
  setView((location.hash || "").slice(1) || "prototype");
  booted = true;
})();
