/* Admin: publications. Loaded in order by admin.html. */

function renderPubsTab(body, pubs) {
  body.innerHTML = `
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newPub">+ Add publication</button></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex-basis:60px">Year</div><div style="flex:3">Title</div><div style="flex:1">Venue</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${pubs
        .map(
          (p) => `<div class="p-inv-row">
        <div style="flex-basis:60px"><code class="p-mono">${p.year}</code></div>
        <div style="flex:3"><div class="p-inv-name">${escHtml(p.title)}</div><div style="font-size:11px;color:var(--fg-4)">${escHtml(p.authors || '')}</div></div>
        <div style="flex:1;font-size:12px;color:var(--fg-3)">${escHtml(p.venue || '')}</div>
        <div style="flex-basis:100px;text-align:right" class="row-actions"><button data-edit="${p.id}">Edit</button><button class="danger" data-del="${p.id}">×</button></div>
      </div>`,
        )
        .join('')}
    </div>
  `;
  body.querySelectorAll('[data-del]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm('Delete?')) {
          await apiDel('/api/publications/' + b.dataset.del);
          renderAdmin($('#mainContent'));
        }
      }),
  );
  body
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => openPub(pubs.find((x) => x.id == b.dataset.edit))));
  $('#newPub').onclick = () => openPub(null);
  function openPub(p) {
    const isNew = !p;
    p = p || {
      title: '',
      authors: '',
      venue: '',
      year: new Date().getFullYear(),
      pdf_url: '',
      doi_url: '',
    };
    modal(
      isNew ? 'Add publication' : 'Edit publication',
      '',
      `
      <label>Title</label><input id="m_t" value="${escHtml(p.title)}">
      <label>Authors</label><input id="m_a" value="${escHtml(p.authors)}">
      <label>Venue</label><input id="m_v" value="${escHtml(p.venue)}">
      <label>Year</label><input id="m_y" type="number" value="${p.year}">
      <label>PDF file (upload, optional)</label>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="file" id="m_pdf_file" accept=".pdf,application/pdf" style="flex:1;">
        <span id="m_pdf_status" style="font-size:11px; color:var(--fg-4);"></span>
      </div>
      <label>PDF URL (or use upload above)</label><input id="m_pdf" value="${escHtml(p.pdf_url || '')}">
      <label>DOI URL</label><input id="m_doi" value="${escHtml(p.doi_url || '')}">
    `,
      async (mb) => {
        const fileInput = $('#m_pdf_file', mb);
        if (fileInput && fileInput.files && fileInput.files[0]) {
          $('#m_pdf_status', mb).textContent = 'Uploading...';
          try {
            const u = await uploadDoc(fileInput.files[0]);
            $('#m_pdf', mb).value = u.url;
            $('#m_pdf_status', mb).textContent = 'Uploaded.';
          } catch (e) {
            $('#m_pdf_status', mb).textContent = e.message;
            throw e;
          }
        }
        const body = {
          title: $('#m_t', mb).value,
          authors: $('#m_a', mb).value,
          venue: $('#m_v', mb).value,
          year: +$('#m_y', mb).value,
          pdf_url: $('#m_pdf', mb).value,
          doi_url: $('#m_doi', mb).value,
        };
        if (isNew) await apiPost('/api/publications', body);
        else await apiPut('/api/publications/' + p.id, body);
        renderAdmin($('#mainContent'));
      },
    );
  }
}
