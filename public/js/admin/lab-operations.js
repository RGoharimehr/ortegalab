/* Admin: lab operations. Loaded in order by admin.html. */

/* ───────────────────────────────────────────────────────────
   DASHBOARD
   ─────────────────────────────────────────────────────────── */
async function renderDashboard(root) {
  const [meetings, tasks, inventory] = await Promise.all([
    apiGet('/api/meetings').catch(() => []),
    apiRows('/api/tasks').catch(() => []),
    apiRows('/api/inventory').catch(() => []),
  ]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMeetings = meetings.filter(
    (m) => m.day_label === 'TODAY' || (m.scheduled_at && m.scheduled_at.startsWith(todayStr)),
  ).length;
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const lowInv = inventory.filter((i) => i.qty < i.min_qty).length;
  const todaySlots = meetings
    .filter(
      (m) => m.day_label === 'TODAY' || (m.scheduled_at && m.scheduled_at.startsWith(todayStr)),
    )
    .slice(0, 4);
  const myTasks = tasks.filter((t) => t.status !== 'done').slice(0, 4);
  const today = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const tagColor = {
    team: 'var(--navy-900)',
    experiment: 'var(--gold-600)',
    '1:1': 'var(--status-info)',
    external: 'var(--gold-600)',
    review: 'var(--status-warn)',
    onboarding: 'var(--gold-700)',
    lab: 'var(--fg-3)',
  };
  const taskTag = {
    todo: ['To do', 'p-tag-outline'],
    in_progress: ['In progress', 'p-tag-info'],
    blocked: ['Blocked', 'p-tag-gold'],
    done: ['Done', 'p-tag-ok'],
  };

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <div class="eyebrow" style="color:var(--gold-700)">${escHtml(today)}</div>
        <h1 class="p-h1">${greeting}, ${escHtml(SESSION_USER.first || SESSION_USER.name.split(' ')[0])}.</h1>
        <p class="p-h1-sub">${todayMeetings} meeting${todayMeetings === 1 ? '' : 's'} today · ${openTasks} open task${openTasks === 1 ? '' : 's'} · ${lowInv} inventory item${lowInv === 1 ? '' : 's'} need attention.</p>
      </div>
    </div>

    <div class="p-grid-3">
      <div class="p-stat-card">
        <i data-lucide="calendar-clock" class="p-stat-icon"></i>
        <div class="p-stat-num">${todayMeetings}</div>
        <div class="p-stat-lbl">Meetings today</div>
      </div>
      <div class="p-stat-card">
        <i data-lucide="check-square" class="p-stat-icon" style="color:var(--gold-600)"></i>
        <div class="p-stat-num">${openTasks}</div>
        <div class="p-stat-lbl">Open tasks</div>
      </div>
      <div class="p-stat-card">
        <i data-lucide="alert-triangle" class="p-stat-icon" style="color:var(--status-warn)"></i>
        <div class="p-stat-num">${lowInv}</div>
        <div class="p-stat-lbl">Inventory low</div>
      </div>
    </div>

    <div class="p-grid-2" style="margin-top:24px">
      <section class="p-card">
        <div class="p-card-head">
          <div class="p-card-title">Today's schedule</div>
          <button class="w-link-gold" data-jump="schedule">Full week →</button>
        </div>
        ${
          todaySlots.length
            ? todaySlots
                .map((s) => {
                  const timeDisplay =
                    s.time_label ||
                    (s.scheduled_at
                      ? new Date(s.scheduled_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '');
                  const roomDisplay = s.room || s.location || '';
                  return `
          <div class="p-slot">
            <div class="p-slot-time">${escHtml(timeDisplay.split('–')[0].trim())}</div>
            <div style="flex:1">
              <div class="p-slot-title">${escHtml(s.title)}</div>
              <div class="p-slot-room">${escHtml(roomDisplay)}</div>
            </div>
            <span class="p-slot-tag" style="background:${tagColor[s.type || s.meeting_type] || 'var(--fg-3)'}">${escHtml(s.type || s.meeting_type || 'meeting')}</span>
          </div>`;
                })
                .join('')
            : '<div class="empty">No meetings scheduled today.</div>'
        }
      </section>

      <section class="p-card">
        <div class="p-card-head">
          <div class="p-card-title">My tasks</div>
          <button class="w-link-gold" data-jump="tasks">All tasks →</button>
        </div>
        ${
          myTasks.length
            ? myTasks
                .map((t) => {
                  const [lbl, cls] = taskTag[t.status] || ['', 'p-tag-outline'];
                  return `<div class="p-task">
            <input type="checkbox" class="p-check">
            <div style="flex:1">
              <div class="p-task-title">${escHtml(t.title)}</div>
              <div class="p-task-due">Due ${escHtml(t.due_label || '—')}</div>
            </div>
            <span class="p-tag ${cls}">${lbl}</span>
          </div>`;
                })
                .join('')
            : '<div class="empty">No open tasks. ✨</div>'
        }
      </section>
    </div>

    <section class="p-card" style="margin-top:24px">
      <div class="p-card-head">
        <div class="p-card-title">Lab status</div>
        <span class="p-tag p-tag-ok">All systems nominal</span>
      </div>
      <div class="p-grid-2">
        <div>
          <div class="p-lab-name">${escHtml(labLabel('A'))}</div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--status-ok)"></span><div style="flex:1"><div class="p-lab-lbl">Boiling rig</div><div class="p-lab-meta">M. Reyes · ends 16:00</div></div><span class="p-lab-state">Running</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--fg-4)"></span><div style="flex:1"><div class="p-lab-lbl">PIV system</div><div class="p-lab-meta">Last used yesterday</div></div><span class="p-lab-state">Idle</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--status-info)"></span><div style="flex:1"><div class="p-lab-lbl">High-speed camera</div><div class="p-lab-meta">A. Park · tomorrow 09:00</div></div><span class="p-lab-state">Booked</span></div>
        </div>
        <div>
          <div class="p-lab-name">${escHtml(labLabel('B'))}</div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--fg-4)"></span><div style="flex:1"><div class="p-lab-lbl">Thermocouple bench</div></div><span class="p-lab-state">Idle</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--status-warn)"></span><div style="flex:1"><div class="p-lab-lbl">Droplet impingement rig</div><div class="p-lab-meta">Pump replaced Mon</div></div><span class="p-lab-state">Maintenance</span></div>
          <div class="p-lab-row"><span class="p-lab-dot" style="background:var(--fg-4)"></span><div style="flex:1"><div class="p-lab-lbl">IR thermography</div></div><span class="p-lab-state">Idle</span></div>
        </div>
      </div>
    </section>
  `;
  root.querySelectorAll('[data-jump]').forEach((b) => (b.onclick = () => navigate(b.dataset.jump)));
}

/* ───────────────────────────────────────────────────────────
   SCHEDULE — list view using real server schema
   ─────────────────────────────────────────────────────────── */
async function renderSchedule(root) {
  const events = await apiGet('/api/events');
  const now = new Date();
  const upcoming = events
    .filter((e) => e.start_time)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Schedule</h1>
        <p class="p-h1-sub">${upcoming.length} upcoming event${upcoming.length === 1 ? '' : 's'}</p>
      </div>
      <div class="p-actions">
        <button class="btn-primary-sm" id="newEvent">+ New event</button>
      </div>
    </div>
    <div class="p-card" id="schedTable">
      ${
        upcoming.length
          ? upcoming
              .map(
                (e) => `
        <div class="p-slot">
          <div class="p-slot-time">${new Date(e.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
          <div style="flex:1;">
            <div class="p-slot-title">${escHtml(e.title)}</div>
            <div class="p-slot-room">${fmtDT(e.start_time)}${e.end_time ? ' → ' + fmtDT(e.end_time) : ''} · ${escHtml(e.location || '')}</div>
          </div>
          <span class="p-tag p-tag-outline">${escHtml(e.event_type || 'event')}</span>
          <div class="row-actions">
            <button data-ev-edit="${e.id}">Edit</button>
            <button class="danger" data-ev-del="${e.id}">Delete</button>
          </div>
        </div>`,
              )
              .join('')
          : '<div class="empty">No upcoming events.</div>'
      }
    </div>
  `;

  root.querySelectorAll('[data-ev-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Delete this event?')) return;
        await apiDel('/api/events/' + b.dataset.evDel);
        navigate('schedule');
      }),
  );
  root.querySelectorAll('[data-ev-edit]').forEach(
    (b) =>
      (b.onclick = () => {
        const ev = events.find((x) => x.id == b.dataset.evEdit);
        openEventModal(ev);
      }),
  );

  function openEventModal(ev) {
    const isNew = !ev;
    ev = ev || {};
    modal(
      isNew ? 'New event' : 'Edit event',
      '',
      `
      <label>Title</label><input id="m_title" value="${escHtml(ev.title || '')}" placeholder="e.g. Boiling rig run">
      <label>Type</label>
      <select id="m_type">
        ${['meeting', 'seminar', 'reservation', 'other'].map((t) => `<option value="${t}"${(ev.event_type || 'meeting') === t ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
      <label>Start</label><input id="m_start" type="datetime-local" value="${ev.start_time ? ev.start_time.slice(0, 16) : ''}">
      <label>End (optional)</label><input id="m_end" type="datetime-local" value="${ev.end_time ? ev.end_time.slice(0, 16) : ''}">
      <label>Location</label><input id="m_loc" value="${escHtml(ev.location || '')}">
    `,
      async (mb) => {
        const body = {
          title: $('#m_title', mb).value.trim(),
          event_type: $('#m_type', mb).value,
          start_time: $('#m_start', mb).value,
          end_time: $('#m_end', mb).value || null,
          location: $('#m_loc', mb).value,
        };
        if (!body.title || !body.start_time) throw new Error('Title and start time are required');
        if (isNew) await apiPost('/api/events', body);
        else await apiPut('/api/events/' + ev.id, body);
        navigate('schedule');
      },
    );
  }

  $('#newEvent').onclick = () => openEventModal(null);
}

/* ───────────────────────────────────────────────────────────
   TASKS — kanban
   ─────────────────────────────────────────────────────────── */
async function renderTasks(root) {
  const tasks = await apiRows('/api/tasks');
  const COLS = [
    ['todo', 'To do'],
    ['in_progress', 'In progress'],
    ['blocked', 'Blocked'],
    ['done', 'Done'],
  ];
  const tagBg = {
    inventory: 'var(--status-info-tint)',
    experiment: 'var(--gold-100)',
    lab: 'var(--gray-100)',
    paper: 'var(--status-info-tint)',
    maintenance: 'var(--status-warn-tint)',
    data: 'var(--gold-100)',
    team: 'var(--gray-100)',
  };
  const tagFg = {
    inventory: '#075985',
    experiment: 'var(--gold-700)',
    lab: 'var(--fg-2)',
    paper: '#075985',
    maintenance: '#92400e',
    data: 'var(--gold-700)',
    team: 'var(--fg-2)',
  };

  const open = tasks.filter((t) => t.status !== 'done').length;

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Tasks</h1>
        <p class="p-h1-sub">${open} open across the lab · ${tasks.length} total</p>
      </div>
      <div class="p-actions">
        <button class="btn-ghost-sm">Filter</button>
        <button class="btn-primary-sm" id="newTask">+ New task</button>
      </div>
    </div>
    <div class="p-kanban">
      ${COLS.map(([sid, sname]) => {
        const items = tasks.filter((t) => t.status === sid);
        return `<div class="p-col" data-status="${sid}">
          <div class="p-col-head"><div class="p-col-title">${sname}</div><div class="p-col-count">${items.length}</div></div>
          ${items
            .map(
              (it) => `<div class="p-task-card" data-id="${it.id}">
            <div class="p-task-card-title">${escHtml(it.title)}</div>
            <div class="p-task-card-foot">
              <span class="p-tag-sm" style="background:${tagBg[it.tag] || 'var(--gray-100)'};color:${tagFg[it.tag] || 'var(--fg-2)'}">${escHtml(it.tag || 'lab')}</span>
              <div class="p-task-meta">
                <span class="p-task-due-sm">${escHtml(it.due_label || '—')}</span>
                <div class="p-task-av" title="${escHtml(it.assignee_display || it.assignee || it.assignee_name || '')}">${escHtml(initials(it.assignee_display || it.assignee || it.assignee_name))}</div>
              </div>
            </div>
          </div>`,
            )
            .join('')}
          <button class="p-col-add" data-add="${sid}">+ Add task</button>
        </div>`;
      }).join('')}
    </div>
  `;

  // Click a task card → edit/delete
  root.querySelectorAll('.p-task-card').forEach((card) => {
    card.onclick = async () => {
      const t = tasks.find((x) => x.id == card.dataset.id);
      if (!t) return;
      const bg = modal(
        'Edit task',
        '',
        `
        <label>Title</label><input id="m_title" value="${escHtml(t.title)}">
        <label>Assignee</label><input id="m_who" value="${escHtml(t.assignee_display || t.assignee || t.assignee_name || '')}">
        <label>Tag</label>
        <select id="m_tag">
          ${['inventory', 'experiment', 'lab', 'paper', 'maintenance', 'data', 'team'].map((x) => `<option value="${x}"${x === t.tag ? ' selected' : ''}>${x}</option>`).join('')}
        </select>
        <label>Due</label><input id="m_due" value="${escHtml(t.due_label || '')}">
        <label>Status</label>
        <select id="m_st">
          ${COLS.map(([value, label]) => `<option value="${value}"${value === t.status ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
        <label>&nbsp;</label>
        <div class="row-actions"><button class="danger" id="m_del">Delete</button></div>
      `,
        async (mb) => {
          await apiPut('/api/tasks/' + t.id, {
            title: $('#m_title', mb).value,
            assignee: $('#m_who', mb).value,
            tag: $('#m_tag', mb).value,
            due_label: $('#m_due', mb).value,
            status: $('#m_st', mb).value,
            sort_order: t.sort_order || 0,
          });
          navigate('tasks');
        },
      );
      // hook delete button directly on the returned modal element
      const delBtn = bg.querySelector('#m_del');
      if (delBtn)
        delBtn.onclick = async (e) => {
          e.preventDefault();
          if (!confirm('Delete this task?')) return;
          await apiDel('/api/tasks/' + t.id);
          bg.remove();
          navigate('tasks');
        };
    };
  });

  root.querySelectorAll('[data-add]').forEach(
    (btn) =>
      (btn.onclick = () => {
        const status = btn.dataset.add;
        modal(
          'New task',
          `Adding to "${status}".`,
          `
      <label>Title</label><input id="m_title" placeholder="Calibrate PIV camera">
      <label>Assignee</label><input id="m_who" placeholder="A. Park">
      <label>Tag</label>
      <select id="m_tag">${['inventory', 'experiment', 'lab', 'paper', 'maintenance', 'data', 'team'].map((x) => `<option value="${x}">${x}</option>`).join('')}</select>
      <label>Due</label><input id="m_due" placeholder="Fri">
    `,
          async (mb) => {
            await apiPost('/api/tasks', {
              title: $('#m_title', mb).value,
              assignee: $('#m_who', mb).value,
              tag: $('#m_tag', mb).value,
              due_label: $('#m_due', mb).value,
              status,
            });
            navigate('tasks');
          },
        );
      }),
  );

  $('#newTask').onclick = () => $('[data-add="todo"]').click();
}

/* ───────────────────────────────────────────────────────────
   MEETINGS — list
   ─────────────────────────────────────────────────────────── */
async function renderMeetings(root) {
  const meetings = await apiGet('/api/meetings');
  const typeColor = {
    team: 'var(--navy-900)',
    '1:1': 'var(--status-info)',
    external: 'var(--gold-600)',
    review: 'var(--status-warn)',
    onboarding: 'var(--gold-700)',
  };

  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Meetings</h1>
        <p class="p-h1-sub">${meetings.length} upcoming · 15 lab members</p>
      </div>
      <div class="p-actions">
        <button class="btn-ghost-sm">Calendar view</button>
        <button class="btn-primary-sm" id="newMeet">+ Schedule meeting</button>
      </div>
    </div>
    <div class="p-meet-list">
      ${
        meetings
          .map((m) => {
            const att = (m.attendees || '').split(',').filter(Boolean);
            return `<div class="p-meet-card" data-id="${m.id}">
          <div class="p-meet-day">
            <div class="p-meet-day-lbl">${escHtml(m.day_label)}</div>
            <div class="p-meet-day-time">${escHtml(m.time_label)}</div>
          </div>
          <div class="p-meet-body">
            <div class="p-meet-title">${escHtml(m.title)}</div>
            <div class="p-meet-room"><i data-lucide="map-pin" class="p-icon-xs"></i>${escHtml(m.room || '')}</div>
            <div class="p-avatars">
              ${att.map((a, j) => `<div class="p-av-sm" style="z-index:${att.length - j}">${escHtml(a.trim())}</div>`).join('')}
            </div>
          </div>
          <div class="p-meet-tag-col">
            <span class="p-meet-tag" style="background:${typeColor[m.type] || 'var(--navy-900)'}">${escHtml(m.type)}</span>
            <div class="row-actions">
              <button data-edit="${m.id}">Edit</button>
              <button class="danger" data-del="${m.id}">Delete</button>
            </div>
          </div>
        </div>`;
          })
          .join('') || '<div class="empty">No meetings scheduled.</div>'
      }
    </div>
  `;

  root.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete meeting?')) return;
        await apiDel('/api/meetings/' + b.dataset.del);
        navigate('meetings');
      }),
  );
  root.querySelectorAll('[data-edit]').forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const m = meetings.find((x) => x.id == b.dataset.edit);
        openMeetingModal(m);
      }),
  );

  function openMeetingModal(m) {
    const isNew = !m;
    m = m || {
      day_label: 'TODAY',
      time_label: '09:30 – 10:30',
      title: '',
      room: '',
      attendees: '',
      type: 'team',
    };
    modal(
      isNew ? 'Schedule meeting' : 'Edit meeting',
      '',
      `
      <label>Day label</label><input id="m_day" value="${escHtml(m.day_label)}" placeholder="TODAY, TUE, WED…">
      <label>Time</label><input id="m_time" value="${escHtml(m.time_label)}" placeholder="09:30 – 10:30">
      <label>Title</label><input id="m_title" value="${escHtml(m.title)}">
      <label>Room</label><input id="m_room" value="${escHtml(m.room || '')}">
      <label>Attendees (comma-sep initials)</label><input id="m_att" value="${escHtml(m.attendees || '')}" placeholder="AO,SK,MR">
      <label>Type</label>
      <select id="m_type">${['team', '1:1', 'external', 'review', 'onboarding'].map((x) => `<option value="${x}"${x === m.type ? ' selected' : ''}>${x}</option>`).join('')}</select>
    `,
      async (mb) => {
        const body = {
          day_label: $('#m_day', mb).value,
          time_label: $('#m_time', mb).value,
          title: $('#m_title', mb).value,
          room: $('#m_room', mb).value,
          attendees: $('#m_att', mb).value,
          type: $('#m_type', mb).value,
          sort_order: m.sort_order || 0,
        };
        if (isNew) await apiPost('/api/meetings', body);
        else await apiPut('/api/meetings/' + m.id, body);
        navigate('meetings');
      },
    );
  }
  $('#newMeet').onclick = () => openMeetingModal(null);
}

/* ───────────────────────────────────────────────────────────
   INVENTORY — tabs + table
   ─────────────────────────────────────────────────────────── */
let _invLab = 'A';
async function renderInventory(root, embedded = false) {
  const response = await apiGet('/api/inventory').catch(() => ({ rows: [] }));
  const suppliers = await apiGet('/api/suppliers').catch(() => []);
  const items = Array.isArray(response) ? response : response.rows || [];
  const labA = items.filter((i) => i.lab === 'A');
  const labB = items.filter((i) => i.lab === 'B');
  const list = _invLab === 'A' ? labA : labB;
  const stateOf = (it) => (it.qty <= 0 ? 'alert' : it.qty <= it.min_qty ? 'warn' : 'ok');
  const stateMap = {
    ok: { cls: 'p-tag-ok', lbl: 'In stock', c: 'var(--status-ok)' },
    warn: { cls: 'p-tag-warn', lbl: 'Low', c: 'var(--status-warn)' },
    alert: { cls: 'p-tag-alert', lbl: 'Out', c: 'var(--status-alert)' },
  };
  const low = list.filter((i) => stateOf(i) !== 'ok').length;

  root.innerHTML = `
    ${
      !embedded
        ? `<div class="p-page-head">
      <div>
        <h1 class="p-h1">Inventory</h1>
        <p class="p-h1-sub">Tracked across two lab spaces · ${low} item${low === 1 ? '' : 's'} need attention</p>
      </div>
      <div class="p-actions">
        <button class="btn-ghost-sm p-btn-tight" id="editSpaces" type="button">Edit lab spaces</button>
        <a class="btn-ghost-sm p-btn-tight" href="/api/inventory/export.csv" download style="text-decoration:none;">Export CSV</a>
        <button class="btn-primary-sm p-btn-tight" id="newInv" type="button">Add item</button>
      </div>
    </div>`
        : `<div class="p-inv-toolbar" style="justify-content:flex-end;">
      <button class="btn-primary-sm p-btn-tight" id="newInv" type="button">Add item</button>
    </div>`
    }

    <div class="p-tabs">
      <button class="p-tab${_invLab === 'A' ? ' active' : ''}" data-lab="A">${escHtml(labLabel('A'))} <span class="p-tab-count">${labA.length}</span></button>
      <button class="p-tab${_invLab === 'B' ? ' active' : ''}" data-lab="B">${escHtml(labLabel('B'))} <span class="p-tab-count">${labB.length}</span></button>
    </div>

    <div class="p-inv-toolbar">
      <div class="p-inv-search">
        <i data-lucide="search" class="p-inv-search-i"></i>
        <input id="invSearch" class="p-inv-input" placeholder="Search SKU, name, category…">
      </div>
      <select class="p-inv-select"><option>All categories</option></select>
      <select class="p-inv-select"><option>All status</option></select>
    </div>

    <div class="p-inv-table" id="invTable">
      <div class="p-inv-row p-inv-head">
        <div style="flex-basis:140px">SKU</div>
        <div style="flex:2.2">Item</div>
        <div style="flex:1">Category</div>
        <div style="flex:1">Quantity</div>
        <div style="flex:1">Status</div>
        <div style="flex-basis:80px"></div>
      </div>
      ${list
        .map((it) => {
          const st = stateOf(it);
          const sm = stateMap[st];
          const supplierBits = [it.supplier_name, it.location]
            .filter(Boolean)
            .map(escHtml)
            .join(' · ');
          const links = [];
          if (it.supplier_url)
            links.push(
              `<a href="${escHtml(it.supplier_url)}" target="_blank" rel="noopener">Vendor</a>`,
            );
          if (it.reorder_url)
            links.push(
              `<a href="${escHtml(it.reorder_url)}" target="_blank" rel="noopener">Reorder</a>`,
            );
          if (it.sds_url)
            links.push(`<a href="${escHtml(it.sds_url)}" target="_blank" rel="noopener">SDS</a>`);
          return `<div class="p-inv-row" data-id="${it.id}">
          <div style="flex-basis:140px"><code class="p-mono">${escHtml(it.sku)}</code></div>
          <div style="flex:2.2">
            <div class="p-inv-name">${escHtml(it.name)}</div>
            ${supplierBits ? `<div class="p-inline-meta"><span>${supplierBits}</span></div>` : ''}
            ${links.length ? `<div class="p-inline-links">${links.join('')}</div>` : ''}
          </div>
          <div style="flex:1" class="p-inv-cat">${escHtml(it.category || '')}</div>
          <div style="flex:1">
            <div><span class="p-qty-num">${it.qty}</span><span class="p-qty-min"> ${escHtml(it.unit || 'each')} / min ${it.min_qty}</span></div>
            <div class="p-qty-bar"><div class="p-qty-fill" style="width:${Math.min(100, (it.qty / Math.max(it.min_qty, 1)) * 60)}%;background:${sm.c}"></div></div>
          </div>
          <div style="flex:1">
            <span class="p-tag ${sm.cls}"><span class="p-dot" style="background:${sm.c}"></span>${sm.lbl}</span>
          </div>
          <div style="flex-basis:80px;text-align:right" class="row-actions">
            <button data-edit="${it.id}">Edit</button>
            <button class="danger" data-del="${it.id}">×</button>
          </div>
        </div>`;
        })
        .join('')}
    </div>
  `;

  root.querySelectorAll('[data-lab]').forEach(
    (b) =>
      (b.onclick = () => {
        _invLab = b.dataset.lab;
        renderInventory(root, embedded);
        if (window.lucide) window.lucide.createIcons();
      }),
  );
  root.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Delete item?')) return;
        await apiDel('/api/inventory/' + b.dataset.del);
        renderInventory(root, embedded);
      }),
  );
  root
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openInvModal(items.find((x) => x.id == b.dataset.edit))));
  $('#newInv').onclick = () => openInvModal(null);
  if ($('#editSpaces')) {
    $('#editSpaces').onclick = () => {
      _adminTab = 'settings';
      navigate('content');
    };
  }
  $('#invSearch').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    root.querySelectorAll('#invTable .p-inv-row:not(.p-inv-head)').forEach((r) => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  function openInvModal(it) {
    const isNew = !it;
    it = it || {
      lab: _invLab,
      sku: '',
      name: '',
      category: '',
      qty: 0,
      min_qty: 0,
      unit: 'each',
      supplier_id: '',
      reorder_url: '',
      notes: '',
      expiry_date: '',
      location: '',
      sds_url: '',
    };
    const bg = modal(
      isNew ? 'Add inventory item' : 'Edit item',
      '',
      `
      <label>Lab</label><select id="m_lab"><option value="A"${it.lab === 'A' ? ' selected' : ''}>${escHtml(labLabel('A'))}</option><option value="B"${it.lab === 'B' ? ' selected' : ''}>${escHtml(labLabel('B'))}</option></select>
      <label>SKU</label><input id="m_sku" value="${escHtml(it.sku)}" placeholder="SN-LAT-00000">
      <label>Name</label><input id="m_name" value="${escHtml(it.name)}">
      <label>Category</label><input id="m_cat" value="${escHtml(it.category || '')}" placeholder="Sensors / Hardware / Consumables / Fluids / Optics / PPE">
      <div class="p-grid-2" style="gap:12px;">
        <div><label>Quantity</label><input id="m_qty" type="number" value="${it.qty}"></div>
        <div><label>Min quantity</label><input id="m_min" type="number" value="${it.min_qty}"></div>
      </div>
      <div class="p-grid-2" style="gap:12px;">
        <div><label>Unit</label><input id="m_unit" value="${escHtml(it.unit || 'each')}" placeholder="each / bottles / packs"></div>
        <div><label>Expiry date</label><input id="m_exp" type="date" value="${escHtml(it.expiry_date || '')}"></div>
      </div>
      <label>Location</label><input id="m_loc" value="${escHtml(it.location || '')}" placeholder="Cabinet, shelf, freezer, or bench">
      <label>Supplier</label>
      <select id="m_sup">
        <option value="">No supplier linked</option>
        ${suppliers.map((s) => `<option value="${s.id}"${String(s.id) === String(it.supplier_id || '') ? ' selected' : ''}>${escHtml(s.name)}</option>`).join('')}
      </select>
      <label>Vendor / reorder URL</label><input id="m_reorder" value="${escHtml(it.reorder_url || '')}" placeholder="https://vendor.example/item">
      <label>SDS / reference URL</label><input id="m_sds" value="${escHtml(it.sds_url || '')}" placeholder="https://...">
      <label>Notes</label><textarea id="m_notes" style="min-height:110px;">${escHtml(it.notes || '')}</textarea>
    `,
      async (mb) => {
        const body = {
          lab: $('#m_lab', mb).value,
          sku: $('#m_sku', mb).value,
          name: $('#m_name', mb).value,
          category: $('#m_cat', mb).value,
          qty: +$('#m_qty', mb).value,
          min_qty: +$('#m_min', mb).value,
          unit: $('#m_unit', mb).value || 'each',
          supplier_id: $('#m_sup', mb).value ? +$('#m_sup', mb).value : null,
          reorder_url: $('#m_reorder', mb).value,
          notes: $('#m_notes', mb).value,
          expiry_date: $('#m_exp', mb).value || null,
          location: $('#m_loc', mb).value,
          sds_url: $('#m_sds', mb).value,
          sort_order: it.sort_order || 0,
        };
        if (isNew) await apiPost('/api/inventory', body);
        else await apiPut('/api/inventory/' + it.id, body);
        renderInventory(root, embedded);
        if (window.lucide) window.lucide.createIcons();
      },
    );
    bg.querySelector('.modal').classList.add('is-wide');
  }
}

/* ───────────────────────────────────────────────────────────
   PROJECTS
   ─────────────────────────────────────────────────────────── */
async function renderProjects(root) {
  const projs = await apiGet('/api/projects');
  const statusTag = {
    active: ['Active', 'p-tag-ok', 'var(--status-ok)'],
    paused: ['Paused', 'p-tag-warn', 'var(--status-warn)'],
    completed: ['Completed', 'p-tag-info', 'var(--status-info)'],
  };
  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <h1 class="p-h1">Projects</h1>
        <p class="p-h1-sub">${projs.length} active project${projs.length === 1 ? '' : 's'} across the lab</p>
      </div>
      <div class="p-actions">
        <button class="btn-primary-sm" id="newProj">+ New project</button>
      </div>
    </div>

    <div class="p-grid-2">
      ${
        projs
          .map((p) => {
            const [lbl, cls, c] = statusTag[p.status] || statusTag.active;
            return `<div class="p-card">
          <div class="p-card-head">
            <div class="p-card-title">${escHtml(p.title)}</div>
            <span class="p-tag ${cls}"><span class="p-dot" style="background:${c}"></span>${lbl}</span>
          </div>
          <div style="font-size:13px;color:var(--fg-2);line-height:1.55;margin-bottom:12px">${escHtml(p.description || '')}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--fg-3)">
            <div><strong>Lead:</strong> ${escHtml(p.lead || '—')}</div>
            <div class="row-actions">
              <button data-edit="${p.id}">Edit</button>
              <button class="danger" data-del="${p.id}">Delete</button>
            </div>
          </div>
        </div>`;
          })
          .join('') || '<div class="empty p-card">No projects yet.</div>'
      }
    </div>
  `;
  root.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Delete project?')) return;
        await apiDel('/api/projects/' + b.dataset.del);
        navigate('projects');
      }),
  );
  root
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openProj(projs.find((x) => x.id == b.dataset.edit))));
  $('#newProj').onclick = () => openProj(null);

  function openProj(p) {
    const isNew = !p;
    p = p || { title: '', lead: '', status: 'active', description: '' };
    modal(
      isNew ? 'New project' : 'Edit project',
      '',
      `
      <label>Title</label><input id="m_t" value="${escHtml(p.title)}">
      <label>Lead</label><input id="m_l" value="${escHtml(p.lead || '')}">
      <label>Status</label>
      <select id="m_s">${['active', 'paused', 'completed'].map((x) => `<option value="${x}"${x === p.status ? ' selected' : ''}>${x}</option>`).join('')}</select>
      <label>Description</label><textarea id="m_d">${escHtml(p.description || '')}</textarea>
    `,
      async (mb) => {
        const body = {
          title: $('#m_t', mb).value,
          lead: $('#m_l', mb).value,
          status: $('#m_s', mb).value,
          description: $('#m_d', mb).value,
          sort_order: p.sort_order || 0,
        };
        if (isNew) await apiPost('/api/projects', body);
        else await apiPut('/api/projects/' + p.id, body);
        navigate('projects');
      },
    );
  }
}
