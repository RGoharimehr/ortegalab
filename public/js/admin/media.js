/* Admin: media. Loaded in order by admin.html. */

async function renderHeroTab(body) {
  const slides = await apiGet('/api/hero-slides').catch(() => []);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Images shown behind the lab name on the public homepage. The slideshow rotates through these. Drop in 1600x900+ photos for best quality.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newSlide">+ Add hero slide</button></div>
    <div class="p-grid-3">
      ${
        slides.length
          ? slides
              .map(
                (s) => `
        <div class="p-card" style="padding:0; overflow:hidden;">
          <img src="${escHtml(s.image_url)}" alt="" style="width:100%; height:170px; object-fit:cover; display:block; background:var(--bg-1);">
          <div style="padding:12px;">
            <div class="p-inv-name">${escHtml(s.title || '(untitled)')}</div>
            <div style="font-size:12px;color:var(--fg-3); margin:4px 0 10px;">${escHtml(s.caption || '')}</div>
            <div class="row-actions"><button data-edit="${s.id}">Edit</button><button class="danger" data-del="${s.id}">Delete</button></div>
          </div>
        </div>`,
              )
              .join('')
          : '<div class="empty">No hero slides yet.</div>'
      }
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Delete this slide?')) return;
        await apiDel('/api/hero-slides/' + b.dataset.del);
        renderAdmin($('#mainContent'));
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openSlide(slides.find((s) => s.id == b.dataset.edit))));
  $('#newSlide').onclick = () => openSlide(null);
  function openSlide(s) {
    const isNew = !s;
    s = s || { title: '', caption: '', image_url: '', sort_order: 0 };
    modal(
      isNew ? 'Add hero slide' : 'Edit hero slide',
      '',
      `
      <label>Title</label><input id="m_t" value="${escHtml(s.title || '')}">
      <label>Caption</label><textarea id="m_c">${escHtml(s.caption || '')}</textarea>
      <label>Sort order</label><input id="m_s" type="number" value="${s.sort_order || 0}">
      ${
        isNew
          ? `<label>Image (required)</label><input type="file" id="m_f" accept="image/*">`
          : `<label>Replace image (optional)</label><input type="file" id="m_f" accept="image/*">
                 <div style="margin-top:8px;"><img src="${escHtml(s.image_url)}" alt="" style="max-width:100%; max-height:140px; border-radius:6px; border:1px solid var(--border-1);"></div>`
      }
    `,
      async (mb) => {
        const f = $('#m_f', mb);
        const title = $('#m_t', mb).value;
        const caption = $('#m_c', mb).value;
        const sort_order = +$('#m_s', mb).value;
        if (isNew) {
          if (!f.files[0]) throw new Error('Please pick an image file');
          await uploadHeroSlide(f.files[0], title, caption, sort_order);
        } else {
          let image_url = s.image_url;
          if (f.files[0]) image_url = await uploadPhoto(f.files[0]);
          await apiPut('/api/hero-slides/' + s.id, { title, caption, image_url, sort_order });
        }
        renderAdmin($('#mainContent'));
      },
    );
  }
}

async function renderGalleryTab(body) {
  const photos = await apiGet('/api/gallery').catch(() => []);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Photos shown in the homepage gallery strip. Add candid lab shots, conferences, and milestones.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newPic">+ Add photo</button></div>
    <div class="p-grid-3">
      ${
        photos.length
          ? photos
              .map(
                (g) => `
        <div class="p-card" style="padding:0; overflow:hidden;">
          <img src="${escHtml(g.image_url)}" alt="" style="width:100%; height:170px; object-fit:cover; display:block; background:var(--bg-1);">
          <div style="padding:10px 12px;">
            <div style="font-size:12px;color:var(--fg-2);">${escHtml(g.caption || '(no caption)')}</div>
            <div class="p-soft-note">${escHtml(g.category || 'Inside LATFS')}</div><div class="row-actions" style="margin-top:8px;"><button data-edit="${g.id}">Edit</button><button class="danger" data-del="${g.id}">Delete</button></div>
          </div>
        </div>`,
              )
              .join('')
          : '<div class="empty">No gallery photos yet.</div>'
      }
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Delete this photo?')) return;
        await apiDel('/api/gallery/' + b.dataset.del);
        renderAdmin($('#mainContent'));
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach(
      (button) =>
        (button.onclick = () => openPhoto(photos.find((photo) => photo.id == button.dataset.edit))),
    );
  $('#newPic').onclick = () => openPhoto();
  function openPhoto(photo) {
    modal(
      photo ? 'Edit gallery photo' : 'Add gallery photo',
      '',
      `
      ${photo ? '' : '<label>Image file (required)</label><input type="file" id="m_f" accept="image/*">'}
      <label>Caption</label><input id="m_c" value="${escHtml(photo?.caption || '')}">
      <label>Section</label><input id="m_category" list="galleryCategories" maxlength="80" value="${escHtml(photo?.category || 'Inside LATFS')}">
      <datalist id="galleryCategories">${['Inside LATFS', 'Exhibition', 'Visits', 'Villanova at a glance'].map((category) => `<option value="${category}"></option>`).join('')}</datalist>
      <label>Sort order</label><input id="m_s" type="number" value="${photo?.sort_order || 0}">
    `,
      async (mb) => {
        const category = $('#m_category', mb).value.trim() || 'Inside LATFS';
        const caption = $('#m_c', mb).value;
        const sort_order = +$('#m_s', mb).value;
        if (photo) await apiPut('/api/gallery/' + photo.id, { category, caption, sort_order });
        else {
          const file = $('#m_f', mb).files[0];
          if (!file) throw new Error('Please pick an image file');
          await uploadGallery(file, caption, sort_order, category);
        }
        renderAdmin($('#mainContent'));
      },
    );
  }
}
