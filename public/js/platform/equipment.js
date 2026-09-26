/* Platform: equipment. Loaded in order by platform.html. */

/* ---------- Equipment ---------- */
let EQ_CAT = '',
  EQ_STATUS = '',
  EQ_QUERY = '',
  EQ_DUE = '',
  EQ_SORT = '',
  EQ_TRAINING = '',
  EQ_MINE_ONLY = false,
  EQ_PENDING_ONLY = false;

function _eqMaintBadge(x) {
  const badges = [];
  if (x.maintenance_state === 'overdue')
    badges.push(
      '<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 5px;border-radius:3px;margin-left:4px;">Maintenance overdue</span>',
    );
  else if (x.maintenance_state === 'due_soon')
    badges.push(
      '<span style="font-size:10px;background:#fff7ed;color:#c2410c;padding:2px 5px;border-radius:3px;margin-left:4px;">Maintenance due soon</span>',
    );
  if (x.calibration_state === 'overdue')
    badges.push(
      '<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:2px 5px;border-radius:3px;margin-left:4px;">Calibration overdue</span>',
    );
  else if (x.calibration_state === 'due_soon')
    badges.push(
      '<span style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:2px 5px;border-radius:3px;margin-left:4px;">Calibration due soon</span>',
    );
  if (n0(x.pending_reservations) > 0)
    badges.push(
      `<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 5px;border-radius:3px;margin-left:4px;">${n0(x.pending_reservations)} pending</span>`,
    );
  return badges.join('');
}

async function loadEquipment() {
  try {
    const res = await api(
      '/api/equipment?' +
        buildQS({
          category: EQ_CAT,
          status: EQ_STATUS,
          search: EQ_QUERY,
          due: EQ_DUE,
          mine: EQ_MINE_ONLY,
          reservations: EQ_PENDING_ONLY ? 'pending' : '',
          training: EQ_TRAINING,
          sort: EQ_SORT,
          limit: 200,
        }),
    );
    const eq = unwrap(res);
    const summary = summaryOf(res);
    $('#eqSummary').innerHTML = [
      statCard(n0(summary.total), 'Tracked equipment'),
      statCard(
        `${n0(summary.available)} available`,
        'Ready right now',
        n0(summary.available) ? '' : 'warn',
      ),
      statCard(
        `${n0(summary.in_use)} active`,
        'Checked out or in use',
        n0(summary.pending_reservations) ? 'info' : '',
      ),
      statCard(
        `${n0(summary.training_blocked)} blocked`,
        'Training clearance missing',
        n0(summary.training_blocked) ? 'warn' : '',
      ),
      statCard(
        `${n0(summary.maintenance_overdue) + n0(summary.calibration_overdue)} overdue`,
        'Maintenance or calibration',
        n0(summary.maintenance_overdue) + n0(summary.calibration_overdue) ? 'alert' : '',
      ),
    ].join('');
    const list = $('#eqList');
    if (!eq.length) {
      list.innerHTML = '<div class="empty">No equipment matches these filters.</div>';
      return;
    }
    const isStaff = isLabStaffRole(ME.role);
    list.innerHTML = eq
      .map((x) => {
        const trainingBlocked = n0(x.requires_training) && !canOperateEquipment(x);
        const statusCls =
          x.status === 'available'
            ? 'p-eq-status-available'
            : x.status === 'in_use'
              ? 'p-eq-status-out'
              : x.status === 'broken'
                ? 'p-eq-status-broken'
                : 'p-eq-status-maint';
        const reservationMeta = x.next_reservation_at
          ? `Next reservation ${fmtDT(x.next_reservation_at)}`
          : 'No upcoming reservations';
        const trainingMeta = !n0(x.requires_training)
          ? 'No training gate'
          : x.training_state === 'active'
            ? `Cleared${x.user_training_expires_at ? ` until ${fmtDate(x.user_training_expires_at)}` : ''}`
            : x.training_state === 'expired'
              ? `Training expired${x.user_training_expires_at ? ` ${fmtDate(x.user_training_expires_at)}` : ''}`
              : `Requires ${x.training_requirement || 'active training'}`;
        return `<div class="p-inv-row">
        <div style="flex:2;">
          <div class="p-inv-name">${escapeHTML(x.name)} ${trainingTagMarkup(x)}${_eqMaintBadge(x)}</div>
          <div class="p-eq-meta">${escapeHTML(x.location || '')}${x.manufacturer ? ` · ${escapeHTML(x.manufacturer)}` : ''}${x.model ? ` ${escapeHTML(x.model)}` : ''}</div>
          <div class="p-eq-meta p-eq-meta-soft" style="margin-top:3px;">${escapeHTML(reservationMeta)}</div>
          <div class="p-eq-meta p-eq-meta-soft" style="margin-top:3px;">${escapeHTML(trainingMeta)}</div>
        </div>
        <div style="flex:1;"><span class="p-mono">${escapeHTML(x.sku || '—')}</span></div>
        <div style="flex:1;" class="p-inv-cat">${escapeHTML(x.category || '')}</div>
        <div style="flex:1;font-size:12px;">${x.last_used_user_name ? escapeHTML(x.last_used_user_name) : '<span style="color:var(--fg-4);">never</span>'}<br>
          <span style="font-size:11px;color:var(--fg-4);">${x.last_used_at ? fmtDT(x.last_used_at) : ''}</span></div>
        <div style="flex:1;"><span class="${statusCls}">${escapeHTML((x.status || '').replace('_', ' '))}</span></div>
        <div style="width:200px; display:flex; gap:5px; flex-wrap:wrap;">
          ${x.status === 'available' && !trainingBlocked ? `<button class="btn-ghost-sm" data-eq-action="checkout" data-eq-id="${x.id}">Check out</button>` : ''}
          ${x.status === 'available' && !trainingBlocked ? `<button class="btn-ghost-sm" data-eq-action="reserve"  data-eq-id="${x.id}">Reserve</button>` : ''}
          ${x.status === 'available' && trainingBlocked ? `<button class="btn-ghost-sm" data-eq-action="training" data-eq-id="${x.id}">Open training</button>` : ''}
          ${x.status === 'in_use' && x.current_user_id === ME.id ? `<button class="btn-ghost-sm" data-eq-action="checkin" data-eq-id="${x.id}">Return</button>` : ''}
          ${isStaff && x.status === 'in_use' ? `<button class="btn-ghost-sm" data-eq-action="checkin" data-eq-id="${x.id}">Force return</button>` : ''}
          <button class="btn-ghost-sm" data-eq-action="log" data-eq-id="${x.id}">History</button>
          ${isStaff ? `<button class="btn-ghost-sm" data-eq-action="maint" data-eq-id="${x.id}">Maint.</button>` : ''}
          ${isStaff ? `<button class="btn-ghost-sm" data-eq-action="edit" data-eq-id="${x.id}">Edit</button>` : ''}
        </div>
      </div>`;
      })
      .join('');
  } catch (e) {
    $('#eqList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
$('#eqTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.p-tab');
  if (!b) return;
  $$('#eqTabs .p-tab').forEach((x) => x.classList.toggle('active', x === b));
  EQ_CAT = b.dataset.eqcat || '';
  loadEquipment();
});
$('#eqStatus').addEventListener('change', (e) => {
  EQ_STATUS = e.target.value;
  loadEquipment();
});
$('#eqSearch').addEventListener('input', (e) => {
  EQ_QUERY = e.target.value;
  loadEquipment();
});
$('#eqDue').addEventListener('change', (e) => {
  EQ_DUE = e.target.value;
  loadEquipment();
});
$('#eqSort').addEventListener('change', (e) => {
  EQ_SORT = e.target.value;
  loadEquipment();
});
$('#eqTraining').addEventListener('change', (e) => {
  EQ_TRAINING = e.target.value;
  loadEquipment();
});
$('#eqMineOnly').addEventListener('change', (e) => {
  EQ_MINE_ONLY = e.target.checked;
  loadEquipment();
});
$('#eqPendingOnly').addEventListener('change', (e) => {
  EQ_PENDING_ONLY = e.target.checked;
  loadEquipment();
});
$('#addEquipBtn').addEventListener('click', () => openEquipModal());
$('#myResvBtn').addEventListener('click', async () => {
  try {
    const resvs = await api(`/api/equipment/reservations?user_id=${ME.id}&upcoming=1`);
    modal(
      `<h2>My equipment reservations</h2>
      ${
        resvs.length
          ? resvs
              .map(
                (r) => `
        <div class="p-log-row" style="flex-direction:column;align-items:flex-start;gap:4px;padding:8px 0;">
          <div style="font-weight:600;">${escapeHTML(r.equipment_name)}</div>
          <div style="font-size:12px;color:var(--fg-3);">${fmtDate(r.start_at)} → ${fmtDate(r.end_at)}</div>
          <div style="font-size:12px;">${escapeHTML(r.purpose || '—')}</div>
          <span class="p-tag-sm p-tag-outline">${escapeHTML(r.status)}</span>
          ${r.status === 'pending' || r.status === 'approved' ? `<button class="btn-ghost-sm" data-resv-cancel="${r.id}" style="margin-top:2px;">Cancel</button>` : ''}
        </div>`,
              )
              .join('')
          : '<div class="empty">No upcoming reservations.</div>'
      }`,
      null,
      '',
      'Close',
    );
    document.querySelectorAll('[data-resv-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/equipment/reservations/${btn.dataset.resvCancel}`, {
            method: 'PUT',
            body: { status: 'cancelled' },
          });
          closeModal();
          loadEquipment();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-eq-action]');
  if (!b) return;
  const id = b.dataset.eqId;
  const action = b.dataset.eqAction;
  if (action === 'checkout') {
    const note = prompt('Optional note (e.g. project, expected return):') || '';
    try {
      await api('/api/equipment/' + id + '/checkout', { method: 'POST', body: { note } });
      loadEquipment();
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  } else if (action === 'checkin') {
    const note = prompt('Optional return note:') || '';
    try {
      await api('/api/equipment/' + id + '/checkin', { method: 'POST', body: { note } });
      loadEquipment();
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  } else if (action === 'reserve') {
    const today = new Date().toISOString().slice(0, 16);
    modal(
      `<h2>Reserve equipment</h2>
      <label>Start date/time<input id="resvStart" type="datetime-local" value="${today}"></label>
      <label>End date/time<input id="resvEnd"   type="datetime-local"></label>
      <label>Purpose<input id="resvPurpose" placeholder="e.g. Experiment XYZ"></label>`,
      async () => {
        const s = $('#resvStart').value,
          en = $('#resvEnd').value;
        if (!s || !en) throw new Error('Start and end are required');
        if (s >= en) throw new Error('End must be after start');
        await api(`/api/equipment/${id}/reservations`, {
          method: 'POST',
          body: { start_at: s, end_at: en, purpose: $('#resvPurpose').value },
        });
        alert('Reservation requested. The professor will review and approve it.');
      },
    );
  } else if (action === 'training') {
    goRoute('training');
  } else if (action === 'log') {
    try {
      const [log, maint, resvs, eq] = await Promise.all([
        api('/api/equipment/' + id + '/log'),
        api('/api/equipment/' + id + '/maintenance'),
        api('/api/equipment/' + id + '/reservations'),
        api('/api/equipment').then((r) => unwrap(r).find((x) => x.id == id)),
      ]);
      const isStaff = isLabStaffRole(ME.role);
      const canApproveReservations = canApproveReservationsRole(ME.role);
      modal(
        `<h2>${escapeHTML(eq?.name || 'Equipment')} — history</h2>
        <p style="font-size:12px;color:var(--fg-3);">SKU ${escapeHTML(eq?.sku || '—')} · ${escapeHTML(eq?.manufacturer || '')} ${escapeHTML(eq?.model || '')}</p>
        <div class="p-tabs" style="margin-bottom:12px;">
          <button type="button" class="p-tab active" data-htab="usage">Usage log</button>
          <button type="button" class="p-tab" data-htab="maint">Maintenance</button>
          <button type="button" class="p-tab" data-htab="resvs">Reservations</button>
        </div>
        <div id="htUsage">
          ${
            log.length
              ? log
                  .map(
                    (l) => `<div class="p-log-row">
            <span class="p-log-when">${fmtDT(l.started_at || l.created_at)}</span>
            <span class="p-log-act ${l.action}">${escapeHTML(l.action)}</span>
            <span class="p-log-who">${escapeHTML(l.user_name || l.username || '?')}</span>
            <span class="p-log-note">${escapeHTML(l.note || '')}</span>
          </div>`,
                  )
                  .join('')
              : '<div class="empty">No usage history.</div>'
          }
        </div>
        <div id="htMaint" style="display:none;">
          ${isStaff ? `<button type="button" class="btn-ghost-sm" id="addMaintBtn" style="margin-bottom:10px;">+ Add maintenance record</button>` : ''}
          ${
            maint.length
              ? maint
                  .map(
                    (m) => `<div class="p-log-row">
            <span class="p-log-when">${fmtDate(m.completed_at || m.scheduled_at)}</span>
            <span class="p-log-act">${escapeHTML(m.maint_type)}</span>
            <span class="p-log-who">${escapeHTML(m.performed_by || '—')}</span>
            <span class="p-log-note">${escapeHTML(m.notes || '')}${m.next_due_at ? ' · Next: ' + fmtDate(m.next_due_at) : ''}</span>
          </div>`,
                  )
                  .join('')
              : '<div class="empty">No maintenance records.</div>'
          }
        </div>
        <div id="htResvs" style="display:none;">
          ${
            resvs.length
              ? resvs
                  .map(
                    (r) => `<div class="p-log-row">
            <span class="p-log-when">${fmtDate(r.start_at)}</span>
            <span class="p-log-act">${escapeHTML(r.status)}</span>
            <span class="p-log-who">${escapeHTML(r.user_name || r.username || '?')}</span>
            <span class="p-log-note">${escapeHTML(r.purpose || '')}
              ${canApproveReservations && r.status === 'pending' ? `<button type="button" class="btn-ghost-sm" data-approve-resv="${r.id}">✓ Approve</button> <button type="button" class="btn-ghost-sm" data-deny-resv="${r.id}">✗ Deny</button>` : ''}
            </span>
          </div>`,
                  )
                  .join('')
              : '<div class="empty">No reservations.</div>'
          }
        </div>`,
        null,
        '',
        'Close',
      );
      // Tab switching
      document.querySelectorAll('[data-htab]').forEach((t) =>
        t.addEventListener('click', (ev) => {
          ev.preventDefault();
          document.querySelectorAll('[data-htab]').forEach((x) => x.classList.remove('active'));
          t.classList.add('active');
          document.getElementById('htUsage').style.display =
            t.dataset.htab === 'usage' ? '' : 'none';
          document.getElementById('htMaint').style.display =
            t.dataset.htab === 'maint' ? '' : 'none';
          document.getElementById('htResvs').style.display =
            t.dataset.htab === 'resvs' ? '' : 'none';
        }),
      );
      // Approve/deny reservations (staff)
      document.querySelectorAll('[data-approve-resv],[data-deny-resv]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const rid = btn.dataset.approveResv || btn.dataset.denyResv;
          const st = btn.dataset.approveResv ? 'approved' : 'denied';
          try {
            await api(`/api/equipment/reservations/${rid}`, {
              method: 'PUT',
              body: { status: st },
            });
            closeModal();
            loadEquipment();
          } catch (err) {
            alert(err.message);
          }
        });
      });
      // Add maintenance record
      const addMaintBtn = document.getElementById('addMaintBtn');
      if (addMaintBtn) addMaintBtn.addEventListener('click', () => openMaintModal(id));
    } catch (err) {
      alert(err.message);
    }
  } else if (action === 'maint') {
    openMaintModal(id);
  } else if (action === 'edit') {
    try {
      const eq = unwrap(await api('/api/equipment')).find((x) => x.id == id);
      openEquipModal(eq);
    } catch (err) {
      alert(err.message);
    }
  }
});

function openMaintModal(equipId, rec) {
  const today = new Date().toISOString().slice(0, 10);
  modal(
    `<h2>${rec ? 'Edit' : 'Add'} maintenance record</h2>
    <label>Type<select id="mType">
      ${['maintenance', 'calibration', 'repair', 'inspection'].map((t) => `<option value="${t}" ${rec?.maint_type === t ? 'selected' : ''}>${t}</option>`).join('')}
    </select></label>
    <label>Scheduled date<input id="mSched" type="date" value="${rec?.scheduled_at?.slice(0, 10) || ''}"></label>
    <label>Completed date<input id="mComp" type="date" value="${rec?.completed_at?.slice(0, 10) || today}"></label>
    <label>Performed by<input id="mPerf" value="${escapeHTML(rec?.performed_by || '')}"></label>
    <label>Cost (USD)<input id="mCost" type="number" step="0.01" value="${rec?.cost || ''}"></label>
    <label>Next due date<input id="mNextDue" type="date" value="${rec?.next_due_at?.slice(0, 10) || ''}"></label>
    <label>Notes<textarea id="mNotes">${escapeHTML(rec?.notes || '')}</textarea></label>`,
    async () => {
      const body = {
        maint_type: $('#mType').value,
        scheduled_at: $('#mSched').value || null,
        completed_at: $('#mComp').value || null,
        performed_by: $('#mPerf').value,
        cost: Number($('#mCost').value) || null,
        next_due_at: $('#mNextDue').value || null,
        notes: $('#mNotes').value,
      };
      if (rec) await api(`/api/equipment/maintenance/${rec.id}`, { method: 'PUT', body });
      else await api(`/api/equipment/${equipId}/maintenance`, { method: 'POST', body });
      loadEquipment();
    },
  );
}

function openEquipModal(eq) {
  const isEdit = !!eq;
  modal(
    `<h2>${isEdit ? 'Edit' : 'New'} equipment</h2>
    <label>Name<input id="eqName" value="${escapeHTML(eq?.name || '')}"></label>
    <label>SKU / asset #<input id="eqTag" value="${escapeHTML(eq?.sku || '')}"></label>
    <label>Category<select id="eqCat">
      ${['rig', 'instrument', 'supply', 'tool'].map((c) => `<option value="${c}" ${eq?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
    </select></label>
    <label>Location<input id="eqLoc" value="${escapeHTML(eq?.location || '')}"></label>
    <label>Manufacturer<input id="eqMfr" value="${escapeHTML(eq?.manufacturer || '')}"></label>
    <label>Model<input id="eqModel" value="${escapeHTML(eq?.model || '')}"></label>
    <label>Serial number<input id="eqSerial" value="${escapeHTML(eq?.serial_number || '')}"></label>
    <label>Purchase date<input id="eqPurch" type="date" value="${eq?.purchase_date || ''}"></label>
    <label>Maintenance interval (days, 0=none)<input id="eqMaintInt" type="number" min="0" value="${eq?.maintenance_interval_days || 0}"></label>
    <label>Last calibrated<input id="eqCalLast" type="date" value="${eq?.last_calibrated_at?.slice(0, 10) || ''}"></label>
    <label>Next calibration due<input id="eqCalNext" type="date" value="${eq?.next_calibration_at?.slice(0, 10) || ''}"></label>
    <label class="p-inline-check"><input id="eqReqTraining" type="checkbox" style="width:auto;" ${n0(eq?.requires_training) ? 'checked' : ''}> Requires active training</label>
    <label>Training requirement / course name<input id="eqTrainingReq" value="${escapeHTML(eq?.training_requirement || '')}" placeholder="e.g. Confocal microscope certification"></label>
    <label>Status<select id="eqSt">
      ${['available', 'in_use', 'maintenance', 'broken'].map((c) => `<option value="${c}" ${eq?.status === c ? 'selected' : ''}>${c.replace('_', ' ')}</option>`).join('')}
    </select></label>
    <label>Notes<textarea id="eqNotes">${escapeHTML(eq?.notes || '')}</textarea></label>`,
    async () => {
      const body = {
        name: $('#eqName').value.trim(),
        sku: $('#eqTag').value,
        category: $('#eqCat').value,
        location: $('#eqLoc').value,
        manufacturer: $('#eqMfr').value,
        model: $('#eqModel').value,
        serial_number: $('#eqSerial').value,
        purchase_date: $('#eqPurch').value || null,
        maintenance_interval_days: Number($('#eqMaintInt').value) || 0,
        last_calibrated_at: $('#eqCalLast').value || null,
        next_calibration_at: $('#eqCalNext').value || null,
        requires_training: $('#eqReqTraining').checked,
        training_requirement: $('#eqReqTraining').checked ? $('#eqTrainingReq').value.trim() : '',
        status: $('#eqSt').value,
        notes: $('#eqNotes').value,
      };
      if (!body.name) throw new Error('Name required');
      if (isEdit) await api('/api/equipment/' + eq.id, { method: 'PUT', body });
      else await api('/api/equipment', { method: 'POST', body });
      loadEquipment();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delEq">Delete</button>` : '',
  );
  const reqToggle = $('#eqReqTraining');
  const reqInput = $('#eqTrainingReq');
  const syncTrainingRequirement = () => {
    reqInput.disabled = !reqToggle.checked;
    if (!reqToggle.checked) reqInput.value = '';
  };
  reqToggle.addEventListener('change', syncTrainingRequirement);
  syncTrainingRequirement();
  if (isEdit) {
    $('#delEq').addEventListener('click', async () => {
      if (!confirm('Delete this equipment? Its usage log will be lost.')) return;
      try {
        await api('/api/equipment/' + eq.id, { method: 'DELETE' });
        closeModal();
        loadEquipment();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
