const token = new URLSearchParams(location.search).get('token');
if(!token){
  document.getElementById('msg').textContent='Missing reset token. Please use the link from your email.';
  document.getElementById('msg').className='msg err';
  document.getElementById('resetForm').querySelector('button').disabled=true;
}

document.getElementById('resetForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pw = document.getElementById('newPass').value;
  const pw2 = document.getElementById('confirmPass').value;
  const msg = document.getElementById('msg');
  if(pw !== pw2){ msg.textContent='Passwords do not match.'; msg.className='msg err'; return; }
  if(pw.length < 8){ msg.textContent='Password must be at least 8 characters.'; msg.className='msg err'; return; }
  msg.textContent='Saving…'; msg.className='msg';
  try {
    const r = await fetch('/api/reset-password', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token, password: pw })
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || 'Reset failed');
    msg.textContent = 'Password updated! You can now sign in.';
    msg.className = 'msg ok';
    document.getElementById('resetForm').querySelector('button').disabled = true;
    setTimeout(() => location.href='/platform', 2500);
  } catch(err){
    msg.textContent = err.message;
    msg.className = 'msg err';
  }
});
