/* ==========================================================================
   RASOVA — prototype controller
   Owns the live state machine for 01 Authentication, the scenario controls,
   the state board and the foundations / component sheets.
   ========================================================================== */
(function () {
  "use strict";
  const R = window.Rasova;
  const { ic, esc, btn, field, banner, status, steps, otp, pinDots, keypad, navItem, emailOk, remaining, fmt } = R;
  const $ = (s, el = document) => el.querySelector(s);
  const E = "aarav.mehta@spicetrail.in";

  /* ---------- State ---------- */
  const base = () => ({
    device: "desktop", network: "online", screen: "login", v: "default",
    email: "", password: "", showPw: false, emailTouched: false, attemptsLeft: 3,
    forgotEmail: "", ssoId: "",
    otp: ["", "", "", "", "", ""], mfaAttempts: 3, mfaMethod: "sms", mfaPick: "sms",
    pin: "", pinAttempts: 3, user: 0, pressed: null, devName: "Cashier Terminal 01",
    appState: "online", nav: "home", via: "web", modal: null, toast: null,
    transit: { title: "", sub: "" }, timers: {}, fired: {}, now: () => Date.now(),
    scen: { login: "mfa", forgot: "sent", sso: "redirect", mfa: "accept", pin: "check" },
  });
  const startTimer = (S, name, sec) => { S.timers[name] = Date.now() + sec * 1000; S.fired[name] = sec <= 0; };

  const STATES = [
    { id: "PA-01", g: "Login", items: [["login", "default", "Default"], ["login", "focus", "Focused input"], ["login", "filled", "Filled"], ["login", "loading", "Loading"], ["login", "invalid", "Invalid credentials"], ["login", "locked", "Account locked"], ["login", "service-error", "Service error"], ["login", "offline", "No connection"]] },
    { id: "PA-01", g: "Forgot password", items: [["forgot", "default", "Reset request"], ["forgot", "invalid-email", "Invalid email"], ["forgot", "unknown", "Unknown email"], ["forgot", "loading", "Sending"], ["forgot", "service-error", "Service error"], ["forgot", "sent", "Reset email sent"]] },
    { id: "PA-02", g: "SSO login", items: [["sso", "default", "Organization"], ["sso", "invalid", "Invalid identifier"], ["sso", "not-configured", "SSO not set up"], ["sso", "redirecting", "Redirecting"], ["sso", "waiting", "Waiting for IdP"], ["sso", "denied", "Not confirmed"]] },
    { id: "PA-03", g: "MFA", items: [["mfa", "default", "Enter code"], ["mfa", "filled", "Code entered"], ["mfa", "verifying", "Verifying"], ["mfa", "incorrect", "Incorrect code"], ["mfa", "expired", "Expired code"], ["mfa", "too-many", "Too many attempts"], ["mfa", "methods", "Another method"], ["mfa", "success", "Verified"]] },
    { id: "PA-04", g: "PIN login", items: [["pin", "default", "Enter PIN"], ["pin", "entering", "Entering"], ["pin", "incorrect", "Incorrect PIN"], ["pin", "too-many", "Too many attempts"], ["pin", "locked", "PIN locked"], ["pin", "unauthorized", "Device not authorized"], ["pin", "success", "PIN accepted"]] },
    { id: "PA-05", g: "Device binding", items: [["device", "start", "Device details"], ["device", "pending", "Pending approval"], ["device", "paired", "Paired"], ["device", "rejected", "Rejected"]] },
    { id: "PA-06", g: "Session / logout", items: [["transit", "signin", "Signing in"], ["login", "session-expired", "Session expired"], ["app", "signout", "Sign-out confirm"], ["app", "signout-offline", "Sign out, unsynced data"], ["login", "signed-out", "Signed out"]] },
    { id: "SYS", g: "System states in the shell", items: [["app", "online", "Online"], ["app", "offline", "Offline"], ["app", "syncing", "Syncing"], ["app", "synced", "Sync success"], ["app", "failed", "Sync failure"], ["app", "conflict", "Conflict"], ["app", "denied", "Permission denied"]] },
  ];
  const TABLET_SET = [["login", "default", "Login"], ["mfa", "filled", "MFA"], ["pin", "entering", "PIN login"], ["device", "pending", "Device binding"], ["app", "online", "Shell, icon rail"], ["app", "offline", "Shell, offline"]];

  function preset(S, screen, v) {
    S.screen = screen; S.v = v; S.modal = null; S.toast = null;
    S.network = /offline/.test(v) ? "offline" : "online";
    switch (screen) {
      case "login":
        S.email = ["default", "focus", "signed-out"].includes(v) ? "" : E;
        S.password = ["filled", "loading", "service-error", "offline"].includes(v) ? "tandoor@2026" : "";
        if (v === "invalid") S.attemptsLeft = 2;
        break;
      case "forgot":
        S.forgotEmail = { default: "", "invalid-email": "aarav.mehta@spicetrail", unknown: "aarav@spicetrial.in" }[v] ?? E;
        if (v === "sent") startTimer(S, "resend", 30);
        break;
      case "sso":
        S.ssoId = { default: "", invalid: "spice trail!", "not-configured": "ops@tandoorhouse.in" }[v] ?? E;
        break;
      case "mfa":
        S.otp = (["filled", "verifying", "incorrect", "expired", "success"].includes(v) ? (v === "incorrect" ? "482931" : "482913") : "").padEnd(6, " ").split("").map((c) => c.trim());
        S.mfaAttempts = v === "incorrect" ? 2 : 3;
        startTimer(S, "mfaExpire", v === "expired" ? 0 : 287);
        startTimer(S, "mfaResend", v === "expired" ? 0 : 24);
        if (v === "methods") S.mfaPick = "app";
        break;
      case "pin":
        S.pin = { entering: "24", incorrect: "1357", success: "2468" }[v] || "";
        S.pinAttempts = v === "incorrect" ? 2 : 3;
        if (v === "too-many") startTimer(S, "pinLock", 300);
        break;
      case "device":
        if (v === "pending") startTimer(S, "deviceCode", 600);
        break;
      case "transit":
        S.transit = { title: "Opening Spice Trail workspace", sub: "Loading outlets, menus and permissions" };
        break;
      case "app":
        S.nav = "home"; S.via = "web";
        S.appState = R.SYNC[v] ? v : "online";
        if (v === "signout") S.modal = "signout";
        if (v === "signout-offline") { S.modal = "signout"; S.appState = "offline"; }
        if (v === "denied") { S.via = "pin"; S.user = 0; S.nav = "reports"; }
        break;
    }
    return S;
  }

  let S = base();
  let seq = 0;
  let booted = false;
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
    frame.innerHTML = R.frameInner(S);
    fit();
    if (booted && currentView === "prototype") {
      const t = (keepId && frame.querySelector("#" + CSS.escape(keepId))) || frame.querySelector(".dialog .rv-btn") || frame.querySelector("[data-autofocus]:not([disabled])");
      if (t) {
        t.focus({ preventScroll: true });
        if (t.tagName === "INPUT" && t.type !== "email") { try { t.setSelectionRange(t.value.length, t.value.length); } catch (_) {} }
      }
    }
    syncControls();
  }

  function go(screen, v) {
    seq++;
    S.screen = screen; S.v = v; S.modal = null;
    render({ focus: null });
  }

  function jump(screen, v) {
    seq++;
    const keep = { device: S.device, scen: S.scen };
    S = Object.assign(base(), keep);
    preset(S, screen, v);
    if (screen === "login" && v === "focus") S.v = "default";
    render({ focus: null });
    if (screen === "login" && v === "focus") frame.querySelector("#email")?.focus({ preventScroll: true });
  }

  function toast(msg) {
    S.toast = msg;
    frame.querySelector(".toast")?.remove();
    frame.insertAdjacentHTML("beforeend", `<div class="toast" role="status">${ic("circle-check")}${esc(msg)}</div>`);
    setTimeout(() => { if (S.toast === msg) { S.toast = null; frame.querySelector(".toast")?.remove(); } }, 2400);
  }

  function signedIn(title, sub) {
    S.transit = { title, sub };
    go("transit", "signin");
    later(1400, () => {
      S.nav = "home";
      S.appState = S.network === "offline" ? "offline" : "online";
      go("app", S.appState);
    });
  }

  function startMfa() {
    S.otp = ["", "", "", "", "", ""]; S.mfaAttempts = 3;
    startTimer(S, "mfaExpire", 300); startTimer(S, "mfaResend", 30);
  }

  const ssoValid = (v) => emailOk(v) || /^[a-z0-9][a-z0-9-]{2,}$/i.test(v.trim());

  /* ---------- Actions ---------- */
  const A = {
    help() { S.modal = "help"; render(); },
    closeModal() { S.modal = null; render({ focus: null }); },
    togglePw() { S.showPw = !S.showPw; render({ focus: "password" }); },

    submitLogin() {
      if (S.v === "locked") return;
      if (S.network === "offline") { S.v = "offline"; return render({ focus: null }); }
      if (!emailOk(S.email) || !S.password) return;
      S.v = "loading"; render({ focus: null });
      later(1000, () => {
        const r = S.scen.login;
        if (r === "invalid") {
          S.attemptsLeft--; S.password = "";
          S.v = S.attemptsLeft <= 0 ? "locked" : "invalid";
          return render({ focus: S.v === "invalid" ? "password" : null });
        }
        if (r === "locked") { S.v = "locked"; S.password = ""; return render({ focus: null }); }
        if (r === "error") { S.v = "service-error"; return render({ focus: null }); }
        S.via = "web"; S.attemptsLeft = 3; S.password = "";
        if (r === "mfa") { startMfa(); return go("mfa", "default"); }
        signedIn("Opening Spice Trail workspace", "Loading outlets, menus and permissions");
      });
    },

    submitForgot() {
      if (!emailOk(S.forgotEmail)) { S.v = "invalid-email"; return render({ focus: "forgotEmail" }); }
      S.v = "loading"; render({ focus: null });
      later(900, () => {
        const r = S.network === "offline" ? "error" : S.scen.forgot;
        if (r === "sent") { startTimer(S, "resend", 30); S.v = "sent"; }
        else S.v = r === "unknown" ? "unknown" : "service-error";
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
        later(1500, () => {
          S.v = "waiting"; render({ focus: null });
          later(1500, () => {
            if (r === "denied") { S.v = "denied"; return render({ focus: null }); }
            S.via = "web";
            signedIn(`Opening ${R.orgFrom(S.ssoId)} workspace`, "Signed in with single sign-on");
          });
        });
      });
    },
    cancelSso() { go("sso", "default"); },

    verify() {
      if (!S.otp.every(Boolean) || S.v === "verifying") return;
      S.v = "verifying"; render({ focus: null });
      later(800, () => {
        const r = S.scen.mfa;
        if (r === "accept") {
          S.v = "success"; render({ focus: null });
          return later(1100, () => signedIn("Opening Spice Trail workspace", "Identity verified"));
        }
        if (r === "expired") { S.v = "expired"; return render({ focus: null }); }
        S.mfaAttempts--;
        S.v = S.mfaAttempts <= 0 ? "too-many" : "incorrect";
        render({ focus: S.v === "incorrect" ? "otp-0" : null });
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
    },
    pinBack() { if (S.v === "incorrect") S.pin = ""; S.pin = S.pin.slice(0, -1); S.v = S.pin.length ? "entering" : "default"; render({ focus: null }); },
    pinClear() { S.pin = ""; S.v = "default"; render({ focus: null }); },
    pinSubmit() {
      if (S.pin.length < 4 || !["entering", "default"].includes(S.v)) return;
      if (S.scen.pin === "unauthorized") { S.v = "unauthorized"; S.pin = ""; return render({ focus: null }); }
      if (S.scen.pin === "locked") { S.v = "locked"; S.pin = ""; return render({ focus: null }); }
      S.v = "verifying"; render({ focus: null });
      later(600, () => {
        if (S.pin === R.DEMO_PIN) {
          S.v = "success"; render({ focus: null });
          return later(900, () => { S.via = "pin"; signedIn("Opening POS", `${R.STAFF[S.user].n} · Cashier Terminal 01`); });
        }
        S.pinAttempts--;
        if (S.pinAttempts <= 0) { S.v = "too-many"; S.pin = ""; startTimer(S, "pinLock", 300); }
        else S.v = "incorrect";
        render({ focus: null });
      });
    },
    switchUser() { seq++; S.user = (S.user + 1) % R.STAFF.length; S.pin = ""; S.pinAttempts = 3; S.v = "default"; delete S.timers.pinLock; render({ focus: null }); },

    requestDevice() { if (!S.devName.trim()) return; startTimer(S, "deviceCode", 600); S.v = "pending"; render({ focus: null }); },
    approve() { if (S.screen === "device" && S.v === "pending") { S.v = "paired"; render({ focus: null }); } },
    reject() { if (S.screen === "device" && S.v === "pending") { S.v = "rejected"; render({ focus: null }); } },
    toPin() { S.scen.pin = "check"; $("#sc-pin").value = "check"; S.pin = ""; S.pinAttempts = 3; go("pin", "default"); },
    copyId() {
      const done = () => toast("Device ID copied");
      try { navigator.clipboard.writeText("RSV-WIN-7F3A-92C1").then(done, done); } catch (_) { done(); }
    },

    nav(id) { S.nav = id; render({ focus: null }); },
    navHome() { S.nav = "home"; render({ focus: null }); },
    signout() { S.modal = "signout"; render({ focus: null }); },
    confirmSignout() {
      S.password = ""; S.pin = "";
      if (S.via === "pin") go("pin", "default");
      else go("login", "signed-out");
    },
    retrySync() { S.appState = "syncing"; render({ focus: null }); later(1600, () => { S.appState = "synced"; render({ focus: null }); }); },
    resolveConflict() { A.retrySync(); },
    dismissBar() { S.appState = "online"; render({ focus: null }); },

    // simulation-only
    simOffline() { setNetwork("offline"); },
    simFail() { S.appState = "failed"; render({ focus: null }); },
    simConflict() { S.appState = "conflict"; render({ focus: null }); },
    simDenied() { S.via = "pin"; S.user = 0; S.nav = "reports"; render({ focus: null }); },
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
    const wrap = frame.querySelector("#email")?.closest(".rv-field");
    if (!wrap) return;
    const box = wrap.querySelector(".rv-input");
    const existing = wrap.querySelector("#email-err");
    const input = wrap.querySelector("#email");
    if (show && !existing) {
      box.classList.add("is-error"); input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "email-err");
      box.insertAdjacentHTML("afterend", `<div class="rv-hint is-error" id="email-err">${ic("circle-alert")}<span>Enter a work email in the format <strong>name@company.com</strong>.</span></div>`);
    }
    if (!show && existing) {
      existing.remove(); input.removeAttribute("aria-describedby");
      if (S.v !== "invalid") { box.classList.remove("is-error"); input.removeAttribute("aria-invalid"); }
    }
  }

  frame.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.otp !== undefined) return onOtpInput(t);
    if (["email", "password", "forgotEmail", "ssoId", "devName"].includes(t.id)) {
      S[t.id] = t.value;
      if (t.id === "email" && S.emailTouched && emailOk(S.email)) setEmailError(false);
      const cta = frame.querySelector("[data-cta]");
      if (cta && !cta.classList.contains("is-loading")) cta.disabled = !ctaOk();
    }
  });
  frame.addEventListener("focusout", (e) => {
    if (e.target.id === "email" && S.screen === "login") {
      S.emailTouched = true;
      setEmailError(!!S.email && !emailOk(S.email));
    }
  });
  frame.addEventListener("submit", (e) => {
    e.preventDefault();
    ({ login: A.submitLogin, forgot: A.submitForgot, sso: A.submitSso, mfa: A.verify })[e.target.dataset.form]?.();
  });
  frame.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go],[data-act],[data-key],[data-nav],[data-method]");
    if (!el || el.disabled) return;
    if (el.dataset.go) { const [s, v] = el.dataset.go.split("/"); return goFrom(s, v); }
    if (el.dataset.key !== undefined) return A.pinKey(el.dataset.key);
    if (el.dataset.nav) return A.nav(el.dataset.nav);
    if (el.dataset.method) { S.mfaPick = el.dataset.method; return render({ focus: null }); }
    A[el.dataset.act]?.(el);
  });

  /* OTP: auto-advance, backspace, paste, auto-verify on the sixth digit */
  function paintOtp(focusIdx) {
    frame.querySelectorAll("[data-otp]").forEach((c) => {
      const i = +c.dataset.otp;
      c.value = S.otp[i];
      c.classList.toggle("is-filled", !!S.otp[i]);
    });
    const cta = frame.querySelector("[data-cta]");
    if (cta) cta.disabled = !ctaOk();
    if (focusIdx !== undefined) frame.querySelector(`#otp-${focusIdx}`)?.focus();
  }
  function onOtpInput(t) {
    let i = +t.dataset.otp;
    const digits = t.value.replace(/\D/g, "");
    let rerender = false;
    if (S.v === "incorrect") { S.otp = ["", "", "", "", "", ""]; S.v = "default"; i = 0; rerender = true; }
    if (!digits) S.otp[i] = "";
    for (let k = 0; k < digits.length && i + k < 6; k++) S.otp[i + k] = digits[k];
    const next = Math.min(i + Math.max(digits.length, 0), 5);
    if (rerender) render({ focus: `otp-${digits ? next : 0}` });
    else paintOtp(digits ? next : i);
    if (digits && S.otp.every(Boolean)) A.verify();
  }
  frame.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.dataset?.otp === undefined) return;
    const i = +t.dataset.otp;
    if (e.key === "Backspace" && !t.value && i > 0) { e.preventDefault(); S.otp[i - 1] = ""; paintOtp(i - 1); }
    if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); frame.querySelector(`#otp-${i - 1}`)?.focus(); }
    if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); frame.querySelector(`#otp-${i + 1}`)?.focus(); }
  });

  /* Physical keyboard for PIN (Windows POS terminals) */
  document.addEventListener("keydown", (e) => {
    if (currentView !== "prototype" || S.screen !== "pin" || S.modal) return;
    if (e.target.matches("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      S.pressed = +e.key; A.pinKey(e.key);
      setTimeout(() => { S.pressed = null; frame.querySelector(".rv-key.is-pressed")?.classList.remove("is-pressed"); }, 140);
    } else if (e.key === "Backspace") { e.preventDefault(); A.pinBack(); }
    else if (e.key === "Enter" && !e.target.matches("button")) { e.preventDefault(); A.pinSubmit(); }
    else if (e.key === "Escape") A.pinClear();
  });

  /* Countdown ticks and their expiries */
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
    login: () => `<p class="hint">Use any work email and password. What happens next follows <b>Sign-in result</b> below. Three invalid attempts lock the account.</p>`,
    forgot: () => `<p class="hint">Any valid email works. Outcome follows <b>Reset email</b> below.</p>`,
    sso: () => `<p class="hint">Try <code>${E}</code> or an org ID like <code>spice-trail</code>. Outcome follows <b>SSO result</b>.</p>`,
    mfa: () => `<p class="hint">Type or paste any 6 digits. The sixth digit verifies automatically. Outcome follows <b>MFA code</b>.</p>`,
    pin: () => `<p class="hint">Demo PIN <code>${R.DEMO_PIN}</code>. Tap the keypad or type on the keyboard. Any other PIN is incorrect; three misses pause entry for 5 minutes.</p>`,
    device: () => S.v === "pending"
      ? `<p class="hint">Act as the administrator approving this code in Admin › Devices.</p><div class="row">${btn({ v: "primary", label: "Approve", icon: "check", act: "approve" })}${btn({ v: "danger", label: "Reject", icon: "x", act: "reject" })}</div>`
      : `<p class="hint">Request authorization to generate a pairing code.</p>`,
    transit: () => `<p class="hint">Loading the workspace…</p>`,
    app: () => `<p class="hint">Trigger the shell's system states, or open the account menu (avatar) to sign out.</p><div class="row">${btn({ v: "secondary", label: "Go offline", icon: "wifi-off", act: "simOffline" })}${btn({ v: "secondary", label: "Sync fails", icon: "circle-x", act: "simFail" })}</div><div class="row">${btn({ v: "secondary", label: "Conflict", icon: "git-compare-arrows", act: "simConflict" })}${btn({ v: "secondary", label: "No permission", icon: "lock-keyhole", act: "simDenied" })}</div><div class="row">${btn({ v: "secondary", label: "Expire session", icon: "timer", act: "simExpire" })}</div>`,
  };
  const SCREEN_NAME = { login: "PA-01 Login", forgot: "Forgot password", sso: "PA-02 SSO login", mfa: "PA-03 MFA", pin: "PA-04 PIN login", device: "PA-05 Device binding", transit: "PA-06 Session", app: "Application shell" };

  function currentKey() {
    if (S.screen !== "app") return `${S.screen}/${S.v}`;
    if (S.modal === "signout") return S.appState === "offline" ? "app/signout-offline" : "app/signout";
    if (S.nav === "reports" && S.via === "pin") return "app/denied";
    return `app/${S.appState}`;
  }

  function buildControls() {
    const sel = (id, label, opts, val) => `<label class="sel" for="${id}">${label}<select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? " selected" : ""}>${l}</option>`).join("")}</select></label>`;
    $("#controls").innerHTML = `
      <div class="ctl"><h3>Viewport</h3>
        <div class="seg" data-ctl="device"><button type="button" data-val="desktop">${ic("monitor")}Desktop 1440</button><button type="button" data-val="tablet">${ic("tablet")}Tablet 1280</button></div>
        <h3 style="margin-top:4px">Network</h3>
        <div class="seg" data-ctl="network"><button type="button" data-val="online">${ic("wifi")}Online</button><button type="button" data-val="offline">${ic("wifi-off")}Offline</button></div>
      </div>
      <div class="ctl ctl--sim"><h3>This screen <span id="sim-name" style="color:var(--orange-300);letter-spacing:0.04em;text-transform:none;font-family:var(--font-mono)"></span></h3><div id="sim" style="display:grid;gap:10px"></div></div>
      <div class="ctl"><h3>Outcomes</h3>
        ${sel("sc-login", "Sign-in result", [["mfa", "Success, MFA required"], ["success", "Success, no MFA"], ["invalid", "Invalid credentials"], ["locked", "Account locked"], ["error", "Service error"]], S.scen.login)}
        ${sel("sc-forgot", "Reset email", [["sent", "Email sent"], ["unknown", "Unknown email"], ["error", "Service error"]], S.scen.forgot)}
        ${sel("sc-sso", "SSO result", [["redirect", "Redirect and sign in"], ["not-configured", "SSO not set up"], ["denied", "IdP declines"]], S.scen.sso)}
        ${sel("sc-mfa", "MFA code", [["accept", "Correct"], ["incorrect", "Incorrect"], ["expired", "Expired"]], S.scen.mfa)}
        ${sel("sc-pin", "PIN login", [["check", "Check against demo PIN"], ["locked", "PIN locked by admin"], ["unauthorized", "Device not authorized"]], S.scen.pin)}
      </div>
      <div class="ctl"><h3>Jump to state ${btn({ v: "ghost", label: "Restart", icon: "rotate-ccw", attrs: 'id="restart" style="height:26px;font-size:11px;padding:0 8px;letter-spacing:0;text-transform:none"' })}</h3>
        <div class="jump">${STATES.map((g) => `<div class="jump__g"><div class="jump__h"><span class="rv-tag">${g.id}</span>${g.g}</div><div class="jump__list">${g.items.map(([s, v, l]) => `<button type="button" data-jump="${s}/${v}">${l}</button>`).join("")}</div></div>`).join("")}</div>
      </div>`;
    $("#controls").addEventListener("click", (e) => {
      const seg = e.target.closest(".seg button");
      if (seg) {
        const ctl = seg.parentElement.dataset.ctl;
        if (ctl === "device") { S.device = seg.dataset.val; render({ focus: null }); }
        if (ctl === "network") setNetwork(seg.dataset.val);
        return;
      }
      const j = e.target.closest("[data-jump]");
      if (j) { const [s, v] = j.dataset.jump.split("/"); return jump(s, v); }
      if (e.target.closest("#restart")) return jump("login", "default");
      const a = e.target.closest("[data-act]");
      if (a && !a.disabled) A[a.dataset.act]?.();
    });
    $("#controls").addEventListener("change", (e) => {
      const k = e.target.id.replace("sc-", "");
      if (k in S.scen) S.scen[k] = e.target.value;
    });
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
    const card = (s, v, l, device, tag) => {
      const st = preset(Object.assign(base(), { device }), s, v);
      return `<div class="board-card" data-board="${s}/${v}" data-device="${device}"><div class="board-thumb">${R.frameHTML(st)}</div><div class="board-cap"><span>${l}</span>${btn({ v: "ghost", label: "Open", iconR: "arrow-right", attrs: `data-open="${s}/${v}" data-device="${device}" aria-label="Open ${esc(l)} in prototype"` })}</div></div>`;
    };
    $("#board").innerHTML =
      STATES.map((g) => `<section class="board-group"><h2><span class="rv-tag rv-tag--orange">${g.id}</span>${g.g}<span class="c">${g.items.length} states</span></h2><div class="board-grid">${g.items.map(([s, v, l]) => card(s, v, l, "desktop")).join("")}</div></section>`).join("") +
      `<section class="board-group"><h2><span class="rv-tag rv-tag--orange">1280×800</span>Tablet and Android POS<span class="c">Touch layout, not a scaled desktop</span></h2><div class="board-grid">${TABLET_SET.map(([s, v, l]) => card(s, v, l, "tablet")).join("")}</div></section>`;
    $("#board").addEventListener("click", (e) => {
      const c = e.target.closest("[data-board]");
      if (!c) return;
      const [s, v] = c.dataset.board.split("/");
      S.device = c.dataset.device;
      setView("prototype");
      jump(s, v);
      window.scrollTo({ top: 0 });
    });
    scaleThumbs();
  }
  function scaleThumbs() {
    document.querySelectorAll(".board-thumb, .shell-preview").forEach((t) => {
      const f = t.firstElementChild;
      if (!f) return;
      const W = f.classList.contains("is-tablet") ? 1280 : 1440;
      t.style.setProperty("--thumb-scale", String(t.clientWidth / W));
    });
  }
  new ResizeObserver(() => scaleThumbs()).observe(document.body);

  /* ---------- Foundations ---------- */
  function buildFoundations() {
    const sw = (hex, token, role) => `<div class="swatch"><i style="background:${hex}"></i><div><b>${token} · ${hex}</b><span>${role}</span></div></div>`;
    const group = (t, items) => `<div class="swatch-group"><h3>${t}</h3>${items.map((i) => sw(...i)).join("")}</div>`;
    const principles = [
      ["Dark first", "Designed for dim service floors. Not a light UI inverted."],
      ["Orange as identity", "One signature accent for action, focus and selection."],
      ["Information density", "Compact controls, tight rhythm, no decorative whitespace."],
      ["Speed", "Fewest taps to bill. Keyboard and keypad parity on POS."],
      ["Clear states", "Online, offline, loading, error, pending, restricted: always shown in form and words, not color alone."],
      ["Touch friendly", "56px minimum on POS and tablet. 72px keypad keys."],
      ["Enterprise credibility", "Precise components that hold up across chains and outlets."],
    ];
    const sections = [["00", "Foundations", true], ["01", "Authentication", true], ["02", "POS"], ["03", "Tables & Orders"], ["04", "Kitchen / KOT"], ["05", "Menu"], ["06", "Online Orders"], ["07", "Reports"], ["08", "Platform / Admin"], ["09", "Devices"], ["10", "Onboarding & Migration"], ["11", "Support"], ["12", "Subscription"], ["13", "Prototypes"], ["14", "Edge Cases & System States", "partial"]];
    const typeRow = (name, spec, sample) => `<div class="type-row"><div class="spec"><b>${name}</b>${spec}</div><div class="sample">${sample}</div></div>`;
    const icons = ["house", "monitor", "chef-hat", "bike", "book-open", "chart-column-big", "shield", "cpu", "life-buoy", "bell", "circle-help", "mail", "lock", "eye", "eye-off", "building-2", "shield-check", "key-round", "fingerprint", "smartphone", "qr-code", "wifi", "wifi-off", "refresh-cw", "cloud-off", "git-compare-arrows", "circle-check", "circle-alert", "triangle-alert", "circle-x", "map-pin", "store", "receipt", "log-out"];
    $("#foundations").innerHTML = `
      <div class="sheet-intro"><h1>00 — Foundations</h1><p>The Rasova visual language: a black operations console where orange marks the next action. Tokens live in <code style="font-family:var(--font-mono);color:var(--orange-300)">prototype/tokens.css</code> and every screen in this file reads from them.</p></div>
      <div class="sheet">
        <section class="sec"><div class="sec__h"><h2>Principles</h2><p>Applied to every screen and state</p></div>
          <div class="principles">${principles.map(([t, d], i) => `<div class="principle"><span class="n">0${i + 1}</span><h3>${t}</h3><p>${d}</p></div>`).join("")}</div></section>

        <section class="sec"><div class="sec__h"><h2>Color</h2><p>Predominantly black and charcoal. Orange is the signature, never the canvas.</p></div>
          <div class="swatch-groups">
            ${group("Canvas", [["#080808", "bg-0", "App canvas, sidebar, brand panel"], ["#0D0D0D", "bg-1", "Main content, auth panel"], ["#111111", "bg-2", "Input wells, recessed areas"]])}
            ${group("Elevated surfaces", [["#151515", "surface-1", "Cards, keypad keys, inputs"], ["#1A1A1A", "surface-2", "Raised cards, secondary buttons"], ["#202020", "surface-3", "Hover, pressed, dialogs"]])}
            ${group("Borders", [["#292929", "border-1", "Default 1px hairline"], ["#333333", "border-2", "Hover, emphasis"]])}
            ${group("Signature orange", [["#FF6A00", "orange-500", "Primary CTA, active nav, focus, selection"], ["#FF7A1A", "orange-400", "Hover on primary"], ["#FF8A3D", "orange-300", "Links, highlight text on black"]])}
            ${group("Text", [["#F5F5F5", "text-1", "Primary text and numbers"], ["#A3A3A3", "text-2", "Secondary text, labels"], ["#6F6F6F", "text-3", "Metadata, placeholders"], ["#0A0A0A", "text-on-orange", "Text on orange (7.6:1)"]])}
            ${group("Semantic", [["#22C55E", "success", "Online, synced, verified"], ["#F59E0B", "warning", "Offline, conflict, paused"], ["#EF4444", "error", "Invalid, failed, locked"], ["#60A5FA", "info", "Neutral system notices"]])}
          </div>
          <div class="ratio"><div class="sec__sub">Color proportion on a typical screen</div>
            <div class="ratio__bar"><i style="width:62%;background:#080808"></i><i style="width:22%;background:#151515"></i><i style="width:9%;background:#333"></i><i style="width:4%;background:#A3A3A3"></i><i style="width:3%;background:#FF6A00"></i></div>
            <div class="ratio__legend"><span>Canvas ~62%</span><span>Surfaces ~22%</span><span>Borders ~9%</span><span>Text ~4%</span><span style="color:var(--orange-300)">Orange ~3%</span></div></div>
          <div class="dodont">
            <div class="do"><h3>Use orange for</h3><ul><li>The one primary action on a screen</li><li>Active navigation and selected items</li><li>Focus rings and the active OTP digit</li><li>Progress and the current step</li><li>The headline number on a dashboard</li></ul></div>
            <div><h3>Keep orange off</h3><ul><li>Backgrounds, large fills and whole cards</li><li>Secondary buttons and every icon</li><li>Error or warning messages (use semantic colors)</li><li>Body text and long labels</li><li>Decoration that carries no meaning</li></ul></div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Typography</h2><p>Manrope for display and numbers, Inter for interface text, JetBrains Mono for codes and IDs</p></div>
          <div class="type-rows">
            ${typeRow("Display", "Manrope 800 · 56/1.02 · −4%", `<span class="auth-type-big" style="font:800 56px/1.02 var(--font-display);letter-spacing:-0.04em">Run every outlet<span style="color:var(--orange-500)">.</span></span>`)}
            ${typeRow("Screen heading", "Manrope 700 · 32/1.1 · −3%", `<span style="font:700 32px/1.1 var(--font-display);letter-spacing:-0.03em">Welcome back</span>`)}
            ${typeRow("Section heading", "Manrope 700 · 24/1.1 · −2%", `<span style="font:700 24px/1.1 var(--font-display);letter-spacing:-0.02em">Verify your identity</span>`)}
            ${typeRow("Card title", "Manrope 700 · 20/1.25", `<span style="font:700 20px/1.25 var(--font-display)">Device authorized</span>`)}
            ${typeRow("Body", "Inter 400 · 14/1.55", `<span style="font:400 14px/1.55 var(--font-ui);color:var(--text-2)">Enter the verification code sent to your registered device.</span>`)}
            ${typeRow("Label", "Inter 500 · 13/1.2", `<span style="font:500 13px/1.2 var(--font-ui);color:var(--text-2)">Work email</span>`)}
            ${typeRow("Metadata", "Inter 400 · 12/1.45", `<span style="font:400 12px/1.45 var(--font-ui);color:var(--text-3)">Last synced 12 sec ago</span>`)}
            ${typeRow("Section label", "Inter 600 · 11 · +14% · caps", `<span style="font:600 11px/1 var(--font-ui);letter-spacing:0.14em;text-transform:uppercase;color:var(--text-3)">Run the outlet</span>`)}
            ${typeRow("Mono", "JetBrains Mono 500 · 13", `<span style="font:500 13px/1 var(--font-mono)">RSV-WIN-7F3A-92C1 · KOT #1042</span>`)}
          </div>
          <div class="sec__sub">Operational numbers · Manrope 800, tabular figures</div>
          <div class="numbers">
            <div class="rv-card rv-card--highlight"><span class="lb">Net sales today</span><span class="rv-num rv-num--accent">₹84,520</span></div>
            <div class="rv-card"><span class="lb">Orders</span><span class="rv-num">128</span></div>
            <div class="rv-card"><span class="lb">KOTs on time</span><span class="rv-num">94%</span></div>
            <div class="rv-card"><span class="lb">Tables occupied</span><span class="rv-num">23<span style="font-size:20px;color:var(--text-3)"> / 32</span></span></div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Space, radius, size</h2><p>4px base grid. Sharp but refined corners. Touch sizes on POS.</p></div>
          <div class="comp-grid">
            <div class="comp"><h3>Spacing <small>4px base</small></h3><div class="scale-rows">${[[4, "s-1"], [8, "s-2"], [12, "s-3"], [16, "s-4"], [20, "s-5"], [24, "s-6"], [32, "s-8"], [40, "s-10"], [48, "s-12"], [64, "s-16"]].map(([p, t]) => `<div class="scale-row"><span>${t}</span><span>${p}px</span><i style="width:${p * 2}px"></i></div>`).join("")}</div></div>
            <div class="comp"><h3>Radius <small>4 → 14</small></h3><div class="radii">${[[4, "xs · tags"], [8, "sm · small"], [10, "md · controls"], [12, "lg · cards"], [14, "xl · panels"]].map(([r, l]) => `<div class="radius-s" style="border-radius:${r}px">${r}px<br>${l}</div>`).join("")}</div></div>
            <div class="comp"><h3>Control heights</h3><div class="heights">${[[32, "sm · toolbars"], [40, "md · desktop"], [48, "lg · auth CTA"], [56, "touch · POS min"], [72, "key · PIN pad"]].map(([h, l]) => `<div class="height-s"><i style="height:${h}px"></i>${h}px · ${l}</div>`).join("")}</div></div>
          </div>
          <div class="sec__sub">Elevation · black on black, lifted by edge light rather than heavy shadow</div>
          <div class="elev"><div class="rv-card"><b>Standard</b><span>surface-1 · border-1</span></div><div class="rv-card rv-card--elevated"><b>Elevated</b><span>surface-2 · shadow-2</span></div><div class="rv-card rv-card--highlight"><b>Highlighted</b><span>orange edge · soft glow</span></div><div class="rv-card rv-card--elevated" style="background:var(--surface-3);box-shadow:var(--shadow-3)"><b>Dialog</b><span>surface-3 · shadow-3</span></div></div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Iconography</h2><p>Lucide, 1.75 stroke, 18px default, 24px on POS. Orange only when active.</p></div>
          <div class="icon-grid">${icons.map((n, i) => `<div class="icon-cell ${i === 1 ? "is-accent" : ""}">${ic(n)}<span>${n}</span></div>`).join("")}</div>
        </section>

        <section class="sec"><div class="sec__h"><h2>File structure</h2><p>Mirrors the Figma page order. This iteration covers 00 and 01.</p></div>
          <div class="sections-map">${sections.map(([n, t, now]) => `<div class="${now === true ? "is-now" : ""}"><b>${n}</b>${t}${now === true ? '<span class="rv-tag rv-tag--orange">This iteration</span>' : now ? '<span class="rv-tag">Auth + shell states</span>' : ""}</div>`).join("")}</div>
        </section>
      </div>`;
  }

  /* ---------- Components ---------- */
  function buildComponents() {
    const bRow = (name, spec, v) => `<tr><td>${name}<small>${spec}</small></td>
      <td>${btn({ v, label: "Sign in" })}</td>
      <td>${btn({ v, label: "Sign in", cls: "is-hover" })}</td>
      <td>${btn({ v, label: "Sign in", cls: "is-focus" })}</td>
      <td>${btn({ v, label: "Sign in", disabled: true })}</td>
      <td>${v === "primary" ? btn({ v, label: "Sign in", loading: "Signing in…" }) : '<span class="lbl">n/a</span>'}</td></tr>`;
    const dummyOtp = (vals, state, active) => otp(vals.split("").map((c) => (c === "_" ? "" : c)), { state, showActive: active, disabled: state === "disabled" });
    const mkStatic = (html) => html.replace(/ id="[^"]*"/g, "").replace(/ for="[^"]*"/g, "");
    const fld = (o) => mkStatic(field(o));
    $("#components").innerHTML = `
      <div class="sheet-intro"><h1>Components</h1><p>Reusable Rasova components with every state the Phase 1 screens need. Forced states (hover, focus) are shown statically; the prototype uses the same classes live.</p></div>
      <div class="sheet">
        <section class="sec"><div class="sec__h"><h2>Buttons</h2><p>Height 40 desktop, 48 auth CTA, 56 touch · radius 10 · Inter 600</p></div>
          <div class="spec-wrap"><table class="spec-table"><thead><tr><th>Variant</th><th>Default</th><th>Hover</th><th>Focus</th><th>Disabled</th><th>Loading</th></tr></thead><tbody>
            ${bRow("Primary", "orange-500 · black text", "primary")}${bRow("Secondary", "surface-2 · border-2", "secondary")}${bRow("Ghost", "text-2 · no fill", "ghost")}${bRow("Destructive", "error tint · error edge", "danger")}
          </tbody></table></div>
          <div class="comp-grid">
            <div class="comp"><h3>Sizes <small>md · lg · touch</small></h3><div class="inline">${btn({ v: "primary", label: "Continue" })}${btn({ v: "primary", size: "lg", label: "Continue" })}${btn({ v: "primary", size: "touch", label: "Continue" })}</div></div>
            <div class="comp"><h3>Icon buttons <small>40 × 40</small></h3><div class="inline">${btn({ v: "icon", icon: "bell", aria: "Notifications" })}${btn({ v: "icon", icon: "circle-help", aria: "Help", cls: "is-hover" })}${btn({ v: "icon", icon: "settings-2", aria: "Settings", cls: "is-focus" })}${btn({ v: "secondary", label: "Retry sync", icon: "refresh-cw" })}${btn({ v: "link", label: "Forgot password?" })}</div></div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Inputs</h2><p>Height 46 desktop, 56 touch · surface-1 · orange focus ring with soft glow</p></div>
          <div class="comp-grid">
            <div class="comp"><h3>Default</h3>${fld({ id: "c1", label: "Work email", icon: "mail", ph: "name@company.com" })}</div>
            <div class="comp"><h3>Focus</h3>${fld({ id: "c2", label: "Work email", icon: "mail", ph: "name@company.com", state: "focus" })}</div>
            <div class="comp"><h3>Filled</h3>${fld({ id: "c3", label: "Work email", icon: "mail", value: E })}</div>
            <div class="comp"><h3>Error <small>icon + text, not color alone</small></h3>${fld({ id: "c4", label: "Work email", icon: "mail", value: "aarav.mehta@spicetrail", error: "Enter a work email in the format <strong>name@company.com</strong>." })}</div>
            <div class="comp"><h3>Disabled</h3>${fld({ id: "c5", label: "Work email", icon: "mail", value: E, disabled: true })}</div>
            <div class="comp"><h3>Read-only <small>mono</small></h3>${fld({ id: "c6", label: "Device ID", icon: "hash", value: "RSV-WIN-7F3A-92C1", readonly: true, mono: true })}</div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Cards</h2><p>Radius 12 · 1px border · restrained shadow</p></div>
          <div class="comp-grid">
            <div class="rv-card"><div class="rv-card__eyebrow">Standard</div><div class="rv-card__title">Kitchen queue</div><p class="rv-card__body">Default container for grouped information on bg-1.</p></div>
            <div class="rv-card rv-card--elevated"><div class="rv-card__eyebrow">Elevated</div><div class="rv-card__title">Pairing request</div><p class="rv-card__body">Menus, popovers and anything floating above the page.</p></div>
            <div class="rv-card rv-card--highlight"><div class="rv-card__eyebrow" style="color:var(--orange-300)">Highlighted</div><div class="rv-card__title">Table 07 selected</div><p class="rv-card__body">One per view: the selected item or the number that matters most.</p></div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Status</h2><p>Each state has its own shape or icon as well as a color</p></div>
          <div class="comp-grid">
            <div class="comp"><h3>Status pills</h3><div class="inline">${status("online", "Online", "12s ago")}${status("offline", "Offline", "3 pending")}${status("syncing")}${status("success", "Success")}${status("warning", "Warning")}${status("error", "Error")}${status("info", "Info")}</div></div>
            <div class="comp"><h3>Sidebar sync card <small>always visible in the shell</small></h3><div class="stack">${["online", "offline", "syncing", "failed"].map((k) => `<div class="sync-card ${R.SYNC[k][0]}"><div class="row">${R.SYNC[k][1]}</div><div class="meta">${R.SYNC[k][2]}</div></div>`).join("")}</div></div>
            <div class="comp" style="grid-column:1/-1"><h3>Inline banners</h3><div class="comp-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
              ${banner({ tone: "error", icon: "circle-alert", title: "Email or password is incorrect", body: "Check both and try again. 2 attempts left." })}
              ${banner({ tone: "warning", icon: "wifi-off", title: "No internet connection", body: "Billing continues on this device." })}
              ${banner({ tone: "info", icon: "timer", title: "Your session expired", body: "Sign in again to continue." })}
              ${banner({ tone: "success", icon: "circle-check", title: "You're signed out", body: "Your session on this device has ended." })}
            </div></div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Navigation</h2><p>Sidebar grouped by the product model: Sell, Run the outlet, Control the business, Keep the system running</p></div>
          <div class="comp-grid">
            <div class="comp"><h3>Section label · item · hover · active</h3><div class="mini-side">${navItem("x", "Home", "house")}<div class="rv-nav-label">Sell</div>${navItem("x", "POS", "monitor", { active: true })}${navItem("x", "Online Orders", "bike", { badge: 3, hover: true })}<div class="rv-nav-label">Run the outlet</div>${navItem("x", "Kitchen", "chef-hat")}</div></div>
            <div class="comp" style="grid-column:span 2;min-width:0"><h3>Application shell <small>sidebar + header + content</small></h3><div class="shell-preview">${R.frameHTML(preset(base(), "app", "online"))}</div></div>
          </div>
        </section>

        <section class="sec"><div class="sec__h"><h2>Authentication</h2><p>OTP field, PIN keypad, password field, SSO button, step indicator</p></div>
          <div class="comp-grid">
            <div class="comp"><h3>Step indicator <small>real sequence</small></h3><div class="stack">${steps(1)}${steps(2)}${steps(3)}</div></div>
            <div class="comp"><h3>Password field <small>visibility toggle</small></h3>${fld({ id: "c7", label: "Password", type: "password", icon: "lock", value: "tandoor@2026", action: `<button type="button" class="rv-input__action" aria-label="Show password">${ic("eye")}</button>` })}${fld({ id: "c8", label: "Password", icon: "lock", value: "tandoor@2026", state: "focus", action: `<button type="button" class="rv-input__action" aria-label="Hide password">${ic("eye-off")}</button>` })}</div>
            <div class="comp"><h3>SSO button</h3>${btn({ v: "secondary", size: "lg", block: true, label: "Continue with SSO", icon: "building-2" })}${btn({ v: "secondary", size: "lg", block: true, label: "Continue with SSO", icon: "building-2", cls: "is-hover" })}</div>
            <div class="comp otp-demo"><h3>OTP field <small>active · filled · error · success</small></h3><div class="stack">${mkStatic(dummyOtp("48____", "", true))}${mkStatic(dummyOtp("482913", ""))}${mkStatic(dummyOtp("482931", "error"))}${mkStatic(dummyOtp("482913", "success"))}</div></div>
            <div class="comp"><h3>PIN dots <small>4 to 6 digits</small></h3><div class="stack" style="gap:18px;padding:8px 0">${pinDots(4, 0)}${pinDots(4, 3)}${pinDots(6, 4)}${pinDots(4, 4, "error")}${pinDots(4, 4, "success")}</div></div>
            <div class="comp keypad-demo"><h3>PIN keypad <small>72px keys · pressed</small></h3>${keypad(false, 5)}</div>
          </div>
        </section>
      </div>`;
  }

  /* ---------- Views ---------- */
  let currentView = "prototype";
  const VIEWS = ["prototype", "states", "foundations", "components"];
  const built = {};
  function setView(v) {
    if (!VIEWS.includes(v)) v = "prototype";
    currentView = v;
    VIEWS.forEach((x) => { $("#view-" + x).hidden = x !== v; $(`[data-tab="${x}"]`).setAttribute("aria-selected", String(x === v)); });
    if (!built[v]) {
      if (v === "states") buildBoard();
      if (v === "foundations") buildFoundations();
      if (v === "components") buildComponents();
      built[v] = true;
    }
    requestAnimationFrame(() => { scaleThumbs(); fit(); });
    try { history.replaceState(null, "", "#" + v); } catch (_) {}
  }
  document.querySelector(".tabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) setView(t.dataset.tab);
  });

  buildControls();
  render();
  setView((location.hash || "").slice(1) || "prototype");
  booted = true;
})();
