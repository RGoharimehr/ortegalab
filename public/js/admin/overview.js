/* Admin: overview. Loaded in order by admin.html. */

async function renderOverview(root) {
  const [people, news, pubs, gallery, downloads, apps] = await Promise.all([
    apiGet('/api/people').catch(() => []),
    apiGet('/api/news').catch(() => []),
    apiGet('/api/publications').catch(() => []),
    apiGet('/api/gallery').catch(() => []),
    apiGet('/api/downloads/all').catch(() => []),
    apiGet('/api/apps/all').catch(() => []),
  ]);
  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <div class="eyebrow" style="color:var(--gold-700)">Website admin</div>
        <h1 class="p-h1">Content overview</h1>
        <p class="p-h1-sub">This panel manages the public LATFS website. For day-to-day lab use, use the Lab platform.</p>
      </div>
      <div class="p-actions">
        <a class="btn-ghost-sm p-btn-tight" href="/platform" style="text-decoration:none;">Open lab platform</a>
        <button class="btn-ghost-sm p-btn-tight" id="ovLogout">Sign out</button>
      </div>
    </div>
    <div class="p-overview-grid">
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Quick edits</div></div>
        <div class="p-action-tiles">
          <button class="p-action-tile" type="button" data-ov-tab="hero">
            <div class="p-action-tile-kicker">Homepage</div>
            <div class="p-action-tile-title">Hero and front page</div>
            <div class="p-action-tile-copy">Jump straight to the homepage hero, research labels, and public-first content.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="publications">
            <div class="p-action-tile-kicker">Archive</div>
            <div class="p-action-tile-title">Publications</div>
            <div class="p-action-tile-copy">Edit the publication table, PDF links, DOI links, and year ordering from one place.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="downloads">
            <div class="p-action-tile-kicker">Library</div>
            <div class="p-action-tile-title">Downloads</div>
            <div class="p-action-tile-copy">Manage PDFs, documents, media, and any public file you want visitors to download.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="gallery">
            <div class="p-action-tile-kicker">Media</div>
            <div class="p-action-tile-title">Gallery</div>
            <div class="p-action-tile-copy">Keep the homepage carousel and gallery page synced to the latest uploaded lab images.</div>
          </button>
          <button class="p-action-tile" type="button" data-ov-tab="apps">
            <div class="p-action-tile-kicker">Apps</div>
            <div class="p-action-tile-title">Apps and calculators</div>
            <div class="p-action-tile-copy">Add linked tools, paste inline HTML, or import a standalone HTML calculator file.</div>
          </button>
        </div>
      </div>
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Content status</div></div>
        <div class="p-link-stack">
          <div class="p-link-item"><strong>${people.length}</strong> people profiles are currently published on the public site.</div>
          <div class="p-link-item"><strong>${pubs.length}</strong> publications are live in the public archive table.</div>
          <div class="p-link-item"><strong>${gallery.length}</strong> gallery images, <strong>${downloads.length}</strong> downloads, and <strong>${apps.length}</strong> apps are ready to manage.</div>
          <div class="p-link-item"><strong>${news.length}</strong> public news items are available for homepage and news-page surfacing.</div>
        </div>
      </div>
    </div>
  `;
  $('#ovLogout').onclick = doLogout;
  root.querySelectorAll('[data-ov-tab]').forEach(
    (btn) =>
      (btn.onclick = () => {
        _adminTab = btn.dataset.ovTab;
        navigate('content');
      }),
  );
}
