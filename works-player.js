/* ════════════════════════════════════════════════════════════════════════════
   works-player.js — плееры секции «Работы» на лендинге.
   Самодостаточный (свой AudioBus). Данные — /audio/home-works/manifest.json.
   Стили — players.css. Классы совпадают с портфолио.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const escHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (s) => { if (!isFinite(s) || s < 0) s = 0; const m = Math.floor(s / 60), x = Math.floor(s % 60); return m + ":" + String(x).padStart(2, "0"); };
  const enc = (p) => String(p).split("/").map(encodeURIComponent).join("/");
  const ICON_PLAY = '<svg class="ico-play" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
  const ICON_PAUSE = '<svg class="ico-pause" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';

  const Bus = (function () {
    let cur = null;
    return { activate(u) { if (cur && cur !== u && cur.stop) cur.stop(); cur = u; }, deactivate(u) { if (cur === u) cur = null; }, get current() { return cur; } };
  })();
  document.addEventListener("visibilitychange", () => { if (document.hidden && Bus.current && Bus.current.stop) Bus.current.stop(); });

  function createListPlayer(listEl, tracks) {
    const audio = new Audio(); audio.preload = "metadata";
    const rows = []; let idx = -1;
    tracks.forEach((t, i) => {
      const li = document.createElement("li"); li.className = "trk"; li.tabIndex = 0;
      const sub = [t.artist, t.genre].filter(Boolean).map(escHTML).join('<span class="dot">·</span>');
      const label = (t.artist ? t.artist + " — " : "") + t.title;
      li.innerHTML =
        '<button class="trk-btn" type="button" aria-label="Слушать · ' + escHTML(label) + '">' + ICON_PLAY + ICON_PAUSE + "</button>" +
        '<div class="trk-main"><div class="trk-title">' + escHTML(t.title) + "</div>" + (sub ? '<div class="trk-sub">' + sub + "</div>" : "") + "</div>" +
        '<div class="trk-time">' + fmt(t.duration) + "</div>" +
        '<div class="trk-seek"><span class="trk-cur">0:00</span><input class="seek" type="range" min="0" max="' + Math.max(1, Math.round(t.duration || 1)) + '" step="0.1" value="0" aria-label="Перемотка трека"></div>';
      listEl.appendChild(li);
      const row = { li, btn: $(".trk-btn", li), seek: $(".seek", li), cur: $(".trk-cur", li), src: enc(t.file), dur: t.duration || 0 };
      rows[i] = row;
      row.btn.addEventListener("click", () => toggle(i));
      row.seek.addEventListener("input", () => { if (i === idx) { audio.currentTime = parseFloat(row.seek.value); paint(); } });
    });
    function loadRow(i) {
      idx = i; audio.src = rows[i].src; const r = rows[i];
      audio.addEventListener("loadedmetadata", function m() { audio.removeEventListener("loadedmetadata", m); if (isFinite(audio.duration)) { r.seek.max = audio.duration; r.li.querySelector(".trk-time").textContent = fmt(audio.duration); } });
    }
    function play(i) { if (i !== idx) { if (rows[idx]) rows[idx].li.classList.remove("playing"); loadRow(i); } Bus.activate(unit); audio.play().catch(() => {}); rows[i].li.classList.add("playing"); }
    function pause() { audio.pause(); if (rows[idx]) rows[idx].li.classList.remove("playing"); }
    function toggle(i) { if (i === idx && !audio.paused) pause(); else play(i); }
    function seekBy(d) { if (idx < 0) return; audio.currentTime = clamp(audio.currentTime + d, 0, audio.duration || rows[idx].dur); paint(); }
    function paint() { if (idx < 0) return; const r = rows[idx], dur = audio.duration || r.dur || 1; r.seek.value = audio.currentTime; r.seek.style.setProperty("--fill", (audio.currentTime / dur) * 100 + "%"); r.cur.textContent = fmt(audio.currentTime); }
    audio.addEventListener("timeupdate", paint);
    audio.addEventListener("ended", () => { if (rows[idx]) rows[idx].li.classList.remove("playing"); audio.currentTime = 0; paint(); });
    listEl.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") { if (e.target.closest(".trk-btn")) return; e.preventDefault(); const row = e.target.closest(".trk"); const i = row ? rows.findIndex((r) => r.li === row) : (idx < 0 ? 0 : idx); toggle(i < 0 ? 0 : i); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seekBy(5); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(-5); }
    });
    const unit = { stop() { pause(); Bus.deactivate(unit); } };
    return unit;
  }

  function createABPlayer(pair) {
    const card = document.createElement("article"); card.className = "ab-card"; card.tabIndex = 0;
    const meta = [pair.genre, pair.year].filter(Boolean).join(" · ");
    card.innerHTML =
      '<div class="ab-head"><div class="ab-title">' + escHTML(pair.title) + (pair.artist ? ' <span class="ab-artist">— ' + escHTML(pair.artist) + "</span>" : "") + "</div>" +
      (meta ? '<div class="ab-meta"><span class="tag">' + escHTML(meta) + "</span></div>" : "") + "</div>" +
      '<div class="ab-transport"><button class="ab-play" type="button" aria-label="Play / pause">' + ICON_PLAY + ICON_PAUSE + "</button>" +
      '<input class="seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="Перемотка"><span class="ab-time">0:00 / 0:00</span></div>' +
      '<div class="ab-switch" role="group" aria-label="Версия">' +
      '<button class="ab-opt ab-opt-before" type="button" data-v="before" aria-pressed="true">ДО<small>без обработки</small></button>' +
      '<button class="ab-opt ab-opt-after" type="button" data-v="after" aria-pressed="false">ПОСЛЕ<small>сведение + мастеринг</small></button></div>';
    const before = new Audio(enc(pair.before)), after = new Audio(enc(pair.after));
    [before, after].forEach((a) => (a.preload = "metadata"));
    before.volume = 1; after.volume = 0;
    let active = "before", playing = false, fadeTimer = null;
    const playBtn = $(".ab-play", card), seek = $(".seek", card), timeEl = $(".ab-time", card), opts = [...card.querySelectorAll(".ab-opt")];
    const lead = () => (active === "before" ? before : after), follow = () => (active === "before" ? after : before);
    function crossfade(toV) {
      const inEl = toV === "after" ? after : before, outEl = toV === "after" ? before : after;
      clearInterval(fadeTimer); const steps = 8; let i = 0;
      fadeTimer = setInterval(() => { i++; const p = i / steps; inEl.volume = clamp(p, 0, 1); outEl.volume = clamp(1 - p, 0, 1); if (i >= steps) { clearInterval(fadeTimer); inEl.volume = 1; outEl.volume = 0; } }, 5);
    }
    function switchTo(v) { if (v === active) return; follow().currentTime = lead().currentTime; active = v; crossfade(v); opts.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v))); }
    function icons() { card.classList.toggle("playing", playing); }
    function play() { Bus.activate(unit); follow().currentTime = lead().currentTime; Promise.all([before.play().catch(() => {}), after.play().catch(() => {})]); playing = true; icons(); }
    function pause() { before.pause(); after.pause(); playing = false; icons(); }
    function paint() { const l = lead(), dur = l.duration || 0; if (seek.max != dur && isFinite(dur) && dur > 0) seek.max = dur; seek.value = l.currentTime; seek.style.setProperty("--fill", (dur ? (l.currentTime / dur) * 100 : 0) + "%"); timeEl.textContent = fmt(l.currentTime) + " / " + fmt(dur); }
    function drift() { const l = lead(), f = follow(); if (!f.seeking && Math.abs(f.currentTime - l.currentTime) > 0.06) f.currentTime = l.currentTime; }
    [before, after].forEach((a) => a.addEventListener("timeupdate", () => { drift(); paint(); }));
    before.addEventListener("loadedmetadata", paint);
    [before, after].forEach((a) => a.addEventListener("ended", () => { pause(); before.currentTime = 0; after.currentTime = 0; paint(); }));
    playBtn.addEventListener("click", () => (playing ? pause() : play()));
    seek.addEventListener("input", () => { before.currentTime = parseFloat(seek.value); after.currentTime = parseFloat(seek.value); paint(); });
    opts.forEach((b) => b.addEventListener("click", () => switchTo(b.dataset.v)));
    card.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") { if (e.target.closest("button")) return; e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const d = e.key === "ArrowRight" ? 5 : -5; const v = clamp(lead().currentTime + d, 0, lead().duration || 0); before.currentTime = v; after.currentTime = v; paint(); }
    });
    const unit = { stop() { pause(); Bus.deactivate(unit); } };
    return card;
  }

  async function boot() {
    const abEl = $("#home-ab"), listEl = $("#home-tracks");
    if (!abEl || !listEl) return;
    try {
      const data = await fetch("/audio/home-works/manifest.json").then((r) => r.json());
      (data.ab || []).forEach((p) => abEl.appendChild(createABPlayer(p)));
      createListPlayer(listEl, data.tracks || []);
    } catch (e) { console.warn("home-works manifest error", e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
