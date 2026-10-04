/* Admin: white papers. Loaded in order by admin.html. */

async function renderWhitePapersTab(body) {
  const rows = await apiGet('/api/white-papers/all');
  body.innerHTML = `
    <div style="font-size:13px; color:var(--fg-3); margin-bottom:14px;">Manage technical reports separately from peer-reviewed publications. Upload or edit LaTeX, compile a preview, then publish the generated page. PDFs are optional.</div>
    <div class="p-inv-toolbar"><button class="btn-primary-sm" id="newDownload">+ Add white paper</button><a class="btn-primary-sm" href="/templates/LATFS-White-Paper-Template.tex" download>Download LaTeX template</a><a href="/templates/author-guide.html" target="_blank" rel="noopener">Author guide ↗</a></div>
    <div class="p-inv-table">
      <div class="p-inv-row p-inv-head"><div style="flex:2">Title</div><div style="flex:1">Tags</div><div style="flex:1">File</div><div style="flex-basis:80px;text-align:center">Live</div><div style="flex-basis:100px;text-align:right"></div></div>
      ${rows
        .map(
          (item) => `<div class="p-inv-row">
        <div style="flex:2">
          <div class="p-inv-name">${escHtml(item.title || '')}</div>
          <div style="font-size:11px;color:var(--fg-4)">${escHtml(item.abstract || '')}</div>
        </div>
        <div style="flex:1;font-size:12px;color:var(--fg-2)">${escHtml((item.tags || (item.category ? [item.category] : [])).join(', '))}</div>
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
      <label>Tags (comma-separated)</label><input id="d_cat" value="${escHtml((item.tags || (item.category ? [item.category] : [])).join(', '))}" placeholder="Data Center Cooling, Two-Phase Flow, Digital Twin...">
      <label>Optional PDF attachment</label><input id="d_file" type="file" accept=".pdf,application/pdf">
      <label>File URL</label><input id="d_url" value="${escHtml(item.file_url || '')}" placeholder="/uploads/your-file.pdf">
      <label>Visible file name</label><input id="d_name" value="${escHtml(item.file_name || '')}" placeholder="Original file name">
      <h3>LaTeX source</h3>
      <p>Use the shared <a href="/templates/LATFS-White-Paper-Template.tex" download>LaTeX template</a>. Standard sections, equations, figures and tables become the page automatically. <a href="/templates/author-guide.html" target="_blank" rel="noopener">Supported format ↗</a></p>
      <label>Open .tex file (up to 100 KB)</label><input id="wp_tex_file" type="file" accept=".tex,text/plain">
      <label for="wp_source">Edit LaTeX</label><textarea id="wp_source" spellcheck="false" style="min-height:420px;font-family:monospace;tab-size:2">${escHtml(item.latex_source || legacyPaperLatex(item.blocks || []))}</textarea>
      <label>Upload a figure</label><input id="wp_figure" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
      <p id="wp_figure_url"></p>
      <div class="row-actions"><button type="button" id="wp_compile">Compile preview</button><button type="button" id="wp_download_source">Download source</button></div>
      <p id="wp_compile_status" role="status"></p>
      <article id="wp_preview" class="w-paper-body w-latex-body" style="max-height:600px;overflow:auto;padding:20px;border:1px solid var(--border-1)" hidden></article>
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
          tags: $('#d_cat', mb)
            .value.split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          latex_source: $('#wp_source', mb).value,
          file_url: fileUrl,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
          published: $('#d_pub', mb).checked ? 1 : 0,
        };
        if (!payload.title || !payload.authors || !payload.abstract)
          throw new Error('Title, authors and abstract are required');

        if (isNew) await apiPost('/api/white-papers', payload);
        else await apiPut('/api/white-papers/' + item.id, payload);
        renderAdmin($('#mainContent'));
      },
    );
    bg.querySelector('.modal').classList.add('is-wide');
    setupPaperLatex(bg);
  }
}

function legacyPaperLatex(blocks) {
  const escape = (text) =>
    String(text || '').replace(
      /[\\{}$&#%_^~]/g,
      (c) =>
        ({ '\\': '\\textbackslash{}', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}' })[c] ||
        '\\' + c,
    );
  const body = blocks
    .map((b) => {
      if (b.type === 'heading') return '\\section{' + escape(b.text) + '}';
      if (b.type === 'paragraph') return escape(b.text);
      if (b.type === 'image')
        return (
          '\\begin{figure}\n\\includegraphics{' +
          b.src +
          '}\n\\caption{' +
          escape(b.caption) +
          '}\n\\end{figure}'
        );
      if (b.type === 'table')
        return (
          '\\begin{table}\n\\caption{' +
          escape(b.caption) +
          '}\n\\begin{tabular}{' +
          'l'.repeat(b.headers.length) +
          '}\n' +
          [b.headers, ...b.rows].map((row) => row.map(escape).join(' & ') + ' \\\\').join('\n') +
          '\n\\end{tabular}\n\\end{table}'
        );
      return '';
    })
    .join('\n\n');
  return (
    '\\documentclass{article}\n\\usepackage{amsmath,graphicx,booktabs}\n\\begin{document}\n\n' +
    (body ||
      '\\section{Introduction}\nWrite your white paper here.\n\n\\section{Methods}\n\n\\section{Results}\n\n\\section{Conclusions}') +
    '\n\n\\end{document}\n'
  );
}
function setupPaperLatex(root) {
  const source = root.querySelector('#wp_source');
  const status = root.querySelector('#wp_compile_status');
  const preview = root.querySelector('#wp_preview');
  let revision = 0;
  source.oninput = () => {
    revision++;
    status.textContent = 'Source changed. Compile again to refresh the preview.';
    preview.hidden = true;
  };
  root.querySelector('#wp_tex_file').onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!/\.tex$/i.test(file.name) || file.size > 100000) {
      status.textContent = 'Choose a .tex file up to 100 KB.';
      return;
    }
    if (source.value.trim() && !confirm('Replace the editor contents with this file?')) return;
    source.value = await file.text();
    source.oninput();
  };
  root.querySelector('#wp_compile').onclick = async (event) => {
    const button = event.currentTarget,
      current = revision;
    button.disabled = true;
    status.textContent = 'Compiling…';
    preview.hidden = true;
    try {
      const result = await apiPost('/api/white-papers/compile', { latex_source: source.value });
      if (revision !== current) return;
      preview.innerHTML = result.html;
      preview.hidden = false;
      status.textContent =
        'Compiled successfully. Save to update the paper. Publishing makes it public.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
  root.querySelector('#wp_download_source').onclick = () => {
    const url = URL.createObjectURL(new Blob([source.value], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'white-paper.tex';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  root.querySelector('#wp_figure').onchange = async (event) => {
    const input = event.target,
      file = input.files[0];
    if (!file) return;
    input.disabled = true;
    try {
      const url = await uploadPhoto(file);
      root.querySelector('#wp_figure_url').textContent = 'Uploaded: ' + url;
      const figure =
        '\\begin{figure}\n\\includegraphics{' +
        url +
        '}\n\\caption{Describe this figure.}\n\\end{figure}\n';
      const end = source.value.lastIndexOf('\\end{document}');
      source.value =
        end >= 0
          ? source.value.slice(0, end) + figure + source.value.slice(end)
          : source.value + '\n' + figure;
      source.oninput();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      input.disabled = false;
    }
  };
}
