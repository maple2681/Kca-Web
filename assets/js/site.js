
/* Photo strip: whole cards move from slot to slot, morphing into each curved shape */
(() => {
  const strip = document.getElementById('rvStrip');
  if (!strip) return;
  // Add or swap photos here (7+ recommended)
  const photos = ['assets/img/game-night.jpg', 'assets/img/study-outdoors.jpg', 'assets/img/students-field.jpg', 'assets/img/life-track.jpg', 'assets/img/life-locker.jpg', 'assets/img/lockers.jpg', 'assets/img/school-building.jpg', 'assets/img/life-bus.jpg', 'assets/img/chalkboard.jpg'];
  const colors = ['#ddf34c', '#f3af42', '#cabffd', '#ff9e85', '#d286c4'];
  // Slot outlines traced from the design (percent of the strip): lime, orange, lavender, peach, pink
  const base = [{"pts": [[0.424, 22.949], [0.891, 22.667], [1.341, 22.253], [1.791, 21.836], [2.241, 21.419], [2.691, 21.001], [3.141, 20.584], [3.591, 20.167], [4.041, 19.75], [4.492, 19.332], [4.959, 19.051], [5.409, 18.637], [5.868, 18.291], [6.327, 17.942], [6.794, 17.663], [7.257, 17.348], [7.754, 16.968], [7.669, 21.911], [7.627, 26.912], [7.542, 31.856], [7.458, 36.799], [7.415, 41.8], [7.331, 46.744], [7.288, 51.744], [7.246, 56.745], [7.246, 61.804], [7.246, 66.863], [7.246, 71.921], [7.29, 76.919], [7.373, 81.866], [7.5, 86.751], [7.593, 91.683], [7.754, 96.662], [7.257, 96.662], [6.777, 96.523], [6.279, 96.523], [5.799, 96.384], [5.319, 96.245], [4.824, 96.224], [4.348, 96.053], [3.872, 95.882], [3.399, 95.688], [2.919, 95.549], [2.457, 95.271], [1.977, 95.132], [1.514, 94.854], [1.052, 94.576], [0.59, 94.298], [0.085, 94.019], [0.0, 89.69], [0.0, 85.164], [0.0, 80.639], [0.0, 76.113], [0.0, 71.587], [0.0, 67.061], [0.0, 62.535], [0.0, 58.009], [0.0, 53.483], [0.0, 48.957], [0.0, 44.432], [0.0, 39.906], [0.0, 35.38], [0.0, 30.854], [0.0, 26.328]], "box": [0.0, 16.968, 7.797, 79.833]}, {"pts": [[9.492, 15.855], [10.87, 15.299], [12.231, 14.604], [13.609, 14.047], [14.988, 13.491], [16.348, 12.796], [17.727, 12.239], [19.105, 11.683], [20.466, 10.987], [21.845, 10.431], [23.21, 9.771], [24.584, 9.179], [25.962, 8.623], [27.325, 7.945], [28.701, 7.371], [30.08, 6.815], [31.483, 6.12], [31.441, 11.99], [31.441, 17.918], [31.441, 23.846], [31.441, 29.773], [31.483, 35.644], [31.525, 41.514], [31.568, 47.384], [31.653, 53.197], [31.737, 59.009], [31.822, 64.822], [31.949, 70.577], [32.034, 76.39], [32.119, 82.202], [32.246, 87.957], [32.331, 93.77], [32.415, 99.722], [30.965, 99.722], [29.516, 99.722], [28.066, 99.722], [26.633, 99.861], [25.184, 99.861], [23.734, 99.861], [22.284, 99.861], [20.852, 99.722], [19.402, 99.722], [17.97, 99.583], [16.555, 99.305], [15.14, 99.026], [13.725, 98.748], [12.328, 98.331], [10.919, 98.009], [9.492, 97.497], [9.407, 92.408], [9.28, 87.378], [9.195, 82.29], [9.11, 77.201], [9.025, 72.113], [8.941, 67.025], [8.898, 61.879], [8.898, 56.676], [8.898, 51.473], [8.898, 46.269], [8.983, 41.181], [9.025, 36.035], [9.11, 30.947], [9.237, 25.916], [9.364, 20.886]], "box": [8.898, 6.12, 23.559, 93.88]}, {"pts": [[34.237, 5.007], [36.006, 4.729], [37.775, 4.451], [39.526, 4.033], [41.294, 3.755], [43.045, 3.338], [44.806, 3.0], [46.565, 2.643], [48.316, 2.225], [50.085, 1.947], [51.853, 1.669], [53.616, 1.344], [55.39, 1.113], [57.159, 0.834], [58.928, 0.556], [60.714, 0.417], [62.373, 0.974], [62.542, 6.832], [62.754, 12.633], [62.952, 18.453], [63.136, 24.292], [63.329, 30.119], [63.517, 35.952], [63.675, 41.826], [63.814, 47.726], [63.941, 53.642], [64.068, 59.558], [64.153, 65.532], [64.237, 71.506], [64.28, 77.537], [64.322, 83.568], [64.364, 89.6], [64.11, 95.132], [62.287, 95.414], [60.481, 95.828], [58.675, 96.245], [56.868, 96.662], [55.062, 97.079], [53.256, 97.497], [51.448, 97.891], [49.627, 98.192], [47.803, 98.47], [45.98, 98.748], [44.156, 99.026], [42.315, 99.166], [40.474, 99.305], [38.633, 99.444], [36.774, 99.444], [35.042, 98.748], [34.915, 92.979], [34.746, 87.268], [34.619, 81.499], [34.492, 75.731], [34.407, 69.904], [34.322, 64.078], [34.237, 58.251], [34.195, 52.367], [34.153, 46.483], [34.153, 40.542], [34.153, 34.6], [34.153, 28.658], [34.153, 22.717], [34.195, 16.833], [34.195, 10.891]], "box": [34.153, 0.278, 30.254, 99.305]}, {"pts": [[65.254, 0.556], [66.668, 0.417], [68.082, 0.278], [69.495, 0.139], [70.909, 0.0], [72.34, 0.0], [73.772, 0.0], [75.186, 0.139], [76.599, 0.278], [78.013, 0.417], [79.427, 0.556], [80.823, 0.834], [82.227, 1.051], [83.633, 1.252], [85.029, 1.53], [86.425, 1.808], [87.797, 2.364], [88.035, 7.458], [88.273, 12.552], [88.517, 17.639], [88.771, 22.711], [89.025, 27.783], [89.237, 32.913], [89.449, 38.042], [89.661, 43.172], [89.831, 48.36], [89.958, 53.605], [90.085, 58.85], [90.169, 64.152], [90.212, 69.512], [90.254, 74.873], [90.297, 80.233], [89.746, 84.284], [88.37, 85.045], [86.994, 85.814], [85.627, 86.648], [84.243, 87.344], [82.858, 88.039], [81.474, 88.734], [80.089, 89.43], [78.687, 89.986], [77.286, 90.549], [75.883, 91.099], [74.472, 91.581], [73.058, 92.047], [71.624, 92.35], [70.205, 92.768], [68.768, 93.046], [67.288, 93.324], [67.203, 87.468], [67.076, 81.67], [66.992, 75.815], [66.907, 69.959], [66.78, 64.161], [66.653, 58.363], [66.568, 52.508], [66.441, 46.71], [66.314, 40.912], [66.186, 35.114], [66.017, 29.373], [65.89, 23.575], [65.72, 17.835], [65.593, 12.037], [65.424, 6.297]], "box": [65.254, 0.0, 25.085, 93.463]}, {"pts": [[89.576, 2.503], [90.234, 2.576], [90.893, 2.643], [91.542, 2.782], [92.174, 3.06], [92.806, 3.338], [93.448, 3.53], [94.069, 3.894], [94.701, 4.172], [95.333, 4.451], [95.947, 4.868], [96.579, 5.146], [97.196, 5.54], [97.825, 5.841], [98.44, 6.259], [99.072, 6.537], [99.746, 6.815], [99.958, 10.702], [99.958, 15.204], [99.958, 19.705], [99.958, 24.206], [99.958, 28.708], [99.958, 33.209], [99.958, 37.71], [99.958, 42.211], [99.958, 46.713], [99.958, 51.214], [99.958, 55.715], [99.958, 60.217], [99.958, 64.718], [99.958, 69.219], [99.958, 73.72], [99.703, 77.747], [99.225, 78.025], [98.753, 78.363], [98.284, 78.72], [97.805, 78.999], [97.34, 79.384], [96.865, 79.694], [96.386, 79.972], [95.915, 80.308], [95.446, 80.668], [94.967, 80.946], [94.488, 81.224], [94.009, 81.502], [93.53, 81.78], [93.051, 82.057], [92.555, 82.197], [92.034, 82.476], [92.034, 77.269], [91.992, 72.119], [91.949, 66.97], [91.864, 61.878], [91.78, 56.786], [91.653, 51.752], [91.492, 46.762], [91.356, 41.741], [91.144, 36.822], [90.975, 31.845], [90.763, 26.926], [90.528, 22.038], [90.297, 17.145], [90.082, 12.23], [89.831, 7.365]], "box": [89.576, 2.503, 10.424, 80.111]}];
  const shift = (sl, dx) => ({ pts: sl.pts.map(([x, y]) => [x + dx, y]), box: [sl.box[0] + dx, sl.box[1], sl.box[2], sl.box[3]] });
  // off-screen slots on both sides so cards can enter/leave smoothly
  const slots = [shift(base[0], -12), ...base, shift(base[4], 12), shift(base[4], 24)];   // index 0 == position -1
  const S = slots.length, M = photos.length;
  const cards = photos.map((src, i) => {
    const c = document.createElement('div'); c.className = 'rv-card'; c.style.background = colors[i % colors.length];
    const im = new Image(); im.src = src; im.alt = ''; im.draggable = false; im.decoding = 'async'; c.appendChild(im);
    strip.appendChild(c); return { c, im };
  });
  const lerp = (a, b, f) => a + (b - a) * f;
  // closed curve through segment midpoints, using each outline point as a control point → soft, rounded corners
  const smooth = P => {
    const n = P.length, m = i => { const a = P[i % n], b = P[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    let d = `M${m(n - 1)[0].toFixed(1)} ${m(n - 1)[1].toFixed(1)}`;
    for (let i = 0; i < n; i++) { const c = P[i], e = m(i); d += `Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`; }
    return d + 'Z';
  };
  let t = 0;
  const draw = () => {
    cards.forEach(({ c, im }, i) => {
      let p = ((i - t) % M + M) % M - 1;           // position in slots, -1 … M-2
      if (p > S - 2) { c.style.visibility = 'hidden'; return; }
      c.style.visibility = '';
      const a = Math.floor(p), f = p - a, A = slots[a + 1], B = slots[Math.min(a + 2, S - 1)];
      const W = strip.clientWidth / 100, H = strip.clientHeight / 100;
      const P = A.pts.map((q, k) => [lerp(q[0], B.pts[k][0], f) * W, lerp(q[1], B.pts[k][1], f) * H]);
      c.style.clipPath = `path('${smooth(P)}')`;
      const bx = A.box.map((v, k) => lerp(v, B.box[k], f));
      im.style.left = bx[0] + '%'; im.style.top = bx[1] + '%'; im.style.width = bx[2] + '%'; im.style.height = bx[3] + '%';
    });
  };
  let target = 0, raf = null;
  const tick = () => { const d = target - t; if (Math.abs(d) < 0.0008) { t = target; draw(); raf = null; return; } t += d * 0.075; draw(); raf = requestAnimationFrame(tick); };
  const goTo = v => { target = v; if (!raf) raf = requestAnimationFrame(tick); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, scrolling = 0;
  addEventListener('scroll', () => { scrolling = performance.now(); }, { passive: true });
  let timer; const play = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => { if (visible && performance.now() - scrolling > 250) goTo(Math.round(target) + 1); }, 3200); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(strip); else visible = true;
  let x0 = null, t0 = 0, moved = 0;
  strip.addEventListener('pointerdown', e => { x0 = e.clientX; t0 = t; moved = 0; cancelAnimationFrame(raf); raf = null; clearInterval(timer); strip.classList.add('dragging'); strip.setPointerCapture(e.pointerId); });
  strip.addEventListener('pointermove', e => { if (x0 === null) return; moved = e.clientX - x0; t = t0 - moved / (strip.offsetWidth * 0.3); target = t; draw(); });
  const end = () => { if (x0 === null) return; x0 = null; strip.classList.remove('dragging'); goTo(Math.abs(moved) < 8 ? Math.round(t) : (moved < 0 ? Math.ceil(t) : Math.floor(t))); play(); };
  strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
  strip.addEventListener('mouseenter', () => clearInterval(timer));
  strip.addEventListener('mouseleave', () => { if (x0 === null) play(); });
  draw(); play();
  addEventListener('resize', draw);
})();

(() => {
  /* Newsletter (front-end only — connect to your email service) */
  const f = document.getElementById('newsForm'), m = document.getElementById('newsMsg');
  if (!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault(); const v = f.querySelector('input');
    if (!v.checkValidity()) { m.style.color = '#c0392b'; m.textContent = 'Please enter a valid email.'; v.focus(); return; }
    m.style.color = '#555'; m.textContent = 'Sending…';
    try { await sendForm({ _subject: 'KCA website: newsletter sign-up', _template: 'table', _captcha: 'false', Email: v.value, _replyto: v.value });
      m.style.color = '#4a7a3a'; m.textContent = 'Thanks! You’re subscribed.'; f.reset(); }
    catch (err) { m.style.color = '#c0392b'; m.textContent = 'Sorry, that didn’t work. Please try again.'; }
  });
})();


(() => {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
})();


/* Menu dropdown */
(() => {
  const btn = document.getElementById('menuBtn'), menu = document.getElementById('siteMenu');
  if (!btn) return;
  const set = open => { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  btn.addEventListener('click', e => { e.stopPropagation(); set(!menu.classList.contains('open')); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { set(false); btn.focus(); } });
})();


/* Motion: header state, parallax, giant words, counters, crest */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.hero-header');
  const word = document.querySelector('.hero-word'), zooms = [...document.querySelectorAll('.hero-video:not(.fg), .hero-fg')], content = document.querySelector('.hero-content');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY, h = innerHeight;
    const sc = y > 40; if (sc !== header.classList.contains('scrolled')) header.classList.toggle('scrolled', sc);
    if (y + h >= document.documentElement.scrollHeight - 4) document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  if (reduce || !('IntersectionObserver' in window)) return;

  const once = (els, fn, opts = { threshold: .25 }) => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }), opts);
    els.forEach(el => io.observe(el));
  };
  // giant words
  const giants = document.querySelectorAll('.giant');
  giants.forEach(g => g.classList.add('pre'));
  once(giants, g => g.classList.remove('pre'), { threshold: 0, rootMargin: '0px 0px -5% 0px' });
  // counters
  once(document.querySelectorAll('[data-count]'), el => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1600;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, { threshold: .6 });
  // crest drop-in
  const crest = document.querySelector('.ft-brand img');
  if (crest) { crest.classList.add('pre'); once([crest], c => c.classList.remove('pre'), { threshold: .3 }); }
})();

/* ===== Where all website forms are delivered ===== */
const FORM_EMAIL = 'yt13501@kca.org.ua';
/* Every form is (1) saved in the database — shown in the admin panel under "Messages" —
   and (2) emailed to FORM_EMAIL. It counts as sent if either one works. */
async function sendForm(data) {
  const clean = {}; Object.keys(data).forEach(k => { if (k[0] !== '_') clean[k] = data[k]; });
  const form = (data._subject || 'Website form').replace(/^KCA website:\s*/, '');
  const C = window.KCA_CMS || {};
  const toDb = (C.supabaseUrl && C.supabaseAnonKey)
    ? fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/form_submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: C.supabaseAnonKey, Authorization: 'Bearer ' + C.supabaseAnonKey, Prefer: 'return=minimal' },
        body: JSON.stringify({ form, page: location.pathname, email: data._replyto || clean.Email || null, data: clean })
      }).then(r => { if (!r.ok) throw new Error('db ' + r.status); return true; })
    : Promise.reject(new Error('no db'));
  const toMail = fetch('https://formsubmit.co/ajax/' + FORM_EMAIL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
    .then(async r => { const out = await r.json().catch(() => ({})); if (!r.ok || out.success === 'false' || out.success === false) throw new Error(out.message || 'mail failed'); return true; });
  const res = await Promise.allSettled([toDb, toMail]);
  res.forEach((x, i) => { if (x.status === 'rejected') console.warn(i ? 'Email delivery:' : 'Database save:', x.reason && x.reason.message); });
  if (res.every(x => x.status === 'rejected')) throw new Error('Send failed');
  return true;
}

/* ===== Shared: search, video modal, forms, donate ===== */
(() => {
  const pages = [
    ['Home', '/', 'Welcome · KCA'], ['About Us', '/about', 'Story, mission, values'], ['Mission & Vision', '/about#mission', 'About'], ['Our Team', '/team', 'Faculty & staff'],
    ['Accreditation', '/about#accreditation', 'ACSI · Middle States'], ['Campus & Safety', '/about#campus', 'Shelter · security'],
    ['Statement of Faith', '/about#faith', 'About'], ['Academics', '/academics', 'Programs & curriculum'],
    ['Elementary School', '/academics#elementary', 'Grades K–5'], ['Middle School', '/academics#middle', 'Grades 6–8'],
    ['High School', '/academics#high', 'Grades 9–12'], ['Admissions', '/admissions', 'How to apply'],
    ['Tuition', '/admissions#tuition', 'Admissions'], ['Apply / Inquiry form', '/admissions#apply', 'Admissions'],
    ['Admissions FAQ', '/admissions#faq', 'Admissions'], ['Student Life', '/student-life', 'Chapel, events, clubs'],
    ['After-School Program', '/student-life#after-school', 'K–5 · 3:15–6:30 pm'], ['School Events', '/student-life#events', 'Student Life'],
    ['Reviews', '/reviews', 'What families say'], ['Teaching Opportunities', '/teaching', 'Open positions'],
    ['Donate', '/donate', 'Support KCA'], ['Contact Us', '/contact', 'Address, phone, email'], ['Schedule a Tour', '/contact#visit', 'Visit the campus'],
  ];
  const mk = (id, html) => { const d = document.createElement('div'); d.className = 'overlay'; d.id = id; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.innerHTML = html; document.body.appendChild(d); return d; };
  const X = '<button class="close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
  const open = o => { o.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = o => { o.classList.remove('open'); document.body.style.overflow = ''; const v = o.querySelector('video'); if (v) v.pause(); };

  // Search
  const so = mk('searchModal', X + '<div class="search-box"><input type="search" placeholder="Search the site…" aria-label="Search"><ul></ul></div>');
  const inp = so.querySelector('input'), ul = so.querySelector('ul');
  const render = q => { q = q.trim().toLowerCase(); ul.innerHTML = pages.filter(p => !q || (p[0] + ' ' + p[2]).toLowerCase().includes(q)).map(p => `<li><a href="${p[1]}">${p[0]}<span>${p[2]}</span></a></li>`).join('') || '<li style="padding:12px 16px;color:#777">No results</li>'; };
  inp.addEventListener('input', () => render(inp.value));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = ul.querySelector('a'); if (a) location.href = a.href; } });
  document.querySelectorAll('.search-btn').forEach(b => b.addEventListener('click', () => { render(''); open(so); setTimeout(() => inp.focus(), 50); }));

  // Video
  const vo = mk('videoModal', X + '<div class="video-box"><video src="assets/video/tour.mp4" controls playsinline></video></div>');
  document.querySelectorAll('[data-video]').forEach(b => b.addEventListener('click', () => { open(vo); vo.querySelector('video').play().catch(() => {}); }));

  [so, vo].forEach(o => { o.addEventListener('click', e => { if (e.target === o || e.target.closest('.close')) close(o); }); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') [so, vo].forEach(close); });

  // Forms: validate, then send to the school inbox (via FormSubmit)
  document.querySelectorAll('form[data-form]').forEach(f => {
    f.setAttribute('novalidate', '');
    const btn = f.querySelector('button[type=submit]'), okEl = f.querySelector('.form-ok'), failEl = f.querySelector('.form-fail');
    f.addEventListener('submit', async e => {
      e.preventDefault(); let ok = true;
      f.querySelectorAll('.field').forEach(fl => { const c = fl.querySelector('input,select,textarea'); const bad = c && !c.checkValidity(); fl.classList.toggle('bad', bad); if (bad && ok) { c.focus(); ok = false; } });
      if (!ok) return;
      const data = { _subject: 'KCA website: ' + (f.dataset.subject || 'Message'), _template: 'table', _captcha: 'false', 'Form': f.dataset.subject || '', 'Page': location.pathname.split('/').pop() || '/' };
      f.querySelectorAll('input,select,textarea').forEach(c => { if (c.name && c.value) data[c.dataset.label || c.name] = c.value; });
      const em = f.querySelector('input[type=email]'); if (em && em.value) data._replyto = em.value;
      if (btn) { btn.disabled = true; btn.style.opacity = .6; }
      okEl?.classList.remove('show'); failEl?.classList.remove('show');
      try { await sendForm(data); okEl?.classList.add('show'); f.reset(); }
      catch (err) { failEl?.classList.add('show'); }
      finally { if (btn) { btn.disabled = false; btn.style.opacity = ''; } }
    });
    f.querySelectorAll('input,select,textarea').forEach(c => c.addEventListener('input', () => c.closest('.field')?.classList.remove('bad')));
  });

  // Donate amount picker
  const am = document.querySelector('.amounts');
  if (am) {
    const out = document.getElementById('giveAmount');
    am.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; am.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); if (out) out.textContent = b.textContent; });
    document.querySelectorAll('.freq button').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.freq button').forEach(x => x.classList.toggle('on', x === b)); const fr = document.getElementById('giveFreq'); if (fr) fr.textContent = b.dataset.f; }));
  }

  // Fit the big page word to ~86% of the viewport width
  const fit = () => document.querySelectorAll('.ph-word').forEach(el => { el.style.fontSize = '100px'; const r = document.createRange(); r.selectNodeContents(el); const w = r.getBoundingClientRect().width || 1; el.style.fontSize = Math.min(innerWidth * 0.86 / w * 100, innerWidth * (innerWidth < 760 ? 0.2 : 0.135)) + 'px'; el.classList.add('fitted'); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit); setTimeout(fit, 1200); addEventListener('resize', fit);
  // Page-hero parallax
  const pw = document.querySelector('.ph-word'), pi = document.querySelector('.ph-img');
})();


/* Background video autoplay (Safari-safe): force muted, retry on first interaction, pause off-screen */
(() => {
  const hero = document.querySelector('.hero'); if (!hero) return;
  const vids = [...hero.querySelectorAll('video')];
  const tryPlay = () => vids.forEach(v => { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true; const p = v.play(); if (p) p.catch(() => {}); });
  tryPlay();
  vids.forEach(v => { v.addEventListener('loadeddata', tryPlay, { once: true }); v.addEventListener('canplay', tryPlay, { once: true }); });
  const kick = () => { tryPlay(); ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(ev => removeEventListener(ev, kick)); };
  ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(ev => addEventListener(ev, kick, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es[0].isIntersecting ? tryPlay() : vids.forEach(v => v.pause())).observe(hero);
})();

/* Turn hover effects off while scrolling (keeps Chrome from repainting cards under the mouse) */
(() => {
  let t; const root = document.documentElement;
  addEventListener('scroll', () => { if (!root.classList.contains('is-scrolling')) root.classList.add('is-scrolling'); clearTimeout(t); t = setTimeout(() => root.classList.remove('is-scrolling'), 160); }, { passive: true });
})();
