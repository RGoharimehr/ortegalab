'use strict';

const { Router } = require('express');

function createScheduleRouter({
  db,
  sendInternalError,
  str,
  currentRole,
  isLabStaffRole,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // EVENTS — schedule entries (meetings, seminars, reservations) used by /platform Schedule
  router.get('/api/events', apiReadLimiter, requireAuth, (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM events ORDER BY COALESCE(start_time, ''), id").all());
    } catch (e) {
      sendInternalError(res, e, 'events list');
    }
  });
  router.post('/api/events', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    try {
      const { title, event_type, start_time, end_time, location, visibility, attendees } = req.body;
      if (!title || !start_time)
        return res.status(400).json({ error: 'Title and start time are required' });
      // day/start_hour/duration_hours are legacy NOT NULL columns retained for schema compatibility; new records use start_time/end_time
      const result = db
        .prepare(
          'INSERT INTO events (title, event_type, start_time, end_time, location, visibility, attendees, owner_user_id, day, start_hour, duration_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          title,
          event_type || 'meeting',
          start_time,
          end_time || '',
          location || '',
          visibility || 'public',
          attendees || '',
          req.session.userId || null,
          0,
          0,
          0,
        );
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      sendInternalError(res, e, 'events create');
    }
  });
  router.put('/api/events/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    try {
      const ev = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
      if (!ev) return res.status(404).json({ error: 'Not found' });
      const role = req.session.role || 'student';
      const isOwner = ev.owner_user_id === req.session.userId;
      if (!isOwner && role !== 'admin' && role !== 'professor')
        return res.status(403).json({ error: 'Only the owner or staff can edit this event' });
      const { title, event_type, start_time, end_time, location, visibility, attendees } = req.body;
      const sets = [],
        params = [];
      if (title !== undefined) {
        sets.push('title=?');
        params.push(title);
      }
      if (event_type !== undefined) {
        sets.push('event_type=?');
        params.push(event_type);
      }
      if (start_time !== undefined) {
        sets.push('start_time=?');
        params.push(start_time);
      }
      if (end_time !== undefined) {
        sets.push('end_time=?');
        params.push(end_time || '');
      }
      if (location !== undefined) {
        sets.push('location=?');
        params.push(location || '');
      }
      if (visibility !== undefined) {
        sets.push('visibility=?');
        params.push(visibility || 'public');
      }
      if (attendees !== undefined) {
        sets.push('attendees=?');
        params.push(attendees || '');
      }
      if (!sets.length) return res.json({ success: true });
      params.push(req.params.id);
      db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id=?`).run(...params);
      res.json({ success: true });
    } catch (e) {
      sendInternalError(res, e, 'events update');
    }
  });
  router.delete('/api/events/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    try {
      const ev = db.prepare('SELECT owner_user_id FROM events WHERE id=?').get(req.params.id);
      if (!ev) return res.status(404).json({ error: 'Not found' });
      const role = currentRole(req);
      const isOwner = ev.owner_user_id === req.session.userId;
      if (!isOwner && !isLabStaffRole(role))
        return res.status(403).json({ error: 'Only the owner or staff can delete this event' });
      db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      sendInternalError(res, e, 'events delete');
    }
  });

  // MEETINGS — group meetings, seminars and announcements
  router.get('/api/meetings', apiReadLimiter, requireAuth, (req, res) => {
    try {
      res.json(
        db
          .prepare("SELECT * FROM meetings ORDER BY COALESCE(scheduled_at, ''), sort_order, id")
          .all(),
      );
    } catch (e) {
      sendInternalError(res, e, 'meetings list');
    }
  });
  router.post('/api/meetings', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    try {
      const { title, meeting_type, scheduled_at, location, description, sort_order } = req.body;
      if (!title) return res.status(400).json({ error: 'Title required' });
      // day_label/time_label are legacy NOT NULL columns retained for schema compatibility; new records use scheduled_at
      const result = db
        .prepare(
          'INSERT INTO meetings (title, meeting_type, scheduled_at, location, description, sort_order, day_label, time_label) VALUES (?,?,?,?,?,?,?,?)',
        )
        .run(
          str(title, 300),
          meeting_type || 'group',
          scheduled_at || '',
          str(location, 300),
          str(description, 5000),
          sort_order || 0,
          '',
          '',
        );
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      sendInternalError(res, e, 'meetings create');
    }
  });
  router.put('/api/meetings/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    try {
      const { title, meeting_type, scheduled_at, location, description, sort_order } = req.body;
      const sets = [],
        params = [];
      if (title !== undefined) {
        sets.push('title=?');
        params.push(title);
      }
      if (meeting_type !== undefined) {
        sets.push('meeting_type=?');
        params.push(meeting_type || 'group');
      }
      if (scheduled_at !== undefined) {
        sets.push('scheduled_at=?');
        params.push(scheduled_at || '');
      }
      if (location !== undefined) {
        sets.push('location=?');
        params.push(location || '');
      }
      if (description !== undefined) {
        sets.push('description=?');
        params.push(description || '');
      }
      if (sort_order !== undefined) {
        sets.push('sort_order=?');
        params.push(sort_order || 0);
      }
      if (!sets.length) return res.json({ success: true });
      params.push(req.params.id);
      const result = db.prepare(`UPDATE meetings SET ${sets.join(', ')} WHERE id=?`).run(...params);
      if (!result.changes) return res.status(404).json({ error: 'not found' });
      res.json({ success: true });
    } catch (e) {
      sendInternalError(res, e, 'meetings update');
    }
  });
  router.delete('/api/meetings/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    try {
      db.prepare('DELETE FROM meetings WHERE id=?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      sendInternalError(res, e, 'meetings delete');
    }
  });

  // ── Lab calendar — iCal export ───────────────────────────────────────────────
  // Public endpoint (no auth required) so users can subscribe in Google/Apple Calendar.
  // URL: /api/events/calendar.ics
  function toICSDate(dt) {
    if (!dt) return null;
    const d = new Date(dt);
    if (isNaN(d)) return null;
    return d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }
  function escapeICS(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
  router.get('/api/events/calendar.ics', apiReadLimiter, (req, res) => {
    // Only explicitly public events belong in an unauthenticated subscription.
    const events = db
      .prepare("SELECT * FROM events WHERE visibility = 'public' ORDER BY start_time")
      .all();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LATFS//Lab Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LATFS Lab Schedule',
      'X-WR-CALDESC:Laboratory for Advanced Thermal and Fluid Systems — public schedule',
    ];
    for (const ev of events) {
      const dtStart = toICSDate(ev.start_time);
      if (!dtStart) continue;
      const dtEnd = toICSDate(ev.end_time) || dtStart;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:latfs-ev-${ev.id}@latfs.villanova.edu`);
      lines.push(`DTSTAMP:${toICSDate(new Date())}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeICS(ev.title)}`);
      if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`);
      if (ev.event_type) lines.push(`CATEGORIES:${escapeICS(ev.event_type)}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="latfs-schedule.ics"');
    res.send(lines.join('\r\n'));
  });
  return router;
}

module.exports = { createScheduleRouter };
