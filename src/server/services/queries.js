'use strict';

function daysUntilExpr(column) {
  return `CASE
    WHEN ${column} IS NULL OR ${column} = '' THEN NULL
    ELSE CAST(julianday(date(${column})) - julianday(date('now')) AS INTEGER)
  END`;
}

function inventoryStockCase(column = 'i') {
  return `CASE
    WHEN ${column}.qty <= 0 THEN 'out'
    WHEN ${column}.qty <= ${column}.min_qty THEN 'low'
    ELSE 'healthy'
  END`;
}

function equipmentDueCase(column) {
  return `CASE
    WHEN ${column} IS NULL OR ${column} = '' THEN 'none'
    WHEN date(${column}) < date('now') THEN 'overdue'
    WHEN date(${column}) <= date('now','+30 days') THEN 'due_soon'
    ELSE 'scheduled'
  END`;
}

function inventoryOrderBy(sort) {
  switch (String(sort || '').toLowerCase()) {
    case 'name':
      return 'i.name COLLATE NOCASE ASC, i.lab, i.sort_order, i.id';
    case 'qty_asc':
      return 'i.qty ASC, i.min_qty DESC, i.name COLLATE NOCASE ASC';
    case 'qty_desc':
      return 'i.qty DESC, i.name COLLATE NOCASE ASC';
    case 'expiry':
      return `CASE WHEN i.expiry_date IS NULL OR i.expiry_date = '' THEN 1 ELSE 0 END,
        date(i.expiry_date) ASC, i.name COLLATE NOCASE ASC`;
    case 'recent':
      return `CASE WHEN ia.last_adjusted_at IS NULL THEN 1 ELSE 0 END,
        datetime(ia.last_adjusted_at) DESC, i.name COLLATE NOCASE ASC`;
    default:
      return `CASE WHEN i.qty <= 0 THEN 0 WHEN i.qty <= i.min_qty THEN 1 ELSE 2 END,
        CASE WHEN i.expiry_date IS NOT NULL AND i.expiry_date != '' AND date(i.expiry_date) <= date('now','+30 days') THEN 0 ELSE 1 END,
        i.lab, i.sort_order, i.name COLLATE NOCASE ASC`;
  }
}

function equipmentOrderBy(sort) {
  switch (String(sort || '').toLowerCase()) {
    case 'name':
      return 'e.name COLLATE NOCASE ASC, e.sort_order, e.id';
    case 'recent':
      return `CASE WHEN e.last_used_at IS NULL THEN 1 ELSE 0 END,
        datetime(e.last_used_at) DESC, e.name COLLATE NOCASE ASC`;
    default:
      return `CASE e.status
          WHEN 'maintenance' THEN 0
          WHEN 'broken' THEN 1
          WHEN 'in_use' THEN 2
          ELSE 3
        END,
        CASE WHEN e.next_maintenance_at IS NOT NULL AND e.next_maintenance_at != '' AND date(e.next_maintenance_at) <= date('now','+30 days') THEN 0 ELSE 1 END,
        CASE WHEN e.next_calibration_at IS NOT NULL AND e.next_calibration_at != '' AND date(e.next_calibration_at) <= date('now','+30 days') THEN 0 ELSE 1 END,
        e.sort_order, e.name COLLATE NOCASE ASC`;
  }
}

function inventoryActionStateCase(
  qtyColumn = 'i.qty',
  minColumn = 'i.min_qty',
  expiryColumn = 'i.expiry_date',
) {
  return `CASE
    WHEN ${expiryColumn} IS NOT NULL AND ${expiryColumn} != '' AND date(${expiryColumn}) < date('now') THEN 'expired'
    WHEN ${qtyColumn} <= 0 THEN 'out_of_stock'
    WHEN ${qtyColumn} > 0 AND ${qtyColumn} <= ${minColumn} THEN 'low_stock'
    WHEN ${expiryColumn} IS NOT NULL AND ${expiryColumn} != '' AND date(${expiryColumn}) <= date('now','+30 days') THEN 'expiring_soon'
    ELSE 'review'
  END`;
}

function suggestedReorderQtyExpr(qtyColumn = 'i.qty', minColumn = 'i.min_qty') {
  return `CASE
    WHEN ${qtyColumn} <= 0 THEN MAX(COALESCE(${minColumn}, 0) * 2, 1)
    WHEN ${qtyColumn} < ${minColumn} THEN MAX(${minColumn} - ${qtyColumn}, 1)
    ELSE 0
  END`;
}

module.exports = {
  daysUntilExpr,
  inventoryStockCase,
  equipmentDueCase,
  inventoryOrderBy,
  equipmentOrderBy,
  inventoryActionStateCase,
  suggestedReorderQtyExpr,
};
