'use strict';

const { str } = require('./validation');

function createTasksService(db) {
  function normalizeTaskStatus(value) {
    const raw = String(value == null ? 'todo' : value)
      .trim()
      .toLowerCase();
    const aliases = {
      doing: 'in_progress',
      'in progress': 'in_progress',
      inprogress: 'in_progress',
      review: 'blocked',
    };
    return aliases[raw] || raw;
  }

  function isValidTaskStatus(value) {
    return ['todo', 'in_progress', 'blocked', 'done'].includes(value);
  }

  function taskStatusOrderExpr(column = 't.status') {
    return `CASE ${column}
      WHEN 'todo' THEN 0
      WHEN 'in_progress' THEN 1
      WHEN 'blocked' THEN 2
      WHEN 'done' THEN 3
      ELSE 4
    END`;
  }

  function resolveTaskAssigneeName(assigneeUserId, fallbackName = '') {
    const idNum = assigneeUserId == null || assigneeUserId === '' ? null : Number(assigneeUserId);
    if (idNum) {
      const user = db.prepare('SELECT name, username FROM users WHERE id=?').get(idNum);
      if (user) return str(user.name || user.username || fallbackName, 120).trim();
    }
    return str(fallbackName, 120).trim();
  }

  function resolveTaskDueLabel(dueDate, dueLabel = '') {
    return str(dueLabel || dueDate || '', 80).trim();
  }

  return {
    normalizeTaskStatus,
    isValidTaskStatus,
    taskStatusOrderExpr,
    resolveTaskAssigneeName,
    resolveTaskDueLabel,
  };
}

module.exports = { createTasksService };
