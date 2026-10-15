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
      async messages() { const { data, error } = await sb.from('form_submissions').select('*').order('created_at', { ascending: false }).limit(300); if (error) throw error; return data; },
      async deleteMessage(id) { const { error } = await sb.from('form_submissions').delete().eq('id', id); if (error) throw error; },
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
  #kca-admin .modal .msgs { width: min(680px, 100%); max-height: 86vh; display: flex; flex-direction: column; }
  #kca-admin .msgs .list { max-height: none; flex: 1; overflow: auto; }
  #kca-admin .msgs .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  #kca-admin .msgs .filters button { height: 32px; padding: 0 12px; font-size: 13px; font-weight: 600; background: #ecebe7; }
  #kca-admin .msgs .filters button.on { background: #111; color: #fff; }
  #kca-admin .allowed.msgs .list li.msg { display: block; padding: 14px 2px; }
  #kca-admin .msgs .mh { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  #kca-admin .msgs .mh time { color: #888; font-size: 13px; }
  #kca-admin .msgs .kv { display: grid; grid-template-columns: 150px 1fr; gap: 10px; font-size: 14px; padding: 2px 0; }
  #kca-admin .msgs .kv b { color: #666; font-weight: 600; } #kca-admin .msgs .kv span { white-space: pre-wrap; word-break: break-word; }
  #kca-admin .msgs .ma { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
  #kca-admin .msgs .ma a { color: #0b74e8; font-weight: 600; font-size: 14px; }
  #kca-admin .msgs .ma button { height: 30px; padding: 0 12px; font-size: 13px; }
  @media (max-width: 700px) { #kca-admin .msgs .kv { grid-template-columns: 1fr; gap: 0; } }
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
  const pageNames = { 'index.html': 'Home', 'about.html': 'About', 'academics.html': 'Academics', 'admissions.html': 'Admissions', 'student-life.html': 'Student Life', 'reviews.html': 'Reviews', 'teaching.html': 'Teaching', 'donate.html': 'Donate', 'contact.html': 'Contact', 'team.html': 'Our Team', 'teacher-application.html': 'Teacher Application' };
  ui.innerHTML = `<div class="bar" role="toolbar" aria-label="Website editor">
      <span class="who"><span class="dot"></span>Editing <small>${user.email} · ${role === 'admin' ? 'Admin' : 'Editor'}</small></span>
      <select aria-label="Go to page">${RT.PAGES.map(p => `<option value="${p}"${p === RT.page ? ' selected' : ''}>${pageNames[p] || p}</option>`).join('')}</select>
      <button type="button" data-act="preview">Preview</button><button type="button" data-act="msgs">Messages</button>${role === 'admin' ? '<button type="button" data-act="allowed">Allowed emails</button>' : ''}
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
  /* ---------- Messages (form submissions) ---------- */
  bar.querySelector('[data-act=msgs]').onclick = async () => {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div role="dialog" aria-modal="true" class="allowed msgs"><h3>Messages</h3>
      <p>Everything visitors send through the website forms.</p>
      <div class="filters"></div><p class="err" role="alert"></p><ul class="list"><li class="muted">Loading…</li></ul>
      <div class="row"><button type="button" data-x>Close</button></div></div>`;
    ui.appendChild(m);
    const list = m.querySelector('.list'), err = m.querySelector('.err'), fl = m.querySelector('.filters');
    m.querySelector('[data-x]').onclick = () => m.remove();
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    let rows = [], cur = 'All';
    const draw = () => {
      const show = rows.filter(r => cur === 'All' || r.form === cur);
      list.innerHTML = show.map(r => {
        const d = new Date(r.created_at);
        const fields = Object.entries(r.data || {}).filter(([k]) => k !== 'Form' && k !== 'Page').map(([k, v]) => `<div class="kv"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
        return `<li class="msg"><div class="mh"><strong>${esc(r.form)}</strong><time>${d.toLocaleString()}</time></div>${fields}<div class="ma">` +
          (r.email ? `<a href="mailto:${esc(r.email)}">Reply</a>` : '') + (role === 'admin' ? `<button type="button" data-del="${r.id}">Delete</button>` : '') + `</div></li>`;
      }).join('') || '<li class="muted">No messages yet</li>';
    };
    try {
      rows = await backend.messages();
      const forms = ['All', ...new Set(rows.map(r => r.form))];
      fl.innerHTML = forms.map(f => `<button type="button" class="${f === cur ? 'on' : ''}" data-f="${esc(f)}">${esc(f)}${f === 'All' ? ' (' + rows.length + ')' : ''}</button>`).join('');
      fl.onclick = e => { const f = e.target.dataset.f; if (!f) return; cur = f; fl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === f)); draw(); };
      draw();
    } catch (e) { list.innerHTML = ''; err.textContent = 'Could not load messages: ' + (e.message || e) + '. Has supabase/forms.sql been run?'; }
    list.onclick = async e => {
      const id = e.target.dataset.del; if (!id) return;
      if (!(await ask('Delete this message?', 'It will be removed permanently.', [['Cancel', false], ['Delete', true, true]]))) return;
      try { await backend.deleteMessage(id); rows = rows.filter(r => String(r.id) !== id); draw(); toast('Deleted'); } catch (x) { err.textContent = 'Could not delete: ' + (x.message || x); }
    };
  };

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
  /* ---------- Form editor: change, hide, reorder and add fields on any form ---------- */
  const FX = RT.forms;
  let openForms = () => {};
  if (FX && FX.list.length) {
    const fcss = document.createElement('style');
    fcss.textContent = `
    html.kca-editing form .field { cursor: pointer; outline: 1.5px dashed transparent; outline-offset: 4px; border-radius: 6px; transition: outline-color .15s; }
    html.kca-editing form .field:hover { outline-color: rgba(11,116,232,.75); }
    html.kca-editing form .field.kf-flash { outline: 2px solid #0b74e8; }
    #kca-admin .fe { position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); z-index: 2147483002; display: flex; flex-direction: column; background: #fff; color: #111; box-shadow: -12px 0 40px rgba(0,0,0,.22); font-size: 14px; }
    #kca-admin .fe header { display: flex; align-items: center; gap: 10px; padding: 16px 18px 10px; }
    #kca-admin .fe h3 { margin: 0; font-size: 18px; flex: 1; }
    #kca-admin .fe .x { width: 36px; height: 36px; border: 0; border-radius: 10px; background: #ecebe7; font-size: 20px; cursor: pointer; }
    #kca-admin .fe .top { padding: 0 18px 10px; border-bottom: 1px solid #ecebe7; }
    #kca-admin .fe .top p { margin: 6px 0 0; color: #666; font-size: 13px; line-height: 1.45; }
    #kca-admin .fe select, #kca-admin .fe input[type=text], #kca-admin .fe textarea { width: 100%; height: 38px; border: 2px solid #dcdcd8; border-radius: 10px; padding: 0 10px; font-size: 14px; background: #fff; color: #111; }
    #kca-admin .fe textarea { height: auto; min-height: 96px; padding: 8px 10px; resize: vertical; line-height: 1.4; }
    #kca-admin .fe select:focus, #kca-admin .fe input:focus, #kca-admin .fe textarea:focus { outline: none; border-color: #0b74e8; }
    #kca-admin .fe .body { flex: 1; overflow: auto; padding: 6px 18px 18px; }
    #kca-admin .fe h4 { margin: 16px 0 6px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #777; }
    #kca-admin .fe ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid #ecebe7; }
    #kca-admin .fe li { border-bottom: 1px solid #ecebe7; }
    #kca-admin .fe li.off .lb { color: #999; text-decoration: line-through; }
    #kca-admin .fe .rh { display: flex; align-items: center; gap: 6px; padding: 8px 0; }
    #kca-admin .fe .lb { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
    #kca-admin .fe em { font-style: normal; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 99px; background: #f1f0ec; color: #555; white-space: nowrap; }
    #kca-admin .fe em.req { background: #fde8e8; color: #a52a2a; } #kca-admin .fe em.new { background: #e4f0fd; color: #0b5cb8; }
    #kca-admin .fe button { height: 32px; border: 0; border-radius: 8px; padding: 0 10px; background: #ecebe7; color: #111; font-size: 13px; font-weight: 600; cursor: pointer; }
    #kca-admin .fe button:hover { background: #dedcd6; }
    #kca-admin .fe button.primary { background: #0b74e8; color: #fff; } #kca-admin .fe button.danger { background: #fdecea; color: #b3261e; }
    #kca-admin .fe button:disabled { opacity: .35; cursor: default; }
    #kca-admin .fe .mv { width: 30px; padding: 0; }
    #kca-admin .fe .ed { display: grid; gap: 10px; padding: 4px 0 14px; }
    #kca-admin .fe .ed label { display: grid; gap: 4px; font-size: 12.5px; font-weight: 600; color: #555; }
    #kca-admin .fe .ed .ck { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #111; font-weight: 500; }
    #kca-admin .fe .ed .ck input { width: 18px; height: 18px; }
    #kca-admin .fe .ed small { color: #888; font-weight: 400; }
    #kca-admin .fe .ed .acts { display: flex; gap: 8px; flex-wrap: wrap; }
    #kca-admin .fe .add { display: flex; gap: 8px; margin-top: 8px; } #kca-admin .fe .add select { flex: 1; }
    #kca-admin .fe footer { display: flex; gap: 8px; align-items: center; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid #ecebe7; }
    #kca-admin .fe footer .sp { flex: 1; } #kca-admin .fe footer button { height: 40px; padding: 0 14px; }
    #kca-admin .fe .dirty { color: #b26b00; font-size: 12.5px; font-weight: 600; }
    @media (max-width: 700px) { #kca-admin .fe { top: auto; height: 86vh; border-radius: 20px 20px 0 0; } #kca-admin .fe footer button { flex: 1; } #kca-admin .fe select, #kca-admin .fe input[type=text], #kca-admin .fe textarea { font-size: 16px; } }`;
    document.head.appendChild(fcss);
    bar.querySelector('[data-act=msgs]').insertAdjacentHTML('beforebegin', '<button type="button" data-act="forms">Forms</button>');
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clone = o => JSON.parse(JSON.stringify(o || {}));
    const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
    const NEW_TYPES = ['text', 'email', 'tel', 'number', 'date', 'textarea', 'select', 'radio', 'checkbox'];
    let pane = null, F = null, draft = null, openKey = null, dirty = false;

    const keyOfEl = el => { const r = [...F.fields.values()].find(x => x.el === el); return r ? r.key : el.dataset.kfAdded; };
    const keysIn = gi => [...F.grids[gi].el.children].filter(n => n.matches('.field') && (n.dataset.kfAdded || [...F.fields.values()].some(r => r.el === n))).map(keyOfEl);
    const addedDef = k => draft.added.find(d => d.key === k);
    const elOf = k => (F.fields.get(k) || {}).el || F.form.querySelector(`[data-kf-added="${k}"]`);
    const infoOf = k => {
      const r = F.fields.get(k);
      if (r) return r.info();
      const d = addedDef(k) || {};
      return { label: d.label || '', placeholder: d.placeholder || '', help: d.help || '', options: ['select', 'radio', 'checkbox'].includes(d.type) ? (d.options || []) : null, required: !!d.required, full: !!d.full || ['textarea', 'radio', 'checkbox'].includes(d.type), error: d.error || '', hidden: !!d.hidden, kind: d.type, added: true };
    };
    const preview = () => { FX.apply(F, draft); };
    const mark = () => { dirty = true; const n = pane && pane.querySelector('.dirty'); if (n) n.textContent = 'Unsaved changes'; };
    const change = (k, prop, val) => {
      const d = addedDef(k);
      if (d) d[prop] = val; else (draft.fields[k] = draft.fields[k] || {})[prop] = val;
      preview(); mark(); updateHead(k);
    };
    const flash = k => { const el = elOf(k); if (!el || !el.offsetParent) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('kf-flash'); setTimeout(() => el.classList.remove('kf-flash'), 1400); };

    function headHTML(k) {
      const i = infoOf(k);
      return `<span class="lb" data-open title="${esc(i.label)}">${esc(i.label || 'Untitled')}</span><em>${esc(FX.TYPES[i.kind] || '')}</em>` +
        (i.added ? '<em class="new">New</em>' : '') + (i.required ? '<em class="req">Required</em>' : '') + (i.hidden ? '<em>Hidden</em>' : '') +
        `<button type="button" class="mv" data-mv="-1" aria-label="Move up">↑</button><button type="button" class="mv" data-mv="1" aria-label="Move down">↓</button><button type="button" data-open>${openKey === k ? 'Close' : 'Edit'}</button>`;
    }
    function updateHead(k) { const li = pane && pane.querySelector(`li[data-k="${CSS.escape(k)}"]`); if (!li) return; li.querySelector('.rh').innerHTML = headHTML(k); li.classList.toggle('off', !!infoOf(k).hidden); fixMoves(); }
    function fixMoves() { pane.querySelectorAll('ul').forEach(ul => { const lis = [...ul.children]; lis.forEach((li, i) => { li.querySelector('[data-mv="-1"]').disabled = i === 0; li.querySelector('[data-mv="1"]').disabled = i === lis.length - 1; }); }); }
    function editorHTML(k) {
      const i = infoOf(k), texty = ['text', 'email', 'tel', 'number', 'url', 'textarea'].includes(i.kind), choice = ['radio', 'checkbox'].includes(i.kind);
      return `<div class="ed">
        <label>Question / label<input type="text" data-p="label" value="${esc(i.label)}"></label>
        <label>Help text <small>(small grey line under the label — optional)</small><input type="text" data-p="help" value="${esc(i.help)}"></label>
        ${texty ? `<label>Placeholder <small>(example text inside the box — optional)</small><input type="text" data-p="placeholder" value="${esc(i.placeholder)}"></label>` : ''}
        ${i.options && !i.locked ? `<label>Choices <small>(one per line)</small><textarea data-p="options">${esc(i.options.join('\n'))}</textarea></label>` : ''}
        ${i.kind === 'special' ? '' : `<label>Error message<input type="text" data-p="error" value="${esc(i.error)}"></label>`}
        ${i.kind === 'special' || i.locked ? '' : `<label class="ck"><input type="checkbox" data-p="required"${i.required ? ' checked' : ''}> Required (must be filled in)</label>`}
        ${texty || i.kind === 'select' || i.kind === 'date' ? `<label class="ck"><input type="checkbox" data-p="full"${i.full ? ' checked' : ''}> Full width</label>` : ''}
        <label class="ck"><input type="checkbox" data-p="hidden"${i.hidden ? ' checked' : ''}> Hide this field from visitors</label>
        <div class="acts">${i.added ? '<button type="button" class="danger" data-del>Delete field</button>' : '<button type="button" data-reset>Undo changes to this field</button>'}</div>
      </div>`;
    }
    function render() {
      const saved = FX.saved(F);
      pane.querySelector('.body').innerHTML = F.grids.map((g, gi) => `<h4>${esc(g.title)}</h4><ul data-g="${gi}">` +
        keysIn(gi).map(k => `<li data-k="${esc(k)}" class="${infoOf(k).hidden ? 'off' : ''}"><div class="rh">${headHTML(k)}</div>${openKey === k ? editorHTML(k) : ''}</li>`).join('') +
        `</ul><div class="add"><select aria-label="Type of new field">${NEW_TYPES.map(t => `<option value="${t}">${esc(FX.TYPES[t])}</option>`).join('')}</select><button type="button" data-add="${gi}">+ Add field</button></div>`).join('');
      pane.querySelector('[data-reset-form]').disabled = !saved && !dirty;
      fixMoves();
    }
    async function close(force) {
      if (!pane) return;
      if (dirty && !force) {
        const c = await ask('Save your form changes?', 'You changed this form but have not saved yet.', [['Discard', 'discard'], ['Keep editing', 'keep'], ['Save', 'save', true]]);
        if (c === 'keep') return; if (c === 'save') return save(true);
        FX.apply(F, FX.saved(F));
      }
      pane.remove(); pane = null; dirty = false;
    }
    async function save(andClose) {
      const clean = { fields: {}, added: draft.added, order: {} };
      Object.entries(draft.fields).forEach(([k, o]) => { if (o && Object.keys(o).length) clean.fields[k] = o; });
      F.grids.forEach((g, gi) => { const ks = keysIn(gi); if (draft.order[gi] || ks.some(k => addedDef(k))) clean.order[gi] = ks; });
      const empty = !Object.keys(clean.fields).length && !clean.added.length && !Object.keys(clean.order).length;
      if (await put(F.key, empty ? null : JSON.stringify(clean))) {
        dirty = false; toast('Form saved — visitors see it now');
        if (andClose) { pane.remove(); pane = null; } else { pane.querySelector('.dirty').textContent = ''; render(); }
      }
    }
    function pick(f) { F = f; draft = Object.assign({ fields: {}, added: [], order: {} }, clone(FX.saved(F))); dirty = false; render(); }

    openForms = async (f, key) => {
      if (pane && f !== F) { await close(); if (pane) return; }
      if (!pane) {
        pane = document.createElement('div'); pane.className = 'fe'; pane.setAttribute('role', 'dialog'); pane.setAttribute('aria-label', 'Form editor');
        pane.innerHTML = `<header><h3>Form editor</h3><button type="button" class="x" aria-label="Close">×</button></header>
          <div class="top">${FX.list.length > 1 ? `<select aria-label="Which form">${FX.list.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}</select>` : `<strong></strong>`}
          <p>Edit questions, choices and required fields, hide or reorder them, or add new ones. You see changes on the page right away; press <b>Save</b> to publish them.</p></div>
          <div class="body"></div>
          <footer><button type="button" data-reset-form>Reset form</button><span class="sp dirty"></span><button type="button" data-discard>Discard</button><button type="button" class="primary" data-save>Save</button></footer>`;
        ui.appendChild(pane);
        const sel = pane.querySelector('.top select');
        if (sel) sel.onchange = async () => { const nf = FX.list[+sel.value]; if (dirty) { const c = await ask('Save your form changes?', 'You changed this form but have not saved yet.', [['Discard', 'discard'], ['Save', 'save', true]]); if (c === 'save') await save(); else FX.apply(F, FX.saved(F)); } openKey = null; pick(nf); };
        pane.querySelector('.x').onclick = () => close();
        pane.querySelector('[data-discard]').onclick = () => { FX.apply(F, FX.saved(F)); openKey = null; pick(F); pane.querySelector('.dirty').textContent = ''; toast('Changes discarded'); };
        pane.querySelector('[data-save]').onclick = () => save();
        pane.querySelector('[data-reset-form]').onclick = async () => {
          if (!(await ask('Reset this form?', 'All changes to this form (including new fields) will be removed and it goes back to the original.', [['Cancel', false], ['Reset', true, true]]))) return;
          draft = { fields: {}, added: [], order: {} }; preview(); openKey = null; await save(); render();
        };
        const body = pane.querySelector('.body');
        body.addEventListener('click', e => {
          const li = e.target.closest('li[data-k]'), k = li && li.dataset.k;
          if (e.target.closest('[data-open]') && k) { openKey = openKey === k ? null : k; render(); if (openKey) { flash(k); pane.querySelector(`li[data-k="${CSS.escape(k)}"] input[data-p=label]`)?.focus(); } return; }
          const mv = e.target.closest('[data-mv]');
          if (mv && k) { const gi = +li.parentElement.dataset.g, ks = keysIn(gi), i = ks.indexOf(k), j = i + +mv.dataset.mv; if (j < 0 || j >= ks.length) return; [ks[i], ks[j]] = [ks[j], ks[i]]; draft.order[gi] = ks; preview(); mark(); render(); flash(k); return; }
          if (e.target.closest('[data-reset]') && k) { delete draft.fields[k]; preview(); mark(); render(); return; }
          if (e.target.closest('[data-del]') && k) { draft.added = draft.added.filter(d => d.key !== k); Object.values(draft.order).forEach(a => { const x = a.indexOf(k); if (x > -1) a.splice(x, 1); }); openKey = null; preview(); mark(); render(); return; }
          const add = e.target.closest('[data-add]');
          if (add) {
            const gi = +add.dataset.add, type = add.previousElementSibling.value, k = 'n' + Date.now().toString(36);
            const choice = ['select', 'radio', 'checkbox'].includes(type);
            draft.added.push({ key: k, grid: gi, type, label: 'New question', options: choice ? ['Option 1', 'Option 2'] : undefined, required: false, full: type === 'textarea' });
            draft.order[gi] = keysIn(gi).concat(k); openKey = k; preview(); mark(); render(); flash(k);
            const inp = pane.querySelector(`li[data-k="${k}"] input[data-p=label]`); if (inp) { inp.focus(); inp.select(); }
          }
        });
        const onEdit = e => {
          const p = e.target.dataset.p, li = e.target.closest('li[data-k]'); if (!p || !li) return;
          const v = e.target.type === 'checkbox' ? e.target.checked : p === 'options' ? lines(e.target.value) : e.target.value;
          if (p === 'options' && !v.length) return;
          if (p === 'label' && !String(v).trim()) return;
          change(li.dataset.k, p, v);
        };
        body.addEventListener('input', onEdit); body.addEventListener('change', e => { if (e.target.type === 'checkbox') onEdit(e); });
      }
      if (f !== F || !draft) pick(f);
      const sel = pane.querySelector('.top select'); if (sel) sel.value = FX.list.indexOf(F); else pane.querySelector('.top strong').textContent = F.name;
      if (key) { openKey = key; render(); flash(key); pane.querySelector(`li[data-k="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'nearest' }); }
    };
    bar.querySelector('[data-act=forms]').onclick = () => (pane ? close() : openForms(F || FX.list[0]));
  }

  bar.querySelector('[data-act=out]').onclick = async () => { exitEdit(); await backend.signOut().catch(() => {}); location.reload(); };

  // text inside form fields is edited in the Form editor instead
  RT.U.forEach(u => { if (!(RT.forms && RT.forms.fieldOf(u.el))) u.el.setAttribute('data-kca-unit', ''); });
  document.querySelectorAll('details').forEach(d => d.open = true);
  setMode(true);

  /* ---------- how many times each text/photo appears across the whole site ---------- */
  const siteCount = { t: {}, i: {} };
  (async () => {
    const docs = await Promise.all(RT.PAGES.map(p => fetch(RT.urlOf(p), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => '')));
    const any = docs.some(Boolean);
    const add = (o, k) => { o[k] = (o[k] || 0) + 1; };
    if (!any) { RT.U.forEach(u => add(siteCount.t, u.h + ':' + u.n)); document.querySelectorAll('img').forEach(i => { const x = RT.trackImg(i); if (x) add(siteCount.i, x.src); }); return; }
    docs.forEach(html => {
      if (!html) return; const d = new DOMParser().parseFromString(html, 'text/html');
      RT.indexUnits(RT.units(d)).forEach(u => add(siteCount.t, u.h + ':' + u.n));
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
    const count = siteCount.t[u.h + ':' + u.n] || 1, a = u.el.tagName === 'A';
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
        const legacy = RT.map['t:' + u.h] != null;
        const k = isOnlyHere(u) ? overrideKey(u) : 't:' + u.h + ':' + u.n;
        if (await put(k, legacy && !isOnlyHere(u) ? u.orig : null)) { refreshSame(u); toast('Reset to original'); }
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
    const key = onlyHere ? overrideKey(u) : 't:' + u.h + ':' + u.n;
    const isOrig = RT.norm(html) === RT.norm(u.orig);
    // older edits were saved for every copy of the same text; keep an explicit value so they can be told apart
    const legacy = RT.map['t:' + u.h] != null;
    const ok = await put(key, isOrig && !legacy ? null : html);
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
    const ff = RT.forms && RT.forms.fieldOf(e.target);
    if (ff) { e.preventDefault(); e.stopPropagation(); finish(); openForms(ff.F, ff.key); return; }
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

  toast(RT.forms && RT.forms.list.length ? 'Edit mode: click any text, photo or form field' : 'Edit mode: click any text or photo');
})();
