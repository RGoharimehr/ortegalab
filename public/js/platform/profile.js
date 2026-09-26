/* Platform: profile. Loaded in order by platform.html. */

/* ---------- Profile ---------- */
async function loadProfile() {
  setAvatarContent($('#profAv'), ME);
  $('#profName').textContent = ME.name || ME.username;
  $('#profRole').textContent = (ME.role || '').toUpperCase();
  $('#profEmail').textContent = ME.email || `@${ME.username}`;
  try {
    const tasks = await api('/api/tasks/full?mine=1');
    const open = tasks.filter((t) => t.status !== 'done');
    $('#profTasks').innerHTML = open.length
      ? open
          .map(
            (t) => `
      <div class="p-task">
        <input class="p-check" type="checkbox" disabled>
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(t.title)}</div>
          <div class="p-task-due">${t.due_date ? 'Due ' + fmtDate(t.due_date) : 'No due'} · ${escapeHTML(t.status)}</div>
        </div>
      </div>`,
          )
          .join('')
      : '<div class="empty">No open tasks.</div>';
  } catch (e) {
    $('#profTasks').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  try {
    const eq = unwrap(await api('/api/equipment'));
    const mine = eq.filter((x) => x.current_user_id === ME.id);
    $('#profEquip').innerHTML = mine.length
      ? mine
          .map(
            (x) => `
      <div class="p-task">
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(x.name)}</div>
          <div class="p-task-due">SKU ${escapeHTML(x.sku || '—')} · since ${fmtDT(x.last_used_at)}</div>
        </div>
        <button class="btn-ghost-sm" data-checkin-id="${x.id}">Return</button>
      </div>`,
          )
          .join('')
      : '<div class="empty">Nothing checked out.</div>';
  } catch (e) {
    $('#profEquip').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  loadTwoFaCard();
}

async function loadTwoFaCard() {
  const card = $('#twoFaCard');
  if (!card) return;
  try {
    const me = await api('/api/me');
    if (me.totp_enabled) {
      const bcResp = await api('/api/me/totp/backup-codes').catch(() => ({ remaining: '?' }));
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--border-1);">
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--status-ok);">✔ 2FA is enabled</div>
            <div style="font-size:12px;color:var(--fg-3);">Backup codes remaining: <strong>${bcResp.remaining}</strong></div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-ghost-sm" id="regenCodesBtn">New backup codes</button>
            <button class="btn-ghost-sm" style="color:#dc2626;" id="disable2faBtn">Disable 2FA</button>
          </div>
        </div>`;
      $('#regenCodesBtn').addEventListener('click', async () => {
        if (!confirm('Generate 10 new backup codes? Your old codes will stop working.')) return;
        try {
          const r = await api('/api/me/totp/backup-codes', { method: 'POST', body: {} });
          showBackupCodes(r.backup_codes);
          loadTwoFaCard();
        } catch (e) {
          alert(e.message);
        }
      });
      $('#disable2faBtn').addEventListener('click', () => {
        modal(
          `<h2>Disable two-factor authentication</h2>
          <p style="font-size:13px;color:var(--fg-3);">Enter your current password to confirm.</p>
          <label>Password<input id="dis2faPw" type="password" autocomplete="current-password"></label>`,
          async () => {
            await api('/api/me/totp', {
              method: 'DELETE',
              body: { password: $('#dis2faPw').value },
            });
            loadTwoFaCard();
          },
        );
      });
    } else {
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;">
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--fg-2);">2FA is not enabled</div>
            <div style="font-size:12px;color:var(--fg-3);">Add an extra layer of security with an authenticator app (Google Authenticator, Authy, etc.).</div>
          </div>
          <button class="btn-ghost-sm" id="enable2faBtn">Enable 2FA</button>
        </div>`;
      $('#enable2faBtn').addEventListener('click', async () => {
        try {
          const setup = await api('/api/me/totp/setup', { method: 'POST', body: {} });
          modal(
            `<h2>Enable two-factor authentication</h2>
            <p style="font-size:13px;color:var(--fg-3);">Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div style="text-align:center;margin:12px 0;"><img src="${escapeHTML(setup.qr)}" style="width:180px;height:180px;border:1px solid var(--border-1);border-radius:var(--radius-sm);"></div>
            <details style="margin-bottom:12px;"><summary style="font-size:11px;color:var(--fg-4);cursor:pointer;">Manual entry key</summary><code style="font-size:12px;user-select:all;">${escapeHTML(setup.secret)}</code></details>
            <label>6-digit code<input id="totpVerify" type="text" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"></label>`,
            async () => {
              const result = await api('/api/me/totp/verify', {
                method: 'POST',
                body: { code: $('#totpVerify').value },
              });
              showBackupCodes(result.backup_codes);
              loadTwoFaCard();
            },
          );
        } catch (e) {
          alert(e.message);
        }
      });
    }
  } catch (e) {
    card.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}

function showBackupCodes(codes) {
  modal(
    `<h2>Your backup codes</h2>
    <p style="font-size:13px;color:var(--fg-3);">Save these codes somewhere safe. Each code can only be used <strong>once</strong>. You can use them instead of your authenticator app if you lose access.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0;font-family:monospace;font-size:14px;">
      ${(codes || []).map((c) => `<div style="padding:8px;background:var(--bg-2);border-radius:var(--radius-sm);text-align:center;">${escapeHTML(c)}</div>`).join('')}
    </div>
    <p style="font-size:11px;color:var(--status-alert);">These codes will not be shown again. Copy or print them now.</p>`,
    null,
    '',
    'Close',
  );
}
$('#profEditBtn').addEventListener('click', () => {
  modal(
    `<h2>Edit my details</h2>
    <label>Display name<input id="meName" value="${escapeHTML(ME.name || '')}"></label>
    <label>Email<input id="meEmail" value="${escapeHTML(ME.email || '')}"></label>
    <p style="font-size:12px;color:var(--fg-3);">Role and username are managed by an admin.</p>`,
    async () => {
      const body = { name: $('#meName').value.trim(), email: $('#meEmail').value.trim() };
      await api('/api/me/profile', { method: 'PUT', body });
      ME.name = body.name;
      ME.email = body.email;
      $('#userName').textContent = ME.name || ME.username;
      setAvatarContent($('#userAv'), ME);
      loadProfile();
    },
  );
});
$('#profDmToggle').addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dm');
  try {
    localStorage.setItem('latfs-theme', isDark ? 'dark' : 'light');
  } catch (_) {
    /* Storage may be disabled. */
  }
});
$('#profChPwBtn').addEventListener('click', () => {
  modal(
    `<h2>Change password</h2>
    <label>Current password<input id="cpCur" type="password" autocomplete="current-password"></label>
    <label>New password (min 12 chars)<input id="cpNew" type="password" autocomplete="new-password"></label>
    <label>Confirm new password<input id="cpConf" type="password" autocomplete="new-password"></label>`,
    async () => {
      const cur = $('#cpCur').value,
        np = $('#cpNew').value,
        conf = $('#cpConf').value;
      if (!cur || !np) throw new Error('All fields are required');
      if (np !== conf) throw new Error('New passwords do not match');
      if (np.length < 12) throw new Error('New password must be at least 12 characters');
      await api('/api/me/password', {
        method: 'PUT',
        body: { current_password: cur, new_password: np },
      });
      alert('Password changed successfully.');
    },
  );
});
