'use strict';

const { str } = require('./validation');

const USER_ROLES = new Set(['admin', 'professor', 'moderator', 'postdoc', 'student']);

function currentRole(req) {
  return req.session?.role || 'student';
}

function isLabStaffRole(role) {
  return role === 'admin' || role === 'professor';
}

function isSiteModeratorRole(role) {
  return isLabStaffRole(role) || role === 'moderator';
}

function isProfessorRole(role) {
  return role === 'professor';
}

function canAccessAdminSurfaceRole(role) {
  return isSiteModeratorRole(role);
}

function normalizeUserRole(value) {
  const role = str(value, 40).trim().toLowerCase();
  return USER_ROLES.has(role) ? role : null;
}

const SAMPLE_LIFECYCLE_STATUSES = new Set(['active', 'depleted', 'disposed', 'archived']);
const SAMPLE_APPROVAL_STATUSES = new Set(['pending', 'approved', 'denied']);

function isSampleApproverRole(role) {
  return isSiteModeratorRole(role);
}

function normalizeSampleLifecycleStatus(value, fallback = 'active') {
  const status = str(value, 40).trim().toLowerCase();
  return SAMPLE_LIFECYCLE_STATUSES.has(status) ? status : fallback;
}

function normalizeSampleApprovalStatus(value, fallback = null) {
  const status = str(value, 40).trim().toLowerCase();
  if (!status) return fallback;
  return SAMPLE_APPROVAL_STATUSES.has(status) ? status : null;
}

module.exports = {
  currentRole,
  isLabStaffRole,
  isSiteModeratorRole,
  isProfessorRole,
  canAccessAdminSurfaceRole,
  normalizeUserRole,
  isSampleApproverRole,
  normalizeSampleLifecycleStatus,
  normalizeSampleApprovalStatus,
};
