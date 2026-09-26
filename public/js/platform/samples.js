/* Platform: samples. Loaded in order by platform.html. */

/* ---------- Samples ---------- */
let SAMPLE_QUERY = '',
  SAMPLE_STATUS = '',
  SAMPLE_APPROVAL = '',
  SAMPLE_EXPIRING_SOON = false,
  SAMPLE_EXPIRED = false,
  SAMPLE_LOW_QTY = false;

function canEditSampleEntry(sample) {
  if (isSiteModeratorRole(ME.role)) return true;
  return Number(sample?.created_by_id) === Number(ME.id) && sample?.approval_status !== 'approved';
}

async function reviewSampleEntry(sample, approvalStatus) {
  let reviewNote = '';
  if (approvalStatus === 'denied') {
    reviewNote =
      prompt(
        `Optional note for ${sample.name}:`,
        sample.review_note || 'Please update the sample details and resubmit.',
      ) || '';
  }
  await api(`/api/samples/${sample.id}/review`, {
    method: 'POST',
    body: { approval_status: approvalStatus, review_note: reviewNote },
  });
  loadSamples();
  loadDashboard();
}

async function loadSamples() {
  try {
    const res = await api(
      '/api/samples?' +
        buildQS({
          status: SAMPLE_STATUS,
          approval_status: SAMPLE_APPROVAL,
          search: SAMPLE_QUERY,
          expiring_soon: SAMPLE_EXPIRING_SOON,
          expired: SAMPLE_EXPIRED,
          low_qty: SAMPLE_LOW_QTY,
        }),
    );
    const items = unwrap(res);
    const summary = summaryOf(res);
    const canReview = isSiteModeratorRole(ME.role);
    $('#sampleSummary').innerHTML = (
      canReview
        ? [
            statCard(n0(summary.total), 'Visible to approvers'),
            statCard(
              `${n0(summary.pending)} pending`,
              'Awaiting approval',
              n0(summary.pending) ? 'warn' : '',
            ),
            statCard(`${n0(summary.approved)} live`, 'Approved samples'),
            statCard(
              `${n0(summary.expired) + n0(summary.depleted)} blocked`,
              'Expired or depleted approved',
              n0(summary.expired) + n0(summary.depleted) ? 'alert' : '',
            ),
          ]
        : [
            statCard(`${n0(summary.approved)} live`, 'Approved samples'),
            statCard(
              `${n0(summary.pending)} pending`,
              'My submissions awaiting approval',
              n0(summary.pending) ? 'info' : '',
            ),
            statCard(
              `${n0(summary.denied)} revise`,
              'Returned for changes',
              n0(summary.denied) ? 'warn' : '',
            ),
            statCard(
              `${n0(summary.expired) + n0(summary.depleted)} blocked`,
              'Expired or depleted approved',
              n0(summary.expired) + n0(summary.depleted) ? 'alert' : '',
            ),
          ]
    ).join('');
    if (!items.length) {
      $('#sampleList').innerHTML = '<div class="empty">No samples found.</div>';
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isStaff = isLabStaffRole(ME.role);
    $('#sampleList').innerHTML = `
      <div class="p-inv-row p-inv-head">
        <div style="flex:2;">Sample</div>
        <div style="flex:1;">Type · Location</div>
        <div style="flex:1;">Qty</div>
        <div style="flex:1;">Expiry</div>
        <div style="width:220px;"></div>
      </div>
      ${items
        .map((s) => {
          const exp = s.expiry_date ? new Date(s.expiry_date) : null;
          const days = exp ? Math.round((exp - today) / 86400000) : null;
          const expStyle =
            days === null
              ? ''
              : days < 0
                ? 'color:#dc2626;font-weight:600;'
                : days <= 30
                  ? 'color:#c2410c;'
                  : 'color:var(--fg-3);';
          const approvalClass =
            s.approval_status === 'approved'
              ? 'p-tag-ok'
              : s.approval_status === 'denied'
                ? 'p-tag-warn'
                : 'p-tag-info';
          const lifecycleClass =
            s.status === 'active'
              ? 'p-tag-ok'
              : s.status === 'depleted'
                ? 'p-tag-warn'
                : 'p-tag-outline';
          const approvalMeta =
            s.approval_status === 'approved'
              ? `${s.approved_by_name ? `Approved by ${s.approved_by_name}` : 'Approved'}${s.approved_at ? ` - ${fmtDT(s.approved_at)}` : ''}`
              : s.approval_status === 'denied'
                ? s.review_note || 'Needs updates before approval'
                : Number(s.created_by_id) === Number(ME.id)
                  ? 'Awaiting approval - only you and approvers can see this entry right now.'
                  : 'Awaiting approval';
          return `<div class="p-inv-row">
          <div style="flex:2;">
            <div class="p-inv-name">${escapeHTML(s.name)} <span class="p-tag-sm ${approvalClass}">${escapeHTML(s.approval_status || 'pending')}</span> <span class="p-tag-sm ${lifecycleClass}">${escapeHTML(s.status || 'active')}</span></div>
            <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(s.project_title || '')} - ${escapeHTML(s.created_by_name || '?')}</div>
            <div style="font-size:11px;color:${s.approval_status === 'approved' ? '#dbe8ff' : s.approval_status === 'denied' ? '#f6ad55' : '#d7e5fb'};font-weight:600;margin-top:3px;">${escapeHTML(approvalMeta)}</div>
          </div>
          <div style="flex:1;font-size:12px;">${escapeHTML(s.sample_type || '—')}<br><span style="font-size:11px;color:var(--fg-4);">${escapeHTML(s.location || '')}</span></div>
          <div style="flex:1;font-size:13px;">${s.qty} ${escapeHTML(s.unit || '')} ${n0(s.qty) <= 0 ? '<span class="p-tag-sm p-tag-alert">empty</span>' : ''}</div>
          <div style="flex:1;font-size:12px;${expStyle}">${s.expiry_date ? (days < 0 ? `Expired ${fmtDate(s.expiry_date)}` : `${fmtDate(s.expiry_date)}`) : '—'}</div>
          <div style="width:220px;display:flex;gap:4px;flex-wrap:wrap;">
            ${canEditSampleEntry(s) ? `<button class="btn-ghost-sm" data-sample-edit="${s.id}">Edit</button>` : ''}
            ${canReview && s.approval_status !== 'approved' ? `<button class="btn-ghost-sm" data-sample-approve="${s.id}">Approve</button><button class="btn-ghost-sm" data-sample-deny="${s.id}">Changes</button>` : ''}
            ${isStaff ? `<button class="btn-ghost-sm" data-sample-del="${s.id}">Del</button>` : ''}
          </div>
        </div>`;
        })
        .join('')}`;
    $('#sampleList')
      .querySelectorAll('[data-sample-edit]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          const s = items.find((x) => x.id == b.dataset.sampleEdit);
          if (s) openSampleModal(s);
        }),
      );
    $('#sampleList')
      .querySelectorAll('[data-sample-approve]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          const sample = items.find((x) => x.id == b.dataset.sampleApprove);
          if (!sample) return;
          try {
            await reviewSampleEntry(sample, 'approved');
          } catch (err) {
            alert(err.message);
          }
        }),
      );
    $('#sampleList')
      .querySelectorAll('[data-sample-deny]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          const sample = items.find((x) => x.id == b.dataset.sampleDeny);
          if (!sample) return;
          try {
            await reviewSampleEntry(sample, 'denied');
          } catch (err) {
            alert(err.message);
          }
        }),
      );
    $('#sampleList')
      .querySelectorAll('[data-sample-del]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          if (!confirm('Delete this sample?')) return;
          try {
            await api(`/api/samples/${b.dataset.sampleDel}`, { method: 'DELETE' });
            loadSamples();
          } catch (err) {
            alert(err.message);
          }
        }),
      );
  } catch (e) {
    $('#sampleList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
$('#sampleSearch').addEventListener('input', (e) => {
  SAMPLE_QUERY = e.target.value;
  loadSamples();
});
$('#sampleStatus').addEventListener('change', (e) => {
  SAMPLE_STATUS = e.target.value;
  loadSamples();
});
$('#sampleApproval').addEventListener('change', (e) => {
  SAMPLE_APPROVAL = e.target.value;
  loadSamples();
});
$('#sampleExpiringSoon').addEventListener('change', (e) => {
  SAMPLE_EXPIRING_SOON = e.target.checked;
  if (e.target.checked) {
    SAMPLE_EXPIRED = false;
    $('#sampleExpired').checked = false;
  }
  loadSamples();
});
$('#sampleExpired').addEventListener('change', (e) => {
  SAMPLE_EXPIRED = e.target.checked;
  if (e.target.checked) {
    SAMPLE_EXPIRING_SOON = false;
    $('#sampleExpiringSoon').checked = false;
  }
  loadSamples();
});
$('#sampleLowQty').addEventListener('change', (e) => {
  SAMPLE_LOW_QTY = e.target.checked;
  loadSamples();
});
$('#addSampleBtn').addEventListener('click', () => openSampleModal());

async function openSampleModal(s) {
  const isEdit = !!s;
  const canReview = isSiteModeratorRole(ME.role);
  if (isEdit && !canEditSampleEntry(s)) {
    alert('Approved samples can only be edited by an admin, professor, or moderator.');
    return;
  }
  let projs = [];
  try {
    projs = await api('/api/projects');
  } catch (_) {
    /* Optional supporting data remains unavailable. */
  }
  modal(
    `<h2>${isEdit ? 'Edit sample' : 'New sample'}</h2>
    ${!canReview ? `<p style="font-size:12px;color:var(--fg-3);margin-top:-4px;">Your sample stays hidden until approved by an admin, professor, or moderator.</p>` : ''}
    ${isEdit && s?.approval_status === 'denied' && s?.review_note ? `<div class="p-card" style="margin-bottom:10px;background:#fff7ed;border-color:#fdba74;"><div style="font-size:12px;color:#9a3412;"><strong>Reviewer note:</strong> ${escapeHTML(s.review_note)}</div></div>` : ''}
    <label>Name<input id="smName" value="${escapeHTML(s?.name || '')}"></label>
    <label>Type<select id="smType">
      ${['solid', 'liquid', 'gas', 'biological', 'chemical', 'other'].map((t) => `<option value="${t}" ${s?.sample_type === t ? 'selected' : ''}>${t}</option>`).join('')}
    </select></label>
    <label>Location (freezer / shelf / cabinet)<input id="smLoc" value="${escapeHTML(s?.location || '')}"></label>
    <label>Project<select id="smProj"><option value="">— none —</option>${projs.map((p) => `<option value="${p.id}" ${s?.project_id == p.id ? 'selected' : ''}>${escapeHTML(p.title)}</option>`).join('')}</select></label>
    <label>Qty<input id="smQty" type="number" step="0.001" value="${s?.qty ?? 1}"></label>
    <label>Unit<input id="smUnit" value="${escapeHTML(s?.unit || 'mL')}" placeholder="mL / g / vial…"></label>
    <label>Expiry date<input id="smExp" type="date" value="${s?.expiry_date || ''}"></label>
    <label>Status<select id="smSt">
      ${['active', 'depleted', 'disposed', 'archived'].map((t) => `<option value="${t}" ${s?.status === t ? 'selected' : ''}>${t}</option>`).join('')}
    </select></label>
    <label>Description<textarea id="smDesc">${escapeHTML(s?.description || '')}</textarea></label>
    <label>Handling notes<textarea id="smNotes">${escapeHTML(s?.notes || '')}</textarea></label>`,
    async () => {
      const body = {
        name: $('#smName').value.trim(),
        sample_type: $('#smType').value,
        location: $('#smLoc').value,
        project_id: $('#smProj').value || null,
        qty: Number($('#smQty').value) || 0,
        unit: $('#smUnit').value || 'mL',
        expiry_date: $('#smExp').value || null,
        status: $('#smSt').value,
        description: $('#smDesc').value,
        notes: $('#smNotes').value,
      };
      if (!body.name) throw new Error('Name required');
      if (isEdit) await api('/api/samples/' + s.id, { method: 'PUT', body });
      else await api('/api/samples', { method: 'POST', body });
      loadSamples();
      loadDashboard();
    },
  );
}
