'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

function createBackupCodesService(db) {
  /**
   * Generate N one-time backup codes, store hashed versions in the DB,
   * and return the plaintext codes (shown to the user exactly once).
   * Format: XXXXX-XXXXX (10 uppercase hex chars split with a dash)
   */
  function generateAndStoreBackupCodes(userId) {
    db.prepare('DELETE FROM totp_backup_codes WHERE user_id=?').run(userId);
    const plaintext = [];
    const insert = db.prepare('INSERT INTO totp_backup_codes (user_id, code_hash) VALUES (?,?)');
    const insertAll = db.transaction(() => {
      for (let i = 0; i < 10; i++) {
        const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
        const code = raw.slice(0, 5) + '-' + raw.slice(5); // XXXXX-XXXXX
        insert.run(userId, bcrypt.hashSync(raw, 10)); // store without dash
        plaintext.push(code);
      }
    });
    insertAll();
    return plaintext;
  }

  return { generateAndStoreBackupCodes };
}

module.exports = { createBackupCodesService };
