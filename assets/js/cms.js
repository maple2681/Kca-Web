/* ============================================================
   KCA website content runtime
   - Finds every editable piece of text/image on the page
   - Applies saved edits (from Supabase) for all visitors
   - Loads the editor when a signed-in admin is in edit mode
   Must load BEFORE site.js.
   ============================================================ */
(() => {
  const CFG = window.KCA_CMS || {};
  const TEST = window.KCA_CMS_TEST || null;             // used only by automated tests
  const configured = !!(TEST || (CFG.supabaseUrl && CFG.supabaseAnonKey));
  const PAGES = ['index.html', 'about.html', 'academics.html', 'admissions.html', 'student-life.html', 'reviews.html', 'teaching.html', 'donate.html', 'contact.html', 'team.html', 'teacher-application.html'];
  const page = (() => { let p = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || 'index'); if (!/\.html$/.test(p)) p += '.html'; return p; })();
  const urlOf = p => (p === 'index.html' ? '/' : '/' + p.replace(/\.html$/, ''));
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'SELECT', 'TEXTAREA', 'TITLE', 'VIDEO', 'IFRAME']);
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- helpers ---------- */
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const hashOf = s => { s = norm(s); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + s.length.toString(36); };
  const hasText = el => { for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true; return false; };

  // Editable text units: the outermost element that directly contains text
  function units(doc) {
    const out = [];
    const walk = el => {
      for (const c of el.children) {
        if (SKIP.has(c.tagName) || c.namespaceURI === SVGNS || c.id === 'kca-admin' || c.classList.contains('overlay') || c.hasAttribute('data-kca-skip')) continue;
        if (hasText(c)) out.push(c); else walk(c);
      }
    };
    if (doc.body) walk(doc.body);
    return out;
  }
  function indexUnits(list) {
    const seen = {};
    return list.map(el => { const h = hashOf(el.innerHTML); const n = seen[h] = (seen[h] ?? -1) + 1; return { el, h, n, orig: el.innerHTML, origHref: el.tagName === 'A' ? el.getAttribute('href') : null }; });
  }

  function sanitize(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => {
      if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    }));
    return t.innerHTML;
  }
  const safeUrl = u => (/^\s*javascript:/i.test(u || '') ? '#' : u);

  /* ---------- team page (list of people, editable in admin) ---------- */
  const teamGrid = document.getElementById('teamGrid');
  let teamDefault = null; try { teamDefault = JSON.parse(document.getElementById('teamDefault').textContent); } catch (e) {}
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TEAM_COLORS = ['#2680e0', '#f3af42', '#9b8cf0', '#ff9e85', '#4a8bc1', '#d286c4'];
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  function teamData() { try { if (map['team:list']) return JSON.parse(map['team:list']); } catch (e) {} return teamDefault; }
  function renderTeam() {
    if (!teamGrid || !teamDefault) return;
    const d = teamData(); if (!d) return;
    teamGrid.innerHTML = d.groups.map(g => {
      const ppl = d.people.filter(p => p.group === g);
      return `<div class="team-group" data-group="${esc(g)}"><h3>${esc(g)}</h3><div class="team-grid">` + ppl.map(p => {
        const col = TEAM_COLORS[[...(p.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % TEAM_COLORS.length];
        return `<article class="person" data-id="${esc(p.id)}"><div class="ph" style="${p.photo ? '' : 'background:' + col}">` +
          (p.photo ? `<img src="${esc(safeUrl(p.photo))}" alt="${esc(p.name)}" loading="lazy">` : `<span class="ini">${esc(initials(p.name))}</span>`) +
          `</div><p class="nm">${esc(p.name)}</p><p class="rl">${esc(p.role)}</p><button type="button" class="del" aria-label="Remove ${esc(p.name)}">×</button></article>`;
      }).join('') + `</div></div>`;
    }).join('');
    document.dispatchEvent(new CustomEvent('kca:team-rendered'));
  }

  /* ---------- content map ---------- */
  let map = {};
  const rules = () => Object.keys(map).filter(k => k.startsWith('r:')).map(k => { try { return JSON.parse(map[k]); } catch (e) { return null; } }).filter(Boolean);

  const U = indexUnits(units(document));
  const imgInfo = new WeakMap(); const imgSeen = {};
  const trackImg = img => {
    if (imgInfo.has(img) || img.closest('#kca-admin, [data-kca-skip]')) return imgInfo.get(img);
    const src = img.getAttribute('src'); if (!src) return null;
    const n = imgSeen[src] = (imgSeen[src] ?? -1) + 1;
    const info = { src, n }; imgInfo.set(img, info); return info;
  };
  document.querySelectorAll('img').forEach(trackImg);

  const digits = s => String(s).replace(/[^\d+]/g, '');
  function replaceEverywhere(root, from, to) {
    if (!from || from === to) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && !n.parentElement.closest('script,style,#kca-admin') ? 1 : 2) });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => { if (n.textContent.includes(from)) n.textContent = n.textContent.split(from).join(to); });
    root.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (h.startsWith('mailto:') && h.slice(7).split('?')[0] === from) a.setAttribute('href', 'mailto:' + to + h.slice(7 + from.length));
      else if (h.startsWith('tel:') && digits(h.slice(4)) === digits(from) && digits(from).length > 6) a.setAttribute('href', 'tel:' + digits(to));
      else if (h === from) a.setAttribute('href', to);
    });
  }
  const unapplyRules = html => { rules().forEach(r => { html = html.split(r.to).join(r.from); }); return html; };

  function applyUnit(u) {
    const v = map['o:' + page + ':' + u.h + ':' + u.n] ?? map['t:' + u.h + ':' + u.n] ?? map['t:' + u.h];
    if (v != null) {
      u.el.innerHTML = sanitize(v); u.applied = true;
      u.el.removeAttribute('data-count'); u.el.querySelectorAll('[data-count]').forEach(x => x.removeAttribute('data-count'));
    } else if (u.applied) { u.el.innerHTML = u.orig; u.applied = false; }
    if (u.origHref != null) { const hv = map['a:' + u.h]; u.el.setAttribute('href', safeUrl(hv != null ? hv : u.origHref)); }
  }
  function applyImg(img) {
    const info = trackImg(img); if (!info) return;
    const v = map['j:' + page + ':' + info.src + ':' + info.n] ?? map['i:' + info.src];
    const want = v != null ? v : info.src;
    if (img.getAttribute('src') !== want) img.setAttribute('src', want);
    if (v != null) img.removeAttribute('srcset');
  }
  function applyAll() {
    renderTeam();
    U.forEach(applyUnit);
    document.querySelectorAll('img').forEach(applyImg);
    rules().forEach(r => replaceEverywhere(document.body, r.from, r.to));
    applyForms();
  }
  // images added later (e.g. the photo strip) get their saved replacement too
  renderTeam();
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IMG') applyImg(n); else n.querySelectorAll && n.querySelectorAll('img').forEach(applyImg);
  }))).observe(document.body, { childList: true, subtree: true });

  /* ---------- forms: field changes made in the admin panel (labels, choices, required, order, new fields) ---------- */
  const FORM_TYPES = { text: 'Short text', email: 'Email', tel: 'Phone', number: 'Number', date: 'Date', url: 'Website link', textarea: 'Long text', select: 'Dropdown', radio: 'One choice', checkbox: 'Several choices', group: 'Group of fields', special: 'Special field' };
  const ERR_TEXT = 'Please fill this in correctly.', ERR_CHOICE = 'Please choose an option.';
  (() => {
    if (document.getElementById('kf-style')) return;
    const st = document.createElement('style'); st.id = 'kf-style';
    st.textContent = '.field[hidden]{display:none!important}' + (document.querySelector('link[href*="pages.css"]') ? '' :
      '.fx-group{border:0;margin:0;padding:0;min-width:0}.fx-group legend{padding:0;margin-bottom:8px;font-size:14px;font-weight:600;color:#333}.fx-group legend i{color:#e5484d;font-style:normal}' +
      '.field .hint{display:block;margin:-2px 0 4px;font-size:13px;color:#777;line-height:1.45}.fx-opts{display:flex;flex-wrap:wrap;gap:8px}.fx-opt{position:relative;cursor:pointer}' +
      '.fx-opt input{position:absolute;opacity:0;pointer-events:none}.fx-opt span{display:inline-flex;align-items:center;min-height:42px;padding:8px 16px;border-radius:99px;background:#fff;border:2px solid #dcdcd8;font-size:15px;line-height:1.3;transition:.2s}' +
      '.fx-opt:hover span{border-color:#111}.fx-opt input:checked+span{background:#111;border-color:#111;color:#fff}.fx-opt input:focus-visible+span{box-shadow:0 0 0 3px rgba(11,116,232,.35)}.field.bad .fx-opts span{outline:2px solid #e5484d;outline-offset:1px}');
    document.head.appendChild(st);
  })();
  const ctrlsOf = fl => [...fl.querySelectorAll('input, select, textarea')].filter(c => c.type !== 'hidden');
  const stripStar = s => norm(String(s || '').replace(/\*\s*$/, ''));
  function fieldKind(fl) {
    if (fl.dataset.choice && fl.querySelector(':scope > .fx-opts')) { const i = fl.querySelector('.fx-opts input'); return i && i.type === 'checkbox' ? 'checkbox' : 'radio'; }
    const cs = ctrlsOf(fl);
    if (!cs.length || fl.querySelector('canvas')) return 'special';
    if (fl.tagName === 'FIELDSET' || cs.length > 1) return 'group';
    const c = cs[0];
    if (c.tagName === 'SELECT') return 'select';
    if (c.tagName === 'TEXTAREA') return 'textarea';
    return FORM_TYPES[c.type] && !['radio', 'checkbox'].includes(c.type) ? c.type : 'special';
  }
  const TEXTY = new Set(['text', 'email', 'tel', 'number', 'url', 'textarea']);
  const FORMS = [];
  document.querySelectorAll('form').forEach((form, fi) => {
    const grids = [...form.querySelectorAll('.form-grid')].filter(g => g.querySelector(':scope > .field'));
    if (!grids.length || form.closest('[data-kca-skip]')) return;
    const id = form.id || ('form' + fi);
    const F = { form, id, key: 'form:' + page + ':' + id, name: form.dataset.subject || id, grids: [], fields: new Map(), addedEls: new Map(), gen: new Map() };
    grids.forEach((g, gi) => {
      const step = g.closest('.app-step'), cond = g.closest('.app-cond');
      let title = step ? norm((step.querySelector('.app-h h2, .app-h h3, h2, h3') || {}).textContent || '') : '';
      if (cond) {
        const [nm, vals] = cond.dataset.show.split('='), q = form.querySelector(`[data-choice="${nm}"]`);
        const qt = q ? stripStar((q.querySelector('legend') || q).textContent) : nm;
        title = (title ? title + ' — ' : '') + 'shown if “' + (qt.length > 50 ? qt.slice(0, 48) + '…' : qt) + '” is ' + vals.split('|').map(v => '“' + v + '”').join(' or ');
      }
      F.grids.push({ el: g, title: title || (grids.length > 1 ? 'Section ' + (gi + 1) : 'Fields'), kids: [...g.children] });
      [...g.querySelectorAll(':scope > .field')].forEach((fl, i) => {
        const cs = ctrlsOf(fl), kind = fieldKind(fl);
        const key = fl.dataset.choice || (cs[0] && cs[0].name) || ('g' + gi + 'f' + i);
        const labelEl = fl.querySelector(':scope > label, :scope > legend');
        const opts = fl.querySelector(':scope > .fx-opts'), sel = kind === 'select' ? cs[0] : null;
        F.fields.set(key, {
          key, el: fl, grid: gi, kind, labelEl, cs, opts, sel,
          hint: fl.querySelector(':scope > small.hint'), err: fl.querySelector(':scope > .err'),
          orig: {
            label: labelEl ? labelEl.innerHTML : '', dataLabel: fl.getAttribute('data-label'), ctrlLabels: cs.map(c => c.getAttribute('data-label')),
            req: cs.map(c => c.required), dataReq: fl.hasAttribute('data-required'), ph: cs.map(c => c.getAttribute('placeholder')),
            full: fl.classList.contains('full'), err: fl.querySelector(':scope > .err') ? fl.querySelector(':scope > .err').textContent : '',
            sel: sel ? sel.innerHTML : null, dis: cs.map(c => c.disabled)
          },
          info() {
            const req = kind === 'radio' || kind === 'checkbox' ? (fl.hasAttribute('data-required') || cs.some(c => c.required)) : cs.some(c => c.required);
            const box = fl.querySelector(':scope > .fx-opts'), h = fl.querySelector(':scope > small.hint');
            const choices = box ? [...box.querySelectorAll('input')].map(i => i.value) : sel ? [...sel.options].filter(o => o.value !== '').map(o => o.text) : null;
            return { label: stripStar(labelEl ? labelEl.textContent : key), placeholder: cs[0] ? cs[0].getAttribute('placeholder') || '' : '', help: h ? norm(h.textContent) : '', options: choices, required: req, full: fl.classList.contains('full'), error: this.err ? norm(this.err.textContent) : '', hidden: fl.hidden, kind, locked: fl.hasAttribute('data-all') };
          }
        });
      });
    });
    FORMS.push(F);
  });
  const unitFor = el => U.find(u => u.el === el);
  const starOf = req => (req ? ' <i>*</i>' : '');
  const formOverride = F => { try { return map[F.key] ? JSON.parse(map[F.key]) : null; } catch (e) { return null; } };

  function restoreField(r) {
    const o = r.orig, fl = r.el;
    if (r.labelEl && r.touched) { const u = unitFor(r.labelEl); r.labelEl.innerHTML = u ? u.orig : o.label; if (u) { u.applied = false; applyUnit(u); } r.touched = false; }
    if (o.dataLabel == null) fl.removeAttribute('data-label'); else fl.setAttribute('data-label', o.dataLabel);
    r.cs.forEach((c, i) => {
      if (o.ctrlLabels[i] == null) c.removeAttribute('data-label'); else c.setAttribute('data-label', o.ctrlLabels[i]);
      c.required = o.req[i]; c.disabled = o.dis[i];
      if (o.ph[i] == null) c.removeAttribute('placeholder'); else c.setAttribute('placeholder', o.ph[i]);
    });
    fl.toggleAttribute('data-required', o.dataReq);
    fl.classList.toggle('full', o.full); fl.hidden = false;
    if (r.err) r.err.textContent = o.err;
    const gh = fl.querySelector(':scope > small.hint[data-kf-gen]'); if (gh) gh.remove();
    if (r.hint && !r.hint.isConnected) (r.labelEl || fl.firstChild).after(r.hint);
    const go = fl.querySelector(':scope > .fx-opts[data-kf-gen]'); if (go) go.replaceWith(r.opts);
    if (r.sel && r.sel.dataset.kfSel) { const v = r.sel.value; r.sel.innerHTML = o.sel; r.sel.value = v; delete r.sel.dataset.kfSel; }
  }
  function setRequired(r, req) {
    const fl = r.el;
    if (r.kind === 'radio' || r.kind === 'checkbox') {
      fl.toggleAttribute('data-required', req);
      fl.querySelectorAll('.fx-opts input').forEach(i => { i.required = req && i.type === 'radio'; });
    } else r.cs.forEach(c => { c.required = req; });
    if (r.labelEl) { r.labelEl.querySelectorAll(':scope > i').forEach(i => { if (i.textContent.trim() === '*') i.remove(); }); r.labelEl.innerHTML = r.labelEl.innerHTML.replace(/\s+$/, '') + starOf(req); r.touched = true; }
  }
  function choiceOpts(name, type, list, req) {
    return list.map(v => `<label class="fx-opt"><input type="${type}" name="${esc(name)}" value="${esc(v)}"${req && type === 'radio' ? ' required' : ''}><span>${esc(v)}</span></label>`).join('');
  }
  function applyField(F, r, o) {
    const fl = r.el;
    if (o.label != null && r.labelEl && norm(o.label)) {
      const req = r.info().required;
      r.labelEl.innerHTML = esc(o.label) + starOf(req); r.touched = true;
      if (fl.tagName === 'FIELDSET' || fl.hasAttribute('data-label')) fl.setAttribute('data-label', o.label);
      if (r.cs.length === 1) r.cs[0].setAttribute('data-label', o.label);
    }
    if (o.options && o.options.length && !fl.hasAttribute('data-all')) {
      if (r.opts) {
        const sig = JSON.stringify([o.options, o.required]); let box = F.gen.get(r.key);
        if (!box || box.sig !== sig) { const n = document.createElement('div'); n.className = 'fx-opts'; n.dataset.kfGen = ''; n.innerHTML = choiceOpts(r.key, r.kind, o.options, o.required ?? r.info().required); box = { sig, n }; F.gen.set(r.key, box); }
        r.opts.replaceWith(box.n); box.n.querySelectorAll('input').forEach(i => { i.disabled = false; });
      } else if (r.sel) {
        const v = r.sel.value, first = r.sel.querySelector('option[value=""]');
        r.sel.innerHTML = (first ? first.outerHTML : '<option value="">Choose…</option>') + o.options.map(x => `<option>${esc(x)}</option>`).join('');
        r.sel.value = v; r.sel.dataset.kfSel = '1';
      }
    }
    if (o.required != null) setRequired(r, !!o.required);
    if (o.placeholder != null && TEXTY.has(r.kind)) r.cs[0].setAttribute('placeholder', o.placeholder);
    if (o.help != null) {
      if (r.hint) r.hint.remove();
      if (norm(o.help)) { const h = document.createElement('small'); h.className = 'hint'; h.dataset.kfGen = ''; h.textContent = o.help; (r.labelEl || fl.firstChild).after(h); }
    }
    if (o.error != null && r.err && norm(o.error)) r.err.textContent = o.error;
    if (o.full != null) fl.classList.toggle('full', !!o.full);
    if (o.hidden) { fl.hidden = true; fl.classList.remove('bad'); fl.querySelectorAll('input, select, textarea').forEach(c => { c.disabled = true; }); }
  }
  function buildAdded(d) {
    const name = 'x-' + d.key, id = 'kf-' + d.key, req = !!d.required, label = norm(d.label) || 'New question';
    const hint = norm(d.help) ? `<small class="hint">${esc(d.help)}</small>` : '';
    const wrap = document.createElement(d.type === 'radio' || d.type === 'checkbox' ? 'fieldset' : 'div');
    wrap.dataset.kfAdded = d.key; wrap.setAttribute('data-kca-skip', '');
    if (d.type === 'radio' || d.type === 'checkbox') {
      wrap.className = 'field full fx-group'; wrap.dataset.label = label; wrap.dataset.choice = name; wrap.toggleAttribute('data-required', req);
      wrap.innerHTML = `<legend>${esc(label)}${starOf(req)}</legend>${hint}<div class="fx-opts">${choiceOpts(name, d.type, (d.options || []).filter(Boolean).length ? d.options.filter(Boolean) : ['Option 1'], req)}</div><span class="err">${esc(norm(d.error) || ERR_CHOICE)}</span>`;
      return wrap;
    }
    wrap.className = 'field' + (d.full || d.type === 'textarea' ? ' full' : '');
    const common = `id="${id}" name="${name}" data-label="${esc(label)}"${req ? ' required' : ''}`;
    const ph = d.placeholder ? ` placeholder="${esc(d.placeholder)}"` : '';
    const ctrl = d.type === 'textarea' ? `<textarea ${common}${ph}></textarea>`
      : d.type === 'select' ? `<select ${common}><option value="">Choose…</option>${(d.options || []).filter(Boolean).map(x => `<option>${esc(x)}</option>`).join('')}</select>`
      : `<input ${common} type="${FORM_TYPES[d.type] ? d.type : 'text'}"${ph}>`;
    wrap.innerHTML = `<label for="${id}">${esc(label)}${starOf(req)}</label>${hint}${ctrl}<span class="err">${esc(norm(d.error) || ERR_TEXT)}</span>`;
    return wrap;
  }
  function applyForm(F, data) {
    data = data || {};
    // 1) back to the original form
    F.grids.forEach(g => g.kids.forEach(k => g.el.appendChild(k)));
    F.form.querySelectorAll('[data-kf-added]').forEach(n => n.remove());
    F.fields.forEach(restoreField);
    // 2) changes to the original fields
    const fo = data.fields || {};
    F.fields.forEach(r => { if (fo[r.key]) applyField(F, r, fo[r.key]); });
    // 3) new fields (reuse unchanged ones so typed answers survive a refresh)
    const added = (data.added || []).filter(d => d && d.key && F.grids[d.grid]);
    const els = new Map();
    added.forEach(d => {
      const sig = JSON.stringify(d), was = F.addedEls.get(d.key);
      const n = was && was.sig === sig ? was.n : buildAdded(d);
      F.addedEls.set(d.key, { sig, n }); els.set(d.key, n);
      if (d.hidden) { n.hidden = true; n.querySelectorAll('input, select, textarea').forEach(c => { c.disabled = true; }); }
      else { n.hidden = false; n.querySelectorAll('input, select, textarea').forEach(c => { c.disabled = false; }); }
    });
    // 4) order inside each section
    F.grids.forEach((g, gi) => {
      const own = [...F.fields.values()].filter(r => r.grid === gi).map(r => [r.key, r.el]).concat(added.filter(d => d.grid === gi).map(d => [d.key, els.get(d.key)]));
      const want = (data.order && data.order[gi]) || [];
      const ordered = want.map(k => own.find(x => x[0] === k)).filter(Boolean).concat(own.filter(x => !want.includes(x[0])));
      const queue = ordered.map(x => x[1]);
      const slots = g.kids.filter(k => [...F.fields.values()].some(r => r.el === k));
      const out = [];
      g.kids.forEach(k => { if (slots.includes(k)) { const n = queue.shift(); if (n) out.push(n); if (k === slots[slots.length - 1]) out.push(...queue.splice(0)); } else out.push(k); });
      if (!slots.length) out.push(...queue);
      out.forEach(n => g.el.appendChild(n));
    });
  }
  function applyForms() { FORMS.forEach(F => applyForm(F, formOverride(F))); }

  /* ---------- loading saved content ---------- */
  const CACHE = 'kca-cms-cache-v1';
  const setMap = m => { const changed = JSON.stringify(m) !== JSON.stringify(map); map = m; if (changed) applyAll(); };
  async function fetchContent() {
    if (TEST) return TEST.load();
    const r = await fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/site_content?select=key,value', { headers: Object.assign({ apikey: CFG.supabaseAnonKey }, /^eyJ/.test(CFG.supabaseAnonKey) ? { Authorization: 'Bearer ' + CFG.supabaseAnonKey } : {}), cache: 'no-store' });
    if (!r.ok) throw new Error('content ' + r.status);
    const rows = await r.json(); const m = {}; rows.forEach(x => { m[x.key] = x.value; }); return m;
  }
  if (configured) {
    let cached = null; try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) {}
    if (cached) setMap(cached);
    else { document.documentElement.classList.add('kca-wait'); setTimeout(() => document.documentElement.classList.remove('kca-wait'), 1500); }
    fetchContent().then(m => { try { localStorage.setItem(CACHE, JSON.stringify(m)); } catch (e) {} setMap(m); })
      .catch(() => {}).finally(() => document.documentElement.classList.remove('kca-wait'));
  }

  /* ---------- public API for the editor ---------- */
  window.KCA_RT = {
    CFG, TEST, PAGES, page, urlOf, units, indexUnits, hashOf, norm, sanitize, safeUrl, U, trackImg, imgInfo, replaceEverywhere, unapplyRules, rules,
    get map() { return map; }, set: (k, v) => { if (v == null) delete map[k]; else map[k] = v; try { localStorage.setItem(CACHE, JSON.stringify(map)); } catch (e) {} },
    applyUnit, applyImg, applyAll, teamData, renderTeam,
    forms: { list: FORMS, TYPES: FORM_TYPES, saved: formOverride, apply: applyForm, fieldOf: el => { for (const F of FORMS) { const fl = el.closest('.field'); if (!fl || !F.form.contains(fl)) continue; const r = [...F.fields.values()].find(x => x.el === fl); return { F, key: r ? r.key : fl.dataset.kfAdded }; } return null; } }
  };

  /* ---------- editor loader (signed-in admins only) ---------- */
  const wantsEdit = (() => { try { return sessionStorage.getItem('kca-edit') === '1'; } catch (e) { return false; } })();
  if (!configured || !wantsEdit) return;
  const base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/cms\.js(\?.*)?$/, '') : 'assets/js/';
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  (TEST ? Promise.resolve() : load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'))
    .then(() => load(base + 'cms-editor.js?v=1790276272')).catch(() => console.warn('KCA editor could not load'));
})();
