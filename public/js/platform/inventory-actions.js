/* Platform: inventory actions. Loaded in order by platform.html. */

function renderInventoryActionQueue(data) {
  const mount = $('#invActionQueue');
  const meta = $('#invQueueMeta');
  if (!mount) return;
  if (data && data.error) {
    mount.innerHTML = `<div class="empty">${escapeHTML(data.error)}</div>`;
    if (meta) meta.textContent = 'Could not load the replenishment queue.';
    return;
  }
  const rows = unwrap(data).slice(0, 8);
  const summary = summaryOf(data);
  if (meta) {
    meta.textContent = rows.length
      ? `${n0(summary.critical)} critical, ${n0(summary.with_links)} with direct reorder links, ${n0(summary.expiring_soon)} expiring soon.`
      : 'Nothing currently needs a restock or expiry review.';
  }
  if (!rows.length) {
    mount.innerHTML =
      '<div class="empty">Nothing currently needs a restock or expiry review.</div>';
    return;
  }
  mount.innerHTML = `<div class="p-action-grid">${rows
    .map((item) => {
      const stateClass =
        item.action_state === 'expired' || item.action_state === 'out_of_stock' ? 'critical' : '';
      const qtyLine = `${n0(item.qty)} ${escapeHTML(item.unit || 'each')} on hand • min ${n0(item.min_qty)} ${escapeHTML(item.unit || 'each')}`;
      const suggestion =
        n0(item.suggested_reorder_qty) > 0
          ? `Suggested receipt ${n0(item.suggested_reorder_qty)} ${escapeHTML(item.unit || 'each')}`
          : 'Expiry review needed';
      const stateLabel = String(item.action_state || 'review').replace(/_/g, ' ');
      return `<div class="p-action-card ${stateClass}">
      <div class="p-action-top">
        <div>
          <div class="p-action-title">${escapeHTML(item.name)}</div>
          <div class="p-action-meta">${escapeHTML(item.sku || 'No SKU')} • ${escapeHTML(item.lab || 'Lab')} ${item.location ? `• ${escapeHTML(item.location)}` : ''}</div>
        </div>
        <span class="p-tag-sm ${item.action_state === 'expired' || item.action_state === 'out_of_stock' ? 'p-tag-alert' : item.action_state === 'low_stock' ? 'p-tag-warn' : 'p-tag-info'}">${escapeHTML(stateLabel)}</span>
      </div>
      <div class="p-chip-row">
        <span class="p-chip ${item.stock_state === 'out' ? 'alert' : item.stock_state === 'low' ? 'warn' : 'info'}">${escapeHTML(String(item.stock_state || 'review').replace(/_/g, ' '))}</span>
        ${item.supplier_name ? `<span class="p-chip">${escapeHTML(item.supplier_name)}</span>` : ''}
        ${item.expiry_date ? `<span class="p-chip ${item.days_until_expiry < 0 ? 'alert' : item.days_until_expiry <= 30 ? 'warn' : ''}">${item.days_until_expiry < 0 ? 'Expired' : `Exp ${fmtDate(item.expiry_date)}`}</span>` : ''}
      </div>
      <div class="p-action-copy">${escapeHTML(qtyLine)}</div>
      <div class="p-action-copy">${escapeHTML(suggestion)}</div>
      <div class="p-action-foot">
        <button class="btn-ghost-sm" data-queue-receive="${item.id}">Receive</button>
        <button class="btn-ghost-sm" data-queue-focus="${item.id}">Focus item</button>
        <button class="btn-ghost-sm" data-queue-request="${item.id}">Request</button>
        ${item.reorder_url ? `<a class="btn-ghost-sm" href="${escapeHTML(item.reorder_url)}" target="_blank">Order</a>` : ''}
      </div>
    </div>`;
    })
    .join('')}</div>`;
  mount.querySelectorAll('[data-queue-receive]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const item = rows.find((row) => String(row.id) === btn.dataset.queueReceive);
      try {
        await receiveInventoryStock(btn.dataset.queueReceive, item?.name || 'item');
      } catch (err) {
        alert(err.message);
      }
    }),
  );
  mount.querySelectorAll('[data-queue-focus]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const item = rows.find((row) => String(row.id) === btn.dataset.queueFocus);
      INV_QUERY = item?.sku || item?.name || '';
      $('#invSearch').value = INV_QUERY;
      loadInventory();
    }),
  );
  mount.querySelectorAll('[data-queue-request]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const item = rows.find((row) => String(row.id) === btn.dataset.queueRequest);
      openIssueModal({ category: 'supplies', inventory: item });
    }),
  );
}

async function receiveInventoryStock(itemId, itemName) {
  const amountRaw = prompt(`How many units of ${itemName} were received?`, '1');
  if (amountRaw == null) return;
  const delta = parseInt(amountRaw, 10);
  if (!Number.isFinite(delta) || delta <= 0) throw new Error('Enter a positive whole number');
  const reason = prompt('Optional receipt note:', 'received stock') || 'received stock';
  await api(`/api/inventory/${itemId}/adjust`, { method: 'PATCH', body: { delta, reason } });
  loadInventory();
}
