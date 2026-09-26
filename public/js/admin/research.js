/* Admin: research. Loaded in order by admin.html. */

async function renderResearchTab(body) {
  const areas = await apiGet('/api/research');
  body.innerHTML = `
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newR">+ Add research area</button></div>
    <div class="p-grid-2">
      ${areas
        .map(
          (r) => `<div class="p-card">
        <div class="p-card-head"><div class="p-card-title">${escHtml(r.title)}</div></div>
        <div style="font-size:13px;color:var(--fg-2);margin-bottom:10px">${escHtml(r.description || '')}</div>
        <div class="row-actions"><button data-edit="${r.id}">Edit</button><button class="danger" data-del="${r.id}">Delete</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm('Delete?')) {
          await apiDel('/api/research/' + b.dataset.del);
          renderAdmin($('#mainContent'));
        }
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openR(areas.find((x) => x.id == b.dataset.edit))));
  $('#newR').onclick = () => openR(null);
  function openR(r) {
    const isNew = !r;
    r = r || { title: '', description: '', image_url: '', sort_order: 0 };
    modal(
      isNew ? 'Add research area' : 'Edit research area',
      '',
      `
      <label>Title</label><input id="m_t" value="${escHtml(r.title)}">
      <label>Description</label><textarea id="m_d" style="min-height:140px;">${escHtml(r.description || '')}</textarea>
      <label>Cover image (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${r.image_url ? `<img src="${escHtml(r.image_url)}" alt="" style="height:48px; border-radius:6px; border:1px solid var(--border-1);">` : ''}
        <input type="file" id="m_i_file" accept="image/*" style="flex:1;">
      </div>
      <label>Image URL (or use upload above)</label><input id="m_i" value="${escHtml(r.image_url || '')}">
      <label>Sort order</label><input id="m_s" type="number" value="${r.sort_order || 0}">
    `,
      async (mb) => {
        const f = $('#m_i_file', mb);
        if (f && f.files && f.files[0]) {
          const url = await uploadPhoto(f.files[0]);
          $('#m_i', mb).value = url;
        }
        const body = {
          title: $('#m_t', mb).value,
          description: $('#m_d', mb).value,
          image_url: $('#m_i', mb).value,
          sort_order: +$('#m_s', mb).value,
        };
        if (isNew) await apiPost('/api/research', body);
        else await apiPut('/api/research/' + r.id, body);
        renderAdmin($('#mainContent'));
      },
    );
  }
}
