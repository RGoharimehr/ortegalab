/* Small shared browser helpers; page-specific rendering stays in feature files. */
(function (global) {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character],
    );
  }

  /** Keep keyboard focus in an open dialog and restore its launching control. */
  function manageDialog(dialog, onClose) {
    const previousFocus = document.activeElement;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('tabindex', '-1');
    const heading = dialog.querySelector('h1, h2, h3');
    dialog.setAttribute('aria-label', heading ? heading.textContent : 'Lab platform dialog');

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.disabled &&
          element.type !== 'hidden' &&
          !element.closest('[hidden]') &&
          global.getComputedStyle(element).display !== 'none',
      );

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        const controls = focusable();
        const first = controls[0] || dialog;
        const last = controls[controls.length - 1] || dialog;
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !controls.length)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    dialog.addEventListener('keydown', onKeyDown);
    (focusable()[0] || dialog).focus();
    return function release() {
      dialog.removeEventListener('keydown', onKeyDown);
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    };
  }

  global.LabUI = Object.freeze({ escapeHTML, manageDialog });
})(window);
