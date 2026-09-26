/* Platform: auth. Loaded in order by platform.html. */

/* ---------- Auth ---------- */
async function checkAuth() {
  try {
    const me = await api('/api/me');
    ME = me;
    CSRF = me.csrfToken;
    return true;
  } catch (e) {
    ME = null;
    CSRF = null;
    if (e.status !== 401) $('#loginErr').textContent = e.message;
    return false;
  }
}

let _loginState = { step: 1, username: '', password: '', rememberMe: false };

function _resetLoginForm() {
  _loginState = { step: 1, username: '', password: '', rememberMe: false };
  $('#loginStep1').style.display = '';
  $('#loginStep2').style.display = 'none';
  $('#loginTotp').value = '';
  $('#loginPass').value = '';
  $('#loginSubmitBtn').textContent = 'Sign in';
  $('#loginUser').focus();
}

async function doLogin(ev) {
  ev.preventDefault();
  const submit = $('#loginSubmitBtn');
  if (submit.disabled) return;
  submit.disabled = true;
  $('#loginErr').textContent = '';
  try {
    let body;
    if (_loginState.step === 1) {
      _loginState.username = $('#loginUser').value.trim();
      _loginState.password = $('#loginPass').value;
      _loginState.rememberMe = $('#loginRemember').checked;
      if (!_loginState.username || !_loginState.password) {
        $('#loginErr').textContent = 'Username and password are required';
        return;
      }
      body = {
        username: _loginState.username,
        password: _loginState.password,
        remember_me: _loginState.rememberMe,
      };
    } else {
      body = {
        username: _loginState.username,
        password: _loginState.password,
        totp_code: $('#loginTotp').value.trim(),
        remember_me: _loginState.rememberMe,
      };
    }
    const data = await api('/admin/login', { method: 'POST', body });
    // Server signals TOTP is required — switch to step 2
    if (data.totp_required) {
      _loginState.step = 2;
      $('#loginStep1').style.display = 'none';
      $('#loginStep2').style.display = '';
      $('#loginSubmitBtn').textContent = 'Verify';
      $('#loginTotp').focus();
      return;
    }
    if (!data.success) throw new Error(data.error || 'Login failed');
    if (!(await checkAuth()))
      throw new Error('Unable to verify your session. Please sign in again.');
    _resetLoginForm();
    showApp();
  } catch (e) {
    $('#loginErr').textContent = e.message;
  } finally {
    submit.disabled = false;
  }
}

async function doLogout() {
  try {
    await api('/admin/logout', { method: 'POST' });
    ME = null;
    CSRF = null;
    location.reload();
  } catch (e) {
    alert(e.message);
  }
}

function showApp() {
  $('#loginScreen').style.display = 'none';
  $('#appShell').classList.remove('hidden');
  $('#userName').textContent = ME.name || ME.username;
  $('#userRole').textContent = (ME.role || 'member').toUpperCase();
  setAvatarContent($('#userAv'), ME);
  if (isLabStaffRole(ME.role)) {
    $$('.staff-only').forEach((el) => el.classList.remove('hidden'));
  }
  // Load editable section subtitles from settings
  api('/api/settings')
    .then((s) => {
      const apply = (id, key) => {
        const el = document.getElementById(id);
        if (el && s[key]) {
          el.textContent = s[key];
          el.dataset.baseText = s[key];
        }
      };
      apply('dashSub', 'platform_dashboard_sub');
      apply('schedSub', 'platform_schedule_sub');
      apply('tasksSub', 'platform_tasks_sub');
      apply('meetingsSub', 'platform_meetings_sub');
      apply('equipmentSub', 'platform_equipment_sub');
      apply('issuesSub', 'platform_issues_sub');
      apply('inventorySub', 'platform_inventory_sub');
      apply('profileSub', 'platform_profile_sub');
      apply('membersSub', 'platform_members_sub');
    })
    .catch(() => {});
  goRoute(location.hash.slice(1) || 'dashboard', { replace: true });
}
