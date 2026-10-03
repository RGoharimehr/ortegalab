/* Admin: downloads. Loaded in order by admin.html. */

async function renderWhitePapersTab(body) {
  const rows = await apiGet('/api/white-papers/all');
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Manage technical reports separately from peer-reviewed publications. Save drafts, upload a PDF, then publish when ready.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newDownload">+ Add white paper</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Title</div><div style="flex:1">Category</div><div style="flex:1">File</div><div style="flex-basis:80px;text-align:center">Live</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${rows
        .map(
          (item) => `<div class="p-inv-row">
        <div style="flex:2">
          <div class="p-inv-name">${escHtml(item.title || '')}</div>
          <div style="font-size:11px;color:var(--fg-4)">${escHtml(item.abstract || '')}</div>
        </div>
        <div style="flex:1;font-size:12px;color:var(--fg-2)">${escHtml(item.category || 'General')}</div>
        <div style="flex:1">
          <div style="font-size:12px;color:var(--fg-2)">${escHtml(item.file_name || 'Uploaded file')}</div>
          <div style="font-size:11px;color:var(--fg-4)">${escHtml(item.mime_type || '')}${item.file_size ? ` · ${Math.max(1, Math.round(item.file_size / 1024))} KB` : ''}</div>
        </div>
        <div style="flex-basis:80px;text-align:center;font-size:12px;color:${item.published ? 'var(--status-ok)' : 'var(--fg-4)'};">${item.published ? 'Yes' : 'Draft'}</div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit-download="${item.id}">Edit</button><button class="danger" data-del-download="${item.id}">x</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del-download]').forEach(
    (btn) =>
      (btn.onclick = async () => {
        if (!confirm('Remove this white paper?')) return;
        await apiDel('/api/white-papers/' + btn.dataset.delDownload);
        renderAdmin($('#mainContent'));
      }),
  );
  body.querySelectorAll('[data-edit-download]').forEach(
    (btn) =>
      (btn.onclick = () => {
        const item = rows.find((row) => row.id == btn.dataset.editDownload);
        if (item) openDownloadEditor(item);
      }),
  );
  $('#newDownload').onclick = () => openDownloadEditor(null);

  function openDownloadEditor(item) {
    const isNew = !item;
    item = item || {
      title: '',
      abstract: '',
      category: '',
      file_url: '',
      file_name: '',
      mime_type: '',
      file_size: 0,
      sort_order: 0,
      published: 0,
    };
    const bg = modal(
      isNew ? 'Add white paper' : 'Edit white paper',
      '',
      `
      <label>Title</label><input id="d_title" value="${escHtml(item.title || '')}">
      <label>Authors</label><input id="wp_authors" value="${escHtml(item.authors || '')}" placeholder="Author names in order">
      <label>Year</label><input id="wp_year" type="number" min="1900" max="2200" value="${Number(item.year) || new Date().getFullYear()}">
      <label>Abstract</label><textarea id="d_desc">${escHtml(item.abstract || '')}</textarea>
      <label>Category</label><input id="d_cat" value="${escHtml(item.category || '')}" placeholder="Data Center Cooling, Two-Phase Flow, Digital Twin...">
      <label>Upload file (optional if keeping current file)</label><input id="d_file" type="file" accept=".pdf,application/pdf">
      <label>File URL</label><input id="d_url" value="${escHtml(item.file_url || '')}" placeholder="/uploads/your-file.pdf">
      <label>Visible file name</label><input id="d_name" value="${escHtml(item.file_name || '')}" placeholder="Original file name">
      <label>Sort order</label><input id="d_sort" type="number" value="${item.sort_order || 0}">
      <label><input type="checkbox" id="d_pub" ${item.published ? 'checked' : ''}> Published (visible on public site)</label>
    `,
      async (mb) => {
        let fileUrl = $('#d_url', mb).value.trim();
        let fileName = $('#d_name', mb).value.trim();
        let mimeType = item.mime_type || '';
        let fileSize = Number(item.file_size || 0);
        const file = $('#d_file', mb).files && $('#d_file', mb).files[0];
        if (file) {
          if (!/\.pdf$/i.test(file.name)) throw new Error('Please choose a PDF file');
          const uploaded = await uploadDoc(file);
          fileUrl = uploaded.url;
          fileName = uploaded.name || fileName;
          mimeType = uploaded.mime_type || mimeType;
          fileSize = Number(uploaded.file_size || fileSize || 0);
        }
        const payload = {
          title: $('#d_title', mb).value.trim(),
          authors: $('#wp_authors', mb).value.trim(),
          year: Number($('#wp_year', mb).value),
          abstract: $('#d_desc', mb).value.trim(),
          category: $('#d_cat', mb).value.trim(),
          file_url: fileUrl,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
          sort_order: Number($('#d_sort', mb).value || 0),
          published: $('#d_pub', mb).checked ? 1 : 0,
        };
        if (!payload.title || !payload.authors || !payload.abstract)
          throw new Error('Title, authors and abstract are required');
        if (payload.published && !payload.file_url)
          throw new Error('Upload a PDF before publishing');
        if (isNew) await apiPost('/api/white-papers', payload);
        else await apiPut('/api/white-papers/' + item.id, payload);
        renderAdmin($('#mainContent'));
      },
    );
    bg.querySelector('.modal').classList.add('is-wide');
  }
}
