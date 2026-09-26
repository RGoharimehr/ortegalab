/* Platform: modal. Loaded in order by platform.html. */

/* ---------- Modal helper ---------- */
let activeModal = null;
function modal(bodyHTML, onSave, extraFootHTML = '', saveLabel = 'Save') {
  if (activeModal) activeModal.releaseFocus();
  const root = $('#modalMount');
  root.innerHTML = `<div class="modal-bg"><form class="modal" id="modalForm" novalidate>
    ${bodyHTML}
    <p class="form-error" id="modalError" role="alert"></p>
    <div class="modal-actions">
      ${extraFootHTML}
      <button type="button" class="p-bigbtn ghost" id="modalCancel">${onSave ? 'Cancel' : 'Close'}</button>
      ${onSave ? `<button type="submit" class="p-bigbtn" data-modal-submit="1">${saveLabel}</button>` : ''}
    </div>
  </form></div>`;
  const form = $('#modalForm');
  const instance = { saving: false, releaseFocus: null };
  activeModal = instance;
  instance.releaseFocus = LabUI.manageDialog(form, closeModal);
  $('#modalCancel').addEventListener('click', closeModal);
  $('#modalForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!onSave) return;
    if (instance.saving) return;
    if (ev.submitter && !ev.submitter.hasAttribute('data-modal-submit')) return;
    const submit = $('[data-modal-submit]', root);
    instance.saving = true;
    submit.disabled = true;
    submit.textContent = 'Saving…';
    $('#modalError').textContent = '';
    try {
      await onSave();
      instance.saving = false;
      if (activeModal === instance) closeModal();
    } catch (err) {
      if (form.isConnected) $('#modalError', form).textContent = err.message;
    } finally {
      instance.saving = false;
      submit.disabled = false;
      submit.textContent = saveLabel;
    }
  });
}
function closeModal() {
  if (activeModal?.saving) return;
  $('#modalMount').innerHTML = '';
  if (activeModal) activeModal.releaseFocus();
  activeModal = null;
}
