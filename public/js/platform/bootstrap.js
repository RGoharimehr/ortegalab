/* Platform: bootstrap. Loaded in order by platform.html. */

/* ---------- Boot ---------- */
$('#loginForm').addEventListener('submit', doLogin);
$('#loginBackBtn').addEventListener('click', () => {
  $('#loginErr').textContent = '';
  _resetLoginForm();
});
$('#logoutBtn').addEventListener('click', doLogout);
(async function boot() {
  if (location.protocol === 'file:') {
    showFileModeNotice();
    return;
  }
  if (await checkAuth()) showApp();
})();
