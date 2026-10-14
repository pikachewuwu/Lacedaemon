// Daemon page: the ripple field, the convergence simulator and the
// emission chart. No dependencies.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =====================================================================
  // Field: a dot grid fixed behind the page, aligned to page coordinates
  // so it scrolls with the content. The hero word is drawn into it.
  // =====================================================================
  var canvas = document.getElementById("field");
  var ctx = canvas.getContext("2d");
  var word = document.querySelector(".wordmark");

  var W = 0, H = 0, dpr = 1, S = 16;
  var mask = null;          // Uint8Array over grid cells covering the word
  var maskCol0 = 0, maskRow0 = 0, maskCols = 0, maskRows = 0;
  var ripples = [];         // {x, y (page px), t0 (ms), amp}
  var pointer = { x: -9999, y: -9999, active: false };
  var BUCKETS = 12;
  var buckets = [];
  for (var b = 0; b < BUCKETS; b++) buckets.push([]);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    // Dot pitch follows the word size so the letters always get a few dots
    // per stroke, from dense on phones to airy on wide screens.
    var wordSize = word ? parseFloat(getComputedStyle(word).fontSize) : 160;
    S = Math.max(7, Math.min(14, Math.round(wordSize / 13)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildMask();
    if (reduceMotion) draw(performance.now());
  }

  // Render the word offscreen at its layout position, then sample it onto
  // the dot grid. Cells that land inside a glyph become letter dots.
  function buildMask() {
    if (!word) return;
    var rect = word.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var style = getComputedStyle(word);
    var size = parseFloat(style.fontSize);
    var off = document.createElement("canvas");
    var w = Math.ceil(rect.width), h = Math.ceil(rect.height);
    if (!w || !h) return;
    off.width = w; off.height = h;
    var o = off.getContext("2d");
    o.fillStyle = "#fff";
    o.font = style.fontWeight + " " + size + "px " + style.fontFamily;
    if ("letterSpacing" in o) o.letterSpacing = style.letterSpacing;
    o.textBaseline = "middle";
    o.fillText(word.textContent.trim(), 0, h / 2);
    var data = o.getImageData(0, 0, w, h).data;

    maskCol0 = Math.floor(rect.left / S);
    maskRow0 = Math.floor(top / S);
    maskCols = Math.ceil((rect.left + w) / S) - maskCol0 + 1;
    maskRows = Math.ceil((top + h) / S) - maskRow0 + 1;
    mask = new Uint8Array(maskCols * maskRows);
    var hit = 0;
    for (var r = 0; r < maskRows; r++) {
      for (var c = 0; c < maskCols; c++) {
        var px = Math.round((maskCol0 + c) * S - rect.left);
        var py = Math.round((maskRow0 + r) * S - top);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        if (data[(py * w + px) * 4 + 3] > 110) { mask[r * maskCols + c] = 1; hit++; }
      }
    }
    // Only hide the real text once the dots can carry the word.
    word.classList.toggle("drawn", hit > 40);
  }

  function isLetter(col, row) {
    if (!mask) return false;
    var c = col - maskCol0, r = row - maskRow0;
    if (c < 0 || r < 0 || c >= maskCols || r >= maskRows) return false;
    return mask[r * maskCols + c] === 1;
  }

  var V = 560;       // ripple speed, px/s
  var BAND = 46;     // wavefront thickness
  var LIFE = 3.6;    // seconds

  function draw(now) {
    var scrollY = window.scrollY;
    ctx.clearRect(0, 0, W, H);
    for (var k = 0; k < BUCKETS; k++) buckets[k].length = 0;

    ripples = ripples.filter(function (r) { return (now - r.t0) / 1000 < LIFE; });

    var row0 = Math.floor(scrollY / S) - 1;
    var row1 = Math.ceil((scrollY + H) / S) + 1;
    var cols = Math.ceil(W / S) + 1;
    var px = pointer.x, py = pointer.y + scrollY;

    for (var row = row0; row <= row1; row++) {
      var y = row * S;
      for (var col = 0; col < cols; col++) {
        var x = col * S;
        var letter = isLetter(col, row);
        var a = letter ? 0.92 : 0.12;
        var size = letter ? 2.6 : 1.4;
        var dx = 0, dy = 0;

        for (var i = 0; i < ripples.length; i++) {
          var rp = ripples[i];
          var t = Math.max(0, (now - rp.t0) / 1000);
          var ex = x - rp.x, ey = y - rp.y;
          var d = Math.sqrt(ex * ex + ey * ey) || 1;
          var delta = d - V * t;
          if (delta > BAND * 2.5 || delta < -BAND * 2.5) continue;
          var env = Math.exp(-(delta * delta) / (BAND * BAND)) * Math.exp(-t * 1.15) * rp.amp;
          var push = Math.sin((delta / BAND) * Math.PI) * 9 * env;
          dx += (ex / d) * push;
          dy += (ey / d) * push;
          a += env * (letter ? 0.1 : 0.85);
          size += env * 1.3;
        }

        if (pointer.active) {
          var qx = x - px, qy = y - py;
          var q = qx * qx + qy * qy;
          if (q < 14400) { var g = 1 - q / 14400; a += g * g * 0.35; }
        }

        if (a > 1) a = 1;
        var bi = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS));
        buckets[bi].push(x + dx, y + dy - scrollY, size);
      }
    }

    for (var bk = 0; bk < BUCKETS; bk++) {
      var list = buckets[bk];
      if (!list.length) continue;
      ctx.fillStyle = "rgba(255,255,255," + ((bk + 0.5) / BUCKETS).toFixed(3) + ")";
      ctx.beginPath();
      for (var j = 0; j < list.length; j += 3) {
        var s = list[j + 2];
        ctx.rect(list[j] - s / 2, list[j + 1] - s / 2, s, s);
      }
      ctx.fill();
    }

    // The visible ring itself
    for (var m = 0; m < ripples.length; m++) {
      var r2 = ripples[m];
      var t2 = Math.max(0, (now - r2.t0) / 1000);
      var alpha = 0.5 * Math.exp(-t2 * 1.5) * r2.amp;
      if (alpha < 0.01) continue;
      ctx.strokeStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r2.x, r2.y - scrollY, V * t2, 0, Math.PI * 2);
      ctx.stroke();
      if (t2 < 0.25) {
        ctx.fillStyle = "rgba(255,255,255," + (0.8 * (1 - t2 / 0.25)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(r2.x, r2.y - scrollY, 3 + t2 * 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function addRipple(clientX, clientY, amp) {
    ripples.push({ x: clientX, y: clientY + window.scrollY, t0: performance.now(), amp: amp });
    if (ripples.length > 10) ripples.shift();
  }

  var running = false;
  function loop(now) {
    if (document.hidden) { running = false; return; }
    draw(now);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(loop);
  }

  window.addEventListener("pointerdown", function (e) {
    if (reduceMotion) return;
    addRipple(e.clientX, e.clientY, 1);
  }, { passive: true });
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.active = false; });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function () { if (reduceMotion) draw(performance.now()); }, { passive: true });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });

  // The daemon breathes: a faint pulse from somewhere inside the word.
  function heartbeat() {
    if (!reduceMotion && !document.hidden && word) {
      var rect = word.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < H) {
        addRipple(rect.left + Math.random() * rect.width, rect.top + rect.height * (0.3 + Math.random() * 0.4), 0.35);
      }
    }
    setTimeout(heartbeat, 5200 + Math.random() * 3000);
  }

  resize();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
    resize();
    if (!reduceMotion && word) {
      var r = word.getBoundingClientRect();
      addRipple(r.left + r.width * 0.5, r.top + r.height * 0.5, 0.8);
    }
  });
  start();
  setTimeout(heartbeat, 2400);

  // =====================================================================
  // Convergence simulator, per the whitepaper:
  //   rank pools by size; the smallest takes half the emission; the two
  //   largest fight by rock-paper-scissors for the other half; winners
  //   split their tranche by commit^1.5 and keep their stake. Forfeited
  //   stakes are added to the two winning tranches in equal halves.
  // =====================================================================
  var EMISSION = 7200;
  var YOU = 1000;
  var CHOICES = ["rock", "paper", "scissors"];
  var BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
  var pick = "rock";
  var commits = null;

  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function deal() {
    commits = { rock: [], paper: [], scissors: [] };
    for (var i = 0; i < 6; i++) {
      var side = CHOICES[Math.floor(Math.random() * 3)];
      commits[side].push(100 * (1 + Math.floor(Math.random() * 30)));
    }
    commits[pick].push(YOU);
  }

  var poolsEl = document.getElementById("pools");
  var verdictEl = document.getElementById("verdict");
  function renderPools(result) {
    poolsEl.textContent = "";
    var totals = {};
    CHOICES.forEach(function (c) { totals[c] = commits ? commits[c].reduce(function (a, b) { return a + b; }, 0) : 0; });
    var max = Math.max(1, totals.rock, totals.paper, totals.scissors);
    CHOICES.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "pool";
      if (result) row.className += result.winners.indexOf(c) >= 0 ? " won" : " lost";
      var name = document.createElement("span"); name.className = "pool-name"; name.textContent = c + (c === pick ? " ·" : "");
      var bar = document.createElement("span"); bar.className = "pool-bar";
      var fill = document.createElement("i");
      fill.style.setProperty("--w", result ? (100 * totals[c] / max).toFixed(1) + "%" : "0%");
      bar.appendChild(fill);
      var amt = document.createElement("span"); amt.className = "pool-amt";
      amt.textContent = result ? fmt(totals[c]) : "hidden";
      var note = document.createElement("span"); note.className = "pool-note";
      if (result) note.textContent = result.notes[c] || "";
      row.appendChild(name); row.appendChild(bar); row.appendChild(amt); row.appendChild(note);
      poolsEl.appendChild(row);
    });
  }

  function resolve() {
    var totals = {};
    CHOICES.forEach(function (c) { totals[c] = commits[c].reduce(function (a, b) { return a + b; }, 0); });
    var ranked = CHOICES.slice().sort(function (a, b) { return totals[b] - totals[a]; });
    var largest = ranked[0], second = ranked[1], underdog = ranked[2];
    var notes = {};
    var verdict;

    if (totals[second] === 0) {
      notes[largest] = "no opponents, stakes returned";
      return { winners: [], notes: notes, verdict: "Everyone picked " + largest + ". With one pool there is nothing to resolve, so every stake is returned and nothing is minted." };
    }
    if (totals[underdog] === 0) {
      // Only two pools exist: they fight for the whole emission.
      var w = BEATS[largest] === second ? largest : second;
      var l = w === largest ? second : largest;
      notes[w] = "wins the fight for all " + fmt(EMISSION);
      notes[l] = "forfeits " + fmt(totals[l]);
      return finish([w], totals, notes, function (tr) { tr[w] = EMISSION + totals[l]; });
    }
    var fightWinner = BEATS[largest] === second ? largest : second;
    var loser = fightWinner === largest ? second : largest;
    notes[underdog] = "smallest pool, takes half";
    notes[fightWinner] = cap(fightWinner) + " beats " + loser + ", takes half";
    notes[loser] = "forfeits " + fmt(totals[loser]);
    return finish([underdog, fightWinner], totals, notes, function (tr) {
      tr[underdog] = EMISSION / 2 + totals[loser] / 2;
      tr[fightWinner] = EMISSION / 2 + totals[loser] / 2;
    });

    function finish(winners, _t, notesOut, fillTranches) {
      var tranche = {};
      fillTranches(tranche);
      if (winners.indexOf(pick) >= 0) {
        var pool = commits[pick];
        var sum = pool.reduce(function (a, c) { return a + Math.pow(c, 1.5); }, 0);
        var share = Math.pow(YOU, 1.5) / sum;
        var gain = share * tranche[pick];
        verdict = "You win. Your stake comes back plus " + fmt(gain) + " DAEMON, a " + (share * 100).toFixed(1) + "% share of " + cap(pick) + "'s tranche.";
      } else {
        verdict = "You lose your 1,000. " + cap(pick) + " was beaten. Conviction is a risk.";
      }
      return { winners: winners, notes: notesOut, verdict: verdict };
    }
  }

  var resolveBtn = document.getElementById("resolve");
  var resolved = false;
  function reset() {
    deal();
    resolved = false;
    renderPools(null);
    verdictEl.textContent = "Pools are hidden until the window closes.";
    resolveBtn.textContent = "Resolve";
  }
  resolveBtn.addEventListener("click", function () {
    if (resolved) { reset(); return; }
    var result = resolve();
    renderPools(result);
    verdictEl.textContent = result.verdict;
    resolveBtn.textContent = "New cycle";
    resolved = true;
  });
  Array.prototype.forEach.call(document.querySelectorAll(".pick"), function (btn) {
    btn.addEventListener("click", function () {
      pick = btn.getAttribute("data-pick");
      document.querySelectorAll(".pick").forEach(function (b2) { b2.setAttribute("aria-checked", b2 === btn ? "true" : "false"); });
      reset();
    });
  });
  reset();

  // =====================================================================
  // Emission chart: d(t+1) = floor(0.9 * d(t)) each year, cumulative
  // supply clipped at the 21,000,000 cap. Threshold cuts are not modelled.
  // =====================================================================
  var CAP = 21000000;
  var years = [];
  var daily = 7200, total = 0, capYear = null;
  for (var yr = 1; yr <= 24; yr++) {
    var minted = Math.min(daily * 365, CAP - total);
    total += minted;
    years.push({ year: yr, daily: daily, total: total });
    if (total >= CAP && capYear === null) capYear = yr;
    daily = Math.floor(daily * 0.9);
  }

  var facts = document.getElementById("emission-facts");
  [["Year 1", years[0].daily], ["Year 5", years[4].daily], ["Year 10", years[9].daily]].forEach(function (f) {
    var dt = document.createElement("dt"); dt.textContent = f[0] + " daily";
    var dd = document.createElement("dd"); dd.textContent = fmt(f[1]);
    facts.appendChild(dt); facts.appendChild(dd);
  });
  var dtc = document.createElement("dt"); dtc.textContent = "Cap reached";
  var ddc = document.createElement("dd"); ddc.textContent = capYear ? "year " + capYear : "beyond year 24";
  facts.appendChild(dtc); facts.appendChild(ddc);

  var svg = document.getElementById("emission-chart");
  var NS = "http://www.w3.org/2000/svg";
  var VW = 640, VH = 320, L = 56, R = 16, T = 26, B = 34;
  svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    svg.appendChild(n);
    return n;
  }
  var maxYear = years.length;
  function sx(y) { return L + (y / maxYear) * (VW - L - R); }
  function sy(v) { return T + (1 - v / CAP) * (VH - T - B); }

  [0, 5000000, 10000000, 15000000].forEach(function (v) {
    el("line", { x1: L, x2: VW - R, y1: sy(v), y2: sy(v), "class": "grid" });
    el("text", { x: L - 8, y: sy(v) + 4, "text-anchor": "end" }, v === 0 ? "0" : v / 1e6 + "M");
  });
  el("line", { x1: L, x2: VW - R, y1: sy(CAP), y2: sy(CAP), "class": "cap" });
  el("text", { x: L - 8, y: sy(CAP) + 4, "text-anchor": "end", "class": "cap-label" }, "21M");
  [0, 4, 8, 12, 16, 20, 24].forEach(function (y) {
    el("text", { x: sx(y), y: VH - 12, "text-anchor": "middle" }, y === 0 ? "year 0" : String(y));
  });

  // Annual emission as faint bars, on the same supply axis.
  var bw = (VW - L - R) / maxYear;
  var prev = 0;
  years.forEach(function (p) {
    var minted = p.total - prev; prev = p.total;
    if (minted <= 0) return;
    el("rect", { x: sx(p.year - 1) + bw * 0.2, y: sy(minted), width: bw * 0.6, height: sy(0) - sy(minted), "class": "bar" });
  });

  var pts = [[sx(0), sy(0)]].concat(years.map(function (p) { return [sx(p.year), sy(p.total)]; }));
  var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  el("path", { d: d + " L" + sx(maxYear) + " " + sy(0) + " L" + sx(0) + " " + sy(0) + " Z", "class": "area" });
  el("path", { d: d, "class": "curve" });
  if (capYear) {
    el("circle", { cx: sx(capYear), cy: sy(CAP), r: 3.5, "class": "end" });
    el("text", { x: sx(capYear), y: sy(CAP) - 10, "text-anchor": "middle", "class": "cap-label" }, "cap · year " + capYear);
  }
  el("text", { x: VW - R, y: sy(years[2].total - years[1].total) - 8, "text-anchor": "end" }, "bars: minted per year");
})();
