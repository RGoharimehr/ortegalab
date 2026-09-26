/* Platform: theme. Loaded in order by platform.html. */

/* ---------- Dark mode ---------- */
(function () {
  let saved = null;
  try {
    saved = localStorage.getItem('latfs-theme');
  } catch (_) {
    /* Storage may be disabled. */
  }
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dm');
  }
})();
$('#dmToggle').addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dm');
  try {
    localStorage.setItem('latfs-theme', isDark ? 'dark' : 'light');
  } catch (_) {
    /* Keep the current in-memory theme. */
  }
});
