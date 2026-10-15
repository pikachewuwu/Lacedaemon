/**
 * The Daemon field: a dot grid fixed behind the page, aligned to page
 * coordinates so it scrolls with the content. One element (the wordmark)
 * is drawn into it as brighter dots. Every click sends a white ripple
 * through the grid; the word breathes on its own every few seconds.
 */
export function startField(canvas: HTMLCanvasElement, word: HTMLElement | null): () => void {
  const ctx = canvas.getContext("2d")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, S = 16, dpr = 1;
  let mask: Uint8Array | null = null;
  let col0 = 0, row0 = 0, cols = 0, rows = 0;
  const ripples: { x: number; y: number; t0: number; amp: number }[] = [];
  const pointer = { x: -9999, y: -9999, on: false };
  const BUCKETS = 12;
  const buckets: number[][] = Array.from({ length: BUCKETS }, () => []);
  const V = 560, BAND = 46, LIFE = 3.6;
  let raf = 0, alive = true;
  let beat: ReturnType<typeof setTimeout>;

  function buildMask() {
    mask = null;
    if (!word) return;
    const rect = word.getBoundingClientRect();
    const top = rect.top + scrollY;
    const st = getComputedStyle(word);
    const w = Math.ceil(rect.width), h = Math.ceil(rect.height);
    if (!w || !h) return;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const o = off.getContext("2d")!;
    o.fillStyle = "#fff";
    o.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    if ("letterSpacing" in o) (o as unknown as { letterSpacing: string }).letterSpacing = st.letterSpacing;
    o.textBaseline = "middle";
    o.fillText((word.textContent ?? "").trim(), 0, h / 2);
    const data = o.getImageData(0, 0, w, h).data;
    col0 = Math.floor(rect.left / S);
    row0 = Math.floor(top / S);
    cols = Math.ceil((rect.left + w) / S) - col0 + 1;
    rows = Math.ceil((top + h) / S) - row0 + 1;
    mask = new Uint8Array(cols * rows);
    let hit = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const px = Math.round((col0 + c) * S - rect.left);
        const py = Math.round((row0 + r) * S - top);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        if (data[(py * w + px) * 4 + 3] > 110) {
          mask[r * cols + c] = 1;
          hit++;
        }
      }
    word.classList.toggle("drawn", hit > 40);
  }

  const letter = (c: number, r: number) => {
    if (!mask) return false;
    const x = c - col0, y = r - row0;
    return x >= 0 && y >= 0 && x < cols && y < rows && mask[y * cols + x] === 1;
  };

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    const size = word ? parseFloat(getComputedStyle(word).fontSize) : 160;
    S = Math.max(7, Math.min(14, Math.round(size / 13)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildMask();
    draw(performance.now());
  }

  function draw(now: number) {
    const sy = scrollY;
    ctx.clearRect(0, 0, W, H);
    for (const b of buckets) b.length = 0;
    for (let i = ripples.length - 1; i >= 0; i--) if ((now - ripples[i].t0) / 1000 > LIFE) ripples.splice(i, 1);
    const r0 = Math.floor(sy / S) - 1, r1 = Math.ceil((sy + H) / S) + 1, nc = Math.ceil(W / S) + 1;
    const px = pointer.x, py = pointer.y + sy;
    // The deeper you scroll, the darker and quieter the field.
    const depth = Math.min(1, sy / Math.max(1, document.documentElement.scrollHeight - H));
    const base = 0.11 * (1 - depth * 0.65);
    for (let row = r0; row <= r1; row++) {
      const y = row * S;
      for (let col = 0; col < nc; col++) {
        const x = col * S;
        const L = letter(col, row);
        let a = L ? 0.92 : base, size = L ? 2.6 : 1.4, dx = 0, dy = 0;
        for (const rp of ripples) {
          const t = Math.max(0, (now - rp.t0) / 1000);
          const ex = x - rp.x, ey = y - rp.y;
          const d = Math.sqrt(ex * ex + ey * ey) || 1;
          const delta = d - V * t;
          if (delta > BAND * 2.5 || delta < -BAND * 2.5) continue;
          const env = Math.exp(-(delta * delta) / (BAND * BAND)) * Math.exp(-t * 1.15) * rp.amp;
          const push = Math.sin((delta / BAND) * Math.PI) * 9 * env;
          dx += (ex / d) * push;
          dy += (ey / d) * push;
          a += env * (L ? 0.1 : 0.85);
          size += env * 1.3;
        }
        if (pointer.on) {
          const qx = x - px, qy = y - py, q = qx * qx + qy * qy;
          if (q < 14400) { const g = 1 - q / 14400; a += g * g * 0.35; }
        }
        if (a > 1) a = 1;
        buckets[Math.min(BUCKETS - 1, Math.floor(a * BUCKETS))].push(x + dx, y + dy - sy, size);
      }
    }
    for (let b = 0; b < BUCKETS; b++) {
      const list = buckets[b];
      if (!list.length) continue;
      ctx.fillStyle = `rgba(242,240,236,${((b + 0.5) / BUCKETS).toFixed(3)})`;
      ctx.beginPath();
      for (let j = 0; j < list.length; j += 3) ctx.rect(list[j] - list[j + 2] / 2, list[j + 1] - list[j + 2] / 2, list[j + 2], list[j + 2]);
      ctx.fill();
    }
    for (const rp of ripples) {
      const t = Math.max(0, (now - rp.t0) / 1000);
      const alpha = 0.5 * Math.exp(-t * 1.5) * rp.amp;
      if (alpha < 0.01) continue;
      ctx.strokeStyle = `rgba(242,240,236,${alpha.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y - sy, V * t, 0, Math.PI * 2);
      ctx.stroke();
      if (t < 0.25) {
        ctx.fillStyle = `rgba(242,240,236,${(0.8 * (1 - t / 0.25)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y - sy, 3 + t * 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const ripple = (cx: number, cy: number, amp: number) => {
    ripples.push({ x: cx, y: cy + scrollY, t0: performance.now(), amp });
    if (ripples.length > 10) ripples.shift();
  };

  const loop = (now: number) => {
    if (!alive) return;
    if (!document.hidden) draw(now);
    raf = requestAnimationFrame(loop);
  };

  const onDown = (e: PointerEvent) => !reduce && ripple(e.clientX, e.clientY, 1);
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.on = true;
  };
  const onLeave = () => (pointer.on = false);
  const onScroll = () => reduce && draw(performance.now());

  const heartbeat = () => {
    if (!reduce && !document.hidden && word) {
      const r = word.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H) ripple(r.left + Math.random() * r.width, r.top + r.height * (0.3 + Math.random() * 0.4), 0.35);
    }
    beat = setTimeout(heartbeat, 5200 + Math.random() * 3000);
  };

  resize();
  addEventListener("resize", resize);
  addEventListener("pointerdown", onDown, { passive: true });
  addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  addEventListener("scroll", onScroll, { passive: true });
  document.fonts?.ready.then(() => {
    if (!alive) return;
    resize();
    if (!reduce && word) {
      const r = word.getBoundingClientRect();
      ripple(r.left + r.width / 2, r.top + r.height / 2, 0.8);
    }
  });
  if (!reduce) raf = requestAnimationFrame(loop);
  beat = setTimeout(heartbeat, 2400);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(beat);
    removeEventListener("resize", resize);
    removeEventListener("pointerdown", onDown);
    removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    removeEventListener("scroll", onScroll);
  };
}
