/* Platform: dashboard. Loaded in order by platform.html. */

function renderResourceDashboard(overview) {
  const pulse = $('#resourcePulse');
  const alerts = $('#resourceAlerts');
  if (!pulse || !alerts) return;
  const equipmentDue =
    n0(overview?.equipment?.maintenance_due_soon) +
    n0(overview?.equipment?.maintenance_overdue) +
    n0(overview?.equipment?.calibration_due_soon) +
    n0(overview?.equipment?.calibration_overdue);
  const sampleApprovalLoad = isSiteModeratorRole(ME?.role)
    ? n0(overview?.samples?.pending_approval)
    : 0;
  const cards = [
    {
      title: 'Inventory',
      total: n0(overview?.inventory?.total),
      badge:
        n0(overview?.inventory?.out_of_stock) +
        n0(overview?.inventory?.low_stock) +
        n0(overview?.inventory?.expired),
      meta: `${n0(overview?.inventory?.low_stock)} low | ${n0(overview?.inventory?.out_of_stock)} out | ${n0(overview?.inventory?.expiring_soon)} expiring`,
      route: 'inventory',
    },
    {
      title: 'Equipment',
      total: n0(overview?.equipment?.total),
      badge: equipmentDue + n0(overview?.reservations?.pending),
      meta: `${n0(overview?.equipment?.in_use)} in use | ${equipmentDue} due soon | ${n0(overview?.reservations?.pending)} pending`,
      route: 'equipment',
    },
    {
      title: 'Samples',
      total: n0(overview?.samples?.total),
      badge: n0(overview?.samples?.expired) + n0(overview?.samples?.depleted) + sampleApprovalLoad,
      meta: `${n0(overview?.samples?.active)} active | ${n0(overview?.samples?.expired)} expired | ${sampleApprovalLoad ? `${sampleApprovalLoad} awaiting approval` : `${n0(overview?.samples?.expiring_soon)} expiring`}`,
      route: 'samples',
    },
    {
      title: 'Training',
      total: n0(overview?.training?.total),
      badge: n0(overview?.training?.expired) + n0(overview?.training?.expiring_soon),
      meta: `${n0(overview?.training?.covered_members)} members covered | ${n0(overview?.training?.expired)} expired | ${n0(overview?.training?.expiring_soon)} expiring`,
      route: 'training',
    },
  ];
  pulse.innerHTML = cards
    .map(
      (card) => `
    <div class="p-resource-card">
      <div class="p-resource-head">
        <div>
          <div class="p-resource-title">${escapeHTML(card.title)}</div>
          <div class="p-resource-meta">${escapeHTML(card.meta)}</div>
        </div>
        <span class="p-tag-sm ${card.badge > 0 ? 'p-tag-warn' : 'p-tag-ok'}">${card.badge > 0 ? `${card.badge} need review` : 'stable'}</span>
      </div>
      <div class="p-resource-num">${card.total}</div>
      <div style="margin-top:10px;">
        <button class="btn-ghost-sm" onclick="goRoute('${card.route}')">Open ${escapeHTML(card.title.toLowerCase())}</button>
      </div>
    </div>`,
    )
    .join('');

  const attention = [];
  (overview?.alerts?.inventory || []).slice(0, 2).forEach((item) => {
    const parts = [];
    if (item.stock_state === 'out') parts.push('Out of stock');
    else if (item.stock_state === 'low') parts.push('Low stock');
    if (item.days_until_expiry < 0) parts.push(`Expired ${Math.abs(item.days_until_expiry)}d`);
    else if (item.days_until_expiry <= 30) parts.push(`Expires in ${item.days_until_expiry}d`);
    attention.push({
      bucket: 'Inventory',
      title: item.name,
      meta: parts.join(' | ') || item.sku || 'Needs review',
      route: 'inventory',
    });
  });
  (overview?.alerts?.equipment || []).slice(0, 2).forEach((item) => {
    const parts = [];
    if (item.status) parts.push(String(item.status).replace('_', ' '));
    if (item.maintenance_state && item.maintenance_state !== 'ok')
      parts.push(`Maintenance ${item.maintenance_state}`);
    if (item.calibration_state && item.calibration_state !== 'ok')
      parts.push(`Calibration ${item.calibration_state}`);
    attention.push({
      bucket: 'Equipment',
      title: item.name,
      meta: parts.join(' | ') || item.sku || 'Needs review',
      route: 'equipment',
    });
  });
  (overview?.alerts?.training || []).slice(0, 2).forEach((item) => {
    const parts = [];
    if (item.days_until_expiry < 0) parts.push(`Expired ${Math.abs(item.days_until_expiry)}d`);
    else if (item.days_until_expiry <= 60) parts.push(`Expires in ${item.days_until_expiry}d`);
    if (item.user_name) parts.push(item.user_name);
    if (item.equipment_name) parts.push(item.equipment_name);
    attention.push({
      bucket: 'Training',
      title: item.training_name,
      meta: parts.join(' | '),
      route: 'training',
    });
  });
  (overview?.alerts?.issues || []).slice(0, 2).forEach((item) => {
    attention.push({
      bucket: 'Issues',
      title: item.title,
      meta: `${item.category || 'issue'} | ${item.priority || 'normal'} priority`,
      route: 'issues',
    });
  });
  (overview?.alerts?.reservations || []).slice(0, 2).forEach((item) => {
    attention.push({
      bucket: 'Reservations',
      title: item.equipment_name,
      meta: `${item.status} | ${item.user_name} | ${fmtDT(item.start_at)}`,
      route: 'equipment',
    });
  });

  alerts.innerHTML = attention.length
    ? `<div class="p-alert-list">${attention
        .slice(0, 8)
        .map(
          (item) => `
    <div class="p-alert-row">
      <div class="p-alert-kicker">${escapeHTML(item.bucket)}</div>
      <div style="flex:1;min-width:0;">
        <div class="p-alert-title">${escapeHTML(item.title)}</div>
        <div class="p-alert-meta">${escapeHTML(item.meta)}</div>
      </div>
      <button class="btn-ghost-sm" onclick="goRoute('${item.route}')">Open</button>
    </div>`,
        )
        .join('')}</div>`
    : '<div class="empty">No urgent resource alerts.</div>';
}

/* ---------- Dashboard ---------- */
async function loadDashboard() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#dashGreeting').textContent = `${greet}, ${(ME.name || ME.username).split(' ')[0]}`;
  const dashSub = $('#dashSub');
  const dashZones = $('#dashZones');
  if (dashSub) {
    const stamp = now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const localTime = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const base = dashSub.dataset.baseText || "Here is today's snapshot.";
    const zones = document.createElement('span');
    zones.className = 'p-zone-line';
    zones.id = 'dashZones';
    zones.textContent = formatDashboardCoastTimes(now);
    dashSub.replaceChildren(document.createTextNode(`${stamp}, ${localTime} - ${base}`), zones);
  }
  // tasks
  try {
    const tasks = await api('/api/tasks/full?mine=1');
    const open = tasks.filter((t) => t.status !== 'done');
    if ($('#stMyTasks')) $('#stMyTasks').textContent = open.length;
    $('#dashTasks').innerHTML = open.length
      ? open
          .slice(0, 5)
          .map(
            (t) => `
      <div class="p-task">
        <input class="p-check" type="checkbox" ${t.status === 'done' ? 'checked' : ''} disabled>
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(t.title)}</div>
          <div class="p-task-due">${t.due_date ? 'Due ' + fmtDate(t.due_date) : 'No due date'} · ${escapeHTML(t.status)}</div>
        </div>
      </div>`,
          )
          .join('')
      : '<div class="empty">No open tasks.</div>';
  } catch (e) {
    $('#dashTasks').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  // meetings (events)
  try {
    const events = await api('/api/events');
    const now = new Date();
    const upcoming = events
      .filter((ev) => new Date(ev.start_time) >= now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    if ($('#stMyMeetings')) $('#stMyMeetings').textContent = upcoming.length;
    $('#dashMeetings').innerHTML = upcoming.length
      ? upcoming
          .slice(0, 5)
          .map(
            (ev) => `
      <div class="p-slot">
        <div class="p-slot-time">${new Date(ev.start_time).toLocaleString(undefined, { weekday: 'short' })}</div>
        <div style="flex:1;">
          <div class="p-slot-title">${escapeHTML(ev.title)}</div>
          <div class="p-slot-room">${fmtDT(ev.start_time)} · ${escapeHTML(ev.location || '')}</div>
        </div>
      </div>`,
          )
          .join('')
      : '<div class="empty">No upcoming events.</div>';
  } catch (e) {
    $('#dashMeetings').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  // equipment checked out to me
  try {
    const mine = unwrap(await api('/api/equipment?mine=1&limit=20'));
    if ($('#stMyEq')) $('#stMyEq').textContent = mine.length;
    $('#dashEquip').innerHTML = mine.length
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
    $('#dashEquip').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  // issues
  try {
    const issues = unwrap(await api('/api/issues?status=open'));
    // Keep sidebar badge in sync
    const badge = $('#issuesBadge');
    if (badge) badge.textContent = issues.length || '';
    $('#dashIssues').innerHTML = issues.length
      ? issues
          .slice(0, 5)
          .map(
            (it) => `
      <div class="p-task">
        <div class="p-dot" style="background: ${it.priority === 'high' ? 'var(--status-alert)' : it.priority === 'low' ? 'var(--status-info)' : 'var(--status-warn)'};"></div>
        <div style="flex:1;">
          <div class="p-task-title">${escapeHTML(it.title)}</div>
          <div class="p-task-due">${escapeHTML(it.category)} · ${escapeHTML(it.reporter_name || '')}</div>
        </div>
      </div>`,
          )
          .join('')
      : '<div class="empty">No open issues.</div>';
  } catch (e) {
    $('#dashIssues').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  try {
    renderResourceDashboard(await api('/api/resources/overview'));
  } catch (e) {
    const pulse = $('#resourcePulse');
    const alerts = $('#resourceAlerts');
    if (pulse) pulse.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
    if (alerts) alerts.innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
  // PI panel — only for staff
  if (ME.role === 'admin' || ME.role === 'professor') loadPIDashboard();
}

/* ---------- PI / Director dashboard ---------- */
async function loadPIDashboard() {
  try {
    const d = await api('/api/dashboard/pi');
    $('#piStats').innerHTML = [
      { label: 'Lab members', val: d.totalMembers, cls: '' },
      { label: 'Open issues', val: d.openIssues, cls: d.openIssues > 0 ? 'warn' : '' },
      { label: 'High-priority issues', val: d.highIssues, cls: d.highIssues > 0 ? 'alert' : '' },
      { label: 'Equipment in use', val: d.equipmentInUse, cls: '' },
      { label: 'Overdue tasks', val: d.overdueTasks, cls: d.overdueTasks > 0 ? 'warn' : '' },
    ]
      .map(
        (s) =>
          `<div class="pi-stat ${s.cls}"><div class="pi-stat-num">${s.val}</div><div class="pi-stat-lbl">${s.label}</div></div>`,
      )
      .join('');

    $('#piIssues').innerHTML = d.recentIssues.length
      ? d.recentIssues
          .map(
            (it) => `
      <div class="pi-row">
        <span class="pi-badge ${it.priority === 'high' ? 'high' : ''}">${escapeHTML(it.priority)}</span>
        <span style="flex:1;">${escapeHTML(it.title)}</span>
        <span style="color:var(--fg-3);font-size:12px;">${escapeHTML(it.reporter_name || '')}</span>
      </div>`,
          )
          .join('')
      : '<div class="empty">No open issues.</div>';

    $('#piEquip').innerHTML = d.checkedOutEq.length
      ? d.checkedOutEq
          .map(
            (e) => `
      <div class="pi-row">
        <span style="flex:1;font-weight:600;">${escapeHTML(e.name)}</span>
        <span style="color:var(--fg-3);font-size:12px;">${escapeHTML(e.held_by || '—')}</span>
        <span style="color:var(--fg-4);font-size:11px;margin-left:6px;">${e.last_used_at ? fmtDT(e.last_used_at) : ''}</span>
      </div>`,
          )
          .join('')
      : '<div class="empty">No equipment checked out.</div>';

    $('#piOverdue').innerHTML = d.overdueTasksList.length
      ? d.overdueTasksList
          .map(
            (t) => `
      <div class="pi-row">
        <span style="flex:1;">${escapeHTML(t.title)}</span>
        <span style="color:var(--status-alert);font-size:12px;font-weight:600;">${escapeHTML(t.due_date || '')}</span>
        <span style="color:var(--fg-3);font-size:12px;margin-left:6px;">${escapeHTML(t.assignee_name || '—')}</span>
      </div>`,
          )
          .join('')
      : '<div class="empty">No overdue tasks.</div>';

    $('#piEvents').innerHTML = d.upcomingEvents.length
      ? d.upcomingEvents
          .map(
            (ev) => `
      <div class="pi-row">
        <span style="flex:1;">${escapeHTML(ev.title)}</span>
        <span style="color:var(--fg-3);font-size:12px;">${fmtDT(ev.start_time)}</span>
      </div>`,
          )
          .join('')
      : '<div class="empty">No upcoming events.</div>';
  } catch (e) {
    $('#piStats').innerHTML =
      `<div class="p-banner">Could not load director overview: ${escapeHTML(e.message)}</div>`;
  }
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-checkin-id]');
  if (!b) return;
  const id = b.dataset.checkinId;
  const note = prompt('Optional return note:') || '';
  try {
    await api(`/api/equipment/${id}/checkin`, { method: 'POST', body: { note } });
    loadDashboard();
    loadEquipment();
  } catch (err) {
    alert(err.message);
  }
});
