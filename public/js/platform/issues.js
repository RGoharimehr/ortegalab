/* Platform: issues. Loaded in order by platform.html. */

/* ---------- Issues ---------- */
let ISSUE_FILTER = 'open';
async function loadIssues() {
  try {
    const q = ($('#issueSearch') || {}).value || '';
    const cat = ($('#issueCatFilter') || {}).value || '';
    const pri = ($('#issuePriFilter') || {}).value || '';
    const qs = new URLSearchParams();
    if (ISSUE_FILTER === 'open') qs.set('status', 'open');
    if (q) qs.set('query', q);
    if (cat) qs.set('category', cat);
    if (pri) qs.set('priority', pri);
    const issues = unwrap(await api('/api/issues?' + qs.toString()));
    // Update sidebar badge
    if (ISSUE_FILTER === 'open' && !q && !cat && !pri) {
      const badge = $('#issuesBadge');
      if (badge) badge.textContent = issues.length || '';
    }
    if (!issues.length) {
      $('#issueList').innerHTML = '<div class="empty">No issues to show.</div>';
      return;
    }
    $('#issueList').innerHTML = issues
      .map(
        (it) => `
      <div class="p-issue-card priority-${escapeHTML(it.priority || 'medium')}">
        <div class="p-issue-head">
          <div>
            <span class="p-tag-sm ${{ open: 'p-tag-warn', in_progress: 'p-tag-info', resolved: 'p-tag-ok' }[it.status] || 'p-tag-outline'}">${escapeHTML((it.status || '').replace('_', ' '))}</span>
            <span class="p-tag-sm p-tag-outline">${escapeHTML(it.category || '')}</span>
            <span class="p-tag-sm p-tag-outline">${escapeHTML(it.priority || '')}</span>
          </div>
          <button class="btn-ghost-sm" data-issue-id="${it.id}" data-act="open">Open</button>
        </div>
        <div class="p-issue-title">${escapeHTML(it.title)}</div>
        ${((body) => `<div class="p-issue-body">${escapeHTML(body.slice(0, 200))}${body.length > 200 ? '...' : ''}</div>`)(it.body || '')}
        <div class="p-issue-meta">Reported by ${escapeHTML(it.reporter_name || it.reporter_username || '?')} - ${fmtDT(it.created_at)}${it.equipment_name ? ' - re: ' + escapeHTML(it.equipment_name) : ''}</div>
      </div>`,
      )
      .join('');
  } catch (e) {
    $('#issueList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}
// Debounced search input
let _issueDebounce;
function onIssueSearch() {
  clearTimeout(_issueDebounce);
  _issueDebounce = setTimeout(loadIssues, 300);
}
document.addEventListener('input', (e) => {
  if (
    e.target.id === 'issueSearch' ||
    e.target.id === 'issueCatFilter' ||
    e.target.id === 'issuePriFilter'
  )
    onIssueSearch();
});
$('#issueFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('#issueFilter button').forEach((x) => x.classList.toggle('active', x === b));
  ISSUE_FILTER = b.dataset.filter;
  loadIssues();
});
$('#addIssueBtn').addEventListener('click', () => openIssueModal());
$('#requestSupplyBtn').addEventListener('click', () => openIssueModal({ category: 'supplies' }));
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-issue-id][data-act="open"]');
  if (!b) return;
  try {
    const issues = unwrap(await api('/api/issues'));
    const it = issues.find((x) => x.id == b.dataset.issueId);
    if (it) openIssueDetail(it);
  } catch (err) {
    alert(err.message);
  }
});

async function openIssueModal(opts = {}) {
  let equipment = [];
  try {
    equipment = unwrap(await api('/api/equipment'));
  } catch (e) {
    /* Optional supporting data remains unavailable. */
  }
  const isSupplyRequest = (opts.category || '') === 'supplies';
  const inventory = opts.inventory || null;
  const defaultTitle = opts.title || (inventory ? `Supply request: ${inventory.name}` : '');
  const defaultDesc = opts.description || '';
  modal(
    `<h2>Report an issue or request</h2>
    <label>Title<input id="iTitle" placeholder="Short summary…" value="${escapeHTML(defaultTitle)}"></label>
    <label>Category<select id="iCat">
      <option value="equipment" ${!isSupplyRequest ? 'selected' : ''}>Equipment</option>
      <option value="supplies" ${isSupplyRequest ? 'selected' : ''}>Supplies</option>
      <option value="facility">Facility</option>
      <option value="safety">Safety</option>
      <option value="other">Other</option>
    </select></label>
    <label>Priority<select id="iPri">
      <option value="low">Low</option>
      <option value="normal" ${!isSupplyRequest ? 'selected' : ''}>Normal</option>
      <option value="high" ${isSupplyRequest ? 'selected' : ''}>High</option>
    </select></label>
    <label id="iEqWrap">Related equipment (optional)<select id="iEq"><option value="">-</option>
      ${equipment.map((e) => `<option value="${e.id}">${escapeHTML(e.name)} (${escapeHTML(e.sku || '')})</option>`).join('')}
    </select></label>
    <div id="iSupplyFields" style="${isSupplyRequest ? '' : 'display:none;'}">
      <label>Requested quantity<input id="iQty" placeholder="e.g. 2 boxes or 500 mL"></label>
      <label>Preferred supplier<input id="iSupplier" value="${escapeHTML(inventory?.supplier_name || '')}" placeholder="Vendor name"></label>
      <label>Part / catalog #<input id="iPart" value="${escapeHTML(inventory?.sku || '')}" placeholder="Catalog number or SKU"></label>
      <label>Order / quote # (optional)<input id="iOrderRef" placeholder="PO, quote, or order reference"></label>
      <label>Reference URL (optional)<input id="iItemUrl" type="url" value="${escapeHTML(inventory?.reorder_url || '')}" placeholder="https://…"></label>
    </div>
    <label>Description<textarea id="iDesc" placeholder="What happened? What's needed?">${escapeHTML(defaultDesc)}</textarea></label>`,
    async () => {
      const category = $('#iCat').value;
      const supplyLines = [];
      if (category === 'supplies') {
        if (inventory?.name) supplyLines.push(`Inventory item: ${inventory.name}`);
        if ($('#iQty').value.trim())
          supplyLines.push(`Requested quantity: ${$('#iQty').value.trim()}`);
        if ($('#iSupplier').value.trim())
          supplyLines.push(`Preferred supplier: ${$('#iSupplier').value.trim()}`);
        if ($('#iPart').value.trim())
          supplyLines.push(`Part / catalog #: ${$('#iPart').value.trim()}`);
        if ($('#iOrderRef').value.trim())
          supplyLines.push(`Order / quote #: ${$('#iOrderRef').value.trim()}`);
        if ($('#iItemUrl').value.trim())
          supplyLines.push(`Reference URL: ${$('#iItemUrl').value.trim()}`);
      }
      const details = $('#iDesc').value.trim();
      const body = {
        title: $('#iTitle').value.trim(),
        category,
        priority: $('#iPri').value,
        related_equipment_id: category === 'equipment' ? $('#iEq').value || null : null,
        body:
          category === 'supplies'
            ? [...supplyLines, details ? '' : null, details || null]
                .filter((v) => v !== null)
                .join('\n')
            : $('#iDesc').value,
      };
      if (!body.title) body.title = category === 'supplies' ? 'Supply request' : '';
      if (!body.title) throw new Error('Title required');
      await api('/api/issues', { method: 'POST', body });
      loadIssues();
      loadDashboard();
    },
  );
  const syncIssueModalFields = () => {
    const isSupplies = $('#iCat').value === 'supplies';
    $('#iSupplyFields').style.display = isSupplies ? '' : 'none';
    $('#iEqWrap').style.display = isSupplies ? 'none' : '';
  };
  $('#iCat').addEventListener('change', syncIssueModalFields);
  syncIssueModalFields();
}

async function openIssueDetail(it) {
  let comments = [];
  try {
    comments = await api('/api/issues/' + it.id + '/comments');
  } catch (e) {
    /* Optional supporting data remains unavailable. */
  }
  const isStaff = isLabStaffRole(ME.role);
  modal(
    `<h2>${escapeHTML(it.title)}</h2>
    <div class="p-issue-meta">${escapeHTML(it.category)} · ${escapeHTML(it.priority || '')} · reported by ${escapeHTML(it.reporter_name || '?')} on ${fmtDT(it.created_at)}</div>
    <div class="p-issue-body" style="margin-top:12px;">${escapeHTML(it.body || '')}</div>
    ${
      isStaff
        ? `<label>Status<select id="iStatus">
      ${['open', 'in_progress', 'resolved'].map((s) => `<option value="${s}" ${it.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
    </select></label>`
        : ''
    }
    <div class="p-issue-comments">
      <div class="p-card-title" style="margin-bottom:8px;">Comments</div>
      <div id="iComments">${
        comments.length
          ? comments
              .map(
                (c) => `
        <div class="p-comment">
          <div class="p-comment-meta">${escapeHTML(c.user_name || c.username || '?')} · ${fmtDT(c.created_at)}</div>
          <div>${escapeHTML(c.body)}</div>
        </div>`,
              )
              .join('')
          : '<div class="empty">No comments yet.</div>'
      }
      </div>
      <label style="margin-top:14px;">Add comment<textarea id="iCmtNew" placeholder="Reply…"></textarea></label>
      <button class="p-bigbtn ghost" id="iCmtBtn" style="margin-top:8px;">Post</button>
    </div>`,
    isStaff
      ? async () => {
          const body = { status: $('#iStatus').value };
          await api('/api/issues/' + it.id, { method: 'PUT', body });
          loadIssues();
          loadDashboard();
        }
      : null,
    isStaff ? `<button type="button" class="p-bigbtn danger" id="iDel">Delete</button>` : '',
    isStaff ? 'Save' : 'Close',
  );
  $('#iCmtBtn').addEventListener('click', async () => {
    const body = $('#iCmtNew').value.trim();
    if (!body) return;
    try {
      await api('/api/issues/' + it.id + '/comments', { method: 'POST', body: { body } });
      const cs = await api('/api/issues/' + it.id + '/comments');
      $('#iComments').innerHTML = cs
        .map(
          (c) => `
        <div class="p-comment">
          <div class="p-comment-meta">${escapeHTML(c.user_name || c.username || '?')} · ${fmtDT(c.created_at)}</div>
          <div>${escapeHTML(c.body)}</div>
        </div>`,
        )
        .join('');
      $('#iCmtNew').value = '';
    } catch (err) {
      alert(err.message);
    }
  });
  if (isStaff) {
    $('#iDel').addEventListener('click', async () => {
      if (!confirm('Delete this issue?')) return;
      try {
        await api('/api/issues/' + it.id, { method: 'DELETE' });
        closeModal();
        loadIssues();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
