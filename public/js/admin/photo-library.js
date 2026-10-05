/* Shared image controls for content editors. Gallery records reuse the uploaded file. */
const photoUploadControls = new WeakMap();
const completedPhotoUploads = new WeakMap();
function installPhotoControls(root) {
  root.querySelectorAll('input[data-photo-target]').forEach((input) => {
    const target = root.querySelector(input.dataset.photoTarget);
    if (!target) return;
    const box = document.createElement('div');
    box.className = 'photo-library-controls';
    box.innerHTML = `<button type="button" class="btn-ghost-sm" data-browse>Choose from gallery</button>
      <label><input type="checkbox" data-add> Add this upload to the public gallery</label>
      <div data-options hidden><label>Gallery tag <input data-tag maxlength="80" value="Inside LATFS"></label>
      <label>Photo caption <input data-caption maxlength="200"></label></div>
      <p data-status role="status"></p><div data-picker hidden>
      <label>Search gallery <input type="search" data-search placeholder="Search captions or tags"></label>
      <div data-results class="photo-library-grid"></div></div>`;
    input.parentElement.insertAdjacentElement('afterend', box);
    const add = box.querySelector('[data-add]');
    const tag = box.querySelector('[data-tag]');
    const caption = box.querySelector('[data-caption]');
    photoUploadControls.set(input, { add, tag, caption });
    add.onchange = () => {
      box.querySelector('[data-options]').hidden = !add.checked;
    };
    let photos;
    const status = box.querySelector('[data-status]');
    const search = box.querySelector('[data-search]');
    const results = box.querySelector('[data-results]');
    function draw() {
      results.replaceChildren();
      const query = search.value.toLowerCase();
      const shown = photos.filter((p) =>
        `${p.caption} ${p.category}`.toLowerCase().includes(query),
      );
      if (!shown.length) {
        results.textContent = 'No matching gallery photos.';
        return;
      }
      shown.forEach((photo) => {
        const button = document.createElement('button');
        button.type = 'button';
        const image = document.createElement('img');
        // Gallery images are local assets or HTTP(S) URLs, never executable schemes.
        if (!/^(\/(?!\/)|https?:\/\/)/i.test(photo.image_url)) return;
        image.src = photo.image_url;
        image.alt = photo.caption || photo.category || 'Gallery photo';
        image.loading = 'lazy';
        const label = document.createElement('span');
        label.textContent = `${photo.category || 'Inside LATFS'} · ${photo.caption || 'Photo'}`;
        button.append(image, label);
        button.onclick = () => {
          input.value = '';
          target.value = photo.image_url;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          add.checked = false;
          add.onchange();
          box.querySelector('[data-picker]').hidden = true;
          status.textContent = 'Selected: ' + (photo.caption || photo.category || 'Gallery photo');
        };
        results.append(button);
      });
    }
    async function load() {
      if (!photos) photos = await apiGet('/api/gallery?limit=1000');
      return photos;
    }
    box.querySelector('[data-browse]').onclick = async () => {
      try {
        await load();
        box.querySelector('[data-picker]').hidden = false;
        draw();
      } catch (error) {
        status.textContent = 'Could not load gallery: ' + error.message;
      }
    };
    search.oninput = draw;
    // Suggestions include existing custom tags, while allowing a new tag.
    const list = document.createElement('datalist');
    list.id = 'gallery-tags-' + input.id;
    tag.setAttribute('list', list.id);
    box.append(list);
    load()
      .then((rows) => {
        for (const value of new Set([
          'Inside LATFS',
          'Exhibition',
          'Visits',
          'Villanova at a glance',
          ...rows.map((p) => p.category).filter(Boolean),
        ])) {
          const option = document.createElement('option');
          option.value = value;
          list.append(option);
        }
      })
      .catch(() => {});
    input.addEventListener('change', () => {
      if (input.files[0]) status.textContent = 'New upload selected: ' + input.files[0].name;
    });
  });
}
async function uploadContentPhoto(file) {
  if (completedPhotoUploads.has(file)) return completedPhotoUploads.get(file);
  const input = [...document.querySelectorAll('input[type="file"]')].find(
    (el) => el.files[0] === file,
  );
  const controls = photoUploadControls.get(input);
  let url;
  if (controls?.add.checked) {
    const category = controls.tag.value.trim();
    if (!category) throw new Error('Choose a gallery tag for this photo.');
    const result = await uploadGallery(file, controls.caption.value.trim(), 0, category);
    url = result.image_url;
  } else {
    const fd = new FormData();
    fd.append('photo', file);
    url = (await api('/api/upload/photo', { method: 'POST', body: fd })).url;
  }
  completedPhotoUploads.set(file, url);
  return url;
}
