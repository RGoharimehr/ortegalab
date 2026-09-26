import { h, escapeHtml } from './dom.mjs';

let closeActiveDialog = null;

/** Every modal restores focus and releases its listeners on every close path. */
function showDialog(overlay) {
  closeInlineApp();
  const previousFocus = document.activeElement;
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      overlay.querySelectorAll('a[href], button:not([disabled]), iframe, [tabindex="0"]'),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || !overlay.contains(document.activeElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !overlay.contains(document.activeElement))
    ) {
      event.preventDefault();
      first?.focus();
    }
  };
  const site = document.getElementById('app');
  const previousOverflow = document.body.style.overflow;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown);
    if (site) site.inert = false;
    document.body.style.overflow = previousOverflow;
    closeActiveDialog = null;
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('[data-dialog-close]')) close();
  });
  document.body.appendChild(overlay);
  if (site) site.inert = true;
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeyDown);
  overlay.querySelector('[data-dialog-close]')?.focus();
  closeActiveDialog = close;
}

export function closeInlineApp() {
  closeActiveDialog?.();
}

export function openInlineApp(app) {
  const frameMarkup = `<base href="${escapeHtml(location.origin + '/')}" />${app.embed_html || ''}`;
  showDialog(
    h(
      'div',
      { class: 'w-app-modal-bg' },
      h(
        'div',
        {
          class: 'w-app-modal',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': app.title || 'Lab app',
        },
        h(
          'div',
          { class: 'w-app-modal-head' },
          h(
            'div',
            { class: 'w-app-modal-copy' },
            h('h3', null, app.title || 'Lab app'),
            h('p', null, app.summary || app.description || 'Lab tool'),
          ),
          h(
            'div',
            { class: 'w-app-actions', style: { marginTop: '0' } },
            app.url
              ? h(
                  'a',
                  { class: 'btn-ghost', href: app.url, target: '_blank', rel: 'noopener' },
                  'Open link',
                )
              : null,
            h('button', { class: 'btn-ghost', type: 'button', 'data-dialog-close': '' }, 'Close'),
          ),
        ),
        h('iframe', {
          class: 'w-app-frame',
          // Embedded tools get an opaque origin: they cannot read the parent session.
          sandbox: 'allow-scripts allow-forms allow-modals allow-popups allow-downloads',
          srcdoc: frameMarkup,
          title: app.title || 'Lab app',
        }),
      ),
    ),
  );
}

export function openGalleryPreview(photo) {
  showDialog(
    h(
      'div',
      { class: 'w-lightbox-bg' },
      h(
        'div',
        {
          class: 'w-lightbox',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': photo.title || 'Gallery image',
        },
        h('img', { class: 'w-lightbox-img', src: photo.src, alt: photo.title || 'Gallery image' }),
        h(
          'div',
          { class: 'w-lightbox-meta' },
          h(
            'div',
            null,
            h('strong', null, photo.title || 'Gallery image'),
            h('span', null, photo.cat || 'Lab photo'),
          ),
          h(
            'button',
            { class: 'w-lightbox-close', type: 'button', 'data-dialog-close': '' },
            'Close',
          ),
        ),
      ),
    ),
  );
}
