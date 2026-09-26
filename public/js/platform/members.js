/* Platform: members. Loaded in order by platform.html. */

/* ---------- Lab members (staff only) ---------- */
async function loadUsers() {
  try {
    const users = await api('/api/users');
    if (!users.length) {
      $('#usersList').innerHTML = '<div class="empty">No members.</div>';
      return;
    }
    $('#usersList').innerHTML = users
      .map(
        (u) => `
      <div class="p-inv-row">
        <div style="flex:2;">
          <div class="p-inv-name">${escapeHTML(u.name || u.username)}</div>
          <div style="font-size:11px;color:var(--fg-4);">@${escapeHTML(u.username)} · ${escapeHTML(u.email || '')}</div>
        </div>
        <div style="flex:1;"><span class="p-tag-sm p-tag-outline">${escapeHTML(u.role || '')}</span></div>
        <div style="flex:1;color:var(--fg-3);font-size:12px;">${u.active ? 'active' : '<span style="color:#dc2626;">disabled</span>'}</div>
        <div style="width:200px;display:flex;gap:6px;">
          <button class="btn-ghost-sm" data-user-edit="${u.id}">Edit</button>
          ${u.id !== ME.id ? `<button class="btn-ghost-sm" data-user-pw="${u.id}">Reset PW</button>` : ''}
          ${u.id !== ME.id && ME.role === 'admin' ? `<button class="btn-ghost-sm" data-user-del="${u.id}">Disable</button>` : ''}
        </div>
      </div>`,
      )
      .join('');
  } catch (e) {
    $('#usersList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
$('#addUserBtn').addEventListener('click', () => openUserModal());
document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-user-edit]');
  const pw = e.target.closest('[data-user-pw]');
  const dl = e.target.closest('[data-user-del]');
  if (ed) {
    try {
      const u = (await api('/api/users')).find((x) => x.id == ed.dataset.userEdit);
      if (u) openUserModal(u);
    } catch (err) {
      alert(err.message);
    }
  }
  if (pw) {
    const userId = pw.dataset.userPw;
    modal(
      `<h2>Reset password</h2>
      <label>New password (min 12 chars)<input id="pwNew" type="password" autocomplete="new-password" minlength="12" placeholder="Minimum 12 characters"></label>
      <label>Confirm new password<input id="pwConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></label>`,
      async () => {
        const np = $('#pwNew').value;
        const nc = $('#pwConfirm').value;
        if (!np || np.length < 12) throw new Error('Password must be at least 12 characters');
        if (np !== nc) throw new Error('Passwords do not match');
        await api('/api/users/' + userId, { method: 'PUT', body: { password: np } });
        alert('Password reset successfully');
      },
    );
  }
  if (dl) {
    if (!confirm('Disable this account?')) return;
    try {
      await api('/api/users/' + dl.dataset.userDel, { method: 'DELETE' });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }
});
function openUserModal(u) {
  const isEdit = !!u;
  modal(
    `<h2>${isEdit ? 'Edit member' : 'Add lab member'}</h2>
    <label>Username (for login)<input id="uUsr" value="${escapeHTML(u?.username || '')}" ${isEdit ? 'readonly' : ''}></label>
    <label>Display name<input id="uName" value="${escapeHTML(u?.name || '')}"></label>
    <label>Email<input id="uEmail" value="${escapeHTML(u?.email || '')}"></label>
    <label>Role<select id="uRole">
      ${['admin', 'professor', 'moderator', 'postdoc', 'student'].map((r) => `<option value="${r}" ${u?.role === r ? 'selected' : ''}>${r}</option>`).join('')}
    </select></label>
    ${!isEdit ? `<label>Initial password (min 12)<input id="uPw" type="text" value=""></label>` : ''}`,
    async () => {
      const body = {
        username: $('#uUsr').value.trim(),
        name: $('#uName').value.trim(),
        email: $('#uEmail').value.trim(),
        role: $('#uRole').value,
      };
      if (!isEdit) {
        body.password = $('#uPw').value;
        if (!body.password || body.password.length < 12) throw new Error('Password >= 12 chars');
      }
      if (isEdit) await api('/api/users/' + u.id, { method: 'PUT', body });
      else await api('/api/users', { method: 'POST', body });
      loadUsers();
    },
  );
}
