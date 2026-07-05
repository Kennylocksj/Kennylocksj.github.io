/* ════════════════════════════════════════════════════════════════════════════
   СЕДУНОВ · /portfolio — portfolio.js
   Ванильный JS, без зависимостей. HTML5 Audio.

   1. NAV / REVEAL / SCROLL   — те же поведения, что на лендинге
   2. AudioBus                — один активный плеер на страницу
   3. ListPlayer              — ambient + showcase (список треков)
   4. ABPlayer                — «до/после» (2 <audio>, mute/unmute + кроссфейд)
   5. Lazy YouTube            — click-to-load фасады (никаких запросов до клика)
   6. boot()                  — загрузка manifest.json и сборка
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── утилиты ── */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const escHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function fmtTime(s) { if (!isFinite(s) || s < 0) s = 0; const m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ":" + String(sec).padStart(2, "0"); }
  // Кодирует каждый сегмент пути (кириллица в именах файлов → безопасный URL)
  function encPath(base, rel) { return base + String(rel).split("/").map(encodeURIComponent).join("/"); }

  // Язык страницы (ru | en) — из <html lang>. Тексты и поля манифеста подбираются под язык.
  const LANG = (document.documentElement.getAttribute("lang") || "ru").toLowerCase().indexOf("en") === 0 ? "en" : "ru";
  const T = LANG === "en"
    ? { listen: "Listen · ", seekTrack: "Seek", seek: "Seek", version: "Version", all: "All", beforeTop: "BEFORE", beforeSub: "raw", afterTop: "AFTER", afterSub: "mix + master", coverCap: (p, a) => "“" + p + "” — exhibition by " + a }
    : { listen: "Слушать · ", seekTrack: "Перемотка трека", seek: "Перемотка", version: "Версия", all: "Все", beforeTop: "ДО", beforeSub: "без обработки", afterTop: "ПОСЛЕ", afterSub: "сведение + мастеринг", coverCap: (p, a) => "«" + p + "» — выставка " + a };
  const pick = (o, key) => (o && o[key + "_" + LANG]) || (o && o[key]) || "";
  const gTitle = (t) => pick(t, "title");
  const gGenre = (t) => pick(t, "genre");
  const gNote = (t) => (LANG === "en" ? t.note_en : t.note) || "";

  const ICON_PLAY = '<svg class="ico-play" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
  const ICON_PAUSE = '<svg class="ico-pause" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';

  /* ═══ 1. NAV / REVEAL / SCROLL ═══ */
  function initChrome() {
    const nav = $("#nav"), burger = $("#burger"), menu = $("#nav-links"), backdrop = $("#nav-backdrop");
    const progress = $("#scroll-progress");

    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 20);
      if (progress) {
        const h = document.documentElement;
        const p = h.scrollHeight > h.clientHeight ? window.scrollY / (h.scrollHeight - h.clientHeight) : 0;
        progress.style.transform = "scaleX(" + clamp(p, 0, 1) + ")";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (burger && menu) {
      const open = () => { menu.classList.add("open"); burger.classList.add("open"); burger.setAttribute("aria-expanded", "true"); backdrop && backdrop.classList.add("show"); document.body.classList.add("nav-open"); };
      const close = () => { menu.classList.remove("open"); burger.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); backdrop && backdrop.classList.remove("show"); document.body.classList.remove("nav-open"); };
      burger.addEventListener("click", () => (burger.classList.contains("open") ? close() : open()));
      backdrop && backdrop.addEventListener("click", close);
      $$(".nav-links a").forEach((a) => a.addEventListener("click", close));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && burger.classList.contains("open")) { close(); burger.focus(); } });
    }

    // Reveal (тот же класс .visible, что и на лендинге)
    const items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("visible")); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => obs.observe(el));
  }

  /* ═══ 2. AudioBus — один активный плеер ═══ */
  const Bus = (function () {
    let current = null;
    return {
      activate(unit) { if (current && current !== unit && current.stop) current.stop(); current = unit; },
      deactivate(unit) { if (current === unit) current = null; },
      get current() { return current; },
    };
  })();
  // Пауза при уходе на другую вкладку
  document.addEventListener("visibilitychange", () => { if (document.hidden && Bus.current && Bus.current.stop) Bus.current.stop(); });

  /* ═══ 3. ListPlayer (ambient + showcase) ═══ */
  function createListPlayer(listEl, tracks, opts) {
    const audio = new Audio();
    audio.preload = "metadata";
    const rows = [];
    let idx = -1; // активный трек

    tracks.forEach((t, i) => {
      const li = document.createElement("li");
      li.className = "trk";
      li.tabIndex = 0;
      li.dataset.genre = gGenre(t).toLowerCase();
      const sub = opts.subHTML(t);
      li.innerHTML =
        '<button class="trk-btn" type="button" aria-label="' + escHTML(T.listen + opts.label(t)) + '">' + ICON_PLAY + ICON_PAUSE + "</button>" +
        '<div class="trk-main"><div class="trk-title">' + opts.titleHTML(t, i) + "</div>" + (sub ? '<div class="trk-sub">' + sub + "</div>" : "") + "</div>" +
        '<div class="trk-time">' + fmtTime(t.duration) + "</div>" +
        '<div class="trk-seek"><span class="trk-cur">0:00</span><input class="seek" type="range" min="0" max="' + Math.max(1, Math.round(t.duration || 1)) + '" step="0.1" value="0" aria-label="' + T.seekTrack + '"></div>';
      listEl.appendChild(li);
      const row = { li, btn: $(".trk-btn", li), seek: $(".seek", li), cur: $(".trk-cur", li), src: opts.srcFor(t), dur: t.duration || 0 };
      rows[i] = row;
      row.btn.addEventListener("click", () => toggle(i));
      row.seek.addEventListener("input", () => { if (i === idx) { audio.currentTime = parseFloat(row.seek.value); paint(); } });
    });

    function loadRow(i) {
      idx = i;
      audio.src = rows[i].src;
      const r = rows[i];
      audio.addEventListener("loadedmetadata", function onmeta() {
        audio.removeEventListener("loadedmetadata", onmeta);
        if (isFinite(audio.duration)) { r.seek.max = audio.duration; r.li.querySelector(".trk-time").textContent = fmtTime(audio.duration); }
      });
    }
    function play(i) {
      if (i !== idx) { if (rows[idx]) rows[idx].li.classList.remove("playing"); loadRow(i); }
      Bus.activate(unit);
      audio.play().catch(() => {});
      rows[i].li.classList.add("playing");
    }
    function pause() { audio.pause(); if (rows[idx]) rows[idx].li.classList.remove("playing"); }
    function toggle(i) { if (i === idx && !audio.paused) pause(); else play(i); }
    function seekBy(d) { if (idx < 0) return; audio.currentTime = clamp(audio.currentTime + d, 0, audio.duration || rows[idx].dur); paint(); }
    function paint() {
      if (idx < 0) return;
      const r = rows[idx], dur = audio.duration || r.dur || 1;
      r.seek.value = audio.currentTime;
      r.seek.style.setProperty("--fill", (audio.currentTime / dur) * 100 + "%");
      r.cur.textContent = fmtTime(audio.currentTime);
    }

    audio.addEventListener("timeupdate", paint);
    audio.addEventListener("ended", () => { if (rows[idx]) rows[idx].li.classList.remove("playing"); audio.currentTime = 0; paint(); });

    // Клавиатура: space = play/pause, ←/→ = ±5с
    listEl.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") {
        if (e.target.closest(".trk-btn")) return; // нативный клик кнопки сам сработает
        e.preventDefault();
        const row = e.target.closest(".trk");
        const i = row ? rows.findIndex((r) => r.li === row) : (idx < 0 ? 0 : idx);
        toggle(i < 0 ? 0 : i);
      } else if (e.key === "ArrowRight") { e.preventDefault(); seekBy(5); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(-5); }
    });

    const unit = { stop() { pause(); Bus.deactivate(unit); } };
    return unit;
  }

  /* ═══ 4. ABPlayer — «до/после» ═══ */
  function createABPlayer(pair) {
    const card = document.createElement("article");
    card.className = "ab-card";
    card.tabIndex = 0;
    const meta = [gGenre(pair), pair.year].filter(Boolean).join(" · ");
    card.innerHTML =
      '<div class="ab-head"><div class="ab-title">' + escHTML(gTitle(pair)) +
      (pair.artist ? ' <span class="ab-artist">— ' + escHTML(pair.artist) + "</span>" : "") + "</div>" +
      (meta ? '<div class="ab-meta"><span class="tag">' + escHTML(meta) + "</span></div>" : "") + "</div>" +
      '<div class="ab-transport">' +
      '<button class="ab-play" type="button" aria-label="Play / pause">' + ICON_PLAY + ICON_PAUSE + "</button>" +
      '<input class="seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="' + T.seek + '">' +
      '<span class="ab-time">0:00 / 0:00</span></div>' +
      '<div class="ab-switch" role="group" aria-label="' + T.version + '">' +
      '<button class="ab-opt ab-opt-before" type="button" data-v="before" aria-pressed="true">' + T.beforeTop + '<small>' + T.beforeSub + '</small></button>' +
      '<button class="ab-opt ab-opt-after" type="button" data-v="after" aria-pressed="false">' + T.afterTop + '<small>' + T.afterSub + '</small></button>' +
      "</div>";

    const before = new Audio(encPath("/audio/works/", pair.before));
    const after = new Audio(encPath("/audio/works/", pair.after));
    [before, after].forEach((a) => (a.preload = "metadata"));
    before.volume = 1; after.volume = 0; // mute/unmute через volume, без доп. gain
    let active = "before", playing = false, fadeTimer = null;

    const playBtn = $(".ab-play", card), seek = $(".seek", card), timeEl = $(".ab-time", card);
    const opts = $$(".ab-opt", card);

    function lead() { return active === "before" ? before : after; }
    function follow() { return active === "before" ? after : before; }

    function crossfade(toV) {
      const inEl = toV === "after" ? after : before, outEl = toV === "after" ? before : after;
      clearInterval(fadeTimer);
      const steps = 8; let i = 0;                    // ~40мс: без щелчков
      fadeTimer = setInterval(() => {
        i++; const p = i / steps;
        inEl.volume = clamp(p, 0, 1); outEl.volume = clamp(1 - p, 0, 1);
        if (i >= steps) { clearInterval(fadeTimer); inEl.volume = 1; outEl.volume = 0; }
      }, 5);
    }
    function switchTo(v) {
      if (v === active) return;
      follow().currentTime = lead().currentTime; // не сбрасываем playhead
      active = v;
      crossfade(v);
      opts.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    }
    function updateIcons() { card.classList.toggle("playing", playing); }
    function play() {
      Bus.activate(unit);
      follow().currentTime = lead().currentTime;
      Promise.all([before.play().catch(() => {}), after.play().catch(() => {})]);
      playing = true; updateIcons();
    }
    function pause() { before.pause(); after.pause(); playing = false; updateIcons(); }
    function toggle() { playing ? pause() : play(); }

    function paint() {
      const l = lead(), dur = l.duration || 0;
      if (seek.max != dur && isFinite(dur) && dur > 0) seek.max = dur;
      seek.value = l.currentTime;
      seek.style.setProperty("--fill", (dur ? (l.currentTime / dur) * 100 : 0) + "%");
      timeEl.textContent = fmtTime(l.currentTime) + " / " + fmtTime(dur);
    }
    function syncDrift() { const l = lead(), f = follow(); if (!f.seeking && Math.abs(f.currentTime - l.currentTime) > 0.06) f.currentTime = l.currentTime; }

    [before, after].forEach((a) => a.addEventListener("timeupdate", () => { syncDrift(); paint(); }));
    before.addEventListener("loadedmetadata", paint);
    lead0Ended();
    function lead0Ended() { [before, after].forEach((a) => a.addEventListener("ended", () => { pause(); before.currentTime = 0; after.currentTime = 0; paint(); })); }

    playBtn.addEventListener("click", toggle);
    seek.addEventListener("input", () => { before.currentTime = parseFloat(seek.value); after.currentTime = parseFloat(seek.value); paint(); });
    opts.forEach((b) => b.addEventListener("click", () => switchTo(b.dataset.v)));

    card.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") { if (e.target.closest("button")) return; e.preventDefault(); toggle(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); const v = clamp(lead().currentTime + 5, 0, lead().duration || 0); before.currentTime = v; after.currentTime = v; paint(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); const v = clamp(lead().currentTime - 5, 0, lead().duration || 0); before.currentTime = v; after.currentTime = v; paint(); }
    });

    const unit = { stop() { pause(); Bus.deactivate(unit); } };
    return card;
  }

  /* ═══ 5. Lazy YouTube (click-to-load) ═══ */
  function initYouTube() {
    $$(".yt-facade").forEach((f) => {
      if (f.dataset.poster) f.style.backgroundImage = 'url("' + f.dataset.poster + '")';
      const btn = $(".yt-btn", f);
      if (!btn) return;
      btn.addEventListener("click", () => {
        const id = f.dataset.yt, list = f.dataset.list, start = f.dataset.start;
        const q = "autoplay=1&rel=0&modestbranding=1" + (list ? "&list=" + encodeURIComponent(list) : "") + (start ? "&start=" + encodeURIComponent(start) : "");
        const iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?" + q;
        iframe.title = f.dataset.label || "YouTube";
        iframe.loading = "lazy";
        iframe.allow = "accelerated-sensors; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
        iframe.allowFullscreen = true;
        f.innerHTML = "";
        f.appendChild(iframe);
      }, { once: true });
    });
  }

  /* ═══ 5b. Жанровые мини-вкладки ═══ */
  function initGenreTabs(tabsEl, listEl, tracks) {
    if (!tabsEl) return;
    const genres = [];
    tracks.forEach((t) => { const g = gGenre(t).trim(); if (g && !genres.includes(g)) genres.push(g); });
    if (genres.length < 2) { tabsEl.remove(); return; }
    const opts = [{ key: "*", label: T.all }].concat(genres.map((g) => ({ key: g.toLowerCase(), label: g })));
    opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "genre-tab"; b.dataset.key = o.key;
      b.setAttribute("aria-pressed", String(i === 0));
      b.textContent = o.label;
      b.addEventListener("click", () => {
        tabsEl.querySelectorAll(".genre-tab").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        listEl.querySelectorAll(".trk").forEach((row) => { row.hidden = !(o.key === "*" || row.dataset.genre === o.key); });
      });
      tabsEl.appendChild(b);
    });
  }

  /* ═══ 6. boot ═══ */
  async function boot() {
    initChrome();
    initYouTube();

    // Ambient
    try {
      const amb = await fetch("/audio/ambient/manifest.json").then((r) => r.json());
      if (amb.cover) {
        const fig = $("#ambient-cover"), img = $("#ambient-cover-img");
        img.alt = T.coverCap(pick(amb, "project"), pick(amb, "artist"));
        img.onload = () => { fig.hidden = false; };
        img.onerror = () => { fig.hidden = true; };
        img.src = amb.cover; // если файла нет — figure остаётся скрытой, вёрстка не ломается
      }
      createListPlayer($("#ambient-tracks"), amb.tracks, {
        srcFor: (t) => encPath("/audio/ambient/", t.file),
        label: (t) => gTitle(t),
        titleHTML: (t) => '<span class="trk-num">' + String(t.n).padStart(2, "0") + "</span>" + escHTML(gTitle(t)),
        subHTML: () => "",
      });
    } catch (e) { console.warn("ambient manifest error", e); }

    // A/B «до/после»
    try {
      const works = await fetch("/audio/works/manifest.json").then((r) => r.json());
      const grid = $("#ab-grid");
      works.pairs.forEach((p) => grid.appendChild(createABPlayer(p)));
    } catch (e) { console.warn("works manifest error", e); }

    // Showcase
    try {
      const show = await fetch("/audio/mixing-showcase/manifest.json").then((r) => r.json());
      createListPlayer($("#showcase-tracks"), show.tracks, {
        srcFor: (t) => encPath("/audio/mixing-showcase/", t.file),
        label: (t) => (t.artist ? t.artist + " — " : "") + gTitle(t),
        titleHTML: (t) => escHTML(gTitle(t)),
        subHTML: (t) => [t.artist, gGenre(t), gNote(t)].filter(Boolean).map(escHTML).join('<span class="dot">·</span>'),
      });
      initGenreTabs($("#showcase-tabs"), $("#showcase-tracks"), show.tracks);
    } catch (e) { console.warn("showcase manifest error", e); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
