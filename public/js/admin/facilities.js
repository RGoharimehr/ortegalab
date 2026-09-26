/* Admin: facilities. Loaded in order by admin.html. */

async function renderFacilitiesTab(body) {
  const facs = await apiGet('/api/facilities').catch(() => []);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Each facility has its own page on the public site (Facilities → click a card). Add photos and PDF documentation per facility.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newFac">+ Add facility</button></div>
    <div class="p-grid-2">
      ${
        facs.length
          ? facs
              .map(
                (f) => `
        <div class="p-card" style="padding:0; overflow:hidden;">
          ${f.photo_url ? `<img src="${escHtml(f.photo_url)}" alt="" style="width:100%; height:160px; object-fit:cover; display:block; background:var(--bg-1);">` : '<div style="height:160px;background:var(--bg-1);"></div>'}
          <div style="padding:14px 16px;">
            <div class="p-inv-name">${escHtml(f.name || '(untitled)')}</div>
            <div style="font-size:12px;color:var(--fg-3); margin:4px 0 10px;">${escHtml((f.description || '').slice(0, 120))}${(f.description || '').length > 120 ? '...' : ''}</div>
            <div style="font-size:11px;color:var(--fg-4); margin-bottom:8px;">${f.doc_url ? '<a href="' + escHtml(f.doc_url) + '" target="_blank" style="color:var(--gold-700);">' + escHtml(f.doc_name || 'document') + '</a>' : 'no document'}</div>
            <div class="row-actions"><button data-edit="${f.id}">Edit</button><button class="danger" data-del="${f.id}">Delete</button></div>
          </div>
        </div>`,
              )
              .join('')
          : '<div class="empty">No facilities yet.</div>'
      }
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Delete this facility?')) return;
        await apiDel('/api/facilities/' + b.dataset.del);
        renderAdmin($('#mainContent'));
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openFac(facs.find((f) => f.id == b.dataset.edit))));
  $('#newFac').onclick = () => openFac(null);
  function openFac(f) {
    const isNew = !f;
    f = f || {
      name: '',
      description: '',
      content: '',
      photo_url: '',
      doc_url: '',
      doc_name: '',
      sort_order: 0,
    };
    modal(
      isNew ? 'Add facility' : 'Edit facility',
      '',
      `
      <label>Name</label><input id="m_n" value="${escHtml(f.name || '')}">
      <label>Short description (one or two lines)</label><textarea id="m_d">${escHtml(f.description || '')}</textarea>
      <label>Long description (shown on detail page)</label><textarea id="m_c" style="min-height:160px;">${escHtml(f.content || '')}</textarea>
      <label>Cover photo (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${f.photo_url ? `<img src="${escHtml(f.photo_url)}" alt="" style="height:50px; border-radius:6px; border:1px solid var(--border-1);">` : ''}
        <input type="file" id="m_pf" accept="image/*" style="flex:1;">
      </div>
      <label>Photo URL (or use upload above)</label><input id="m_p" value="${escHtml(f.photo_url || '')}">
      <label>Documentation file (PDF, upload)</label>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="file" id="m_df" accept=".pdf,application/pdf" style="flex:1;">
        <span id="m_df_status" style="font-size:11px; color:var(--fg-4);">${f.doc_url ? '<a href="' + escHtml(f.doc_url) + '" target="_blank" style="color:var(--gold-700);">current: ' + escHtml(f.doc_name || 'doc') + '</a>' : ''}</span>
      </div>
      <label>Doc URL (or use upload above)</label><input id="m_du" value="${escHtml(f.doc_url || '')}">
      <label>Doc display name</label><input id="m_dn" value="${escHtml(f.doc_name || '')}">
      <label>Sort order</label><input id="m_s" type="number" value="${f.sort_order || 0}">
    `,
      async (mb) => {
        const pf = $('#m_pf', mb);
        if (pf && pf.files && pf.files[0]) {
          const url = await uploadPhoto(pf.files[0]);
          $('#m_p', mb).value = url;
        }
        const df = $('#m_df', mb);
        if (df && df.files && df.files[0]) {
          const u = await uploadDoc(df.files[0]);
          $('#m_du', mb).value = u.url;
          if (!$('#m_dn', mb).value) $('#m_dn', mb).value = u.name;
        }
        const body = {
          name: $('#m_n', mb).value,
          description: $('#m_d', mb).value,
          content: $('#m_c', mb).value,
          photo_url: $('#m_p', mb).value,
          doc_url: $('#m_du', mb).value,
          doc_name: $('#m_dn', mb).value,
          sort_order: +$('#m_s', mb).value,
        };
        if (isNew) await apiPost('/api/facilities', body);
        else await apiPut('/api/facilities/' + f.id, body);
        renderAdmin($('#mainContent'));
      },
    );
  }
}
