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
    const dialog = modal(
      isNew ? 'New news item' : 'Edit news',
      '',
      `
      <label>Date</label><input id="m_date" type="date" value="${escHtml(n.date)}">
      <label>Title</label><input id="m_t" value="${escHtml(n.title)}">
      <div id="newsPhotos"></div><button type="button" class="btn-ghost-sm" id="addNewsPhoto">+ Add photo</button>
      <div style="margin-top:16px"><label>Link text</label><input id="newsLinkText"><label>Link URL</label><input id="newsLinkUrl" type="url" placeholder="https://…"><button type="button" class="btn-ghost-sm" id="insertNewsLink">Insert link into text</button></div>
      <label>Content</label><textarea id="m_c" style="min-height:160px;">${escHtml(n.content)}</textarea>
    `,
      async (mb) => {
        const photos = [];
        for (const row of mb.querySelectorAll('[data-news-photo]')) {
          const file = row.querySelector('input[type="file"]');
          const field = row.querySelector('[data-url]');
          if (file.files[0]) field.value = await uploadPhoto(file.files[0]);
          if (!field.value.trim()) throw new Error('Choose an image or remove the empty photo.');
          photos.push({
            url: field.value.trim(),
            caption: row.querySelector('[data-news-caption]').value,
            position: row.querySelector('[data-position]').value,
            size: row.querySelector('[data-size]').value,
          });
        }
        const body = {
          date: $('#m_date', mb).value,
          title: $('#m_t', mb).value,
          content: $('#m_c', mb).value,
          image_url: photos[0]?.url || '',
          photos,
        };
        if (isNew) await apiPost('/api/news', body);
        else await apiPut('/api/news/' + n.id, body);
        renderAdmin($('#mainContent'));
      },
    );
    let sequence = 0;
    const container = dialog.querySelector('#newsPhotos');
    function addPhoto(photo = { url: '', caption: '', position: 'before' }) {
      if (container.children.length >= 20) return;
      const id = 'newsPhoto' + sequence++;
      const row = document.createElement('fieldset');
      row.dataset.newsPhoto = '';
      row.innerHTML = `<legend>News photo</legend><div><label>Upload photo</label><input type="file" id="${id}File" accept="image/*" data-photo-target="#${id}Url"></div>
        <label>Image URL</label><input id="${id}Url" data-url value="${escHtml(photo.url)}">
        <label>Caption</label><input data-news-caption maxlength="500" value="${escHtml(photo.caption)}">
        <label>Placement</label><select data-position><option value="before">Before news text</option><option value="after">After news text</option></select>
        <label>Display size</label><select data-size><option value="large">Large feature photo — full width</option><option value="medium">Medium — centered</option><option value="grid">Small — grid with neighboring grid photos</option></select>
        <button type="button" class="btn-ghost-sm" data-remove>Remove photo</button>`;
      row.querySelector('[data-position]').value = photo.position || 'before';
      row.querySelector('[data-size]').value = photo.size || 'large';
      row.querySelector('[data-remove]').onclick = () => row.remove();
      container.append(row);
      installPhotoControls(row);
    }
    NewsContent.photos(n).forEach(addPhoto);
    dialog.querySelector('#addNewsPhoto').onclick = () => addPhoto();
    dialog.querySelector('#insertNewsLink').onclick = () => {
      const label = dialog.querySelector('#newsLinkText').value.trim();
      const url = dialog.querySelector('#newsLinkUrl').value.trim();
      const error = dialog.querySelector('.form-error');
      if (!label || /[\]\n]/.test(label) || !NewsContent.safe(url) || /[()]/.test(url)) {
        error.textContent = 'Enter link text and a valid URL (encode parentheses in the URL).';
        return;
      }
      error.textContent = '';
      const field = dialog.querySelector('#m_c');
      field.setRangeText(
        '[' + label + '](' + url + ')',
        field.selectionStart,
        field.selectionEnd,
        'end',
      );
      field.focus();
    };
  }
}
