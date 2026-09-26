/* Platform: schedule. Loaded in order by platform.html. */

/* ---------- Schedule ---------- */
let SCHED_SCOPE = 'mine';
async function loadSchedule() {
  try {
    const now = new Date();
    // Fetch events, meetings and tasks in parallel
    const [events, meetings, tasks] = await Promise.all([
      api('/api/events'),
      api('/api/meetings').catch(() => []),
      api('/api/tasks/full?all=1').catch(() => []),
    ]);

    // Normalise events
    const evItems = events
      .filter((ev) => ev.start_time)
      .map((ev) => ({
        _type: 'event',
        _id: ev.id,
        _owner: ev.owner_user_id,
        _attendees: ev.attendees || '',
        sortKey: ev.start_time,
        date: ev.start_time,
        title: ev.title,
        subtitle: `${fmtDT(ev.start_time)}${ev.end_time ? ' → ' + fmtDT(ev.end_time) : ''}${ev.location ? ' · ' + ev.location : ''}`,
        badge: ev.event_type || 'event',
        badgeColor: 'var(--navy-700)',
        canEdit: ev.owner_user_id === ME.id || isLabStaffRole(ME.role),
      }));

    // Normalise meetings (from the meetings table)
    const meetItems = meetings
      .filter((m) => m.scheduled_at)
      .map((m) => ({
        _type: 'meeting',
        _id: m.id,
        _owner: null,
        _attendees: '',
        sortKey: m.scheduled_at,
        date: m.scheduled_at,
        title: m.title,
        subtitle: `${fmtDT(m.scheduled_at)}${m.location ? ' · ' + m.location : ''}`,
        badge: m.meeting_type || 'meeting',
        badgeColor: 'var(--gold-700)',
        canEdit: isLabStaffRole(ME.role),
      }));

    // Normalise task deadlines
    const deadlineItems = tasks
      .filter((t) => t.due_date && t.status !== 'done')
      .map((t) => ({
        _type: 'deadline',
        _id: t.id,
        _owner: t.assignee_user_id,
        _attendees: '',
        sortKey: t.due_date,
        date: t.due_date,
        title: t.title,
        subtitle: `Due ${fmtDate(t.due_date)}${t.assignee_name ? ' · ' + t.assignee_name : ''}`,
        badge: 'deadline',
        badgeColor: 'var(--status-alert)',
        canEdit: false,
      }));

    // Merge + filter by scope
    let all = [...evItems, ...meetItems, ...deadlineItems];
    if (SCHED_SCOPE === 'mine') {
      all = all.filter((item) => {
        if (item._type === 'event')
          return item._owner === ME.id || item._attendees.includes(ME.username);
        if (item._type === 'deadline') return item._owner === ME.id;
        return true; // meetings always visible to all
      });
    }

    // Sort by date, upcoming only
    const upcoming = all
      .filter((item) => new Date(item.date) >= now)
      .sort((a, b) => new Date(a.sortKey) - new Date(b.sortKey));

    if (!upcoming.length) {
      $('#schedList').innerHTML = '<div class="empty">No upcoming events.</div>';
      return;
    }
    $('#schedList').innerHTML = upcoming
      .map(
        (item) => `
      <div class="p-slot">
        <div class="p-slot-time">${new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
        <div style="flex:1;">
          <div class="p-slot-title">${escapeHTML(item.title)}</div>
          <div class="p-slot-room">${escapeHTML(item.subtitle)}</div>
        </div>
        <div class="p-slot-tag" style="background:${item.badgeColor};">${escapeHTML(item.badge)}</div>
        ${
          item._type === 'event' && item.canEdit
            ? `<button class="btn-ghost-sm" data-event-edit="${item._id}">Edit</button>
        <button class="btn-ghost-sm" data-event-del="${item._id}">Delete</button>`
            : ''
        }
        ${item._type === 'meeting' && item.canEdit ? `<button class="btn-ghost-sm" data-meet-edit="${item._id}">Edit</button>` : ''}
      </div>`,
      )
      .join('');
  } catch (e) {
    $('#schedList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-event-edit]');
  const dl = e.target.closest('[data-event-del]');
  const med = e.target.closest('[data-meet-edit]');
  if (ed) {
    try {
      const ev = (await api('/api/events')).find((x) => x.id == ed.dataset.eventEdit);
      if (ev) openEventModal(ev);
    } catch (err) {
      alert(err.message);
    }
  }
  if (dl) {
    if (!confirm('Delete this event?')) return;
    try {
      await api('/api/events/' + dl.dataset.eventDel, { method: 'DELETE' });
      loadSchedule();
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  }
  if (med) {
    try {
      const m = (await api('/api/meetings')).find((x) => x.id == med.dataset.meetEdit);
      if (m) openMeetingModal(m);
    } catch (err) {
      alert(err.message);
    }
  }
});
$('#schedScope').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('#schedScope button').forEach((x) => x.classList.toggle('active', x === b));
  SCHED_SCOPE = b.dataset.scope;
  loadSchedule();
});

$('#addEventBtn').addEventListener('click', () => openEventModal());
function openEventModal(ev) {
  const isEdit = !!ev;
  modal(
    `<h2>${isEdit ? 'Edit' : 'New'} event</h2>
    <label>Title<input id="evTitle" value="${escapeHTML(ev?.title || '')}"></label>
    <label>Type<select id="evType"><option value="meeting">Meeting</option><option value="seminar">Seminar</option><option value="reservation">Reservation</option><option value="other">Other</option></select></label>
    <label>Start<input id="evStart" type="datetime-local" value="${ev?.start_time ? ev.start_time.slice(0, 16) : ''}"></label>
    <label>End<input id="evEnd" type="datetime-local" value="${ev?.end_time ? ev.end_time.slice(0, 16) : ''}"></label>
    <label>Location<input id="evLoc" value="${escapeHTML(ev?.location || '')}"></label>
    <label>Visibility<select id="evVis"><option value="public" ${ev?.visibility !== 'private' ? 'selected' : ''}>Public</option><option value="private" ${ev?.visibility === 'private' ? 'selected' : ''}>Private (just me)</option></select></label>`,
    async () => {
      const body = {
        title: $('#evTitle').value.trim(),
        event_type: $('#evType').value,
        start_time: $('#evStart').value,
        end_time: $('#evEnd').value,
        location: $('#evLoc').value,
        visibility: $('#evVis').value,
      };
      if (!body.title || !body.start_time) throw new Error('Title and start required');
      if (isEdit) await api('/api/events/' + ev.id, { method: 'PUT', body });
      else await api('/api/events', { method: 'POST', body });
      loadSchedule();
      loadDashboard();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delEv">Delete</button>` : '',
  );
  if (isEdit) {
    $('#delEv').addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return;
      try {
        await api('/api/events/' + ev.id, { method: 'DELETE' });
        closeModal();
        loadSchedule();
        loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
