// ════════════════════════════════════════════════════════════════════════════
// СЕДУНОВ · Subbox Records — main.js
// ════════════════════════════════════════════════════════════════════════════
//
// КАРТА ФАЙЛА:
//   CONFIG           — TRACKS (данные для плеера), isTouch/prefersReducedMotion
//   1. NAV           — sticky shadow + мобильный бургер
//   2. REVEAL        — IntersectionObserver для появления блоков при скролле
//   3. MANIFESTO     — word-by-word подсветка цитаты + canvas-волны на фоне
//   3b. MIX SESSION  — живой мини-микшер в карточке "Сведение"
//   4. RAIL          — горизонтальный скролл треков + A/B плеер на каждой карточке
//   5. FORM          — валидация + toast при сабмите
//   6. ANCHORS       — плавный скролл по якорям с учётом высоты шапки
//   7. DVH FIX       — фикс для iOS Safari (mobile 100dvh фоллбэк)
//   8. SCROLL PROGRESS — тонкая lime-полоска под шапкой по мере прокрутки
//   9. NAV SCROLL-SPY  — подсветка текущей секции в шапке
//
// КАК ДОБАВИТЬ НОВЫЙ ТРЕК В ПОРТФОЛИО:
//   добавь объект в массив TRACKS ниже. Плеер сгенерируется автоматически.
//
// КАК ИЗМЕНИТЬ ТЕКСТ МАНИФЕСТА:
//   правь index.html секцию #manifesto-quote — оборачивай каждое слово в <span>,
//   ключевые слова помечай атрибутом data-hl. Логика подсветки запустится сама.
//
// КАК ПОМЕНЯТЬ КАНАЛЫ В MIX SESSION:
//   в index.html внутри #mix-session — добавь/убери .mix-ch с data-ch="..." и
//   data-pan="-1..1". Профили звучания регулируются в CHANNEL_PROFILES ниже.
//
// ════════════════════════════════════════════════════════════════════════════

// === CONFIG ==================================================================

/** Треки для горизонтального рейла в секции "Работы".
 *  Добавляй новые объекты сюда — карточки генерируются автоматически.
 *  Поля: title, artist, genre, duration (mm:ss), lufs (для подписи).            */
const TRACKS = [
  { title: "Окнами на север", artist: "Дарья Рипп", genre: "Indie Pop", duration: "3:51", lufs: "-14.2" },
  { title: "Пульс", artist: "The Pulse Band", genre: "Alt-Rock", duration: "4:17", lufs: "-13.8" },
  { title: "Dreams in Motion", artist: "Echo Voyage", genre: "Electronic", duration: "5:02", lufs: "-9.4" },
  { title: "Серебро и пепел", artist: "Максим Ворон", genre: "Hip-Hop", duration: "3:08", lufs: "-11.6" },
  { title: "Midnight Drive", artist: "Luna Martinez", genre: "R&B", duration: "4:28", lufs: "-13.1" },
  { title: "Тихий голос", artist: "Кирилл Echo", genre: "Acoustic", duration: "3:24", lufs: "-16.8" }
];

/** Флаги окружения для условного поведения */
const isTouch = matchMedia("(hover: none)").matches;
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// === 1. NAV ==================================================================
// Фиксированная шапка: добавляем класс .scrolled при скролле + переключаем
// мобильное меню по клику на бургер. Меню имеет backdrop, блокирует скролл
// body, закрывается по ESC, клику на оверлей и якорным ссылкам.
(() => {
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("nav-links");
  const backdrop = document.getElementById("nav-backdrop");
  if (!nav || !burger || !menu) return;

  // Throttle через requestAnimationFrame, чтобы не дёргать DOM на каждый пиксель
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle("scrolled", window.scrollY > 20);
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function openMenu() {
    menu.classList.add("open");
    burger.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    if (backdrop) backdrop.classList.add("show");
    document.body.classList.add("nav-open");
  }

  function closeMenu() {
    menu.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.classList.remove("show");
    document.body.classList.remove("nav-open");
  }

  burger.addEventListener("click", () => {
    menu.classList.contains("open") ? closeMenu() : openMenu();
  });

  if (backdrop) backdrop.addEventListener("click", closeMenu);

  // Закрываем меню при клике по любой ссылке
  menu.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", closeMenu);
  });

  // ESC закрывает меню (клавиатурная доступность)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("open")) {
      closeMenu();
      burger.focus();
    }
  });

  // Автозакрытие при ресайзе в десктоп (чтобы не остался залочен body)
  const mq = matchMedia("(min-width: 901px)");
  mq.addEventListener("change", (e) => {
    if (e.matches) closeMenu();
  });
})();

// === 2. REVEAL ===============================================================
// Все элементы с `data-reveal` получают класс .visible при попадании в viewport.
// Stagger-задержка 0–300ms между элементами, появляющимися одновременно.
(() => {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (!e.isIntersecting) return;
      const delay = Math.min(i * 50, 300);
      setTimeout(() => e.target.classList.add("visible"), delay);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -80px 0px" });

  items.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add("visible");
      return;
    }

    obs.observe(el);
  });
})();

// === 3. MANIFESTO · word-by-word reveal + canvas waveforms ==================
// Блок цитаты в отдельной секции .manifesto. Слова из <p> последовательно
// загораются цветом при попадании в viewport. Ключевые слова (data-hl)
// дополнительно получают lime-акцент и подчёркивание.
//
// Canvas .manifesto-waves на фоне — несколько плавных sin-волн (декор).
// Рисуется через requestAnimationFrame, ставится на паузу когда секция
// вне зоны видимости (энергосбережение на ноутбуках).
(() => {
  // ── Word-by-word reveal ──
  const quote = document.getElementById("manifesto-quote");
  if (quote) {
    const words = quote.querySelectorAll("p > span");
    words.forEach((w, i) => w.style.setProperty("--i", i));

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        quote.classList.add("reveal-words");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    obs.observe(quote);
  }

  // ── Canvas waveform: визуал "видео" в правой колонке ──
  const canvas = document.getElementById("manifesto-waves");
  if (!canvas || prefersReducedMotion) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * DPR;
    canvas.height = rect.height * DPR;
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Тайм-код-оверлей под визуалом
  const timeEl = document.getElementById("mvis-time");
  const startTime = Date.now();

  // Главный waveform: вертикальные столбики как на DAW-дорожке
  const BARS = 96;

  // Pre-seed фиксированный паттерн амплитуд (имитация аудио-сэмплов).
  // Чтобы столбики не мерцали хаотично, seed фиксим — меняется только огибающая.
  const pattern = Array.from({ length: BARS }, (_, i) => {
    const low = Math.sin(i * 0.08) * 0.4 + Math.sin(i * 0.03) * 0.3;
    const mid = Math.sin(i * 0.22) * 0.3;
    const high = Math.sin(i * 0.55) * 0.15 + Math.random() * 0.12;
    return Math.max(0.15, Math.min(1, 0.55 + low + mid + high));
  });

  let t = 0;
  let rafId = null;
  let running = false;

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    const midY = H * 0.5;

    ctx.clearRect(0, 0, W, H);

    const barW = W / BARS;
    const gap = barW * 0.35;
    const colW = barW - gap;
    const maxH = H * 0.78;

    // Playhead — позиция "воспроизведения", плавно движется
    const playhead = (Math.sin(t * 0.006) * 0.5 + 0.5) * BARS;

    for (let i = 0; i < BARS; i++) {
      // Огибающая: базовая амплитуда × sin-модулятор (дыхание)
      const breath = Math.sin(t * 0.012 + i * 0.15) * 0.2 + 0.8;
      const base = pattern[i] * breath;
      // Усиление около playhead'а (волна-импульс проходит по треку)
      const distance = Math.abs(i - playhead);
      const pulse = Math.max(0, 1 - distance / 18);
      const amp = base * (1 + pulse * 0.35);

      const h = amp * maxH;
      const y = midY - h / 2;
      const x = i * barW;

      // Столбики ближе к playhead — ярче
      const brightness = 0.32 + pulse * 0.68;
      ctx.fillStyle = `rgba(195, 245, 60, ${brightness})`;
      ctx.fillRect(x + gap / 2, y, colW, h);
    }

    // Вертикальная playhead-линия
    const phX = playhead * barW;
    ctx.fillStyle = "rgba(245, 245, 242, .5)";
    ctx.fillRect(phX, 0, 1.5 * DPR, H);
    // Маркер сверху
    ctx.beginPath();
    ctx.fillStyle = "#F5F5F2";
    ctx.arc(phX, 5 * DPR, 3 * DPR, 0, Math.PI * 2);
    ctx.fill();

    // Тайм-код сессии
    if (timeEl) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const ss = String(elapsed % 60).padStart(2, "0");
      timeEl.textContent = `${hh}:${mm}:${ss}`;
    }

    t += 1;
    rafId = requestAnimationFrame(draw);
  }

  function start() { if (!running) { running = true; draw(); } }
  function stop() { if (running) { running = false; cancelAnimationFrame(rafId); } }

  // Рисуем только пока секция видима (экономим батарею)
  const visObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.isIntersecting ? start() : stop());
  }, { threshold: 0 });

  visObs.observe(canvas);
})();

// === 3b. MIX SESSION · mini-DAW mixer в карточке "Сведение" =================
// Генерит живые бары-эквалайзеры в .mix-ch-wave для каждого канала.
// Разные паттерны для kick/snare/bass/vox/gtr/master — каждый канал
// "звучит" по-своему. Пан-точка позиционируется из data-pan (-1..1).
(() => {
  const mixer = document.getElementById("mix-session");
  if (!mixer || prefersReducedMotion) return;

  const BARS_PER_CH = 14;

  // Паттерны для разных каналов (индекс → base phase)
  const CHANNEL_PROFILES = {
    kick: { freq: 0.012, amp: 0.85, spike: 0.3 },  // низкий плотный пульс
    snare: { freq: 0.018, amp: 0.7, spike: 0.5 },  // резкие пики
    bass: { freq: 0.008, amp: 0.8, spike: 0.15 },  // ровный низ
    vox: { freq: 0.015, amp: 0.75, spike: 0.35 },  // средне-живо
    gtr: { freq: 0.022, amp: 0.6, spike: 0.25 },  // густо и тихо
    master: { freq: 0.014, amp: 0.9, spike: 0.2 }   // собранный микс
  };

  const channels = mixer.querySelectorAll(".mix-ch");

  channels.forEach(ch => {
    // Pan индикатор — точка смещается по слайдеру
    const pan = parseFloat(ch.dataset.pan || "0"); // -1..1
    const panEl = ch.querySelector(".mix-ch-pan i");
    if (panEl) {
      // 30px максимальный ход от центра
      panEl.style.setProperty("--p", (pan * 22) + "px");
    }

    // Заполняем волну барами
    const wave = ch.querySelector(".mix-ch-wave");
    if (!wave) return;
    for (let i = 0; i < BARS_PER_CH; i++) {
      const bar = document.createElement("div");
      bar.className = "wbar";
      bar.style.height = "3px";
      wave.appendChild(bar);
    }
  });

  // Единый animation loop для всех каналов
  let rafId = null;
  let running = false;

  function tick() {
    const now = Date.now();
    channels.forEach(ch => {
      const profile = CHANNEL_PROFILES[ch.dataset.ch] || CHANNEL_PROFILES.master;
      const bars = ch.querySelectorAll(".wbar");
      bars.forEach((b, i) => {
        const base = Math.sin(now * profile.freq + i * 0.45) * 0.5 + 0.5;
        const kick = Math.random() * profile.spike;
        const h = 3 + (base * profile.amp + kick) * 14;
        b.style.height = h + "px";
      });
    });
    rafId = requestAnimationFrame(tick);
  }

  function start() { if (!running) { running = true; tick(); } }
  function stop() { if (running) { running = false; cancelAnimationFrame(rafId); } }

  const visObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.isIntersecting ? start() : stop());
  }, { threshold: 0.1 });

  visObs.observe(mixer);
})();

// === 4. RAIL · горизонтальный плеер портфолио ===============================
// Рендерим карточки из TRACKS, каждая имеет A/B переключатель (before/after),
// плей-кнопку, прогресс-бар и live-эквалайзер (bars).
// Навигация: стрелки + свайп на мобилках.
(() => {
  const rail = document.getElementById("rail");
  const inner = document.getElementById("rail-inner");
  const prevBtn = document.getElementById("rail-prev");
  const nextBtn = document.getElementById("rail-next");
  if (!rail || !inner) return;

  // ── Рендер всех карточек из TRACKS ──
  TRACKS.forEach((tr, idx) => {
    const card = document.createElement("article");
    card.className = "tcard mode-after";          // стартуем в режиме "after"
    card.dataset.idx = idx;
    card.innerHTML = `
      <div class="tcard-head">
        <span>Трек · ${String(idx + 1).padStart(2, "0")}</span>
        <span class="genre">${tr.genre}</span>
      </div>
      <div>
        <div class="tcard-title">${tr.title}</div>
        <div class="tcard-artist">${tr.artist}</div>
      </div>
      <div class="tcard-ab" role="tablist">
        <button data-mode="before" type="button">BEFORE</button>
        <button data-mode="after" class="active" type="button">AFTER</button>
      </div>
      <div class="tcard-viz" aria-hidden="true"></div>
      <div class="tcard-controls">
        <button class="tcard-play" type="button" aria-label="Играть">
          <svg class="ico-play" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          <svg class="ico-pause" width="14" height="14" viewBox="0 0 24 24" style="display:none"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
        </button>
        <div class="tcard-progress"><div class="tcard-progress-bar"></div></div>
        <div class="tcard-time">
          <span class="cur">0:00</span> / <span>${tr.duration}</span>
        </div>
      </div>
    `;

    // Эквалайзер — 28 баров в карточке
    const vizEl = card.querySelector(".tcard-viz");
    for (let i = 0; i < 28; i++) {
      const b = document.createElement("div");
      b.className = "bar";
      b.style.height = "3px";
      vizEl.appendChild(b);
    }

    // A/B mode toggle
    const abBtns = card.querySelectorAll(".tcard-ab button");
    abBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        abBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        card.classList.remove("mode-before", "mode-after");
        card.classList.add("mode-" + btn.dataset.mode);
      });
    });

    // Плеер-логика
    const playBtn = card.querySelector(".tcard-play");
    const progressBar = card.querySelector(".tcard-progress-bar");
    const progressTrack = card.querySelector(".tcard-progress");
    const curEl = card.querySelector(".cur");
    const icoPlay = card.querySelector(".ico-play");
    const icoPause = card.querySelector(".ico-pause");
    const bars = card.querySelectorAll(".bar");

    const TOTAL = (() => {
      const [m, s] = tr.duration.split(":").map(Number);
      return m * 60 + s;
    })();

    let t = 0, playing = false, timer = null;

    const format = (sec) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    // Рендер эквалайзера
    function render() {
      bars.forEach((b, i) => {
        if (!playing) { b.style.height = "3px"; b.style.opacity = ".4"; return; }
        const mode = card.classList.contains("mode-before") ? "before" : "after";
        if (mode === "before") {
          const h = 3 + Math.random() * 10;
          b.style.height = h + "px";
          b.style.opacity = ".55";
        } else {
          const base = Math.sin(Date.now() * 0.006 + i * 0.3) * 0.5 + 0.5;
          const kick = Math.random() * 0.35;
          const h = 5 + (base * 0.7 + kick * 0.3) * 34;
          b.style.height = h + "px";
          b.style.opacity = "1";
        }
      });
    }

    function play() {
      document.querySelectorAll(".tcard.active").forEach(c => {
        if (c !== card) c.querySelector(".tcard-play")?.click();
      });

      playing = true;
      card.classList.add("active");
      icoPlay.style.display = "none";
      icoPause.style.display = "block";
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        t += 0.1;
        if (t >= TOTAL) {
          pause();
          t = 0;
          progressBar.style.width = "0%";
          curEl.textContent = "0:00";
          return;
        }
        progressBar.style.width = (t / TOTAL * 100) + "%";
        curEl.textContent = format(t);
        render();
      }, 100);
    }

    function pause() {
      playing = false;
      card.classList.remove("active");
      icoPlay.style.display = "block";
      icoPause.style.display = "none";
      if (timer) clearInterval(timer);
      bars.forEach(b => { b.style.height = "3px"; b.style.opacity = ".4"; });
    }

    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playing ? pause() : play();
    });

    progressTrack.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = progressTrack.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      t = Math.max(0, Math.min(TOTAL * ratio, TOTAL));
      progressBar.style.width = (t / TOTAL * 100) + "%";
      curEl.textContent = format(t);
    });

    inner.appendChild(card);
  });

  // ── Arrow navigation ──
  function getCardWidth() {
    const card = inner.querySelector(".tcard");
    if (!card) return 340;
    return card.offsetWidth + 16; // card width + gap
  }

  function updateArrows() {
    if (!prevBtn || !nextBtn) return;
    const atStart = rail.scrollLeft <= 10;
    const atEnd = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 10;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    // Sync mobile arrows
    if (mobPrev) mobPrev.disabled = atStart;
    if (mobNext) mobNext.disabled = atEnd;
  }

  function scrollByCards(dir) {
    const scrollAmount = getCardWidth() * dir;
    rail.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTimeout(updateArrows, 350);
  }

  if (prevBtn) prevBtn.addEventListener("click", () => scrollByCards(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => scrollByCards(1));

  // Mobile arrows (under the rail)
  const mobPrev = document.getElementById("rail-mob-prev");
  const mobNext = document.getElementById("rail-mob-next");
  if (mobPrev) mobPrev.addEventListener("click", () => scrollByCards(-1));
  if (mobNext) mobNext.addEventListener("click", () => scrollByCards(1));

  // ── Mobile wave canvas: линия между стрелками, превращается в волну при скролле ──
  const waveCanvas = document.getElementById("rail-mob-wave");
  if (waveCanvas && !prefersReducedMotion) {
    const wCtx = waveCanvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let waveEnergy = 0; // 0 = прямая линия, 1 = полная волна

    function resizeWave() {
      const rect = waveCanvas.getBoundingClientRect();
      waveCanvas.width = rect.width * DPR;
      waveCanvas.height = rect.height * DPR;
    }
    resizeWave();
    window.addEventListener("resize", resizeWave, { passive: true });

    let lastScroll = rail.scrollLeft;
    let waveRaf = null;

    function drawWave() {
      const W = waveCanvas.width;
      const H = waveCanvas.height;
      const midY = H / 2;

      wCtx.clearRect(0, 0, W, H);

      // Плавное затухание энергии
      waveEnergy *= 0.92;
      if (waveEnergy < 0.005) waveEnergy = 0;

      wCtx.beginPath();
      wCtx.moveTo(0, midY);

      const segments = 60;
      const segW = W / segments;

      for (let i = 0; i <= segments; i++) {
        const x = i * segW;
        const t = i / segments;
        // Огибающая: сильнее в центре, затухает к краям
        const envelope = Math.sin(t * Math.PI);
        // Волна: несколько частот для органичности
        const wave1 = Math.sin(t * Math.PI * 6 + Date.now() * 0.004) * 0.6;
        const wave2 = Math.sin(t * Math.PI * 10 + Date.now() * 0.007) * 0.3;
        const wave3 = Math.sin(t * Math.PI * 14 + Date.now() * 0.003) * 0.1;
        const amplitude = (H * 0.35) * waveEnergy * envelope;
        const y = midY + (wave1 + wave2 + wave3) * amplitude;
        wCtx.lineTo(x, y);
      }

      // Цвет: от dim-серого (покой) до лайма (активность)
      const r = Math.round(138 + (195 - 138) * waveEnergy);
      const g = Math.round(138 + (245 - 138) * waveEnergy);
      const b = Math.round(133 + (60 - 133) * waveEnergy);
      const alpha = 0.4 + waveEnergy * 0.6;
      wCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      wCtx.lineWidth = 1.5 * DPR;
      wCtx.stroke();

      if (waveEnergy > 0.005) {
        waveRaf = requestAnimationFrame(drawWave);
      } else {
        // Рисуем финальную прямую линию в покое
        wCtx.clearRect(0, 0, W, H);
        wCtx.beginPath();
        wCtx.moveTo(0, midY);
        wCtx.lineTo(W, midY);
        wCtx.strokeStyle = "rgba(138, 138, 133, .4)";
        wCtx.lineWidth = 1 * DPR;
        wCtx.stroke();
        waveRaf = null;
      }
    }

    // Начальная прямая линия
    function drawStaticLine() {
      resizeWave();
      const W = waveCanvas.width;
      const H = waveCanvas.height;
      wCtx.clearRect(0, 0, W, H);
      wCtx.beginPath();
      wCtx.moveTo(0, H / 2);
      wCtx.lineTo(W, H / 2);
      wCtx.strokeStyle = "rgba(138, 138, 133, .4)";
      wCtx.lineWidth = 1 * DPR;
      wCtx.stroke();
    }
    drawStaticLine();

    // При скролле рейла — подаём энергию в волну
    rail.addEventListener("scroll", () => {
      const delta = Math.abs(rail.scrollLeft - lastScroll);
      lastScroll = rail.scrollLeft;
      // Чем быстрее скролл, тем больше энергии (но не больше 1)
      waveEnergy = Math.min(1, waveEnergy + delta * 0.008);
      if (!waveRaf) {
        waveRaf = requestAnimationFrame(drawWave);
      }
    }, { passive: true });
  }

  rail.addEventListener("scroll", () => {
    requestAnimationFrame(updateArrows);
  }, { passive: true });

  // Initial state
  setTimeout(updateArrows, 100);
})();

// === 5. FORM · отправка заявки ==============================================
// Валидация по полям (имя + контакт обязательны, формат контакта проверяется),
// показ inline-ошибок под полями, счётчик символов для textarea, имитация
// отправки с loading-состоянием кнопки, инлайн-экран успеха вместо toast.
// Поддержка выбора пакета из секции тарифов.
(() => {
  const form = document.getElementById("contact-form");
  const toast = document.getElementById("toast");
  if (!form) return;

  const nameInput = form.querySelector("#f-name");
  const contactInput = form.querySelector("#f-contact");
  const messageInput = form.querySelector("#f-message");
  const messageCount = form.querySelector("#f-message-count");
  const successEl = form.querySelector("#form-success");
  const resetBtn = form.querySelector("#form-reset");
  const submitBtn = form.querySelector("button[type=submit]");

  // ── Package selection from pricing section ──
  const packageNote = document.getElementById("form-package-note");
  const packageText = document.getElementById("form-package-text");
  const packageInput = document.getElementById("f-package");
  const packageClear = document.getElementById("package-clear");

  document.querySelectorAll("[data-package]").forEach(btn => {
    btn.addEventListener("click", () => {
      const pkg = btn.dataset.package;
      if (packageNote && packageText && packageInput) {
        packageNote.hidden = false;
        packageText.textContent = "Пакет: " + pkg;
        packageInput.value = pkg;
      }
    });
  });

  if (packageClear) {
    packageClear.addEventListener("click", () => {
      if (packageNote && packageInput) {
        packageNote.hidden = true;
        packageInput.value = "";
      }
    });
  }

  // ── Toast (резервный канал уведомлений для ошибок) ──
  let toastTimer = null;
  function showToast(msg, ms = 3500) {
    if (!toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.removeAttribute("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.setAttribute("hidden", ""), 300);
    }, ms);
  }

  // ── Валидация ──
  // Email: простая, но достаточная проверка (не RFC 5322, а "понятно пользователю")
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // Telegram: @username / username / t.me/username / https://t.me/username
  const tgRe = /^(?:@|https?:\/\/t\.me\/|t\.me\/)?[a-zA-Z][a-zA-Z0-9_]{3,31}$/;

  function setError(input, message) {
    const field = input.closest(".field");
    if (!field) return;
    const err = field.querySelector(".field-err");
    if (err) {
      err.textContent = message;
      err.hidden = false;
    }
    field.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(input) {
    const field = input.closest(".field");
    if (!field) return;
    const err = field.querySelector(".field-err");
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    field.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
  }

  function validateName(input) {
    const v = (input.value || "").trim();
    if (!v) { setError(input, "Укажите имя, чтобы я знал, как к вам обращаться"); return false; }
    if (v.length < 2) { setError(input, "Имя слишком короткое"); return false; }
    clearError(input);
    return true;
  }

  function validateContact(input) {
    const v = (input.value || "").trim();
    if (!v) { setError(input, "Нужен Telegram или email, чтобы ответить"); return false; }
    if (!emailRe.test(v) && !tgRe.test(v)) {
      setError(input, "Похоже на опечатку. Пример: @username или you@mail.com");
      return false;
    }
    clearError(input);
    return true;
  }

  // Валидация на blur (после потери фокуса), чтобы не раздражать при вводе
  if (nameInput) {
    nameInput.addEventListener("blur", () => validateName(nameInput));
    nameInput.addEventListener("input", () => {
      if (nameInput.closest(".field")?.classList.contains("has-error")) validateName(nameInput);
    });
  }
  if (contactInput) {
    contactInput.addEventListener("blur", () => validateContact(contactInput));
    contactInput.addEventListener("input", () => {
      if (contactInput.closest(".field")?.classList.contains("has-error")) validateContact(contactInput);
    });
  }

  // Счётчик символов для textarea
  if (messageInput && messageCount) {
    const limit = parseInt(messageInput.getAttribute("maxlength") || "800", 10);
    const updateCount = () => {
      const n = messageInput.value.length;
      messageCount.textContent = `${n} / ${limit}`;
      messageCount.classList.toggle("near-limit", n >= limit * 0.9);
    };
    messageInput.addEventListener("input", updateCount);
    updateCount();
  }

  // Ресет формы для повторной отправки
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form.classList.remove("is-submitted");
      if (successEl) successEl.hidden = true;
      form.reset();
      if (packageNote) packageNote.hidden = true;
      if (packageInput) packageInput.value = "";
      if (messageCount) messageCount.textContent = "0 / 800";
      [nameInput, contactInput].forEach(el => el && clearError(el));
      nameInput?.focus();
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Валидируем оба обязательных поля одновременно (чтобы показать все ошибки сразу)
    const nameOk = validateName(nameInput);
    const contactOk = validateContact(contactInput);

    if (!nameOk || !contactOk) {
      // Скролл к первому ошибочному полю и фокус
      const firstErr = form.querySelector(".field.has-error input, .field.has-error textarea");
      if (firstErr) {
        firstErr.focus({ preventScroll: true });
        firstErr.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      }
      showToast("Проверьте заполненные поля");
      return;
    }

    // Loading state
    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    const originalLabel = submitBtn.querySelector(".form-submit-label")?.textContent;
    const labelEl = submitBtn.querySelector(".form-submit-label");
    if (labelEl) labelEl.textContent = "Отправляю…";

    // Реальная отправка в Netlify Forms (AJAX — остаёмся на странице).
    // Netlify принимает форму POST-ом на "/" с form-urlencoded телом (включая form-name).
    const restoreBtn = () => {
      submitBtn.classList.remove("is-loading");
      submitBtn.disabled = false;
      if (labelEl && originalLabel) labelEl.textContent = originalLabel;
    };
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        restoreBtn();
        // Показываем инлайн-успех
        form.classList.add("is-submitted");
        if (successEl) {
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
        }
      })
      .catch(() => {
        restoreBtn();
        showToast("Не удалось отправить. Напишите в Telegram @Blindfo1d");
      });
  });
})();

// === 6. ANCHORS · плавный скролл по якорям ==================================
// Учитываем высоту шапки (--nav-h из CSS). При prefers-reduced-motion — без
// smooth-behavior (мгновенный переход).
(() => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 68;
      const y = target.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo({
        top: y,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });
  });
})();

// === 7. DVH FIX · iOS Safari fallback =======================================
// Фикс для старых мобильных браузеров, где 100dvh не работает корректно.
// Кастомная --vh переменная на документе.
(() => {
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }
  setVH();
  window.addEventListener("resize", setVH, { passive: true });
  window.addEventListener("orientationchange", setVH, { passive: true });
})();

// === 8. SCROLL PROGRESS · тонкая lime-линия под nav =========================
// Вычисляем процент прокрутки от общей высоты документа и выставляем
// --progress на элементе .scroll-progress. Выполняется через rAF-throttle.
(() => {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;

  let ticking = false;
  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.setProperty("--progress", pct + "%");
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
})();

// === 9. NAV SCROLL-SPY · активная секция в шапке ============================
// IntersectionObserver отслеживает все секции c id. Активной считается
// та, что ближе к верху viewport. Ссылка в nav с соответствующим href
// получает класс .active — подсвечивается lime-чипом.
(() => {
  const links = document.querySelectorAll(".nav-links a[href^='#']");
  if (!links.length) return;

  const sectionIds = Array.from(links)
    .map(a => a.getAttribute("href").slice(1))
    .filter(Boolean);

  const sections = sectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  // Map: section id → link element
  const linkMap = new Map();
  links.forEach(a => linkMap.set(a.getAttribute("href").slice(1), a));

  function setActive(id) {
    links.forEach(a => a.classList.remove("active"));
    const active = linkMap.get(id);
    if (active) active.classList.add("active");
  }

  // rootMargin: активируем секцию когда её верх пересекает линию ~30% сверху
  const obs = new IntersectionObserver((entries) => {
    // Собираем все пересекающиеся и берём самую верхнюю по top
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;
    visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    setActive(visible[0].target.id);
  }, {
    rootMargin: "-30% 0px -60% 0px",
    threshold: 0
  });

  sections.forEach(s => obs.observe(s));
})();
