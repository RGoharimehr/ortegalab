'use strict';

function createPeopleService(db) {
  function personForUser(user) {
    if (!user) return null;
    if (user.person_id) {
      const byId = db
        .prepare('SELECT id, photo_url, photo_position FROM people WHERE id=?')
        .get(user.person_id);
      if (byId) return byId;
    }
    if (user.email) {
      const byEmail = db
        .prepare(
          'SELECT id, photo_url, photo_position FROM people WHERE lower(email)=lower(?) ORDER BY active DESC, id LIMIT 1',
        )
        .get(user.email);
      if (byEmail) return byEmail;
    }
    if (user.name) {
      const byName = db
        .prepare(
          'SELECT id, photo_url, photo_position FROM people WHERE lower(name)=lower(?) ORDER BY active DESC, id LIMIT 1',
        )
        .get(user.name);
      if (byName) return byName;
    }
    return null;
  }

  function withUserProfile(user) {
    if (!user) return null;
    const person = personForUser(user) || {};
    return {
      ...user,
      person_id: user.person_id || person.id || null,
      photo_url: person.photo_url || '',
      photo_position: person.photo_position || 'center center',
    };
  }

  function titleCaseWords(value) {
    return String(value || '')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  function publicRoleFromUser(user) {
    const role = String(user?.role || '').toLowerCase();
    const name = String(user?.name || '');
    if (role === 'professor') return /ortega/i.test(name) ? 'Director & Professor' : 'Professor';
    if (role === 'postdoc') return 'Postdoctoral Researcher';
    if (role === 'student') return 'Graduate Researcher';
    if (role === 'moderator') return 'Research Staff';
    if (role === 'admin') return 'Lab Administrator';
    return titleCaseWords(role || 'Lab member');
  }

  function publicCategoryFromUser(user) {
    const role = String(user?.role || '').toLowerCase();
    const name = String(user?.name || '');
    if (role === 'professor') return /ortega/i.test(name) ? 'director' : 'faculty';
    if (role === 'postdoc') return 'postdoc';
    if (role === 'student') return 'phd';
    if (role === 'moderator') return 'faculty';
    if (role === 'admin') return 'manager';
    return 'collaborator';
  }

  function buildPublicPeopleRows() {
    const cmsPeople = db
      .prepare('SELECT * FROM people WHERE active=1 ORDER BY category, name')
      .all();
    return cmsPeople;
  }

  return {
    personForUser,
    withUserProfile,
    titleCaseWords,
    publicRoleFromUser,
    publicCategoryFromUser,
    buildPublicPeopleRows,
  };
}

module.exports = { createPeopleService };
