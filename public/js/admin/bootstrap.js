/* Admin: bootstrap. Loaded in order by admin.html. */

const ROUTES = {
  overview: renderOverview,
  content: renderAdmin,
  schedule: renderSchedule,
  tasks: renderTasks,
  meetings: renderMeetings,
  inventory: renderInventory,
  projects: renderProjects,
};

async function doLogout() {
  try {
    await api('/admin/logout', { method: 'POST' });
  } catch (error) {
    alert(error.message);
    return;
  }
  CSRF = '';
  SESSION_USER = { name: '', role: '', initials: '', first: '' };
  _resetAdminLogin();
  $('#appShell').style.display = 'none';
  $('#loginScreen').style.display = 'flex';
}

async function showAdminApp() {
  try {
    Object.assign(LAB_NAMES, await apiGet('/api/settings'));
  } catch (_) {
    /* Optional supporting data remains unavailable. */
  }
  $('#loginScreen').style.display = 'none';
  $('#appShell').style.display = 'flex';
  $('#userInitials').textContent = SESSION_USER.initials;
  $('#userName').textContent = SESSION_USER.name;
  $('#userRole').textContent = SESSION_USER.role;
  renderNav();
  await navigate(location.hash.slice(1) || 'overview', { replace: true });
}

async function boot() {
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const submit = $('#adminSubmitBtn');
    if (submit.disabled) return;
    submit.disabled = true;
    $('#lErr').textContent = '';
    try {
      let result;
      if (_adminLoginState.step === 1) {
        _adminLoginState.username = $('#lUser').value.trim();
        _adminLoginState.password = $('#lPass').value;
        _adminLoginState.rememberMe = $('#adminRemember').checked;
        result = await doLogin(
          _adminLoginState.username,
          _adminLoginState.password,
          null,
          _adminLoginState.rememberMe,
        );
      } else {
        result = await doLogin(
          _adminLoginState.username,
          _adminLoginState.password,
          $('#lTotp').value.trim(),
          _adminLoginState.rememberMe,
        );
      }
      if (result && result.totp_required) {
        _adminLoginState.step = 2;
        $('#adminStep1').style.display = 'none';
        $('#adminStep2').style.display = '';
        $('#adminSubmitBtn').textContent = 'Verify';
        $('#lTotp').focus();
        return;
      }
      _resetAdminLogin();
      await showAdminApp();
    } catch (err) {
      $('#lErr').textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  };
  $('#adminBackBtn').onclick = () => {
    $('#lErr').textContent = '';
    _resetAdminLogin();
  };
  $('#logoutBtn').onclick = doLogout;
  const ok = await checkAuth();
  if (ok) {
    await showAdminApp();
  }
  if (window.lucide) window.lucide.createIcons();
}

boot();
