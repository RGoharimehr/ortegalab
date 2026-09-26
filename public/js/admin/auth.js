/* Admin: auth. Loaded in order by admin.html. */

/* ── Auth ──────────────────────────────────────────────── */
async function checkAuth() {
  try {
    const data = await api('/admin/check');
    if (data.loggedIn) {
      if (!canAccessAdminSurface(data.role)) {
        $('#lErr').textContent =
          'This account should use the Lab platform. Website administration requires a moderator, professor, or administrator account.';
        return false;
      }
      CSRF = data.csrfToken || '';
      SESSION_USER.name = data.name || data.username;
      SESSION_USER.role = data.role;
      SESSION_USER.first = (data.name || data.username || '?').split(' ')[0] || '?';
      SESSION_USER.initials = initials(SESSION_USER.name);
      return true;
    }
    if (data && data.message) $('#lErr').textContent = data.message;
  } catch (e) {
    $('#lErr').textContent = e.message;
  }
  return false;
}
let _adminLoginState = { step: 1, username: '', password: '', rememberMe: false };

function _resetAdminLogin() {
  _adminLoginState = { step: 1, username: '', password: '', rememberMe: false };
  $('#adminStep1').style.display = '';
  $('#adminStep2').style.display = 'none';
  $('#lTotp').value = '';
  $('#lPass').value = '';
  $('#adminSubmitBtn').textContent = 'Sign in';
  $('#lUser').focus();
}

async function doLogin(user, pass, totpCode, rememberMe) {
  const body = { username: user, password: pass, remember_me: rememberMe };
  if (totpCode) body.totp_code = totpCode;
  const data = await api('/admin/login', { method: 'POST', body });
  if (data.totp_required) return data; // caller handles step transition
  if (!data.success) throw new Error(data.error || 'Login failed');
  if (!canAccessAdminSurface(data.role || 'student')) {
    throw new Error(
      'This account should use the Lab platform. Website Admin access is limited to moderator, professor, or admin roles.',
    );
  }
  CSRF = data.csrfToken || '';
  SESSION_USER.name = data.name || data.username;
  SESSION_USER.role = data.role;
  SESSION_USER.first = (data.name || data.username || '?').split(' ')[0] || '?';
  SESSION_USER.initials = initials(SESSION_USER.name);
  return data;
}
