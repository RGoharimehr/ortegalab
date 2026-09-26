/* Admin: modal. Loaded in order by admin.html. */

/* ── Modal helper ──────────────────────────────────────── */
function modal(title, sub, body, onSave) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">
    <h2>${escHtml(title)}</h2>
    <p class="modal-sub">${escHtml(sub || '')}</p>
    <div class="modal-body">${body}</div>
    <p class="form-error" role="alert"></p>
    <div class="modal-actions">
      <button class="btn-ghost-sm" data-act="cancel">Cancel</button>
      <button class="btn-primary-sm" data-act="save">Save</button>
    </div>
  </div>`;
  document.body.appendChild(bg);
  let saving = false;
  let releaseFocus;
  const close = () => {
    if (saving) return;
    bg.remove();
    if (releaseFocus) releaseFocus();
  };
  releaseFocus = LabUI.manageDialog(bg.querySelector('.modal'), close);
  bg.addEventListener('click', (e) => {
    if (e.target === bg) close();
  });
  bg.querySelector('[data-act="cancel"]').onclick = close;
  bg.querySelector('[data-act="save"]').onclick = async () => {
    if (saving) return;
    const saveButton = bg.querySelector('[data-act="save"]');
    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    bg.querySelector('.form-error').textContent = '';
    try {
      await onSave(bg.querySelector('.modal-body'));
      saving = false;
      close();
    } catch (e) {
      bg.querySelector('.form-error').textContent = e.message;
    } finally {
      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Save';
    }
  };
  if (window.lucide) window.lucide.createIcons();
  return bg;
}
