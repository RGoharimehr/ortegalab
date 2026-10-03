/* Admin: content. Loaded in order by admin.html. */

/* ───────────────────────────────────────────────────────────
   ADMIN — Members / Content / Apps / Settings / Audit
   Members + Content + Apps render real lab data (people/news/publications/research/sponsors)
   ─────────────────────────────────────────────────────────── */
let _adminTab = 'people';
const ADMIN_TAB_META = {
  'white-papers': {
    title: 'White Papers',
    copy: 'Create technical reports with authors, abstracts, topic filters and PDF downloads.',
  },
  people: {
    title: 'People and profiles',
    copy: 'Keep bios, roles, contact links, and photos aligned with the current lab roster.',
  },
  news: {
    title: 'News publishing',
    copy: 'Highlight milestones, conference activity, awards, and lab announcements with strong cover images.',
  },
  publications: {
    title: 'Publication archive',
    copy: 'Maintain the paper list, outbound links, and venue metadata for researchers and visitors.',
  },
  research: {
    title: 'Research pillars',
    copy: 'Shape the homepage research narrative with concise themes and compelling supporting imagery.',
  },
  facilities: {
    title: 'Facility showcase',
    copy: 'Document rigs, instruments, and reference materials so collaborators know what is available.',
  },
  hero: {
    title: 'Homepage hero',
    copy: 'Refresh the first impression with seasonal photography, clear positioning, and disciplined copy.',
  },
  gallery: {
    title: 'Gallery curation',
    copy: 'Surface candid lab work, team moments, and conference images that make the site feel alive.',
  },
  downloads: {
    title: 'Download library',
    copy: 'Manage PDFs, office files, media, and other downloadable resources shown on the public site.',
  },
  sponsors: {
    title: 'Sponsors and collaborators',
    copy: 'Present funding partners and collaborators with clean, current acknowledgements.',
  },
  apps: {
    title: 'App launcher',
    copy: 'Organize tools, calculators, and linked experiences so students can find them quickly.',
  },
  settings: {
    title: 'Site and platform copy',
    copy: 'Tune labels, section intros, and surface-level messaging used across the website and platform.',
  },
};
async function renderAdmin(root) {
  const tabs = allowedContentTabs();
  if (!tabs.some(([id]) => id === _adminTab)) _adminTab = tabs[0][0];
  const activeMeta = ADMIN_TAB_META[_adminTab] || {
    title: 'Content operations',
    copy: 'Manage the public-facing LATFS website.',
  };
  root.innerHTML = `
    <div class="p-page-head">
      <div>
        <div class="eyebrow" style="color:var(--gold-700)">Administration</div>
        <h1 class="p-h1">Admin Panel</h1>
        <p class="p-h1-sub">Members, content publishing, and site settings.</p>
      </div>
      <div class="p-actions">
        <a class="btn-ghost-sm" href="/" target="_blank" rel="noopener" style="text-decoration:none;">Preview public site</a>
        <button class="btn-ghost-sm" id="logoutTop"><i data-lucide="log-out" style="width:12px;height:12px;margin-right:4px"></i>Sign out</button>
      </div>
    </div>

    <div class="p-admin-ribbon">
      <div>
        <div class="p-admin-kicker">Current focus</div>
        <div class="p-admin-title">${escHtml(activeMeta.title)}</div>
        <div class="p-admin-copy">${escHtml(activeMeta.copy)}</div>
      </div>
      <div class="p-admin-pill-row">
        <span class="p-admin-pill">${escHtml(SESSION_USER.role || 'admin')}</span>
        <span class="p-admin-pill soft">${isLabStaffRole(SESSION_USER.role) ? 'Full content access' : 'Moderator-safe access'}</span>
      </div>
    </div>

    <div class="p-tabs" id="adminTabs">
      ${tabs
        .map(
          ([id, lbl, icn]) =>
            `<button class="p-tab${id === _adminTab ? ' active' : ''}" data-tab="${id}"><i data-lucide="${icn}" style="width:14px;height:14px"></i> ${lbl}</button>`,
        )
        .join('')}
    </div>

    <div id="adminBody"></div>
  `;
  root.querySelectorAll('[data-tab]').forEach(
    (b) =>
      (b.onclick = () => {
        _adminTab = b.dataset.tab;
        renderAdmin(root);
      }),
  );
  $('#logoutTop').onclick = doLogout;

  const body = $('#adminBody');
  try {
    if (_adminTab === 'news') renderNewsTab(body, await apiGet('/api/news'));
    else if (_adminTab === 'publications' && isLabStaffRole(SESSION_USER.role))
      renderPubsTab(body, await apiGet('/api/publications'));
    else if (_adminTab === 'white-papers' && isLabStaffRole(SESSION_USER.role))
      await renderWhitePapersTab(body);
    else if (_adminTab === 'research' && isLabStaffRole(SESSION_USER.role))
      await renderResearchTab(body);
    else if (_adminTab === 'people' && isLabStaffRole(SESSION_USER.role))
      await renderPeopleTab(body, await apiGet('/api/people'));
    else if (_adminTab === 'facilities' && isLabStaffRole(SESSION_USER.role))
      await renderFacilitiesTab(body);
    else if (_adminTab === 'hero') await renderHeroTab(body);
    else if (_adminTab === 'gallery') await renderGalleryTab(body);
    else if (_adminTab === 'downloads' && isLabStaffRole(SESSION_USER.role))
      await renderDownloadsTab(body);
    else if (_adminTab === 'sponsors' && isLabStaffRole(SESSION_USER.role))
      await renderSponsorsTab(body);
    else if (_adminTab === 'apps' && isLabStaffRole(SESSION_USER.role)) await renderAppsTab(body);
    else if (_adminTab === 'settings' && isLabStaffRole(SESSION_USER.role))
      await renderSettingsTab(body);
    else
      body.innerHTML =
        '<div class="p-card"><p style="color:var(--fg-3);font-size:13px;">This account has limited website-moderator access. News, hero, and gallery remain available here.</p></div>';
  } catch (error) {
    body.innerHTML = `<div class="p-card form-error" role="alert">${escHtml(error.message)}</div>`;
  }
  if (window.lucide) window.lucide.createIcons();
}
