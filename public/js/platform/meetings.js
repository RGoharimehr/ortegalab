/* Platform: meetings. Loaded in order by platform.html. */

/* ---------- Meetings ---------- */
async function loadMeetings() {
  try {
    const meetings = await api('/api/meetings');
    const now = new Date();
    const upcoming = meetings
      .filter((m) => m.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .concat(
        meetings
          .filter((m) => !m.scheduled_at)
          .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)),
      );
    if (!upcoming.length) {
      $('#meetList').innerHTML = '<div class="empty">No meetings yet.</div>';
      return;
    }
    const isStaff = isLabStaffRole(ME.role);
    $('#meetList').innerHTML = upcoming
      .map((m) => {
        const d = new Date(m.scheduled_at || m.created_at);
        return `<div class="p-meet-card">
        <div class="p-meet-day">
          <div class="p-meet-day-lbl">${d.toLocaleString(undefined, { weekday: 'short' }).toUpperCase()}</div>
          <div class="p-meet-day-time">${d.toLocaleString(undefined, { month: 'short', day: 'numeric' })}</div>
          <div class="p-meet-day-time">${d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
        </div>
        <div class="p-meet-body">
          <div class="p-meet-title">${escapeHTML(m.title)}</div>
          <div class="p-meet-room">${escapeHTML(m.location || '')}</div>
          <div style="font-size:13px;color:var(--fg-2); margin-top:6px;">${escapeHTML(m.description || m.notes || '')}</div>
        </div>
        <div class="p-meet-tag-col">
          <div class="p-meet-tag" style="background: var(--navy-700);">${escapeHTML(m.meeting_type || 'meeting')}</div>
          ${
            isStaff
              ? `<div style="display:flex; gap:6px;">
            <button class="btn-ghost-sm" data-meet-edit="${m.id}">Edit</button>
            <button class="btn-ghost-sm" data-meet-del="${m.id}">Delete</button>
          </div>`
              : ''
          }
        </div>
      </div>`;
      })
      .join('');
  } catch (e) {
    $('#meetList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-meet-edit]');
  const dl = e.target.closest('[data-meet-del]');
  if (ed) {
    try {
      const m = (await api('/api/meetings')).find((x) => x.id == ed.dataset.meetEdit);
      if (m) openMeetingModal(m);
    } catch (err) {
      alert(err.message);
    }
  }
  if (dl) {
    if (!confirm('Delete this meeting?')) return;
    try {
      await api('/api/meetings/' + dl.dataset.meetDel, { method: 'DELETE' });
      loadMeetings();
    } catch (err) {
      alert(err.message);
    }
  }
});
$('#addMeetingBtn').addEventListener('click', () => openMeetingModal());
function openMeetingModal(m) {
  const isEdit = !!m;
  modal(
    `<h2>${isEdit ? 'Edit' : 'New'} meeting / announcement</h2>
    <label>Title<input id="mTitle" value="${escapeHTML(m?.title || '')}"></label>
    <label>Type<select id="mType">
      ${['group', 'seminar', 'announcement'].map((v) => `<option value="${v}" ${m?.meeting_type === v ? 'selected' : ''}>${v}</option>`).join('')}
    </select></label>
    <label>Date & time<input id="mWhen" type="datetime-local" value="${m?.scheduled_at ? String(m.scheduled_at).slice(0, 16) : ''}"></label>
    <label>Location<input id="mLoc" value="${escapeHTML(m?.location || '')}"></label>
    <label>Notes / description<textarea id="mDesc">${escapeHTML(m?.description || m?.notes || '')}</textarea></label>`,
    async () => {
      const body = {
        title: $('#mTitle').value.trim(),
        meeting_type: $('#mType').value,
        scheduled_at: $('#mWhen').value || null,
        location: $('#mLoc').value,
        description: $('#mDesc').value,
      };
      if (!body.title) throw new Error('Title required');
      if (isEdit) await api('/api/meetings/' + m.id, { method: 'PUT', body });
      else await api('/api/meetings', { method: 'POST', body });
      loadMeetings();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delMeet">Delete</button>` : '',
  );
  if (isEdit) {
    $('#delMeet').addEventListener('click', async () => {
      if (!confirm('Delete this meeting?')) return;
      try {
        await api('/api/meetings/' + m.id, { method: 'DELETE' });
        closeModal();
        loadMeetings();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
