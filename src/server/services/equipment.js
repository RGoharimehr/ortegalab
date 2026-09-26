'use strict';

const { queryFlag } = require('./validation');
const { isLabStaffRole } = require('./roles');

function createEquipmentService(db) {
  function syncEquipmentMaintenanceState(equipmentId) {
    const maintenance = db
      .prepare(
        `
      SELECT completed_at, next_due_at
      FROM equipment_maintenance
      WHERE equipment_id=? AND maint_type IN ('maintenance','repair') AND completed_at IS NOT NULL
      ORDER BY datetime(completed_at) DESC, id DESC
      LIMIT 1
    `,
      )
      .get(equipmentId);
    const calibration = db
      .prepare(
        `
      SELECT completed_at, next_due_at
      FROM equipment_maintenance
      WHERE equipment_id=? AND maint_type='calibration' AND completed_at IS NOT NULL
      ORDER BY datetime(completed_at) DESC, id DESC
      LIMIT 1
    `,
      )
      .get(equipmentId);
    db.prepare(
      `
      UPDATE equipment
      SET last_maintained_at=?, next_maintenance_at=?, last_calibrated_at=?, next_calibration_at=?
      WHERE id=?
    `,
    ).run(
      maintenance?.completed_at || null,
      maintenance?.next_due_at || null,
      calibration?.completed_at || null,
      calibration?.next_due_at || null,
      equipmentId,
    );
  }

  function validateReservationWindow(startAt, endAt) {
    if (!startAt || !endAt) return 'start_at and end_at required';
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return 'invalid reservation date';
    if (end <= start) return 'end_at must be after start_at';
    return '';
  }

  function findReservationConflict(equipmentId, startAt, endAt, excludeId = null) {
    const params = [equipmentId, endAt, startAt];
    let sql = `SELECT id, user_id, status
      FROM equipment_reservations
      WHERE equipment_id=?
        AND status IN ('pending','approved')
        AND start_at < ?
        AND end_at > ?`;
    if (excludeId != null) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    return db.prepare(sql).get(...params);
  }

  function getEquipmentTrainingStatus(userId, equipmentId) {
    const active = db
      .prepare(
        `
      SELECT training_name, expires_at
      FROM training_records
      WHERE user_id=? AND equipment_id=? AND completed_at IS NOT NULL
        AND (expires_at IS NULL OR expires_at='' OR date(expires_at) >= date('now'))
      ORDER BY
        CASE WHEN expires_at IS NULL OR expires_at='' THEN 1 ELSE 0 END DESC,
        CASE WHEN expires_at IS NULL OR expires_at='' THEN date('2999-12-31') ELSE date(expires_at) END ASC,
        date(completed_at) DESC
      LIMIT 1
    `,
      )
      .get(userId, equipmentId);
    if (active) {
      return {
        status: 'active',
        training_name: active.training_name || '',
        expires_at: active.expires_at || null,
      };
    }
    const latest = db
      .prepare(
        `
      SELECT training_name, expires_at
      FROM training_records
      WHERE user_id=? AND equipment_id=? AND completed_at IS NOT NULL
      ORDER BY
        CASE WHEN expires_at IS NULL OR expires_at='' THEN 1 ELSE 0 END DESC,
        CASE WHEN expires_at IS NULL OR expires_at='' THEN date('2999-12-31') ELSE date(expires_at) END DESC,
        date(completed_at) DESC
      LIMIT 1
    `,
      )
      .get(userId, equipmentId);
    if (latest) {
      return {
        status: 'expired',
        training_name: latest.training_name || '',
        expires_at: latest.expires_at || null,
      };
    }
    return { status: 'missing', training_name: '', expires_at: null };
  }

  function equipmentAccessError(equipment, userId, role) {
    if (!equipment || !queryFlag(equipment.requires_training)) return null;
    if (isLabStaffRole(role)) return null;
    const trainingStatus = getEquipmentTrainingStatus(userId, equipment.id);
    if (trainingStatus.status === 'active') return null;
    const label =
      equipment.training_requirement || trainingStatus.training_name || 'Active training';
    if (trainingStatus.status === 'expired') {
      return trainingStatus.expires_at
        ? `${label} expired on ${trainingStatus.expires_at}; renew training before using this equipment`
        : `${label} is no longer active; renew training before using this equipment`;
    }
    return `${label} is required before this equipment can be reserved or checked out`;
  }

  return {
    syncEquipmentMaintenanceState,
    validateReservationWindow,
    findReservationConflict,
    getEquipmentTrainingStatus,
    equipmentAccessError,
  };
}

module.exports = { createEquipmentService };
