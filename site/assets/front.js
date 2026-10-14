// Front page behaviour. Everything here is a mockup: sign-in, seats and
// balances are simulated in the browser until the backend exists.
(function () {
  "use strict";

  var GAME_TZ = "Europe/Berlin";
  var GAME_DAY = 0; // Sunday
  var GAME_HOUR = 16;
  var SEATS = 8;
  var COLLECT_MINUTES = 777;

  var $ = function (id) { return document.getElementById(id); };
  var state = { signedIn: false, seated: false, taken: 5, collectAt: 0 };

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  // ---- Next game night in Berlin time ----------------------------------
  function zoneParts(date) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: GAME_TZ, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short"
    }).formatToParts(date);
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return out;
  }
  function zoneOffsetMs(date) {
    var p = zoneParts(date);
    var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
  }
  function nextGameNight(now) {
    var p = zoneParts(now);
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var dow = days.indexOf(p.weekday);
    var ahead = (GAME_DAY - dow + 7) % 7;
    var wall = Date.UTC(+p.year, +p.month - 1, +p.day + ahead, GAME_HOUR, 0, 0);
    var target = new Date(wall - zoneOffsetMs(new Date(wall)));
    if (target.getTime() <= now.getTime()) {
      wall = Date.UTC(+p.year, +p.month - 1, +p.day + ahead + 7, GAME_HOUR, 0, 0);
      target = new Date(wall - zoneOffsetMs(new Date(wall)));
    }
    return target;
  }

  var target = nextGameNight(new Date());
  (function labelDate() {
    var date = new Intl.DateTimeFormat("en-GB", { timeZone: GAME_TZ, weekday: "long", day: "numeric", month: "long" }).format(target);
    var zone = new Intl.DateTimeFormat("en-GB", { timeZone: GAME_TZ, timeZoneName: "short" })
      .formatToParts(target).filter(function (x) { return x.type === "timeZoneName"; })[0];
    $("next-date").textContent = date + " · " + GAME_HOUR + ":00 " + (zone ? zone.value : "Berlin");
  })();

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function tick() {
    var ms = target.getTime() - Date.now();
    if (ms <= 0) { target = nextGameNight(new Date()); ms = target.getTime() - Date.now(); }
    var s = Math.floor(ms / 1000);
    $("cd-d").textContent = Math.floor(s / 86400);
    $("cd-h").textContent = pad(Math.floor(s / 3600) % 24);
    $("cd-m").textContent = pad(Math.floor(s / 60) % 60);
    $("cd-s").textContent = pad(s % 60);
    renderCollect();
  }

  // ---- Seats -----------------------------------------------------------
  var regulars = [];
  function renderSeats() {
    var row = $("seat-row");
    row.textContent = "";
    for (var i = 0; i < SEATS; i++) {
      var seat = document.createElement("span");
      seat.className = "seat";
      if (i < state.taken) { seat.className += " taken"; seat.textContent = regulars[i] || ""; }
      if (state.seated && i === state.taken) { seat.className += " taken mine"; seat.textContent = "Y"; }
      row.appendChild(seat);
    }
    $("seat-count").textContent = state.taken + (state.seated ? 1 : 0);
    var btn = $("rsvp");
    if (!state.signedIn) btn.textContent = "Sign in to take a seat";
    else if (state.seated) btn.textContent = "Give up your seat";
    else btn.textContent = "Take a seat";
  }

  // ---- Collect (777 minutes, like =collect) ----------------------------
  function renderCollect() {
    var btn = $("collect"), label = $("collect-time");
    if (!state.signedIn) { btn.disabled = true; label.textContent = "sign in to see"; return; }
    var left = state.collectAt - Date.now();
    if (left <= 0) { btn.disabled = false; label.textContent = "ready now"; return; }
    btn.disabled = true;
    var m = Math.ceil(left / 60000);
    label.textContent = "in " + Math.floor(m / 60) + " h " + pad(m % 60) + " min";
  }

  // ---- Sign in (mock Discord OAuth) ------------------------------------
  var balance = 172400;
  function renderAccount() {
    $("login").hidden = state.signedIn;
    $("me").hidden = !state.signedIn;
    $("me-bal").textContent = balance.toLocaleString("en-US");
    renderSeats();
    renderCollect();
  }
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  $("login").addEventListener("click", function () {
    state.signedIn = true;
    store("lc.signedIn", true);
    renderAccount();
    toast("Signed in with Discord (mockup)");
  });
  $("logout").addEventListener("click", function () {
    state.signedIn = false;
    state.seated = false;
    store("lc.signedIn", false);
    renderAccount();
  });
  $("rsvp").addEventListener("click", function () {
    if (!state.signedIn) { $("login").click(); return; }
    state.seated = !state.seated;
    renderSeats();
    toast(state.seated ? "Seat taken. See you Sunday." : "Seat released.");
  });
  $("collect").addEventListener("click", function () {
    balance += 17000;
    state.collectAt = Date.now() + COLLECT_MINUTES * 60000;
    store("lc.collectAt", state.collectAt);
    renderAccount();
    toast("Collected 17,000 dragons");
  });

  // ---- The way down ----------------------------------------------------
  // The daemon page is meant to be found: the faint sigil in the footer,
  // or typing "daemon" anywhere on the page.
  function descend(href) {
    var veil = $("veil");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { location.href = href; return; }
    veil.classList.add("on");
    setTimeout(function () { location.href = href; }, 700);
  }
  $("sigil").addEventListener("click", function (e) {
    e.preventDefault();
    descend(this.getAttribute("href"));
  });
  var typed = "";
  document.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (!e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === "daemon") descend("daemon.html");
  });
  window.addEventListener("pageshow", function () { $("veil").classList.remove("on"); });

  state.signedIn = store("lc.signedIn") === true;
  state.collectAt = store("lc.collectAt") || 0;
  renderAccount();
  tick();
  setInterval(tick, 1000);
})();
