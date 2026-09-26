/* Reset-Password: bootstrap. Loaded in order by reset-password.html. */

const token = new URLSearchParams(location.search).get('token');
const resetApi = LabHttp.createClient();
let resetSaving = false;
if (!token) {
  document.getElementById('msg').textContent =
    'Missing reset token. Please use the link from your email.';
  document.getElementById('msg').className = 'msg err';
  document.getElementById('resetForm').querySelector('button').disabled = true;
}

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!token || resetSaving) return;
  const pw = document.getElementById('newPass').value;
  const pw2 = document.getElementById('confirmPass').value;
  const msg = document.getElementById('msg');
  if (pw !== pw2) {
    msg.textContent = 'Passwords do not match.';
    msg.className = 'msg err';
    return;
  }
  if (pw.length < 12) {
    msg.textContent = 'Password must be at least 12 characters.';
    msg.className = 'msg err';
    return;
  }
  const submit = document.getElementById('resetForm').querySelector('button');
  resetSaving = true;
  submit.disabled = true;
  msg.textContent = 'Saving…';
  msg.className = 'msg';
  try {
    await resetApi('/api/reset-password', { method: 'POST', body: { token, password: pw } });
    msg.textContent = 'Password updated! You can now sign in.';
    msg.className = 'msg ok';
    document.getElementById('newPass').value = '';
    document.getElementById('confirmPass').value = '';
    setTimeout(() => (location.href = '/platform'), 2500);
  } catch (err) {
    resetSaving = false;
    submit.disabled = false;
    msg.textContent = err.message;
    msg.className = 'msg err';
  }
});
