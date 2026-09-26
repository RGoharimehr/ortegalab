/* Platform: notebook. Loaded in order by platform.html. */

/* ---------- Lab Notebook ---------- */
let NOTEBOOK_QUERY = '';
async function loadNotebook() {
  try {
    const isStaff = isLabStaffRole(ME.role);
    const qs = new URLSearchParams();
    if (!isStaff) qs.set('mine', '1');
    if (NOTEBOOK_QUERY) qs.set('search', NOTEBOOK_QUERY);
    const entries = await api('/api/lab-notebooks?' + qs);
    if (!entries.length) {
      $('#notebookList').innerHTML = '<div class="empty">No notebook entries found.</div>';
      return;
    }
    const STATUS_COLOR = {
      draft: 'var(--fg-4)',
      complete: 'var(--status-ok)',
      reviewed: 'var(--gold-700)',
    };
    $('#notebookList').innerHTML = entries
      .map(
        (n) => `
      <div class="p-card" style="margin-bottom:12px;cursor:pointer;" data-nb-open="${n.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="font-weight:600;font-size:15px;">${escapeHTML(n.title)}</div>
            <div style="font-size:12px;color:var(--fg-3);margin-top:2px;">
              ${fmtDate(n.experiment_date)} · ${escapeHTML(n.author_name || '?')}
              ${n.project_title ? `· ${escapeHTML(n.project_title)}` : ''}
            </div>
            ${
              n.tags
                ? `<div style="margin-top:4px;">${n.tags
                    .split(',')
                    .map(
                      (t) =>
                        `<span style="font-size:11px;background:var(--bg-2);padding:2px 6px;border-radius:10px;margin-right:4px;">${escapeHTML(t.trim())}</span>`,
                    )
                    .join('')}</div>`
                : ''
            }
          </div>
          <span style="font-size:11px;color:${STATUS_COLOR[n.status] || 'var(--fg-4)'};">${escapeHTML(n.status)}</span>
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--fg-3);white-space:pre-wrap;max-height:60px;overflow:hidden;">${escapeHTML((n.content || '').slice(0, 200))}${(n.content || '').length > 200 ? '…' : ''}</div>
      </div>`,
      )
      .join('');
    $('#notebookList')
      .querySelectorAll('[data-nb-open]')
      .forEach((card) => {
        card.addEventListener('click', async () => {
          const n = entries.find((x) => x.id == card.dataset.nbOpen);
          if (!n) return;
          openNotebookModal(n);
        });
      });
  } catch (e) {
    $('#notebookList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
$('#notebookSearch').addEventListener('input', (e) => {
  NOTEBOOK_QUERY = e.target.value;
  loadNotebook();
});
$('#addNotebookBtn').addEventListener('click', () => openNotebookModal());

async function openNotebookModal(n) {
  const isEdit = !!n;
  const today = new Date().toISOString().slice(0, 10);
  let projs = [];
  try {
    projs = await api('/api/projects');
  } catch (_) {
    /* Optional supporting data remains unavailable. */
  }
  modal(
    `<h2>${isEdit ? 'Edit entry' : 'New notebook entry'}</h2>
    <label>Title<input id="nbTitle" value="${escapeHTML(n?.title || '')}"></label>
    <label>Experiment date<input id="nbDate" type="date" value="${n?.experiment_date || today}"></label>
    <label>Project<select id="nbProj"><option value="">— none —</option>${projs.map((p) => `<option value="${p.id}" ${n?.project_id == p.id ? 'selected' : ''}>${escapeHTML(p.title)}</option>`).join('')}</select></label>
    <label>Tags (comma-separated)<input id="nbTags" value="${escapeHTML(n?.tags || '')}" placeholder="protocol, measurement, synthesis…"></label>
    <label>Status<select id="nbSt">
      ${['draft', 'complete', 'reviewed'].map((t) => `<option value="${t}" ${n?.status === t ? 'selected' : ''}>${t}</option>`).join('')}
    </select></label>
    <label>Notes / observations<textarea id="nbContent" style="min-height:160px;">${escapeHTML(n?.content || '')}</textarea></label>`,
    async () => {
      const body = {
        title: $('#nbTitle').value.trim(),
        experiment_date: $('#nbDate').value,
        project_id: $('#nbProj').value || null,
        tags: $('#nbTags').value,
        status: $('#nbSt').value,
        content: $('#nbContent').value,
      };
      if (!body.title || !body.experiment_date) throw new Error('Title and date required');
      if (isEdit) await api('/api/lab-notebooks/' + n.id, { method: 'PUT', body });
      else await api('/api/lab-notebooks', { method: 'POST', body });
      loadNotebook();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delNb">Delete</button>` : '',
  );
  if (isEdit) {
    $('#delNb').addEventListener('click', async () => {
      if (!confirm('Delete this notebook entry?')) return;
      try {
        await api('/api/lab-notebooks/' + n.id, { method: 'DELETE' });
        closeModal();
        loadNotebook();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
