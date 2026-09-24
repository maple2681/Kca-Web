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
  const PAGES = ['index.html', 'about.html', 'academics.html', 'admissions.html', 'student-life.html', 'reviews.html', 'teaching.html', 'donate.html', 'contact.html', 'team.html'];
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
    const v = map['o:' + page + ':' + u.h + ':' + u.n] ?? map['t:' + u.h];
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
  }
  // images added later (e.g. the photo strip) get their saved replacement too
  renderTeam();
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IMG') applyImg(n); else n.querySelectorAll && n.querySelectorAll('img').forEach(applyImg);
  }))).observe(document.body, { childList: true, subtree: true });

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
    applyUnit, applyImg, applyAll, teamData, renderTeam
  };

  /* ---------- editor loader (signed-in admins only) ---------- */
  const wantsEdit = (() => { try { return sessionStorage.getItem('kca-edit') === '1'; } catch (e) { return false; } })();
  if (!configured || !wantsEdit) return;
  const base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/cms\.js(\?.*)?$/, '') : 'assets/js/';
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  (TEST ? Promise.resolve() : load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'))
    .then(() => load(base + 'cms-editor.js')).catch(() => console.warn('KCA editor could not load'));
})();
