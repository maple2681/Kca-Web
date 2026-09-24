/* ============================================================
   KCA website editor (loaded only for signed-in @kca.org.ua admins)
   - Click text to edit it in place (saves when you click away)
   - Click a photo to replace it from your computer
   - Identical text/photos across the site update together
   ============================================================ */
(async () => {
  const RT = window.KCA_RT; if (!RT) return;
  const CFG = RT.CFG, DOMAIN = (CFG.allowedDomain || 'kca.org.ua').toLowerCase();
  const exitEdit = () => { try { sessionStorage.removeItem('kca-edit'); } catch (e) {} };

  /* ---------- backend ---------- */
  let backend = RT.TEST && RT.TEST.backend;
  if (!backend) {
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    backend = {
      async user() { const { data } = await sb.auth.getUser(); return data && data.user ? { email: data.user.email, confirmed: !!data.user.email_confirmed_at } : null; },
      async save(key, value) { const { error } = await sb.from('site_content').upsert({ key, value }); if (error) throw error; },
      async remove(key) { const { error } = await sb.from('site_content').delete().eq('key', key); if (error) throw error; },
      async upload(blob, name) {
        const path = 'uploads/' + Date.now() + '-' + name.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
        const { error } = await sb.storage.from('site-media').upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' });
        if (error) throw error;
        return sb.storage.from('site-media').getPublicUrl(path).data.publicUrl;
      },
      async signOut() { await sb.auth.signOut(); },
      async role() { const { data, error } = await sb.rpc('kca_my_role'); if (error) throw error; return data || null; },
      async listAllowed() { const { data, error } = await sb.from('allowed_emails').select('email,role,added_at').order('role').order('email'); if (error) throw error; return data; },
      async addAllowed(email) { const { error } = await sb.from('allowed_emails').insert({ email, role: 'editor' }); if (error) throw error; },
      async removeAllowed(email) { const { error } = await sb.from('allowed_emails').delete().eq('email', email); if (error) throw error; }
    };
  }
  const user = await backend.user().catch(() => null);
  if (!user || !user.confirmed || !user.email.toLowerCase().endsWith('@' + DOMAIN)) { exitEdit(); return; }
  const role = await backend.role().catch(() => null);
  if (role !== 'admin' && role !== 'editor') { exitEdit(); await backend.signOut().catch(() => {}); return; }

  /* ---------- styles ---------- */
  const css = `
  html.kca-editing [data-kca-unit] { cursor: text; outline: 1.5px dashed transparent; outline-offset: 3px; transition: outline-color .15s; pointer-events: auto !important; }
  html.kca-editing [data-kca-unit]:hover { outline-color: rgba(11,116,232,.75); }
  html.kca-editing [data-kca-unit][contenteditable] { outline: 2px solid #0b74e8 !important; }
  html.kca-editing .giant [contenteditable], html.kca-editing .giant[contenteditable], html.kca-editing .hero-word[contenteditable], html.kca-editing .ph-word[contenteditable] { -webkit-text-fill-color: #0b74e8; }
  html.kca-editing img { pointer-events: auto !important; }
  html.kca-editing .hero-fg, html.kca-editing .hero-fg * { pointer-events: none !important; }
  html.kca-editing .reveal, html.kca-editing .stagger > *, html.kca-editing .giant.pre, html.kca-editing .rv-stats li { opacity: 1 !important; transform: none !important; }
  html.kca-editing body { padding-bottom: 90px; }
  #kca-admin, #kca-admin * { box-sizing: border-box; font-family: "Satoshi", system-ui, sans-serif; }
  #kca-admin .bar { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 2147483000; display: flex; align-items: center; gap: 6px; padding: 6px; border-radius: 16px; background: #1f1f1e; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.3); font-size: 14px; max-width: calc(100vw - 20px); }
  #kca-admin .bar .who { padding: 0 10px 0 8px; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  #kca-admin .bar .dot { width: 8px; height: 8px; border-radius: 50%; background: #4cd964; }
  #kca-admin .bar .who small { color: #aaa; font-size: 12px; }
  #kca-admin .bar select, #kca-admin .bar button { white-space: nowrap; height: 36px; border: 0; border-radius: 10px; padding: 0 12px; background: #333331; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
  #kca-admin .bar button:hover, #kca-admin .bar select:hover { background: #444442; }
  #kca-admin .bar button.on { background: #f3af42; color: #1f1f1e; }
  #kca-admin .chip { position: absolute; z-index: 2147483001; display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 12px; background: #1f1f1e; color: #fff; font-size: 13px; box-shadow: 0 8px 22px rgba(0,0,0,.25); white-space: nowrap; }
  #kca-admin .chip span { padding: 0 8px; color: #ccc; }
  #kca-admin .chip button { height: 30px; border: 0; border-radius: 8px; padding: 0 10px; background: #333331; color: #fff; font-size: 13px; cursor: pointer; }
  #kca-admin .chip button:hover { background: #444442; }
  #kca-admin .chip button.on { background: #0b74e8; }
  #kca-admin .chip input { height: 30px; width: 260px; border: 0; border-radius: 8px; padding: 0 10px; font-size: 13px; }
  #kca-admin .imgtip { position: fixed; z-index: 2147483001; pointer-events: none; padding: 6px 10px; border-radius: 8px; background: #0b74e8; color: #fff; font-size: 13px; font-weight: 600; transform: translate(12px, 12px); display: none; }
  #kca-admin .toast { position: fixed; left: 50%; bottom: 76px; transform: translate(-50%, 10px); z-index: 2147483002; padding: 10px 16px; border-radius: 10px; background: #1f1f1e; color: #fff; font-size: 14px; opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none; }
  #kca-admin .toast.show { opacity: 1; transform: translate(-50%, 0); }
  #kca-admin .toast.err { background: #b3261e; }
  #kca-admin .modal { position: fixed; inset: 0; z-index: 2147483003; display: grid; place-items: center; background: rgba(0,0,0,.4); padding: 16px; }
  #kca-admin .modal > div { width: min(440px, 100%); background: #fff; color: #111; border-radius: 16px; padding: 22px; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
  #kca-admin .modal h3 { margin: 0 0 8px; font-size: 18px; } #kca-admin .modal p { margin: 0 0 18px; color: #444; font-size: 15px; line-height: 1.5; word-break: break-word; }
  #kca-admin .modal .row { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
  #kca-admin .modal button { height: 40px; border: 0; border-radius: 10px; padding: 0 16px; font-size: 14px; font-weight: 600; cursor: pointer; background: #ecebe7; color: #111; }
  #kca-admin .modal button.primary { background: #0b74e8; color: #fff; }
  html.kca-editing .person .del { display: grid; place-items: center; position: absolute; top: 18px; right: 18px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgba(20,20,20,.75); color: #fff; font-size: 20px; line-height: 1; cursor: pointer; }
  html.kca-editing .person .del:hover { background: #b3261e; }
  html.kca-editing .person .ph { cursor: pointer; position: relative; }
  html.kca-editing .person .ph::after { content: "Change photo"; position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); padding: 5px 10px; border-radius: 8px; background: rgba(11,116,232,.9); color: #fff; font: 600 12px "Satoshi", sans-serif; opacity: 0; transition: opacity .2s; white-space: nowrap; }
  html.kca-editing .person .ph:hover::after { opacity: 1; }
  html.kca-editing .person .nm, html.kca-editing .person .rl { cursor: text; outline: 1.5px dashed transparent; outline-offset: 3px; border-radius: 4px; }
  html.kca-editing .person .nm:hover, html.kca-editing .person .rl:hover { outline-color: rgba(11,116,232,.75); }
  html.kca-editing .person [contenteditable] { outline: 2px solid #0b74e8; }
  .person.add { display: none; }
  html.kca-editing .person.add { display: grid; place-items: center; min-height: 220px; border: 2px dashed #b9c7d8; background: transparent; color: #0b74e8; font: 700 16px "Satoshi", sans-serif; cursor: pointer; }
  html.kca-editing .person.add:hover { background: #eef4fd; }
  #kca-admin .modal .allowed { width: min(520px, 100%); }
  #kca-admin .allowed .add { display: flex; gap: 8px; margin-bottom: 6px; }
  #kca-admin .allowed .add input { flex: 1; height: 40px; border: 2px solid #dcdcd8; border-radius: 10px; padding: 0 12px; font-size: 15px; }
  #kca-admin .allowed .err { min-height: 0; margin: 0 0 8px; color: #b3261e; font-size: 14px; }
  #kca-admin .allowed .list { list-style: none; margin: 0 0 16px; padding: 0; max-height: 45vh; overflow: auto; border-top: 1px solid #ecebe7; }
  #kca-admin .allowed .list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 2px; border-bottom: 1px solid #ecebe7; font-size: 15px; }
  #kca-admin .allowed .list li em { font-style: normal; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 99px; background: #fdf1dc; color: #7c4f08; }
  #kca-admin .allowed .list li button { height: 32px; padding: 0 12px; font-size: 13px; }
  #kca-admin .allowed .list li.muted { color: #888; }
  @media (max-width: 700px) {
    #kca-admin .bar { left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom)); transform: none; max-width: none; flex-wrap: wrap; gap: 6px; padding: 8px; border-radius: 18px; }
    #kca-admin .bar .who { flex: 1 1 100%; order: -2; padding: 2px 4px 4px; font-size: 13px; justify-content: flex-start; }
    #kca-admin .bar .who small { margin-left: auto; }
    #kca-admin .bar .who small { display: inline !important; font-size: 12px; overflow: hidden; text-overflow: ellipsis; max-width: 60vw; }
    #kca-admin .bar select { flex: 1 1 100%; height: 40px; }
    #kca-admin .bar button { flex: 1 1 0; height: 40px; padding: 0 8px; font-size: 13.5px; }
    #kca-admin .bar .hide-sm { display: block !important; }
    html.kca-editing body { padding-bottom: 170px; }
    #kca-admin .toast { bottom: calc(150px + env(safe-area-inset-bottom)); max-width: calc(100vw - 32px); text-align: center; }
    #kca-admin .chip { left: 8px !important; right: 8px; max-width: calc(100vw - 16px); flex-wrap: wrap; white-space: normal; }
    #kca-admin .chip span { flex: 1 1 100%; padding: 2px 6px 4px; }
    #kca-admin .chip button { flex: 1 1 auto; height: 36px; }
    #kca-admin .chip input { width: 100%; flex: 1 1 100%; height: 36px; }
    #kca-admin .modal { place-items: end stretch; padding: 0; }
    #kca-admin .modal > div { width: 100% !important; border-radius: 20px 20px 0 0; padding: 20px 18px calc(18px + env(safe-area-inset-bottom)); max-height: 88vh; overflow: auto; }
    #kca-admin .modal .row button { flex: 1; height: 46px; }
    #kca-admin .allowed .add input { height: 46px; font-size: 16px; }
    #kca-admin .allowed .add button { height: 46px; }
    #kca-admin .allowed .list li { padding: 12px 2px; }
    #kca-admin .imgtip { display: none !important; }
    html.kca-editing .person .del { width: 36px; height: 36px; top: 14px; right: 14px; }
  }
  @media (max-width: 700px) { #kca-admin .bar .who small, #kca-admin .bar .hide-sm { display: none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- UI ---------- */
  const ui = document.createElement('div'); ui.id = 'kca-admin'; document.body.appendChild(ui);
  const pageNames = { 'index.html': 'Home', 'about.html': 'About', 'academics.html': 'Academics', 'admissions.html': 'Admissions', 'student-life.html': 'Student Life', 'reviews.html': 'Reviews', 'teaching.html': 'Teaching', 'donate.html': 'Donate', 'contact.html': 'Contact', 'team.html': 'Our Team' };
  ui.innerHTML = `<div class="bar" role="toolbar" aria-label="Website editor">
      <span class="who"><span class="dot"></span>Editing <small>${user.email} · ${role === 'admin' ? 'Admin' : 'Editor'}</small></span>
      <select aria-label="Go to page">${RT.PAGES.map(p => `<option value="${p}"${p === RT.page ? ' selected' : ''}>${pageNames[p] || p}</option>`).join('')}</select>
      <button type="button" data-act="preview">Preview</button>${role === 'admin' ? '<button type="button" data-act="allowed">Allowed emails</button>' : ''}
      <button type="button" data-act="out" class="hide-sm">Sign out</button>
    </div><div class="imgtip">Click to replace photo</div><div class="toast" role="status"></div>`;
  const bar = ui.querySelector('.bar'), tip = ui.querySelector('.imgtip'), toastEl = ui.querySelector('.toast');
  let toastT; const toast = (msg, err) => { toastEl.textContent = msg; toastEl.classList.toggle('err', !!err); toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), err ? 5000 : 1800); };
  const ask = (title, text, buttons) => new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div role="dialog" aria-modal="true"><h3></h3><p></p><div class="row"></div></div>`;
    m.querySelector('h3').textContent = title; m.querySelector('p').textContent = text;
    buttons.forEach(([label, val, primary]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (primary) b.className = 'primary'; b.onclick = () => { m.remove(); res(val); }; m.querySelector('.row').appendChild(b); });
    ui.appendChild(m); m.querySelector('button.primary')?.focus();
  });

  let editing = true;
  const setMode = on => { editing = on; document.documentElement.classList.toggle('kca-editing', on); bar.querySelector('[data-act=preview]').classList.toggle('on', !on); bar.querySelector('[data-act=preview]').textContent = on ? 'Preview' : 'Back to editing'; if (!on) finish(); };
  bar.querySelector('select').onchange = e => { location.href = RT.urlOf(e.target.value); };
  bar.querySelector('[data-act=preview]').onclick = () => setMode(!editing);
  /* ---------- Allowed Emails (Admin only) ---------- */
  const allowedBtn = bar.querySelector('[data-act=allowed]');
  if (allowedBtn) allowedBtn.onclick = async () => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div role="dialog" aria-modal="true" class="allowed"><h3>Allowed emails</h3>
      <p>Only these @${DOMAIN} addresses can create an account and sign in. Editors can change the website; only the Admin can manage this list.</p>
      <form class="add"><input type="email" placeholder="name@${DOMAIN}" aria-label="Email to allow" required><button type="submit" class="primary">Add</button></form>
      <p class="err" role="alert"></p><ul class="list"><li class="muted">Loading…</li></ul>
      <div class="row"><button type="button" data-x>Close</button></div></div>`;
    ui.appendChild(m);
    const list = m.querySelector('.list'), err = m.querySelector('.err'), inp = m.querySelector('input');
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const load = async () => {
      try {
        const rows = await backend.listAllowed();
        list.innerHTML = rows.map(r => `<li><span>${esc(r.email)}</span>` + (r.role === 'admin' ? '<em>Admin</em>' : `<button type="button" data-rm="${esc(r.email)}">Remove</button>`) + '</li>').join('') || '<li class="muted">No emails yet</li>';
      } catch (e) { list.innerHTML = ''; err.textContent = 'Could not load the list: ' + (e.message || e); }
    };
    m.querySelector('[data-x]').onclick = () => m.remove();
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    m.querySelector('form').onsubmit = async e => {
      e.preventDefault(); err.textContent = '';
      const v = inp.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+$/.test(v) || !v.endsWith('@' + DOMAIN)) { err.textContent = 'Please enter an @' + DOMAIN + ' email address.'; return; }
      try { await backend.addAllowed(v); inp.value = ''; toast('Added ' + v); load(); }
      catch (x) { err.textContent = /duplicate|already/i.test(x.message || '') ? 'That email is already on the list.' : 'Could not add: ' + (x.message || x); }
    };
    list.onclick = async e => {
      const em = e.target.dataset.rm; if (!em) return;
      if (!(await ask('Remove access?', `${em} will no longer be able to sign in or edit the website.`, [['Cancel', false], ['Remove', true, true]]))) return;
      try { await backend.removeAllowed(em); toast('Removed ' + em); load(); } catch (x) { err.textContent = 'Could not remove: ' + (x.message || x); }
    };
    inp.focus(); load();
  };
  bar.querySelector('[data-act=out]').onclick = async () => { exitEdit(); await backend.signOut().catch(() => {}); location.reload(); };

  RT.U.forEach(u => u.el.setAttribute('data-kca-unit', ''));
  document.querySelectorAll('details').forEach(d => d.open = true);
  setMode(true);

  /* ---------- how many times each text/photo appears across the whole site ---------- */
  const siteCount = { t: {}, i: {} };
  (async () => {
    const docs = await Promise.all(RT.PAGES.map(p => fetch(RT.urlOf(p), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => '')));
    const any = docs.some(Boolean);
    const add = (o, k) => { o[k] = (o[k] || 0) + 1; };
    if (!any) { RT.U.forEach(u => add(siteCount.t, u.h)); document.querySelectorAll('img').forEach(i => { const x = RT.trackImg(i); if (x) add(siteCount.i, x.src); }); return; }
    docs.forEach(html => {
      if (!html) return; const d = new DOMParser().parseFromString(html, 'text/html');
      RT.indexUnits(RT.units(d)).forEach(u => add(siteCount.t, u.h));
      d.querySelectorAll('img[src]').forEach(i => add(siteCount.i, i.getAttribute('src')));
    });
  })();

  /* ---------- saving ---------- */
  async function put(key, value) {
    try { if (value == null) await backend.remove(key); else await backend.save(key, value); RT.set(key, value); return true; }
    catch (e) { toast('Could not save: ' + (e.message || e), true); return false; }
  }

  /* ---------- text editing ---------- */
  let cur = null, chip = null;
  const unitOf = el => RT.U.find(u => u.el === el);
  const overrideKey = u => 'o:' + RT.page + ':' + u.h + ':' + u.n;
  const isOnlyHere = u => RT.map[overrideKey(u)] != null;
  const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g, PHONE = /\+?\d[\d ()\-]{7,}\d/g, TOKENS = [EMAIL, PHONE];
  const tokens = (s, re) => [...new Set((s.match(re) || []).map(x => x.trim()))];

  function placeChip(u) {
    chip?.remove(); chip = document.createElement('div'); chip.className = 'chip';
    const count = siteCount.t[u.h] || 1, a = u.el.tagName === 'A';
    chip.innerHTML = `<span>${count > 1 ? 'Same text in ' + count + ' places' : 'Editing text'}</span>` +
      (count > 1 ? `<button type="button" data-c="scope" class="${isOnlyHere(u) ? 'on' : ''}">Change only here</button>` : '') +
      (a ? `<button type="button" data-c="link">Link</button>` : '') +
      `<button type="button" data-c="reset">Reset</button><button type="button" data-c="done">Done</button>`;
    ui.appendChild(chip);
    const r = u.el.getBoundingClientRect(); const top = scrollY + r.top - chip.offsetHeight - 10;
    chip.style.top = (top < scrollY + 70 ? scrollY + r.bottom + 10 : top) + 'px';
    chip.style.left = Math.max(8, Math.min(scrollX + r.left, scrollX + innerWidth - chip.offsetWidth - 8)) + 'px';
    chip.addEventListener('mousedown', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
    chip.onclick = async e => {
      const c = e.target.dataset.c; if (!c) return;
      if (c === 'done') return finish();
      if (c === 'scope') { u.onlyHere = !(u.onlyHere ?? isOnlyHere(u)); e.target.classList.toggle('on', u.onlyHere); return; }
      if (c === 'reset') {
        finish(true);
        const k = isOnlyHere(u) ? overrideKey(u) : 't:' + u.h;
        if (await put(k, null)) { refreshSame(u); toast('Reset to original'); }
        return;
      }
      if (c === 'link') {
        const box = document.createElement('span'); box.innerHTML = `<input type="url" aria-label="Link address"><button type="button" data-c="savelink">Save link</button>`;
        const inp = box.querySelector('input'); inp.value = u.el.getAttribute('href') || '';
        e.target.replaceWith(box); inp.focus(); inp.select();
        const save = async () => { const v = inp.value.trim(); if (await put('a:' + u.h, v === u.origHref ? null : v)) { refreshSame(u); toast('Link saved'); } finish(); };
        box.querySelector('button').onclick = save; inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); save(); } if (ev.key === 'Escape') finish(); };
      }
    };
  }

  function start(el, x, y) {
    if (cur && cur.el === el) return;
    finish();
    const u = unitOf(el); if (!u) return;
    cur = { el, u, before: el.innerHTML };
    try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.focus();
    const rng = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    if (rng && el.contains(rng.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(rng); }
    placeChip(u);
  }
  function finish(skip) {
    if (!cur) { chip?.remove(); chip = null; return; }
    const { el, before } = cur; cur = null; chip?.remove(); chip = null;
    el.removeAttribute('contenteditable'); el.blur();
    if (!skip) commit(el, before);
  }
  function refreshSame(u) {
    RT.U.filter(x => x.h === u.h).forEach(RT.applyUnit);
    RT.rules().forEach(r => RT.replaceEverywhere(document.body, r.from, r.to));
  }

  async function commit(el, before) {
    const u = unitOf(el); if (!u) return;
    const after = RT.sanitize(el.innerHTML);
    if (RT.norm(after) === RT.norm(before)) return;

    // An email address or phone number was swapped → offer to change it on every page
    const bT = el.cloneNode(false); bT.innerHTML = before; const bText = bT.textContent, aText = el.textContent;
    for (const re of TOKENS) {
      const was = tokens(bText, re), now = tokens(aText, re);
      const gone = was.filter(x => !now.includes(x)), added = now.filter(x => !was.includes(x));
      if (gone.length === 1 && added.length === 1) {
        const from = gone[0], to = added[0];
        const choice = await ask('Change it everywhere?', `Replace “${from}” with “${to}” on every page of the website (text and links)?`, [['Only here', 'here'], ['Everywhere', 'all', true]]);
        if (choice === 'all') {
          const existing = RT.rules().find(r => r.to === from);
          const orig = existing ? existing.from : from;
          const key = 'r:' + RT.hashOf(orig);
          if (!(await put(key, orig === to ? null : JSON.stringify({ from: orig, to })))) return;
          RT.replaceEverywhere(document.body, from, to);
          const rest = RT.unapplyRules(after.split(to).join(from));
          await saveText(u, rest);
          toast('Updated everywhere');
          return;
        }
      }
    }
    await saveText(u, RT.unapplyRules(after));
    toast('Saved');
  }
  async function saveText(u, html) {
    const onlyHere = u.onlyHere ?? isOnlyHere(u);
    const key = onlyHere ? overrideKey(u) : 't:' + u.h;
    const isOrig = RT.norm(html) === RT.norm(u.orig);
    const ok = await put(key, isOrig ? null : html);
    if (ok && !onlyHere && isOnlyHere(u)) await put(overrideKey(u), null);
    if (ok) refreshSame(u);
  }

  document.addEventListener('focusout', e => {
    if (!cur || e.target !== cur.el) return;
    if (chip && e.relatedTarget && chip.contains(e.relatedTarget)) return;
    finish();
  });
  document.addEventListener('keydown', e => {
    if (!cur) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); cur.el.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); cur.el.innerHTML = cur.before; finish(true); }
  }, true);
  document.addEventListener('paste', e => {
    if (!cur) return; e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  }, true);

  /* ---------- photos ---------- */
  const picker = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' }); picker.style.display = 'none'; ui.appendChild(picker);
  const imgAt = (x, y) => document.elementsFromPoint(x, y).find(n => n.tagName === 'IMG' && !n.closest('#kca-admin, .hero-fg, [data-kca-skip]'));
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file); const max = 2200, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return await new Promise(r => c.toBlob(b => r(b || file), type, .86));
  }
  function replaceImage(img) {
    const info = RT.trackImg(img); if (!info) return;
    picker.value = '';
    picker.onchange = async () => {
      const f = picker.files[0]; if (!f) return;
      if (!f.type.startsWith('image/')) return toast('Please choose an image file', true);
      const count = siteCount.i[info.src] || 1;
      let scope = 'all';
      if (count > 1) scope = await ask('Replace this photo', `This photo is used in ${count} places on the website.`, [['Only here', 'here'], ['Everywhere', 'all', true]]);
      toast('Uploading…');
      try {
        const blob = await shrink(f); const url = await backend.upload(blob, f.name.replace(/\.\w+$/, '') + (blob.type === 'image/png' ? '.png' : '.jpg'));
        const key = scope === 'here' ? 'j:' + RT.page + ':' + info.src + ':' + info.n : 'i:' + info.src;
        if (await put(key, url)) { document.querySelectorAll('img').forEach(RT.applyImg); toast('Photo replaced'); }
      } catch (e) { toast('Upload failed: ' + (e.message || e), true); }
    };
    picker.click();
  }


  /* ---------- team page: add / remove / edit people ---------- */
  const grid = document.getElementById('teamGrid');
  if (grid) {
    const data = () => JSON.parse(JSON.stringify(RT.teamData()));
    const saveTeam = async (d, msg) => { if (await put('team:list', JSON.stringify(d))) { RT.renderTeam(); toast(msg || 'Saved'); } };
    const decorate = () => grid.querySelectorAll('.team-group').forEach(g => {
      if (g.querySelector('.person.add')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'person add'; b.textContent = '+ Add person';
      b.dataset.group = g.dataset.group; g.querySelector('.team-grid').appendChild(b);
    });
    decorate(); document.addEventListener('kca:team-rendered', decorate);

    grid.addEventListener('click', async e => {
      if (!editing) return;
      const card = e.target.closest('.person'); if (!card) return;
      e.preventDefault(); e.stopPropagation();
      if (card.classList.contains('add')) {
        const d = data(); d.people.push({ id: 'p' + Date.now().toString(36), group: card.dataset.group, name: 'New person', role: 'Role', photo: '' });
        return saveTeam(d, 'Person added. Click the name to edit it.');
      }
      const id = card.dataset.id;
      if (e.target.closest('.del')) {
        const p = data().people.find(x => x.id === id);
        const ok = await ask('Remove this person?', `“${p ? p.name : ''}” will be removed from the Our Team page.`, [['Cancel', false], ['Remove', true, true]]);
        if (ok) { const d = data(); d.people = d.people.filter(x => x.id !== id); saveTeam(d, 'Removed'); }
        return;
      }
      if (e.target.closest('.ph')) {
        picker.value = '';
        picker.onchange = async () => {
          const f = picker.files[0]; if (!f || !f.type.startsWith('image/')) return;
          toast('Uploading…');
          try {
            const blob = await shrink(f); const url = await backend.upload(blob, 'team-' + id + (blob.type === 'image/png' ? '.png' : '.jpg'));
            const d = data(); const p = d.people.find(x => x.id === id); if (p) { p.photo = url; saveTeam(d, 'Photo updated'); }
          } catch (err) { toast('Upload failed: ' + (err.message || err), true); }
        };
        return picker.click();
      }
      const field = e.target.closest('.nm, .rl');
      if (field && !field.isContentEditable) {
        finish();
        try { field.contentEditable = 'plaintext-only'; } catch (x) { field.contentEditable = 'true'; }
        if (field.contentEditable !== 'plaintext-only') field.contentEditable = 'true';
        field.focus();
        const before = field.textContent;
        const done = async save => {
          field.removeEventListener('blur', onBlur); field.removeEventListener('keydown', onKey);
          field.removeAttribute('contenteditable');
          const v = field.textContent.trim();
          if (!save || !v || v === before) { field.textContent = before; return; }
          const d = data(); const p = d.people.find(x => x.id === id); if (!p) return;
          p[field.classList.contains('nm') ? 'name' : 'role'] = v; saveTeam(d);
        };
        const onBlur = () => done(true);
        const onKey = ev => { if (ev.key === 'Enter') { ev.preventDefault(); field.blur(); } if (ev.key === 'Escape') { ev.preventDefault(); field.textContent = before; done(false); } };
        field.addEventListener('blur', onBlur); field.addEventListener('keydown', onKey);
      }
    }, true);
  }

  /* ---------- click routing ---------- */
  document.addEventListener('click', e => {
    if (cur && !cur.el.contains(e.target) && !(chip && chip.contains(e.target))) finish();
    if (!editing || e.target.closest('#kca-admin')) return;
    const unit = e.target.closest('[data-kca-unit]');
    if (unit) { e.preventDefault(); e.stopPropagation(); start(unit, e.clientX, e.clientY); return; }
    const img = imgAt(e.clientX, e.clientY);
    if (img) { e.preventDefault(); e.stopPropagation(); finish(); replaceImage(img); return; }
    if (e.target.closest('a')) e.preventDefault();
  }, true);
  document.addEventListener('submit', e => { if (editing) e.preventDefault(); }, true);

  let raf = 0;
  document.addEventListener('mousemove', e => {
    if (raf) return; raf = requestAnimationFrame(() => {
      raf = 0;
      const show = editing && !e.target.closest('[data-kca-unit], #kca-admin') && imgAt(e.clientX, e.clientY);
      tip.style.display = show ? 'block' : 'none';
      if (show) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; document.documentElement.style.cursor = 'pointer'; }
      else document.documentElement.style.cursor = '';
    });
  }, { passive: true });
  addEventListener('scroll', () => { if (cur) placeChip(cur.u); }, { passive: true });

  toast('Edit mode: click any text or photo');
})();
