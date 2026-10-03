/* Admin: settings. Loaded in order by admin.html. */

async function renderSettingsTab(body) {
  let s = Object.assign({}, LAB_NAMES);
  try {
    const fresh = await apiGet('/api/settings');
    Object.assign(s, fresh);
    Object.assign(LAB_NAMES, fresh);
  } catch (_) {
    /* Optional supporting data remains unavailable. */
  }

  const fieldRow = (id, label, val, placeholder = '') =>
    `<div style="margin-bottom:12px;">
       <label style="font-size:12px;font-weight:700;color:var(--fg-3);display:block;margin-bottom:4px;">${escHtml(label)}</label>
       <input id="${id}" class="p-inv-input" value="${escHtml(val || '')}" placeholder="${escHtml(placeholder)}">
     </div>`;

  body.innerHTML = `
    <div class="p-card" style="margin-bottom:24px">
      <div class="p-card-head"><div class="p-card-title">Join the lab — position advertisement</div></div>
      <label for="st_openings_status">Availability</label>
      <select id="st_openings_status" class="p-inv-input">
        <option value="closed" ${s.join_openings_status !== 'open' ? 'selected' : ''}>No open positions advertised</option>
        <option value="open" ${s.join_openings_status === 'open' ? 'selected' : ''}>Applications open</option>
      </select>
      ${fieldRow('st_openings_title', 'Advertisement title', s.join_openings_title)}
      <label for="st_openings_details">Position details, requirements and deadline</label>
      <textarea id="st_openings_details" class="p-inv-input" rows="5" maxlength="2000">${escHtml(s.join_openings_details || '')}</textarea>
      <button class="btn-primary-sm" id="saveOpenings">Save advertisement</button>
      <span id="openingsMsg" role="status" style="display:none">Saved!</span>
    </div>
    <div class="p-grid-2">
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Site</div></div>
        ${[
          ['globe', 'Public domain', 'latfs.villanova.edu'],
          ['image', 'Homepage hero', 'from Hero tab'],
          ['mail', 'Contact inbox', 'info@latfs.villanova.edu'],
        ]
          .map(
            ([icn, lbl, val]) => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px dashed var(--border-1)">
            <i data-lucide="${icn}" style="width:16px;height:16px;color:var(--fg-4);flex-shrink:0"></i>
            <div style="flex:1;font-size:13px;color:var(--fg-1);font-weight:600">${lbl}</div>
            <div style="font-size:12px;color:var(--fg-3)">${val}</div>
          </div>`,
          )
          .join('')}
        <div class="p-theme-grid">
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--fg-3);margin-bottom:4px;">Website appearance</div>
            <label for="siteTheme">Color scheme</label>
            <select id="siteTheme" class="p-inv-input">
              <option value="graphite" ${!['navy', 'graphite-green'].includes(s.site_theme) ? 'selected' : ''}>Graphite — charcoal and warm sand</option>
              <option value="navy" ${s.site_theme === 'navy' ? 'selected' : ''}>Navy — deep blue and soft blue</option>
            <option value="graphite-green" ${s.site_theme === 'graphite-green' ? 'selected' : ''}>Graphite — fresh green accent</option></select>
            <p class="p-soft-note">All designs are preserved. Save to apply the selected colors across the public website.</p>
            <button id="saveTheme" class="btn-primary-sm">Save color scheme</button>
            <span id="themeMsg" role="status"></span>
          </div>
        </div>
      </div>
      <div class="p-card">
        <div class="p-card-head"><div class="p-card-title">Account</div></div>
        <div style="padding:10px 0;border-bottom:1px dashed var(--border-1);font-size:13px;color:var(--fg-2)">Signed in as <strong>${escHtml(SESSION_USER.name)}</strong></div>
        <button class="btn-ghost-sm" id="logoutSet" style="margin-top:12px">Sign out</button>
      </div>
    </div>

    <div class="p-card" style="margin-top:24px;">
      <div class="p-card-head"><div class="p-card-title">Lab spaces</div></div>
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:16px;">These names flow into the lab platform and shared operational labels.</p>
      <div class="p-grid-2" style="gap:16px;">
        <div>
          ${fieldRow('st_la_name', 'Lab A — short name', s.lab_a_name, 'Lab A')}
          ${fieldRow('st_la_room', 'Lab A — room / building', s.lab_a_room, 'Tolentine 344')}
        </div>
        <div>
          ${fieldRow('st_lb_name', 'Lab B — short name', s.lab_b_name, 'Lab B')}
          ${fieldRow('st_lb_room', 'Lab B — room / building', s.lab_b_room, 'Mendel 270')}
        </div>
      </div>
      <button class="btn-primary-sm" id="saveLabNames" style="margin-top:4px;">Save lab names</button>
      <span id="labSaveMsg" style="font-size:12px;color:var(--status-ok);margin-left:10px;display:none;">Saved!</span>
    </div>

    <div class="p-card" style="margin-top:24px;">
      <div class="p-card-head"><div class="p-card-title">Public page headers</div></div>
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:16px;">Titles and intro paragraphs shown on the public website pages.</p>
      <div class="p-grid-2" style="gap:16px;">
        <div>
          ${fieldRow('st_res_sec', 'Research section title (home)', s.research_section_title, 'Research Areas')}
          ${fieldRow('st_res_ey', 'Research section eyebrow (home)', s.research_eyebrow, 'Six pillars · updated quarterly')}
          ${fieldRow('st_metric_res', 'Hero metric label · research', s.hero_metric_research_label, 'Research areas')}
          ${fieldRow('st_metric_pub', 'Hero metric label · publications', s.hero_metric_publications_label, 'Publications')}
          ${fieldRow('st_res_pt', 'Research page title', s.research_page_title, 'Six pillars of inquiry')}
          ${fieldRow('st_res_pi', 'Research page intro', s.research_page_intro, 'LATFS investigates…')}
        </div>
        <div>
          ${fieldRow('st_metric_people', 'Hero metric label · people', s.hero_metric_people_label, 'Active members')}
          ${fieldRow('st_metric_fac', 'Hero metric label · facilities', s.hero_metric_facilities_label, 'Facilities')}
          ${fieldRow('st_ppl_pt', 'People page title', s.people_page_title, 'Lab members')}
          ${fieldRow('st_ppl_pi', 'People page intro', s.people_page_intro, 'A small, hands-on lab…')}
          ${fieldRow('st_fac_pt', 'Facilities page title', s.facilities_page_title, 'Lab facilities & instruments')}
          ${fieldRow('st_fac_pi', 'Facilities page intro', s.facilities_page_intro, 'Click any facility…')}
          ${fieldRow('st_dl_pt', 'Downloads page title', s.downloads_page_title, 'Downloads')}
          ${fieldRow('st_dl_pi', 'Downloads page intro', s.downloads_page_intro, 'Access published PDFs…')}
        </div>
      </div>
      <button class="btn-primary-sm" id="savePageHeaders" style="margin-top:4px;">Save page headers</button>
      <span id="pageHdrMsg" style="font-size:12px;color:var(--status-ok);margin-left:10px;display:none;">Saved!</span>
    </div>

    <div class="p-card" style="margin-top:24px;">
      <div class="p-card-head"><div class="p-card-title">Platform section descriptions</div></div>
      <p style="font-size:13px;color:var(--fg-3);margin-bottom:16px;">Subtitle text shown under each section heading in the platform (/platform) for all users.</p>
      <div class="p-grid-2" style="gap:16px;">
        <div>
          ${fieldRow('st_pl_dash', 'Dashboard subtitle', s.platform_dashboard_sub, "Here is today's snapshot.")}
          ${fieldRow('st_pl_sched', 'Schedule subtitle', s.platform_schedule_sub, 'Calendar of meetings, sessions and reservations.')}
          ${fieldRow('st_pl_tasks', 'Tasks subtitle', s.platform_tasks_sub, 'Drag-style kanban (open / in progress / blocked / done).')}
          ${fieldRow('st_pl_meet', 'Meetings subtitle', s.platform_meetings_sub, 'Group meetings, seminars and announcements from the PI.')}
        </div>
        <div>
          ${fieldRow('st_pl_equip', 'Equipment subtitle', s.platform_equipment_sub, 'Check items out and check them back in. Last-user is tracked.')}
          ${fieldRow('st_pl_iss', 'Issues subtitle', s.platform_issues_sub, 'Report broken equipment, request supplies, flag facility issues.')}
          ${fieldRow('st_pl_inv', 'Inventory subtitle', s.platform_inventory_sub, 'Track consumables, chemicals, reagents and supplies.')}
          ${fieldRow('st_pl_prof', 'Profile subtitle', s.platform_profile_sub, 'Your details, assigned tasks and equipment.')}
          ${fieldRow('st_pl_mem', 'Members subtitle', s.platform_members_sub, 'Manage accounts. Only admins / professors can edit.')}
        </div>
      </div>
      <button class="btn-primary-sm" id="savePlatformSubs" style="margin-top:4px;">Save platform descriptions</button>
      <span id="platSubMsg" style="font-size:12px;color:var(--status-ok);margin-left:10px;display:none;">Saved!</span>
    </div>
  `;

  const showSaved = (id) => {
    const el = $('#' + id);
    if (el) {
      el.style.display = '';
      setTimeout(() => {
        el.style.display = 'none';
      }, 2500);
    }
  };

  const backgroundsPanel = document.createElement('div');
  backgroundsPanel.className = 'p-card';
  backgroundsPanel.style.marginTop = '24px';
  body.appendChild(backgroundsPanel);
  await renderBackgroundSettings(backgroundsPanel, s);
  $('#saveTheme').onclick = async () => {
    const status = $('#themeMsg');
    try {
      await apiPut('/api/settings', { site_theme: $('#siteTheme').value });
      status.textContent = 'Saved. Refresh the public site to see this design.';
    } catch (error) {
      status.textContent = error.message;
    }
  };
  $('#saveOpenings').onclick = async () => {
    try {
      await apiPut('/api/settings', {
        join_openings_status: $('#st_openings_status').value,
        join_openings_title: $('#st_openings_title').value.trim(),
        join_openings_details: $('#st_openings_details').value.trim(),
      });
      showSaved('openingsMsg');
    } catch (e) {
      alert(e.message);
    }
  };
  $('#logoutSet').onclick = doLogout;
  $('#saveLabNames').onclick = async () => {
    const upd = {
      lab_a_name: $('#st_la_name').value.trim() || 'Lab A',
      lab_a_room: $('#st_la_room').value.trim(),
      lab_b_name: $('#st_lb_name').value.trim() || 'Lab B',
      lab_b_room: $('#st_lb_room').value.trim(),
    };
    try {
      await apiPut('/api/settings', upd);
      Object.assign(LAB_NAMES, upd);
      showSaved('labSaveMsg');
    } catch (e) {
      alert(e.message);
    }
  };

  $('#savePageHeaders').onclick = async () => {
    const upd = {
      research_section_title: $('#st_res_sec').value.trim(),
      research_eyebrow: $('#st_res_ey').value.trim(),
      hero_metric_research_label: $('#st_metric_res').value.trim(),
      hero_metric_publications_label: $('#st_metric_pub').value.trim(),
      research_page_title: $('#st_res_pt').value.trim(),
      research_page_intro: $('#st_res_pi').value.trim(),
      hero_metric_people_label: $('#st_metric_people').value.trim(),
      hero_metric_facilities_label: $('#st_metric_fac').value.trim(),
      people_page_title: $('#st_ppl_pt').value.trim(),
      people_page_intro: $('#st_ppl_pi').value.trim(),
      facilities_page_title: $('#st_fac_pt').value.trim(),
      facilities_page_intro: $('#st_fac_pi').value.trim(),
      downloads_page_title: $('#st_dl_pt').value.trim(),
      downloads_page_intro: $('#st_dl_pi').value.trim(),
    };
    try {
      await apiPut('/api/settings', upd);
      Object.assign(LAB_NAMES, upd);
      showSaved('pageHdrMsg');
    } catch (e) {
      alert(e.message);
    }
  };

  $('#savePlatformSubs').onclick = async () => {
    const upd = {
      platform_dashboard_sub: $('#st_pl_dash').value.trim(),
      platform_schedule_sub: $('#st_pl_sched').value.trim(),
      platform_tasks_sub: $('#st_pl_tasks').value.trim(),
      platform_meetings_sub: $('#st_pl_meet').value.trim(),
      platform_equipment_sub: $('#st_pl_equip').value.trim(),
      platform_issues_sub: $('#st_pl_iss').value.trim(),
      platform_inventory_sub: $('#st_pl_inv').value.trim(),
      platform_profile_sub: $('#st_pl_prof').value.trim(),
      platform_members_sub: $('#st_pl_mem').value.trim(),
    };
    try {
      await apiPut('/api/settings', upd);
      Object.assign(LAB_NAMES, upd);
      showSaved('platSubMsg');
    } catch (e) {
      alert(e.message);
    }
  };

  if (window.lucide) window.lucide.createIcons();
}

async function renderBackgroundSettings(root, settings) {
  const BACKGROUND_SECTIONS = {
    home_hero: 'Home · hero',
    home_research: 'Home · research',
    home_partners: 'Home · collaborators',
    home_updates: 'Home · publications and news',
    home_gallery: 'Home · gallery',
    home_join: 'Home · invitation',
    footer: 'Footer',
    research: 'Research page',
    people: 'People page',
    publications: 'Publications page',
    'white-papers': 'White Papers page',
    facilities: 'Facilities page',
    gallery: 'Gallery page',
    apps: 'Research tools page',
    downloads: 'Downloads page',
    news: 'News page',
    join: 'Join page',
    contact: 'Contact page',
  };
  const gallery = await apiGet('/api/gallery');
  let current = {};
  try {
    current = JSON.parse(settings.site_backgrounds || '{}') || {};
  } catch {
    /* Keep defaults for legacy settings. */
  }
  root.innerHTML = `<h2>Section backgrounds</h2><p class="p-soft-note">Choose a gallery photo for each section, upload a new background, or keep a plain theme-colored surface. Research detail images remain editable under Research.</p><div class="p-grid-2">${Object.entries(
    BACKGROUND_SECTIONS,
  )
    .map(([key, label]) => {
      const choices = new Map([
        ['', 'Original design'],
        ['none', 'No photo'],
        ...gallery.map((photo) => [photo.image_url, photo.caption || photo.image_url]),
      ]);
      if (current[key] && !choices.has(current[key]))
        choices.set(current[key], 'Current custom image');
      return `<div><label for="bg_${key}">${escHtml(label)}</label><select id="bg_${key}" data-background="${key}" class="p-inv-input">${[...choices].map(([value, title]) => `<option value="${escHtml(value)}" ${value === (current[key] || '') ? 'selected' : ''}>${escHtml(title)}</option>`).join('')}</select><label>Upload background for ${escHtml(label)}<input type="file" accept="image/*" data-bg-upload="${key}"></label></div>`;
    })
    .join(
      '',
    )}</div><button class="btn-primary-sm" id="saveBackgrounds">Save backgrounds</button><span id="backgroundMsg" role="status"></span>`;
  root.querySelector('#saveBackgrounds').onclick = async () => {
    const button = root.querySelector('#saveBackgrounds');
    const status = root.querySelector('#backgroundMsg');
    button.disabled = true;
    try {
      const backgrounds = {};
      for (const select of root.querySelectorAll('[data-background]')) {
        const key = select.dataset.background;
        const file = root.querySelector(`[data-bg-upload="${key}"]`).files[0];
        const value = file ? await uploadPhoto(file) : select.value;
        if (value) backgrounds[key] = value;
      }
      await apiPut('/api/settings', { site_backgrounds: JSON.stringify(backgrounds) });
      status.textContent = 'Saved. Refresh the public website to see your backgrounds.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
}
