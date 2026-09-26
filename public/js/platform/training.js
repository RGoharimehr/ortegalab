/* Platform: training. Loaded in order by platform.html. */

/* ---------- Training & Certifications ---------- */
let TRAINING_USER = '',
  TRAINING_TYPE = '',
  TRAINING_EXPIRING = false,
  TRAINING_EXPIRED = false,
  TRAINING_QUERY = '';
async function loadTraining() {
  try {
    // populate user filter
    let users = [];
    try {
      users = await api('/api/users');
    } catch (_) {
      /* Optional supporting data remains unavailable. */
    }
    const uSel = $('#trainingUserFilter');
    const curU = TRAINING_USER || uSel.value;
    uSel.innerHTML =
      '<option value="">All members</option>' +
      users
        .map(
          (u) =>
            `<option value="${u.id}" ${u.id == curU ? 'selected' : ''}>${escapeHTML(u.name || u.username)}</option>`,
        )
        .join('');

    const res = await api(
      '/api/training?' +
        buildQS({
          user_id: TRAINING_USER,
          training_type: TRAINING_TYPE,
          expiring_soon: TRAINING_EXPIRING,
          expired: TRAINING_EXPIRED,
          search: TRAINING_QUERY,
        }),
    );
    const records = unwrap(res);
    const summary = summaryOf(res);
    const isStaff = isLabStaffRole(ME.role);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    $('#trainingSummary').innerHTML = [
      statCard(n0(summary.total), 'Training records'),
      statCard(`${n0(summary.members)} members`, 'People covered'),
      statCard(
        `${n0(summary.expiring_soon)} expiring`,
        'Needs renewal soon',
        n0(summary.expiring_soon) ? 'warn' : '',
      ),
      statCard(
        `${n0(summary.expired)} expired`,
        'Expired certifications',
        n0(summary.expired) ? 'alert' : '',
      ),
    ].join('');
    if (!records.length) {
      $('#trainingList').innerHTML = '<div class="empty">No training records found.</div>';
      return;
    }
    $('#trainingList').innerHTML = `
      <div class="p-inv-row p-inv-head">
        <div style="flex:2;">Training / Certification</div>
        <div style="flex:1;">Member</div>
        <div style="flex:1;">Equipment</div>
        <div style="flex:1;">Completed · Expires</div>
        ${isStaff ? '<div style="width:80px;"></div>' : ''}
      </div>
      ${records
        .map((r) => {
          const exp = r.expires_at ? new Date(r.expires_at) : null;
          const days = exp ? Math.round((exp - today) / 86400000) : null;
          const expStyle =
            days === null
              ? ''
              : days < 0
                ? 'color:var(--status-alert);font-weight:600;'
                : days <= 60
                  ? 'color:var(--status-warn);'
                  : '';
          return `<div class="p-inv-row">
          <div style="flex:2;">
            <div class="p-inv-name">${escapeHTML(r.training_name)} <span class="p-tag-sm ${days !== null && days < 0 ? 'p-tag-alert' : days !== null && days <= 60 ? 'p-tag-warn' : 'p-tag-ok'}">${days === null ? 'no expiry' : days < 0 ? 'expired' : 'active'}</span></div>
            <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(r.training_type)}${r.certified_by ? ` · cert. by ${escapeHTML(r.certified_by)}` : ''}</div>
          </div>
          <div style="flex:1;font-size:13px;">${escapeHTML(r.user_name || r.username || '?')}</div>
          <div style="flex:1;font-size:12px;color:var(--fg-3);">${escapeHTML(r.equipment_name || '—')}</div>
          <div style="flex:1;font-size:12px;">
            <div>${fmtDate(r.completed_at)}</div>
            <div style="${expStyle}">${r.expires_at ? (days < 0 ? `⚠ Expired ${fmtDate(r.expires_at)}` : `Exp ${fmtDate(r.expires_at)}`) : 'No expiry'}</div>
          </div>
          ${
            isStaff
              ? `<div style="width:80px;display:flex;gap:4px;">
            <button class="btn-ghost-sm" data-tr-edit="${r.id}">Edit</button>
            <button class="btn-ghost-sm" data-tr-del="${r.id}">Del</button>
          </div>`
              : ''
          }
        </div>`;
        })
        .join('')}`;
    if (isStaff) {
      $('#trainingList')
        .querySelectorAll('[data-tr-edit]')
        .forEach((b) =>
          b.addEventListener('click', () => {
            const r = records.find((x) => x.id == b.dataset.trEdit);
            if (r) openTrainingModal(r);
          }),
        );
      $('#trainingList')
        .querySelectorAll('[data-tr-del]')
        .forEach((b) =>
          b.addEventListener('click', async () => {
            if (!confirm('Delete this record?')) return;
            try {
              await api(`/api/training/${b.dataset.trDel}`, { method: 'DELETE' });
              loadTraining();
            } catch (err) {
              alert(err.message);
            }
          }),
        );
    }
  } catch (e) {
    $('#trainingList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
$('#trainingUserFilter').addEventListener('change', (e) => {
  TRAINING_USER = e.target.value;
  loadTraining();
});
$('#trainingTypeFilter').addEventListener('change', (e) => {
  TRAINING_TYPE = e.target.value;
  loadTraining();
});
$('#trainingExpiringFilter').addEventListener('change', (e) => {
  TRAINING_EXPIRING = e.target.checked;
  if (e.target.checked) {
    TRAINING_EXPIRED = false;
    $('#trainingExpiredFilter').checked = false;
  }
  loadTraining();
});
$('#trainingExpiredFilter').addEventListener('change', (e) => {
  TRAINING_EXPIRED = e.target.checked;
  if (e.target.checked) {
    TRAINING_EXPIRING = false;
    $('#trainingExpiringFilter').checked = false;
  }
  loadTraining();
});
$('#trainingSearch').addEventListener('input', (e) => {
  TRAINING_QUERY = e.target.value;
  loadTraining();
});
$('#addTrainingBtn').addEventListener('click', () => openTrainingModal());

async function openTrainingModal(r) {
  const isEdit = !!r;
  let users = [],
    equip = [];
  try {
    [users, equip] = await Promise.all([api('/api/users'), api('/api/equipment').then(unwrap)]);
  } catch (_) {
    /* Optional supporting data remains unavailable. */
  }
  modal(
    `<h2>${isEdit ? 'Edit' : 'Add'} training record</h2>
    <label>Member<select id="trUser">
      <option value="">— select —</option>
      ${users.map((u) => `<option value="${u.id}" ${r?.user_id == u.id ? 'selected' : ''}>${escapeHTML(u.name || u.username)}</option>`).join('')}
    </select></label>
    <label>Training name<input id="trName" value="${escapeHTML(r?.training_name || '')}"></label>
    <label>Type<select id="trType">
      ${['equipment', 'safety', 'chemical', 'lab', 'other'].map((t) => `<option value="${t}" ${r?.training_type === t ? 'selected' : ''}>${t}</option>`).join('')}
    </select></label>
    <label>Related equipment (optional)<select id="trEquip">
      <option value="">— none —</option>
      ${equip.map((e) => `<option value="${e.id}" ${r?.equipment_id == e.id ? 'selected' : ''}>${escapeHTML(e.name)}</option>`).join('')}
    </select></label>
    <label>Completed date<input id="trComp" type="date" value="${r?.completed_at || ''}"></label>
    <label>Expiry date<input id="trExp" type="date" value="${r?.expires_at || ''}"></label>
    <label>Certified by<input id="trCert" value="${escapeHTML(r?.certified_by || '')}"></label>
    <label>Notes<textarea id="trNotes">${escapeHTML(r?.notes || '')}</textarea></label>`,
    async () => {
      const body = {
        user_id: $('#trUser').value,
        training_name: $('#trName').value.trim(),
        training_type: $('#trType').value,
        equipment_id: $('#trEquip').value || null,
        completed_at: $('#trComp').value,
        expires_at: $('#trExp').value || null,
        certified_by: $('#trCert').value,
        notes: $('#trNotes').value,
      };
      if (!body.user_id || !body.training_name || !body.completed_at)
        throw new Error('Member, name, and date required');
      if (isEdit) await api('/api/training/' + r.id, { method: 'PUT', body });
      else await api('/api/training', { method: 'POST', body });
      loadTraining();
    },
  );
}
