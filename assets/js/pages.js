/* =====================================================================
   KCA — Donate page, Teaching request form and the online Teacher
   Application. Loads after site.js (uses its sendForm()).
   ===================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = s => (window.KCA_LANG ? window.KCA_LANG.t(s) : s);
  const visible = el => !el.closest('[hidden]:not(.app-step)') && !el.closest('.app-cond:not(.on)');  // a whole step being hidden doesn't count
  const clean = s => String(s || '').replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').trim();

  /* ---------- validation that understands grouped fields (name, address, choices, confirm email) ---------- */
  const checkField = fl => {
    let ok = true;
    if (fl.matches('[data-choice]')) {
      const boxes = $$('input', fl), on = boxes.filter(b => b.checked);
      if (fl.hasAttribute('data-all')) ok = on.length === boxes.length;
      else if (boxes[0] && boxes[0].type === 'radio') ok = !boxes.some(b => b.required) || on.length > 0;
      else if (fl.hasAttribute('data-required')) ok = on.length > 0;
    } else {
      $$('input, select, textarea', fl).forEach(c => {
        if (c.type === 'hidden') { if (c.id === 'a-sign' && !c.value) ok = false; return; }
        if (c.dataset.confirm) { const o = document.getElementById(c.dataset.confirm); c.setCustomValidity(o && o.value.trim().toLowerCase() !== c.value.trim().toLowerCase() ? 'mismatch' : ''); }
        if (!c.checkValidity()) ok = false;
      });
    }
    fl.classList.toggle('bad', !ok);
    return ok;
  };
  const validate = scope => {
    let first = null;
    $$('.field', scope).forEach(fl => { if (!visible(fl)) { fl.classList.remove('bad'); return; } if (!checkField(fl) && !first) first = fl; });
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); const c = first.querySelector('input:not([type=hidden]), select, textarea'); if (c) setTimeout(() => c.focus({ preventScroll: true }), 350); }
    return !first;
  };
  document.addEventListener('input', e => { const fl = e.target.closest('.field.bad'); if (fl) checkField(fl); });
  document.addEventListener('change', e => { const fl = e.target.closest('.field.bad'); if (fl) checkField(fl); });

  // forms handled by site.js (data-form): run the fuller check first and stop the send if something is missing
  $$('#wireForm, #teachRequest').forEach(f => f.addEventListener('submit', e => { if (!validate(f)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true));

  /* ---------- Donate: choose a way to give ---------- */
  const card = $('#giveCard');
  if (card) {
    const panels = $$('.give-panel', card), hint = $('#giveHint');
    const show = m => {
      panels.forEach(p => { const on = p.dataset.panel === m; p.hidden = !on; if (on) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); } });
      $$('.gm', card).forEach(l => l.classList.toggle('on', l.querySelector('input').value === m));
      if (hint) hint.hidden = !!m;
    };
    $$('input[name=give-method]', card).forEach(r => r.addEventListener('change', () => show(r.value)));
    const pre = (location.hash.match(/give-(online|check|wire)/) || [])[1];
    if (pre) { const r = card.querySelector(`input[value=${pre}]`); if (r) { r.checked = true; show(pre); } }

    // amount + 2.9% fee
    const amts = $('.give-amounts', card), other = $('.give-other', card), otherIn = $('#giveOther'), fee = $('#giveFee'), total = $('#giveTotal');
    let amount = 50;
    const fmt = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const update = () => { const v = amount > 0 ? amount * (fee.checked ? 1.029 : 1) : 0; total.textContent = v ? fmt(Math.round(v * 100) / 100) : '—'; };
    amts.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      amts.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      const isOther = b.dataset.v === 'other'; other.hidden = !isOther;
      amount = isOther ? parseFloat(otherIn.value) || 0 : +b.dataset.v;
      if (isOther) setTimeout(() => otherIn.focus(), 50);
      update();
    });
    otherIn.addEventListener('input', () => { amount = parseFloat(otherIn.value) || 0; update(); });
    fee.addEventListener('change', update);
    update();

    // copy mailing address
    const copy = $('#giveCopy');
    if (copy) copy.addEventListener('click', async () => {
      const txt = 'Bright Fund Ukraine\n218 Heatherfield Drive\nSouderton, PA 18964-1954\nUSA';
      try { await navigator.clipboard.writeText(txt); } catch (e) {}
      const lab = copy.firstChild; const old = lab.textContent; lab.textContent = t('Copied!') + ' ';
      setTimeout(() => { lab.textContent = old; }, 1800);
    });
  }

  /* ---------- Teacher application: 9 steps, save for later, signature ---------- */
  const form = $('#appForm');
  if (!form) return;
  const steps = $$('.app-step', form), N = steps.length, KEY = 'kca-teacher-application-v1';
  const prev = $('#appPrev'), next = $('#appNext'), submit = $('#appSubmit'), save = $('#appSave'), saved = $('#appSaved');
  let cur = 0;

  // conditional questions (e.g. spouse details only when "Married")
  const conds = $$('.app-cond', form);
  const refresh = () => conds.forEach(c => {
    const [name, vals] = c.dataset.show.split('='), want = vals.split('|');
    const on = $$(`input[name="${name}"]`, form).some(i => i.checked && want.includes(i.value));
    c.classList.toggle('on', on);
  });
  form.addEventListener('change', refresh);

  const go = (n, scroll = true) => {
    cur = Math.max(0, Math.min(N - 1, n));
    steps.forEach((s, i) => { s.hidden = i !== cur; });
    steps[cur].classList.remove('in'); void steps[cur].offsetWidth; steps[cur].classList.add('in');
    const pct = Math.round((cur + 1) / N * 100);
    $('#appStep').textContent = cur + 1; $('#appPct').textContent = pct + '%'; $('#appBar').style.width = pct + '%';
    prev.hidden = cur === 0; next.hidden = cur === N - 1; submit.hidden = cur !== N - 1;
    if (cur === N - 1) sizePad();
    if (scroll) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    store();
  };
  next.addEventListener('click', () => { if (validate(steps[cur])) go(cur + 1); });
  prev.addEventListener('click', () => go(cur - 1));

  // save / restore on this device
  const snapshot = () => {
    const v = {};
    $$('input, select, textarea', form).forEach(c => {
      if (!c.name) return;
      if (c.type === 'radio' || c.type === 'checkbox') { if (c.checked) (v[c.name] = v[c.name] || []).push(c.value); }
      else v[c.name] = c.value;
    });
    return { v, step: cur, at: Date.now() };
  };
  let saveT;
  const store = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) {} }, 300); };
  form.addEventListener('input', store); form.addEventListener('change', store);
  save.addEventListener('click', () => { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); saved.hidden = false; setTimeout(() => { saved.hidden = true; }, 6000); } catch (e) {} });
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.v && Date.now() - d.at < 30 * 864e5) {
      Object.entries(d.v).forEach(([k, val]) => {
        $$(`[name="${k}"]`, form).forEach(c => {
          if (c.type === 'radio' || c.type === 'checkbox') c.checked = [].concat(val).includes(c.value);
          else if (c.type !== 'hidden' || k === 'a-sign') c.value = val;
        });
      });
      cur = d.step || 0;
    }
  } catch (e) {}
  const dt = $('#a-date'); if (dt && !dt.value) dt.value = new Date().toISOString().slice(0, 10);
  refresh();

  // signature pad
  const pad = $('#sigPad'), sigIn = $('#a-sign');
  let ctx, drawing = false, last = null, dirty = !!sigIn.value;
  function sizePad() {
    const r = pad.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    pad.width = r.width * dpr; pad.height = r.height * dpr;
    ctx = pad.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111a26';
    if (sigIn.value) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = sigIn.value; }
  }
  const pos = e => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  pad.addEventListener('pointerdown', e => { if (!ctx) sizePad(); drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId); e.preventDefault(); });
  pad.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; dirty = true; });
  const end = () => {
    if (!drawing) return; drawing = false;
    if (dirty) {
      // keep a small copy (for the email and the admin panel)
      const c = document.createElement('canvas'), w = 360, h = Math.round(pad.height / pad.width * w) || 120;
      c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(pad, 0, 0, w, h);
      sigIn.value = c.toDataURL('image/png');
      pad.closest('.field').classList.remove('bad'); store();
    }
  };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  $('#sigClear').addEventListener('click', () => { if (ctx) ctx.clearRect(0, 0, pad.width, pad.height); sigIn.value = ''; dirty = false; store(); });
  addEventListener('resize', () => { if (!steps[N - 1].hidden) sizePad(); });

  // collect answers in order, with readable question labels
  const collect = () => {
    const data = {};
    steps.forEach(s => $$('.field', s).forEach(fl => {
      if (!visible(fl)) return;
      if (fl.matches('[data-choice]')) {
        const on = $$('input:checked', fl).map(i => i.value);
        if (on.length) data[fl.dataset.label || clean(fl.querySelector('legend').innerText)] = fl.hasAttribute('data-all') ? 'Yes — all statements accepted' : on.join(', ');
        return;
      }
      $$('input, select, textarea', fl).forEach(c => {
        if (!c.value || c.dataset.confirm) return;
        if (c.id === 'a-sign') { data['Signature'] = c.value; return; }
        data[c.dataset.label || clean(fl.querySelector('label,legend')?.innerText)] = c.value;
      });
    }));
    return data;
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate(steps[cur])) return;
    for (let i = 0; i < N; i++) if (!validate(steps[i])) { go(i); validate(steps[i]); return; }
    const okEl = form.querySelector('.form-ok'), failEl = form.querySelector('.form-fail');
    okEl.classList.remove('show'); failEl.classList.remove('show');
    submit.disabled = true; submit.style.opacity = .6;
    const d = collect(), email = $('#a-email').value.trim();
    const payload = Object.assign({ _subject: 'KCA website: Teacher application', _template: 'table', _captcha: 'false', 'Full name': ($('#a-name-first').value + ' ' + $('#a-name-last').value).trim(), Email: email, _replyto: email }, d);
    try {
      if (typeof sendForm !== 'function') throw new Error('no sender');
      await sendForm(payload);
      okEl.classList.add('show');
      try { localStorage.removeItem(KEY); } catch (err) {}
      $$('.app-step, .app-nav, .app-progress', form).forEach(el => { el.hidden = true; });
      okEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) { failEl.classList.add('show'); }
    finally { submit.disabled = false; submit.style.opacity = ''; }
  });

  go(cur, false);
})();
