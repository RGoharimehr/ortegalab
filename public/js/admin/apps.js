/* Admin: apps. Loaded in order by admin.html. */

async function renderAppsTab(body) {
  const apps = await apiGet('/api/apps/all').catch(() => []);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Publish either a linked app URL, inline HTML, or both. Inline HTML entries launch directly on the public Apps page, and you can also paste or import a full HTML file.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newApp">+ Add app</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">App</div><div style="flex:1">Slug</div><div style="flex:2">Summary</div><div style="flex-basis:110px;text-align:center">Mode</div><div style="flex-basis:80px;text-align:center">Live</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${apps
        .map(
          (a) => `<div class="p-inv-row">
        <div style="flex:2">
          <div class="p-inv-name">${escHtml(a.title)}</div>
          <div style="font-size:11px;color:var(--fg-4)">${a.url ? `<a href="${escHtml(a.url)}" target="_blank" style="color:var(--fg-4); text-decoration:underline;">${escHtml(a.url)}</a>` : '(no linked URL)'}</div>
          ${a.embed_html ? '<div class="p-inline-meta"><span>Inline HTML ready</span></div>' : ''}
        </div>
        <div style="flex:1"><code class="p-mono">${escHtml(a.slug)}</code></div>
        <div style="flex:2; font-size:12px; color:var(--fg-2);">${escHtml(a.summary || '')}</div>
        <div style="flex-basis:110px; text-align:center; font-size:11px; color:var(--fg-3);">${a.url && a.embed_html ? 'Link + inline' : a.embed_html ? 'Inline HTML' : a.url ? 'Linked URL' : 'Draft shell'}</div>
        <div style="flex-basis:80px; text-align:center; font-size:12px; color:${a.published ? 'var(--status-ok)' : 'var(--fg-4)'};">${a.published ? 'Yes' : 'Draft'}</div>
        <div style="flex-basis:100px; text-align:right" class="row-actions"><button data-edit="${a.id}">Edit</button><button class="danger" data-del="${a.id}">x</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Remove this app?')) return;
        await apiDel('/api/apps/' + b.dataset.del);
        renderAdmin($('#mainContent'));
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openApp(apps.find((a) => a.id == b.dataset.edit))));
  $('#newApp').onclick = () => openApp(null);
  function openApp(a) {
    const isNew = !a;
    a = a || {
      slug: '',
      title: '',
      summary: '',
      description: '',
      url: '',
      embed_html: '',
      thumbnail: '',
      sort_order: 0,
      published: 1,
    };
    const bg = modal(
      isNew ? 'Add app' : 'Edit app',
      '',
      `
      <label>Title</label><input id="m_t" value="${escHtml(a.title || '')}">
      <label>Slug (URL-safe id)</label><input id="m_sl" value="${escHtml(a.slug || '')}">
      <label>Summary (one line)</label><input id="m_su" value="${escHtml(a.summary || '')}">
      <label>Description</label><textarea id="m_d">${escHtml(a.description || '')}</textarea>
      <label>App URL (optional)</label><input id="m_u" value="${escHtml(a.url || '')}" placeholder="https://... or /apps/your-app">
      <label>Inline HTML (optional)</label><textarea id="m_html" style="min-height:180px;" placeholder="<div>...</div><script>...</script>">${escHtml(a.embed_html || '')}</textarea>
      <label>Import HTML file (optional)</label><input id="m_html_file" type="file" accept=".html,text/html">
      <div class="p-soft-note">Choose a standalone HTML file and its contents will be loaded into the inline HTML field.</div>
      <label>Thumbnail image URL (optional)</label><input id="m_thumb" value="${escHtml(a.thumbnail || '')}" placeholder="https://...">
      <label>Sort order</label><input id="m_so" type="number" value="${a.sort_order || 0}">
      <label><input type="checkbox" id="m_pub" ${a.published ? 'checked' : ''}> Published (visible on public site)</label>
    `,
      async (mb) => {
        const body = {
          slug: $('#m_sl', mb).value.trim(),
          title: $('#m_t', mb).value,
          summary: $('#m_su', mb).value,
          description: $('#m_d', mb).value,
          url: $('#m_u', mb).value,
          embed_html: $('#m_html', mb).value,
          thumbnail: $('#m_thumb', mb).value,
          sort_order: +$('#m_so', mb).value,
          published: $('#m_pub', mb).checked ? 1 : 0,
        };
        if (!body.slug || !body.title) throw new Error('Slug and title required');
        if (!body.url && !body.embed_html) throw new Error('Add either a URL or inline HTML');
        if (isNew) await apiPost('/api/apps', body);
        else await apiPut('/api/apps/' + a.id, body);
        renderAdmin($('#mainContent'));
      },
    );
    bg.querySelector('.modal').classList.add('is-wide');
    const htmlFileInput = $('#m_html_file', bg);
    if (htmlFileInput) {
      htmlFileInput.addEventListener('change', () => {
        const file = htmlFileInput.files && htmlFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          $('#m_html', bg).value = String(reader.result || '');
        };
        reader.readAsText(file);
      });
    }
  }
}
