'use strict';

const { Router } = require('express');

function createInventoryRouter({
  db,
  sendMail,
  sendInternalError,
  str,
  clampInt,
  searchTerm,
  likePattern,
  queryFlag,
  daysUntilExpr,
  inventoryStockCase,
  inventoryOrderBy,
  inventoryActionStateCase,
  suggestedReorderQtyExpr,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // INVENTORY
  // CSV export — must be before parameterised routes to avoid conflict
  router.get('/api/inventory/export.csv', apiReadLimiter, requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `
      SELECT i.id, i.lab, i.sku, i.name, i.category, i.qty, i.min_qty, i.unit,
             i.location, i.expiry_date, i.chemical_cas, i.hazard_class, i.sds_url,
             i.reorder_url, i.notes, s.name AS supplier_name, s.email AS supplier_email,
             s.phone AS supplier_phone, i.created_at
      FROM inventory i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ORDER BY i.lab, i.sort_order, i.id
    `,
      )
      .all();
    const header = [
      'id',
      'lab',
      'sku',
      'name',
      'category',
      'qty',
      'min_qty',
      'unit',
      'location',
      'expiry_date',
      'chemical_cas',
      'hazard_class',
      'sds_url',
      'reorder_url',
      'notes',
      'supplier',
      'supplier_email',
      'supplier_phone',
      'created_at',
    ];
    const csvEscape = (v) => {
      const s = String(v == null ? '' : v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.lab,
          r.sku,
          r.name,
          r.category,
          r.qty,
          r.min_qty,
          r.unit || 'each',
          r.location,
          r.expiry_date,
          r.chemical_cas,
          r.hazard_class,
          r.sds_url,
          r.reorder_url,
          r.notes,
          r.supplier_name,
          r.supplier_email,
          r.supplier_phone,
          r.created_at,
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    const csv = lines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  });

  router.get('/api/inventory/reorder-queue', apiReadLimiter, requireAuth, (req, res) => {
    const limit = clampInt(req.query.limit, 24, { min: 1, max: 200 });
    const lab = str(req.query.lab, 32).trim();
    const supplierId = req.query.supplier_id
      ? clampInt(req.query.supplier_id, null, { min: 1, max: 1000000 })
      : null;
    const conditions = [
      `(i.qty <= i.min_qty OR (i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) <= date('now','+30 days')))`,
    ];
    const params = [];
    if (lab) {
      conditions.push('i.lab=?');
      params.push(lab);
    }
    if (supplierId) {
      conditions.push('i.supplier_id=?');
      params.push(supplierId);
    }
    const rows = db
      .prepare(
        `
      SELECT
        i.id, i.lab, i.sku, i.name, i.category, i.location, i.qty, i.min_qty, i.unit,
        i.expiry_date, i.reorder_url, i.notes,
        s.id AS supplier_id, s.name AS supplier_name, s.email AS supplier_email, s.phone AS supplier_phone,
        ${inventoryStockCase('i')} AS stock_state,
        ${daysUntilExpr('i.expiry_date')} AS days_until_expiry,
        ${inventoryActionStateCase('i.qty', 'i.min_qty', 'i.expiry_date')} AS action_state,
        ${suggestedReorderQtyExpr('i.qty', 'i.min_qty')} AS suggested_reorder_qty
      FROM inventory i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY CASE
          WHEN i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) < date('now') THEN 0
          WHEN i.qty <= 0 THEN 1
          WHEN i.qty > 0 AND i.qty <= i.min_qty THEN 2
          WHEN i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) <= date('now','+30 days') THEN 3
          ELSE 4
        END,
        CASE WHEN i.expiry_date IS NULL OR i.expiry_date = '' THEN 1 ELSE 0 END,
        date(i.expiry_date) ASC,
        COALESCE(s.name, '') COLLATE NOCASE ASC,
        i.name COLLATE NOCASE ASC
      LIMIT ?
    `,
      )
      .all(...params, limit);
    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.action_state === 'expired' || row.action_state === 'out_of_stock')
          acc.critical += 1;
        if (row.reorder_url) acc.with_links += 1;
        if (row.supplier_id) acc.with_supplier += 1;
        if (row.action_state === 'low_stock') acc.low_stock += 1;
        if (row.action_state === 'out_of_stock') acc.out_of_stock += 1;
        if (row.action_state === 'expired') acc.expired += 1;
        if (row.action_state === 'expiring_soon') acc.expiring_soon += 1;
        return acc;
      },
      {
        total: 0,
        critical: 0,
        with_links: 0,
        with_supplier: 0,
        low_stock: 0,
        out_of_stock: 0,
        expired: 0,
        expiring_soon: 0,
      },
    );
    res.json({ summary, rows });
  });

  router.get('/api/inventory', apiReadLimiter, requireAuth, (req, res) => {
    const {
      page,
      limit,
      search,
      category,
      lab,
      low_stock,
      expiring_soon,
      supplier_id,
      status,
      sort,
    } = req.query;
    const pageNum = clampInt(page, 1, { min: 1, max: 100000 });
    const pageSize = clampInt(limit, 200, { min: 1, max: 500 });
    const conditions = [],
      params = [];
    if (lab) {
      conditions.push('i.lab=?');
      params.push(lab);
    }
    if (category) {
      conditions.push('i.category=?');
      params.push(category);
    }
    if (supplier_id) {
      conditions.push('i.supplier_id=?');
      params.push(supplier_id);
    }
    if (queryFlag(low_stock)) conditions.push('i.qty <= i.min_qty');
    if (queryFlag(expiring_soon))
      conditions.push(
        "i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) <= date('now','+30 days')",
      );
    if (status === 'out') conditions.push('i.qty <= 0');
    else if (status === 'low') conditions.push('i.qty > 0 AND i.qty <= i.min_qty');
    else if (status === 'healthy') conditions.push('i.qty > i.min_qty');
    else if (status === 'expired')
      conditions.push(
        "i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) < date('now')",
      );
    else if (status === 'expiring')
      conditions.push(
        "i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) BETWEEN date('now') AND date('now','+30 days')",
      );
    const q = searchTerm(search);
    if (q) {
      const like = likePattern(q);
      conditions.push(`(
        i.name LIKE ? ESCAPE '\\' OR i.sku LIKE ? ESCAPE '\\' OR COALESCE(i.location,'') LIKE ? ESCAPE '\\' OR
        COALESCE(i.category,'') LIKE ? ESCAPE '\\' OR COALESCE(i.chemical_cas,'') LIKE ? ESCAPE '\\' OR
        COALESCE(i.hazard_class,'') LIKE ? ESCAPE '\\' OR COALESCE(s.name,'') LIKE ? ESCAPE '\\'
      )`);
      params.push(like, like, like, like, like, like, like);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `FROM inventory i
      LEFT JOIN suppliers s ON s.id=i.supplier_id
      LEFT JOIN (
        SELECT inventory_id, MAX(created_at) AS last_adjusted_at
        FROM inventory_adjustments
        GROUP BY inventory_id
      ) ia ON ia.inventory_id=i.id
      ${where}`;
    const total = db.prepare(`SELECT COUNT(*) as n ${baseSql}`).get(...params).n;
    const summary = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN i.qty <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
        COALESCE(SUM(CASE WHEN i.qty > 0 AND i.qty <= i.min_qty THEN 1 ELSE 0 END), 0) AS low_stock,
        COALESCE(SUM(CASE WHEN i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) < date('now') THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS expiring_soon,
        COALESCE(SUM(CASE WHEN COALESCE(i.hazard_class,'') != '' THEN 1 ELSE 0 END), 0) AS hazardous,
        COUNT(DISTINCT NULLIF(i.lab, '')) AS labs,
        COUNT(DISTINCT NULLIF(i.category, '')) AS categories
      ${baseSql}
    `,
      )
      .get(...params);
    const rows = db
      .prepare(
        `
      SELECT i.*, s.name AS supplier_name, s.website_url AS supplier_url, s.email AS supplier_email,
        ia.last_adjusted_at,
        ${inventoryStockCase('i')} AS stock_state,
        ${daysUntilExpr('i.expiry_date')} AS days_until_expiry
      ${baseSql}
      ORDER BY ${inventoryOrderBy(sort)} LIMIT ? OFFSET ?
    `,
      )
      .all(...params, pageSize, (pageNum - 1) * pageSize);
    res.json({ total, page: pageNum, limit: pageSize, summary, rows });
  });

  router.post('/api/inventory', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      lab,
      sku,
      name,
      category,
      qty,
      min_qty,
      unit,
      supplier_id,
      reorder_url,
      notes,
      sort_order,
      expiry_date,
      location,
      chemical_cas,
      hazard_class,
      sds_url,
    } = req.body;
    if (!sku || !name) return res.status(400).json({ error: 'Missing fields' });
    const safeQty = Math.max(0, clampInt(qty, 0, { min: 0, max: Number.MAX_SAFE_INTEGER }));
    const safeMinQty = clampInt(min_qty, 0, { min: 0, max: Number.MAX_SAFE_INTEGER });
    try {
      const result = db
        .prepare(
          `INSERT INTO inventory
        (lab, sku, name, category, qty, min_qty, unit, supplier_id, reorder_url, notes, sort_order,
         expiry_date, location, chemical_cas, hazard_class, sds_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          lab || 'A',
          sku,
          name,
          category || '',
          safeQty,
          safeMinQty,
          unit || 'each',
          supplier_id || null,
          reorder_url || '',
          notes || '',
          sort_order || 0,
          expiry_date || null,
          location || '',
          chemical_cas || '',
          hazard_class || '',
          sds_url || '',
        );
      if (safeQty > 0) {
        db.prepare(
          'INSERT INTO inventory_adjustments (inventory_id, user_id, delta, qty_before, qty_after, reason) VALUES (?,?,?,?,?,?)',
        ).run(
          result.lastInsertRowid,
          req.session.userId || null,
          safeQty,
          0,
          safeQty,
          'initial stock',
        );
      }
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      if (e.message.includes('UNIQUE'))
        return res.status(409).json({ error: 'SKU already exists' });
      sendInternalError(res, e, 'inventory create');
    }
  });

  router.put('/api/inventory/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      lab,
      sku,
      name,
      category,
      qty,
      min_qty,
      unit,
      supplier_id,
      reorder_url,
      notes,
      sort_order,
      adjustment_reason,
      expiry_date,
      location,
      chemical_cas,
      hazard_class,
      sds_url,
    } = req.body;
    const existing = db.prepare('SELECT qty, min_qty FROM inventory WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    if (!sku || !name) return res.status(400).json({ error: 'sku and name are required' });
    const newQty = Math.max(
      0,
      clampInt(qty, existing.qty, { min: 0, max: Number.MAX_SAFE_INTEGER }),
    );
    const nextMinQty = clampInt(min_qty, existing.min_qty, {
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    });
    try {
      db.prepare(
        `UPDATE inventory SET lab=?, sku=?, name=?, category=?, qty=?, min_qty=?, unit=?,
        supplier_id=?, reorder_url=?, notes=?, sort_order=?,
        expiry_date=?, location=?, chemical_cas=?, hazard_class=?, sds_url=? WHERE id=?`,
      ).run(
        lab || 'A',
        sku,
        name,
        category || '',
        newQty,
        nextMinQty,
        unit || 'each',
        supplier_id || null,
        reorder_url || '',
        notes || '',
        sort_order || 0,
        expiry_date || null,
        location || '',
        chemical_cas || '',
        hazard_class || '',
        sds_url || '',
        req.params.id,
      );
    } catch (e) {
      if (e.message.includes('UNIQUE'))
        return res.status(409).json({ error: 'SKU already exists' });
      return sendInternalError(res, e, 'inventory update');
    }

    // Log qty change if qty changed
    const delta = newQty - existing.qty;
    if (delta !== 0) {
      db.prepare(
        'INSERT INTO inventory_adjustments (inventory_id, user_id, delta, qty_before, qty_after, reason) VALUES (?,?,?,?,?,?)',
      ).run(
        req.params.id,
        req.session.userId || null,
        delta,
        existing.qty,
        newQty,
        adjustment_reason || '',
      );
      // Low-stock email alert
      if (newQty <= nextMinQty && newQty < existing.qty) {
        const item = db.prepare('SELECT name, sku FROM inventory WHERE id=?').get(req.params.id);
        const staff = db
          .prepare(
            "SELECT email FROM users WHERE role IN ('admin','professor') AND email != '' AND active!=0",
          )
          .all();
        const emails = staff.map((u) => u.email).filter(Boolean);
        if (emails.length && item) {
          sendMail(
            emails,
            `[LATFS] Low stock alert: ${item.name}`,
            `Inventory item "${item.name}" (SKU: ${item.sku}) is at or below its minimum quantity.\n\nCurrent qty: ${newQty} (min: ${nextMinQty})\n\nLog in to the LATFS Platform to reorder.\n`,
          );
        }
      }
    }
    res.json({ success: true });
  });

  router.delete('/api/inventory/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const item = db.prepare('SELECT id FROM inventory WHERE id=?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    db.prepare('DELETE FROM inventory WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // Inventory adjustment log
  router.get('/api/inventory/:id/log', apiReadLimiter, requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `
      SELECT a.*, u.username, u.name AS user_name
      FROM inventory_adjustments a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.inventory_id=? ORDER BY a.id DESC LIMIT 200
    `,
      )
      .all(req.params.id);
    res.json(rows);
  });

  // Quick quantity adjust — PATCH /api/inventory/:id/adjust { delta, reason }
  router.patch(
    '/api/inventory/:id/adjust',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const delta = parseInt(req.body.delta, 10);
      if (isNaN(delta) || delta === 0) return res.status(400).json({ error: 'delta required' });
      const item = db
        .prepare('SELECT id, qty, min_qty, name, sku FROM inventory WHERE id=?')
        .get(req.params.id);
      if (!item) return res.status(404).json({ error: 'not found' });
      const newQty = Math.max(0, item.qty + delta);
      db.prepare('UPDATE inventory SET qty=? WHERE id=?').run(newQty, item.id);
      db.prepare(
        'INSERT INTO inventory_adjustments (inventory_id, user_id, delta, qty_before, qty_after, reason) VALUES (?,?,?,?,?,?)',
      ).run(
        item.id,
        req.session.userId || null,
        newQty - item.qty,
        item.qty,
        newQty,
        req.body.reason || '',
      );
      if (newQty <= item.min_qty && newQty < item.qty) {
        const staff = db
          .prepare(
            "SELECT email FROM users WHERE role IN ('admin','professor') AND email != '' AND active!=0",
          )
          .all();
        const emails = staff.map((u) => u.email).filter(Boolean);
        if (emails.length) {
          sendMail(
            emails,
            `[LATFS] Low stock alert: ${item.name}`,
            `Inventory item "${item.name}" (SKU: ${item.sku}) dropped to ${newQty} (min: ${item.min_qty}).\n`,
          );
        }
      }
      res.json({ success: true, qty: newQty });
    },
  );

  // Batch quantity adjust — POST /api/inventory/batch-adjust
  // Body: { adjustments: [{ id, delta, reason }] }
  router.post(
    '/api/inventory/batch-adjust',
    apiWriteLimiter,
    requireStaff,
    requireCsrf,
    (req, res) => {
      const { adjustments } = req.body;
      if (!Array.isArray(adjustments) || adjustments.length === 0) {
        return res.status(400).json({ error: 'adjustments array required' });
      }
      const results = [];
      const pendingAlerts = [];
      const staffEmails = db
        .prepare(
          "SELECT email FROM users WHERE role IN ('admin','professor') AND email != '' AND active!=0",
        )
        .all()
        .map((u) => u.email)
        .filter(Boolean);
      const batchTx = db.transaction(() => {
        for (const adj of adjustments) {
          const id = parseInt(adj.id, 10);
          const delta = parseInt(adj.delta, 10);
          if (!id || isNaN(delta) || delta === 0) continue;
          const item = db
            .prepare('SELECT id, qty, min_qty, name, sku FROM inventory WHERE id=?')
            .get(id);
          if (!item) {
            results.push({ id, error: 'not found' });
            continue;
          }
          const newQty = Math.max(0, item.qty + delta);
          db.prepare('UPDATE inventory SET qty=? WHERE id=?').run(newQty, id);
          db.prepare(
            'INSERT INTO inventory_adjustments (inventory_id, user_id, delta, qty_before, qty_after, reason) VALUES (?,?,?,?,?,?)',
          ).run(
            id,
            req.session.userId || null,
            newQty - item.qty,
            item.qty,
            newQty,
            adj.reason || 'batch adjust',
          );
          // Low-stock email alert
          if (staffEmails.length && newQty <= item.min_qty && newQty < item.qty) {
            pendingAlerts.push({
              subject: `[LATFS] Low stock alert: ${item.name}`,
              text: `Inventory item "${item.name}" (SKU: ${item.sku}) is at or below its minimum quantity.\n\nCurrent qty: ${newQty} (min: ${item.min_qty})\n`,
            });
          }
          results.push({ id, qty_before: item.qty, qty_after: newQty, delta: newQty - item.qty });
        }
      });
      try {
        batchTx();
        for (const alert of pendingAlerts) sendMail(staffEmails, alert.subject, alert.text);
        res.json({ success: true, results });
      } catch (e) {
        sendInternalError(res, e, 'inventory batch adjust');
      }
    },
  );

  // ── Suppliers ────────────────────────────────────────────────────────────────
  router.get('/api/suppliers', apiReadLimiter, requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
  });
  router.post('/api/suppliers', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, contact, email, phone, website_url, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const r = db
      .prepare(
        'INSERT INTO suppliers (name, contact, email, phone, website_url, notes) VALUES (?,?,?,?,?,?)',
      )
      .run(name, contact || '', email || '', phone || '', website_url || '', notes || '');
    res.json({ id: r.lastInsertRowid });
  });
  router.put('/api/suppliers/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, contact, email, phone, website_url, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = db
      .prepare(
        'UPDATE suppliers SET name=?, contact=?, email=?, phone=?, website_url=?, notes=? WHERE id=?',
      )
      .run(
        name,
        contact || '',
        email || '',
        phone || '',
        website_url || '',
        notes || '',
        req.params.id,
      );
    if (!result.changes) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  });
  router.delete('/api/suppliers/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM suppliers WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createInventoryRouter };
