/* Admin: people. Loaded in order by admin.html. */

async function renderPeopleTab(body, people) {
  body.innerHTML = `
    <div id="peopleAccounts" class="p-card" style="margin-bottom:32px"></div>
    <h2>Public directory</h2><p class="p-soft-note">Published profiles are managed here. Removing a profile does not disable the member’s login; manage access above.</p>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newP">+ Add person</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Name</div><div style="flex:1">Role</div><div style="flex:1">Category</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${people
        .map(
          (p) => `<div class="p-inv-row">
        <div style="flex:2;display:flex;align-items:center;gap:12px">
          ${
            p.photo_url
              ? `<img src="${escHtml(p.photo_url)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border-1);">`
              : `<div class="p-task-av" style="width:36px;height:36px;font-size:12px;background:var(--gold-600)">${escHtml(initials(p.name))}</div>`
          }
          <div><div class="p-inv-name">${escHtml(p.name)}</div><div style="font-size:11px;color:var(--fg-4)">${escHtml(p.email || '')}</div></div>
        </div>
        <div style="flex:1;font-size:12px;color:var(--fg-2)">${escHtml(p.role || '')}</div>
        <div style="flex:1"><span class="p-tag p-tag-outline">${escHtml(p.category || '')}</span></div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit="${p.id}">Edit</button><button class="danger" data-del="${p.id}">×</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm('Remove?')) {
          await apiDel('/api/people/' + b.dataset.del);
          renderAdmin($('#mainContent'));
        }
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openP(people.find((x) => x.id == b.dataset.edit))));
  $('#newP').onclick = () => openP(null);
  await renderPeopleAccounts($('#peopleAccounts', body));
  function openP(p) {
    const isNew = !p;
    p = p || { name: '', role: '', category: 'phd', email: '', bio: '', photo_url: '', active: 1 };
    const bg = modal(
      isNew ? 'Add person' : 'Edit person',
      '',
      `
      <label>Name</label><input id="m_n" value="${escHtml(p.name)}">
      <label>Role</label><input id="m_r" value="${escHtml(p.role)}">
      <label>Category</label>
      <select id="m_c">${['director', 'manager', 'faculty', 'postdoc', 'phd', 'ms', 'ug', 'alumni', 'collaborator'].map((x) => `<option value="${x}"${x === p.category ? ' selected' : ''}>${x}</option>`).join('')}</select>
      <label>Email</label><input id="m_e" value="${escHtml(p.email || '')}">
      <label>Profile photo (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        <img id="m_ph_prev" src="${escHtml(p.photo_url || '')}" alt="" style="width:54px;height:54px;border-radius:50%;object-fit:cover;object-position:${escHtml(p.photo_position || 'center center')};background:var(--bg-1);border:1px solid var(--border-1);${p.photo_url ? '' : 'visibility:hidden;'}">
        <input type="file" id="m_ph_file" accept="image/*" style="flex:1;">
      </div>
      <label>Photo URL (or use upload above)</label><input id="m_ph" value="${escHtml(p.photo_url || '')}">
      <label>Photo focal point — click on the image to choose what should be centered in the circle</label>
      <div id="m_ph_picker" style="position:relative; width:300px; height:300px; border:1px solid var(--border-1); border-radius:8px; overflow:hidden; background:var(--bg-1); cursor:crosshair;">
        <img id="m_ph_picker_img" src="${escHtml(p.photo_url || '')}" alt="" style="width:100%; height:100%; object-fit:contain; ${p.photo_url ? '' : 'display:none;'}">
        <div id="m_ph_picker_dot" style="position:absolute; width:18px; height:18px; border:2px solid var(--gold-600); background:rgba(255,255,255,.6); border-radius:50%; transform:translate(-50%,-50%); pointer-events:none; left:50%; top:50%;"></div>
      </div>
      <input id="m_pp" type="hidden" value="${escHtml(p.photo_position || 'center center')}">
      <label>Result preview</label>
      <img id="m_ph_result" src="${escHtml(p.photo_url || '')}" alt="" style="width:120px;height:120px;border-radius:50%;object-fit:cover;object-position:${escHtml(p.photo_position || 'center center')};border:3px solid #fff; box-shadow:var(--shadow-sm); ${p.photo_url ? '' : 'display:none;'}">
      <label>LinkedIn URL</label><input id="m_li" value="${escHtml(p.linkedin_url || '')}" placeholder="https://linkedin.com/in/...">
      <label>Personal website (optional)</label><input id="m_ws" value="${escHtml(p.website_url || '')}">
      <label>Bio</label><textarea id="m_b" style="min-height:120px;">${escHtml(p.bio || '')}</textarea>
    `,
      async (mb) => {
        const f = $('#m_ph_file', mb);
        if (f && f.files && f.files[0]) {
          const url = await uploadPhoto(f.files[0]);
          $('#m_ph', mb).value = url;
          $('#m_ph_picker_img', mb).src = url;
          $('#m_ph_picker_img', mb).style.display = 'block';
          $('#m_ph_result', mb).src = url;
          $('#m_ph_result', mb).style.display = 'inline-block';
        }
        const body = {
          name: $('#m_n', mb).value,
          role: $('#m_r', mb).value,
          category: $('#m_c', mb).value,
          email: $('#m_e', mb).value,
          photo_url: $('#m_ph', mb).value,
          photo_position: $('#m_pp', mb).value,
          linkedin_url: $('#m_li', mb).value,
          website_url: $('#m_ws', mb).value,
          bio: $('#m_b', mb).value,
          active: 1,
        };
        if (isNew) await apiPost('/api/people', body);
        else await apiPut('/api/people/' + p.id, body);
        renderAdmin($('#mainContent'));
      },
    );
    bg.querySelector('.modal').classList.add('is-wide');
    // Upgrade the focal-point picker into a larger drag-to-frame tool.
    setTimeout(() => {
      const picker = document.getElementById('m_ph_picker');
      if (!picker) return;
      const img = document.getElementById('m_ph_picker_img');
      const dot = document.getElementById('m_ph_picker_dot');
      const result = document.getElementById('m_ph_result');
      const preview = document.getElementById('m_ph_prev');
      const hidden = document.getElementById('m_pp');
      const urlInput = document.getElementById('m_ph');
      const fileInput = document.getElementById('m_ph_file');
      const resultLabel = result ? result.previousElementSibling : null;
      picker.className = 'p-photo-stage';
      picker.style.width = '100%';
      picker.style.maxWidth = '360px';
      picker.style.height = 'auto';
      if (img) {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
      }
      if (dot) dot.className = 'p-photo-dot';
      if (resultLabel && resultLabel.tagName === 'LABEL')
        resultLabel.textContent = 'Circle preview';
      if (result) {
        result.style.width = '120px';
        result.style.height = '120px';
        result.style.display = result.src ? 'block' : 'none';
      }
      const xMap = { left: '0%', center: '50%', right: '100%' };
      const yMap = { top: '0%', center: '50%', bottom: '100%' };
      const applySource = (src) => {
        const visible = !!src;
        if (img) {
          img.src = src || '';
          img.style.display = visible ? 'block' : 'none';
        }
        if (result) {
          result.src = src || '';
          result.style.display = visible ? 'block' : 'none';
        }
        if (preview) {
          preview.src = src || '';
          preview.style.visibility = visible ? 'visible' : 'hidden';
        }
      };
      const applyFocus = (pos) => {
        const parts = String(pos || 'center center').split(' ');
        const x = xMap[parts[0]] || parts[0] || '50%';
        const y = yMap[parts[1]] || parts[1] || '50%';
        hidden.value = `${x} ${y}`;
        if (dot) {
          dot.style.left = x;
          dot.style.top = y;
        }
        if (img) img.style.objectPosition = `${x} ${y}`;
        if (result) result.style.objectPosition = `${x} ${y}`;
        if (preview) preview.style.objectPosition = `${x} ${y}`;
      };
      const setFromPointer = (clientX, clientY) => {
        if (!img || !img.src) return;
        const rect = picker.getBoundingClientRect();
        const xPct =
          Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)).toFixed(1) + '%';
        const yPct =
          Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)).toFixed(1) + '%';
        applyFocus(`${xPct} ${yPct}`);
      };
      const modalBody = picker.parentElement;
      const leftCol = document.createElement('div');
      const toolWrap = document.createElement('div');
      toolWrap.className = 'p-photo-tool';
      const infoCol = document.createElement('div');
      infoCol.innerHTML = `
        <div class="p-photo-help">Click or drag on the image to choose what stays centered in the circular crop. The preview reflects the same cover-style framing used on the public site.</div>
        <div class="p-photo-presets">
          <button type="button" data-photo-pos="50% 50%">Center</button>
          <button type="button" data-photo-pos="50% 26%">Raise</button>
          <button type="button" data-photo-pos="35% 50%">Left</button>
          <button type="button" data-photo-pos="65% 50%">Right</button>
        </div>
      `;
      const previewCard = document.createElement('div');
      previewCard.className = 'p-photo-preview-card';
      if (resultLabel && result) {
        resultLabel.remove();
        previewCard.appendChild(resultLabel);
        previewCard.appendChild(result);
      }
      infoCol.appendChild(previewCard);
      modalBody.insertBefore(toolWrap, picker);
      leftCol.appendChild(picker);
      if (hidden) leftCol.appendChild(hidden);
      toolWrap.appendChild(leftCol);
      toolWrap.appendChild(infoCol);
      let dragging = false;
      applyFocus(hidden.value || 'center center');
      applySource(urlInput.value.trim() || p.photo_url || '');
      picker.addEventListener('pointerdown', (e) => {
        dragging = true;
        setFromPointer(e.clientX, e.clientY);
      });
      picker.addEventListener('pointermove', (e) => {
        if (dragging) setFromPointer(e.clientX, e.clientY);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) =>
        picker.addEventListener(evt, () => {
          dragging = false;
        }),
      );
      infoCol
        .querySelectorAll('[data-photo-pos]')
        .forEach((btn) => (btn.onclick = () => applyFocus(btn.dataset.photoPos)));
      urlInput.addEventListener('input', () => applySource(urlInput.value.trim()));
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          const file = fileInput.files && fileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => applySource(String(reader.result || ''));
          reader.readAsDataURL(file);
        });
      }
    }, 0);
  }
}

async function renderPeopleAccounts(root) {
  const users = await apiGet('/api/users?include_disabled=1');
  root.innerHTML = `<h2>Lab accounts</h2><p class="p-soft-note">Control platform access here. Login roles are separate from public research titles and bios.</p>
    <button id="newAccount" class="btn-primary-sm">+ Add lab account</button>
    ${users.map((user) => `<div class="p-inv-row"><div style="flex:2"><strong>${escHtml(user.name || user.username)}</strong><div>@${escHtml(user.username)} · ${escHtml(user.email || '')}</div></div><div style="flex:1">${escHtml(user.role)} · ${user.active ? 'Active' : 'Disabled'}</div><button data-account="${user.id}" class="btn-ghost-sm">Manage account</button></div>`).join('')}`;
  root.querySelector('#newAccount').onclick = () => openAccount();
  root
    .querySelectorAll('[data-account]')
    .forEach(
      (button) =>
        (button.onclick = () =>
          openAccount(users.find((user) => String(user.id) === button.dataset.account))),
    );
  function openAccount(user) {
    modal(
      user ? 'Manage lab account' : 'Add lab account',
      '',
      `
      <label>Username</label><input id="accountUsername" value="${escHtml(user?.username || '')}" ${user ? 'readonly' : ''}>
      <label>Display name</label><input id="accountName" value="${escHtml(user?.name || '')}">
      <label>Email</label><input id="accountEmail" type="email" value="${escHtml(user?.email || '')}">
      <label>Access role</label><select id="accountRole">${['admin', 'professor', 'moderator', 'postdoc', 'student'].map((role) => `<option value="${role}" ${role === (user?.role || 'student') ? 'selected' : ''}>${role}</option>`).join('')}</select>
      <label>Account status</label><select id="accountActive"><option value="1">Active</option><option value="0" ${user?.active === 0 ? 'selected' : ''}>Disabled</option></select>
      <label>${user ? 'Reset password (leave blank to keep current password)' : 'Initial password'} — minimum 12 characters</label><input id="accountPassword" type="password" autocomplete="new-password">
      <label>Confirm password</label><input id="accountPasswordConfirm" type="password" autocomplete="new-password">
    `,
      async (mb) => {
        const password = $('#accountPassword', mb).value;
        if ((!user || password) && password.length < 12)
          throw new Error('Password must be at least 12 characters');
        if (password !== $('#accountPasswordConfirm', mb).value)
          throw new Error('Passwords do not match');
        const payload = {
          username: $('#accountUsername', mb).value.trim(),
          name: $('#accountName', mb).value.trim(),
          email: $('#accountEmail', mb).value.trim(),
          role: $('#accountRole', mb).value,
          active: $('#accountActive', mb).value === '1',
        };
        if (password) payload.password = password;
        if (user) await apiPut('/api/users/' + user.id, payload);
        else {
          if (!payload.username) throw new Error('Username is required');
          if (!payload.active) throw new Error('Create an active account before disabling it');
          await apiPost('/api/users', payload);
        }
        await renderPeopleAccounts(root);
      },
    );
  }
}
