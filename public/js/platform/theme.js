/* Platform: theme. Loaded in order by platform.html. */

/* Dark is the default; dim mode only reduces surface brightness. */
(function () {
  const controls = [$('#dmToggle'), $('#profDmToggle')].filter(Boolean);
  function applyDimDisplay(enabled) {
    document.body.classList.toggle('dm', enabled);
    controls.forEach((control) => control.setAttribute('aria-pressed', String(enabled)));
  }
  let enabled = false;
  try {
    enabled = localStorage.getItem('latfs-dim-display') === 'true';
  } catch (_) {
    /* Storage may be disabled. */
  }
  applyDimDisplay(enabled);
  controls.forEach((control) => {
    control.addEventListener('click', () => {
      const dimmed = !document.body.classList.contains('dm');
      applyDimDisplay(dimmed);
      try {
        localStorage.setItem('latfs-dim-display', String(dimmed));
      } catch (_) {
        /* Keep the current in-memory preference. */
      }
    });
  });
})();
