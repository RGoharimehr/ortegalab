/* Platform: inventory. Loaded in order by platform.html. */

/* ---------- Inventory ---------- */
let INV_LAB = '',
  INV_QUERY = '',
  INV_CAT = '',
  INV_SUPPLIER = '',
  INV_STATUS = '',
  INV_SORT = '',
  INV_LOW_STOCK = false,
  INV_EXPIRING = false;

function _expiryBadge(expiry_date) {
  if (!expiry_date) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date);
  const days = Math.round((exp - today) / 86400000);
  if (days < 0)
    return `<span style="font-size:10px;background:var(--status-alert-tint);color:var(--status-alert);padding:2px 5px;border-radius:3px;">Expired</span>`;
  if (days <= 30)
    return `<span style="font-size:10px;background:var(--status-warn-tint);color:var(--status-warn);padding:2px 5px;border-radius:3px;">Exp ${days}d</span>`;
  return `<span style="font-size:10px;color:var(--fg-4);">Exp ${fmtDate(expiry_date)}</span>`;
}

function _hazardBadge(h, sds) {
  if (!h && !sds) return '';
  const icon =
    {
      flammable: '🔥',
      corrosive: '⚗',
      toxic: '☠',
      explosive: '💥',
      oxidizer: '🌀',
      irritant: '⚠',
      environmental: '🌿',
    }[h?.toLowerCase()] || '⚠';
  const badges = [];
  if (h)
    badges.push(
      `<span title="Hazard: ${escapeHTML(h)}" style="font-size:11px;cursor:default;">${icon} ${escapeHTML(h)}</span>`,
    );
  if (sds)
    badges.push(
      `<a href="${escapeHTML(sds)}" target="_blank" style="font-size:11px;color:var(--gold-700);" title="Safety Data Sheet">SDS ↗</a>`,
    );
  return `<span style="display:inline-flex;gap:6px;">${badges.join('')}</span>`;
}

async function loadInventory() {
  try {
    const [res, suppliers, queue] = await Promise.all([
      api(
        '/api/inventory?' +
          buildQS({
            search: INV_QUERY,
            lab: INV_LAB,
            category: INV_CAT,
            supplier_id: INV_SUPPLIER,
            status: INV_STATUS,
            sort: INV_SORT,
            low_stock: INV_LOW_STOCK,
            expiring_soon: INV_EXPIRING,
            limit: 300,
          }),
      ),
      api('/api/suppliers').catch(() => []),
      api(
        '/api/inventory/reorder-queue?' +
          buildQS({
            lab: INV_LAB,
            supplier_id: INV_SUPPLIER,
            limit: 8,
          }),
      ).catch((err) => ({ error: err.message, rows: [], summary: {} })),
    ]);
    const items = unwrap(res);
    const summary = summaryOf(res);
    // populate lab filter
    const labs = [...new Set(items.map((x) => x.lab || '').filter(Boolean))];
    const sel = $('#invLab');
    const curLab = INV_LAB || sel.value;
    sel.innerHTML =
      '<option value="">All labs</option>' +
      labs
        .map(
          (l) => `<option value="${l}" ${l === curLab ? 'selected' : ''}>${escapeHTML(l)}</option>`,
        )
        .join('');
    // populate category filter
    const cats = [...new Set(items.map((x) => x.category || '').filter(Boolean))].sort();
    const catSel = $('#invCatFilter');
    const curCat = INV_CAT || catSel.value;
    catSel.innerHTML =
      '<option value="">All categories</option>' +
      cats
        .map(
          (c) => `<option value="${c}" ${c === curCat ? 'selected' : ''}>${escapeHTML(c)}</option>`,
        )
        .join('');
    const supplierSel = $('#invSupplier');
    const curSupplier = INV_SUPPLIER || supplierSel.value;
    supplierSel.innerHTML =
      '<option value="">All suppliers</option>' +
      suppliers
        .map(
          (s) =>
            `<option value="${s.id}" ${String(s.id) === String(curSupplier) ? 'selected' : ''}>${escapeHTML(s.name)}</option>`,
        )
        .join('');
    $('#invSummary').innerHTML = [
      statCard(n0(summary.total), 'Tracked items'),
      statCard(
        `${n0(summary.low_stock)} low`,
        'Below reorder threshold',
        n0(summary.low_stock) ? 'warn' : '',
      ),
      statCard(
        `${n0(summary.out_of_stock)} out`,
        'Unavailable now',
        n0(summary.out_of_stock) ? 'alert' : '',
      ),
      statCard(
        `${n0(summary.expired) + n0(summary.expiring_soon)} at risk`,
        'Expiry and safety watch',
        n0(summary.expired) + n0(summary.expiring_soon) ? 'alert' : '',
      ),
    ].join('');
    renderInventoryActionQueue(queue);
    const isStaff = isLabStaffRole(ME.role);
    if (!items.length) {
      $('#invList').innerHTML = '<div class="empty">No inventory items match.</div>';
      return;
    }
    $('#invList').innerHTML = `
      <div class="p-inv-table">
        <div class="p-inv-row p-inv-head">
          <div style="flex:2.5;">Item</div>
          <div style="flex:1;">SKU · Lab</div>
          <div style="flex:1.5;">Qty</div>
          <div style="width:130px;"></div>
        </div>
        ${items
          .map((x) => {
            const pct = x.min_qty > 0 ? Math.min(100, Math.round((x.qty / x.min_qty) * 100)) : 100;
            const fillColor =
              x.qty <= 0
                ? 'var(--status-alert)'
                : x.qty < x.min_qty
                  ? 'var(--status-warn)'
                  : 'var(--status-ok)';
            return `<div class="p-inv-row">
            <div style="flex:2.5;">
              <div class="p-inv-name">${escapeHTML(x.name)} <span class="p-tag-sm ${x.stock_state === 'out' ? 'p-tag-alert' : x.stock_state === 'low' ? 'p-tag-warn' : 'p-tag-ok'}">${escapeHTML(String(x.stock_state || 'ok').replace('_', ' '))}</span></div>
              <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(x.category || '')}${x.supplier_name ? ` · ${escapeHTML(x.supplier_name)}` : ''}${x.supplier_email ? ` · ${escapeHTML(x.supplier_email)}` : ''}</div>
              <div style="margin-top:2px;display:flex;gap:6px;align-items:center;">
                ${_hazardBadge(x.hazard_class, x.sds_url)}
                ${_expiryBadge(x.expiry_date)}
              </div>
            </div>
            <div style="flex:1;">
              <div><span class="p-mono" style="font-size:12px;">${escapeHTML(x.sku || '—')}</span></div>
              <div style="font-size:11px;color:var(--fg-4);">${escapeHTML(x.lab || '—')}${x.location ? ' · ' + escapeHTML(x.location) : ''}${x.last_adjusted_at ? ` · adjusted ${fmtDT(x.last_adjusted_at)}` : ''}</div>
            </div>
            <div style="flex:1.5;">
              <div class="p-qty-control">
                <button class="btn-ghost-sm" data-inv-adj="${x.id}" data-adj-delta="-1" title="Decrease by 1">-</button>
                <span class="p-qty-num">${x.qty}</span>
                <span class="p-qty-min" style="font-size:11px;"> ${escapeHTML(x.unit || 'each')}</span>
                <button class="btn-ghost-sm" data-inv-adj="${x.id}" data-adj-delta="1" title="Increase by 1">+</button>
              </div>
              <div style="font-size:11px;color:var(--fg-4);">min ${x.min_qty} ${escapeHTML(x.unit || 'each')}</div>
              <div class="p-qty-bar"><div class="p-qty-fill" style="width:${pct}%;background:${fillColor};"></div></div>
            </div>
            <div style="width:130px;display:flex;gap:4px;flex-wrap:wrap;">
              <button class="btn-ghost-sm" data-inv-log="${x.id}">Log</button>
              <button class="btn-ghost-sm" data-inv-receive="${x.id}">Receive</button>
              <button class="btn-ghost-sm" data-inv-request="${x.id}">Request</button>
              ${isStaff ? `<button class="btn-ghost-sm" data-inv-edit="${x.id}">Edit</button>` : ''}
              ${x.reorder_url ? `<a class="btn-ghost-sm" href="${escapeHTML(x.reorder_url)}" target="_blank">Order</a>` : ''}
            </div>
          </div>`;
          })
          .join('')}
      </div>`;
    // Wire ± adjust buttons
    $('#invList')
      .querySelectorAll('[data-inv-adj]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          const delta = parseInt(b.dataset.adjDelta, 10);
          const reason =
            delta < 0
              ? prompt('Reason for decrease (optional):') || 'manual adjust'
              : 'manual adjust';
          try {
            const res = await api(`/api/inventory/${b.dataset.invAdj}/adjust`, {
              method: 'PATCH',
              body: { delta, reason },
            });
            // Update qty in place
            const numEl = b.closest('.p-inv-row').querySelector('.p-qty-num');
            if (numEl) numEl.textContent = res.qty;
            loadInventory(); // refresh to update bar colours and min display
          } catch (err) {
            alert(err.message);
          }
        }),
      );
    $('#invList')
      .querySelectorAll('[data-inv-request]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          const item = items.find((x) => String(x.id) === b.dataset.invRequest);
          openIssueModal({ category: 'supplies', inventory: item });
        }),
      );
    // Wire log buttons
    $('#invList')
      .querySelectorAll('[data-inv-log]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          const it = items.find((x) => x.id == b.dataset.invLog);
          if (!it) return;
          try {
            const log = await api(`/api/inventory/${it.id}/log`);
            modal(
              `<h2>${escapeHTML(it.name)} — adjustment log</h2>
          <p style="font-size:12px;color:var(--fg-3);">SKU ${escapeHTML(it.sku || '—')} · Current qty: ${it.qty} ${escapeHTML(it.unit || 'each')}</p>
          ${
            log.length
              ? log
                  .map(
                    (l) => `<div class="p-log-row">
            <span class="p-log-when">${fmtDT(l.created_at)}</span>
            <span class="p-log-act" style="color:${l.delta >= 0 ? 'var(--status-ok)' : 'var(--status-alert)'}">${l.delta >= 0 ? '+' : ''}${l.delta}</span>
            <span class="p-log-who">${escapeHTML(l.user_name || l.username || '?')}</span>
            <span class="p-log-note">${escapeHTML(l.reason || '')} → ${l.qty_after}</span>
          </div>`,
                  )
                  .join('')
              : '<div class="empty">No adjustment history.</div>'
          }`,
              null,
              '',
              'Close',
            );
          } catch (err) {
            alert(err.message);
          }
        }),
      );
    $('#invList')
      .querySelectorAll('[data-inv-receive]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          const it = items.find((x) => x.id == b.dataset.invReceive);
          if (!it) return;
          try {
            await receiveInventoryStock(it.id, it.name);
          } catch (err) {
            alert(err.message);
          }
        }),
      );
    // Wire edit buttons
    $('#invList')
      .querySelectorAll('[data-inv-edit]')
      .forEach((b) =>
        b.addEventListener('click', async () => {
          const it = items.find((x) => x.id == b.dataset.invEdit);
          if (it) openInvModal(it);
        }),
      );
  } catch (e) {
    $('#invList').innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`;
  }
}

$('#invSearch').addEventListener('input', (e) => {
  INV_QUERY = e.target.value;
  loadInventory();
});
$('#invLab').addEventListener('change', (e) => {
  INV_LAB = e.target.value;
  loadInventory();
});
$('#invCatFilter').addEventListener('change', (e) => {
  INV_CAT = e.target.value;
  loadInventory();
});
$('#invSupplier').addEventListener('change', (e) => {
  INV_SUPPLIER = e.target.value;
  loadInventory();
});
$('#invStatus').addEventListener('change', (e) => {
  INV_STATUS = e.target.value;
  loadInventory();
});
$('#invSort').addEventListener('change', (e) => {
  INV_SORT = e.target.value;
  loadInventory();
});
$('#invLowStock').addEventListener('change', (e) => {
  INV_LOW_STOCK = e.target.checked;
  loadInventory();
});
$('#invExpiring').addEventListener('change', (e) => {
  INV_EXPIRING = e.target.checked;
  loadInventory();
});
$('#addInvBtn').addEventListener('click', () => openInvModal());
$('#invExportBtn').addEventListener('click', async () => {
  try {
    await downloadFile('/api/inventory/export.csv', 'latfs-inventory.csv');
  } catch (err) {
    alert(err.message);
  }
});

async function openInvModal(it) {
  const isEdit = !!it;
  let suppliers = [];
  try {
    suppliers = await api('/api/suppliers');
  } catch (_) {
    /* Optional supporting data remains unavailable. */
  }
  modal(
    `<h2>${isEdit ? 'Edit inventory item' : 'Add inventory item'}</h2>
    <label>Name<input id="ivName" value="${escapeHTML(it?.name || '')}"></label>
    <label>SKU / part # (required, unique)<input id="ivSku" value="${escapeHTML(it?.sku || '')}" placeholder="SN-LAT-00000"></label>
    <label>Category<input id="ivCat" value="${escapeHTML(it?.category || '')}" placeholder="Chemicals / Consumables / Hardware…"></label>
    <label>Lab<select id="ivLab">
      <option value="A" ${it?.lab === 'A' || !it ? 'selected' : ''}>Lab A</option>
      <option value="B" ${it?.lab === 'B' ? 'selected' : ''}>Lab B</option>
    </select></label>
    <label>Location (shelf / cabinet)<input id="ivLoc" value="${escapeHTML(it?.location || '')}" placeholder="e.g. Shelf B3, Fridge 2"></label>
    <label>Qty on hand<input id="ivQty" type="number" value="${it?.qty ?? 0}" min="0"></label>
    <label>Min qty (reorder threshold)<input id="ivMin" type="number" value="${it?.min_qty ?? 1}" min="0"></label>
    <label>Unit<input id="ivUnit" value="${escapeHTML(it?.unit || 'each')}" placeholder="each / mL / g / box…"></label>
    <label>Supplier<select id="ivSupplier">
      <option value="">— none —</option>
      ${suppliers.map((s) => `<option value="${s.id}" ${it?.supplier_id == s.id ? 'selected' : ''}>${escapeHTML(s.name)}</option>`).join('')}
    </select></label>
    <label>Reorder URL<input id="ivReorder" type="url" value="${escapeHTML(it?.reorder_url || '')}" placeholder="https://…"></label>
    <label>Expiry date<input id="ivExpiry" type="date" value="${it?.expiry_date || ''}"></label>
    <label>Chemical CAS # (optional)<input id="ivCas" value="${escapeHTML(it?.chemical_cas || '')}" placeholder="e.g. 7732-18-5"></label>
    <label>Hazard class<input id="ivHazard" value="${escapeHTML(it?.hazard_class || '')}" placeholder="flammable / corrosive / toxic…"></label>
    <label>SDS URL<input id="ivSds" type="url" value="${escapeHTML(it?.sds_url || '')}" placeholder="https://…"></label>
    <label>Notes<textarea id="ivNotes">${escapeHTML(it?.notes || '')}</textarea></label>`,
    async () => {
      const body = {
        name: $('#ivName').value.trim(),
        sku: $('#ivSku').value.trim(),
        category: $('#ivCat').value,
        lab: $('#ivLab').value,
        location: $('#ivLoc').value,
        qty: Number($('#ivQty').value) || 0,
        min_qty: Number($('#ivMin').value) || 0,
        unit: $('#ivUnit').value || 'each',
        supplier_id: $('#ivSupplier').value || null,
        reorder_url: $('#ivReorder').value,
        expiry_date: $('#ivExpiry').value || null,
        chemical_cas: $('#ivCas').value,
        hazard_class: $('#ivHazard').value,
        sds_url: $('#ivSds').value,
        notes: $('#ivNotes').value,
        sort_order: it?.sort_order || 0,
      };
      if (!body.name) throw new Error('Name required');
      if (!body.sku) throw new Error('SKU required');
      if (isEdit) await api('/api/inventory/' + it.id, { method: 'PUT', body });
      else await api('/api/inventory', { method: 'POST', body });
      loadInventory();
    },
    isEdit ? `<button type="button" class="p-bigbtn danger" id="delInv">Delete</button>` : '',
  );
  if (isEdit) {
    $('#delInv').addEventListener('click', async () => {
      if (!confirm('Delete this item?')) return;
      try {
        await api('/api/inventory/' + it.id, { method: 'DELETE' });
        closeModal();
        loadInventory();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
