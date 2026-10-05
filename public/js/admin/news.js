/* Admin: news. Loaded in order by admin.html. */

function renderNewsTab(body, news) {
  body.innerHTML = `
    <div class="p-inv-toolbar">
      <button class="btn-primary-sm" id="newNews">+ New news item</button>
    </div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head">
        <div style="flex-basis:120px">Date</div>
        <div style="flex:2">Title</div>
        <div style="flex-basis:100px;text-align:right"></div>
      </div>
      ${news
        .map(
          (n) => `<div class="p-inv-row" data-id="${n.id}">
        <div style="flex-basis:120px"><code class="p-mono">${escHtml(n.date)}</code></div>
        <div style="flex:2"><div class="p-inv-name">${escHtml(n.title)}</div><div style="font-size:11px;color:var(--fg-4)">${escHtml((n.content || '').slice(0, 100))}${(n.content || '').length > 100 ? '…' : ''}</div></div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit="${n.id}">Edit</button><button class="danger" data-del="${n.id}">×</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm('Delete?')) {
          await apiDel('/api/news/' + b.dataset.del);
          renderAdmin($('#mainContent'));
        }
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openNews(news.find((n) => n.id == b.dataset.edit))));
  $('#newNews').onclick = () => openNews(null);
  function openNews(n) {
    const isNew = !n;
    n = n || { title: '', content: '', date: new Date().toISOString().slice(0, 10), image_url: '' };
    modal(
      isNew ? 'New news item' : 'Edit news',
      '',
      `
      <label>Date</label><input id="m_date" type="date" value="${escHtml(n.date)}">
      <label>Title</label><input id="m_t" value="${escHtml(n.title)}">
      <label>Cover image (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${n.image_url ? `<img src="${escHtml(n.image_url)}" alt="" style="height:48px;border-radius:6px;border:1px solid var(--border-1);">` : ''}
        <input type="file" id="m_img_file" data-photo-target="#m_img" accept="image/*" style="flex:1;">
      </div>
      <label>Cover image URL</label><input id="m_img" value="${escHtml(n.image_url || '')}">
      <label>Content</label><textarea id="m_c" style="min-height:160px;">${escHtml(n.content)}</textarea>
    `,
      async (mb) => {
        const f = $('#m_img_file', mb);
        if (f && f.files && f.files[0]) {
          const url = await uploadPhoto(f.files[0]);
          $('#m_img', mb).value = url;
        }
        const body = {
          date: $('#m_date', mb).value,
          title: $('#m_t', mb).value,
          content: $('#m_c', mb).value,
          image_url: $('#m_img', mb).value,
        };
        if (isNew) await apiPost('/api/news', body);
        else await apiPut('/api/news/' + n.id, body);
        renderAdmin($('#mainContent'));
      },
    );
  }
}
