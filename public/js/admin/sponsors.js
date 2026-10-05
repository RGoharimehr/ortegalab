/* Admin: sponsors. Loaded in order by admin.html. */

async function renderSponsorsTab(body) {
  const sponsors = await apiGet('/api/sponsors').catch(() => []);
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Sponsors and collaborators. Logo and name appear on the homepage marquee. URL links the logo. Mark "show in footer" to also display in the footer.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newSp">+ Add sponsor / collaborator</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Name</div><div style="flex:2">Logo</div><div style="flex:2">Website</div><div style="flex-basis:80px;text-align:center">Footer</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${sponsors
        .map(
          (sp) => `<div class="p-inv-row">
        <div style="flex:2"><div class="p-inv-name">${escHtml(sp.name)}</div></div>
        <div style="flex:2">${sp.logo_url ? `<img src="${escHtml(sp.logo_url)}" alt="" style="max-height:34px; max-width:140px;">` : '<span style="color:var(--fg-4); font-size:12px;">no logo</span>'}</div>
        <div style="flex:2; font-size:12px; color:var(--fg-3); word-break:break-all;">${escHtml(sp.website_url || '')}</div>
        <div style="flex-basis:80px; text-align:center; font-size:12px; color:${sp.show_in_footer ? 'var(--status-ok)' : 'var(--fg-4)'};">${sp.show_in_footer ? 'Yes' : '-'}</div>
        <div style="flex-basis:100px; text-align:right" class="row-actions"><button data-edit="${sp.id}">Edit</button><button class="danger" data-del="${sp.id}">x</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!confirm('Remove this sponsor?')) return;
        await apiDel('/api/sponsors/' + b.dataset.del);
        renderAdmin($('#mainContent'));
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openSp(sponsors.find((s) => s.id == b.dataset.edit))));
  $('#newSp').onclick = () => openSp(null);
  function openSp(sp) {
    const isNew = !sp;
    sp = sp || { name: '', logo_url: '', website_url: '', sort_order: 0, show_in_footer: 0 };
    modal(
      isNew ? 'Add sponsor' : 'Edit sponsor',
      '',
      `
      <label>Name</label><input id="m_n" value="${escHtml(sp.name || '')}">
      <label>Website URL</label><input id="m_w" value="${escHtml(sp.website_url || '')}">
      <label>Logo (upload)</label>
      <div style="display:flex; gap:10px; align-items:center;">
        ${sp.logo_url ? `<img src="${escHtml(sp.logo_url)}" alt="" style="max-height:40px; max-width:120px;">` : ''}
        <input type="file" id="m_lf" data-photo-target="#m_l" accept="image/*">
      </div>
      <label>Logo URL (or use upload above)</label><input id="m_l" value="${escHtml(sp.logo_url || '')}">
      <label>Sort order</label><input id="m_s" type="number" value="${sp.sort_order || 0}">
      <label><input type="checkbox" id="m_sf" ${sp.show_in_footer ? 'checked' : ''}> Show in footer</label>
    `,
      async (mb) => {
        const lf = $('#m_lf', mb);
        if (lf && lf.files && lf.files[0]) {
          const url = await uploadPhoto(lf.files[0]);
          $('#m_l', mb).value = url;
        }
        const body = {
          name: $('#m_n', mb).value,
          logo_url: $('#m_l', mb).value,
          website_url: $('#m_w', mb).value,
          sort_order: +$('#m_s', mb).value,
          show_in_footer: $('#m_sf', mb).checked ? 1 : 0,
        };
        if (isNew) await apiPost('/api/sponsors', body);
        else await apiPut('/api/sponsors/' + sp.id, body);
        renderAdmin($('#mainContent'));
      },
    );
  }
}
