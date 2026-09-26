/* Platform: tasks. Loaded in order by platform.html. */

/* ---------- Tasks ---------- */
let TASK_SCOPE = 'mine';
async function loadTasks() {
  try {
    const tasks = await api('/api/tasks/full?' + (TASK_SCOPE === 'mine' ? 'mine=1' : 'all=1'));
    const cols = [
      ['todo', 'To do'],
      ['in_progress', 'In progress'],
      ['blocked', 'Blocked'],
      ['done', 'Done'],
    ];
    const root = $('#kanbanRoot');
    root.innerHTML = cols
      .map(([k, t]) => {
        const items = tasks.filter((x) => (x.status || 'todo') === k);
        return `<div class="p-col"><div class="p-col-head"><div class="p-col-title">${t}</div><div class="p-col-count">${items.length}</div></div>
        ${items
          .map(
            (x) => `
          <div class="p-task-card" data-task-id="${x.id}">
            <div class="p-task-card-title">${escapeHTML(x.title)}</div>
            <div class="p-task-card-foot">
              <span class="p-tag-sm ${prioClass(x.priority)}">${escapeHTML(x.priority || 'normal')}</span>
              <div class="p-task-meta">
                <span class="p-task-due-sm">${x.due_date ? fmtDate(x.due_date) : ''}</span>
                <span class="p-task-av" title="${escapeHTML(x.assignee_name || '')}">${initials(x.assignee_name || x.assignee || '')}</span>
              </div>
            </div>
          </div>`,
          )
          .join('')}
        <button class="p-col-add" data-add-status="${k}">+ Add task</button></div>`;
      })
      .join('');
  } catch (e) {
    $('#kanbanRoot').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
function prioClass(p) {
  if (p === 'high') return 'p-tag-alert';
  if (p === 'low') return 'p-tag-info';
  if (p === 'normal') return 'p-tag-outline';
  return 'p-tag-warn';
}

$('#taskScope').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('#taskScope button').forEach((x) => x.classList.toggle('active', x === b));
  TASK_SCOPE = b.dataset.scope;
  loadTasks();
});
$('#addTaskBtn').addEventListener('click', () => openTaskModal());
document.addEventListener('click', async (e) => {
  const add = e.target.closest('[data-add-status]');
  if (add) {
    openTaskModal({ status: add.dataset.addStatus });
    return;
  }
  const card = e.target.closest('.p-task-card');
  if (card && card.dataset.taskId) {
    try {
      const t = (await api('/api/tasks/full?all=1')).find((x) => x.id == card.dataset.taskId);
      if (t) openTaskModal(t);
    } catch (err) {
      alert(err.message);
    }
  }
});

async function openTaskModal(t) {
  const isEdit = !!(t && t.id);
  const canAssign = ME.role === 'admin' || ME.role === 'professor';
  let users = [];
  if (canAssign)
    try {
      users = await api('/api/users');
    } catch (e) {
      users = [];
    }
  modal(
    `<h2>${isEdit ? 'Edit task' : 'New task'}</h2>
    <label>Title<input id="tTitle" value="${escapeHTML(t?.title || '')}"></label>
    <label>Description<textarea id="tDesc">${escapeHTML(t?.description || '')}</textarea></label>
    <label>Priority<select id="tPri">
      ${['low', 'normal', 'high'].map((p) => `<option value="${p}" ${t?.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
    </select></label>
    <label>Status<select id="tSt">
      ${['todo', 'in_progress', 'blocked', 'done'].map((p) => `<option value="${p}" ${(t?.status || 'todo') === p ? 'selected' : ''}>${p.replace('_', ' ')}</option>`).join('')}
    </select></label>
    <label>Due date<input id="tDue" type="date" value="${t?.due_date ? t.due_date.slice(0, 10) : ''}"></label>
    ${
      canAssign
        ? `<label>Assigned to<select id="tAss"><option value="">—</option>
      ${users.map((u) => `<option value="${u.id}" ${t?.assignee_user_id === u.id ? 'selected' : ''}>${escapeHTML(u.name || u.username)}</option>`).join('')}
    </select></label>`
        : ''
    }`,
    async () => {
      const body = {
        title: $('#tTitle').value.trim(),
        description: $('#tDesc').value,
        priority: $('#tPri').value,
        status: $('#tSt').value,
        due_date: $('#tDue').value || null,
        assignee_user_id: canAssign && $('#tAss') ? Number($('#tAss').value) || null : null,
      };
      if (!body.title) throw new Error('Title required');
      if (isEdit) await api('/api/tasks/' + t.id, { method: 'PUT', body });
      else await api('/api/tasks', { method: 'POST', body });
      loadTasks();
      loadDashboard();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delTask">Delete</button>` : '',
  );
  if (isEdit) {
    $('#delTask').addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;
      try {
        await api('/api/tasks/' + t.id, { method: 'DELETE' });
        closeModal();
        loadTasks();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
