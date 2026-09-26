export const AVATAR_GRADS = [
  'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)',
  'linear-gradient(135deg,#7a5e15 0%,#b8912a 100%)',
  'linear-gradient(135deg,#162041 0%,#4a6fa5 100%)',
  'linear-gradient(135deg,#2d4a78 0%,#0f172a 100%)',
  'linear-gradient(135deg,#9a7820 0%,#d4a942 100%)',
  'linear-gradient(135deg,#1e3a5f 0%,#2d4a78 100%)',
];

export function avatarGrad(name) {
  return AVATAR_GRADS[((name || '').charCodeAt(0) || 65) % AVATAR_GRADS.length];
}
export function getInitials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function activePeopleRows(rows) {
  return (rows || []).filter((p) => (p.active === undefined ? true : !!p.active));
}

export function formatMetricCount(value, fallback) {
  const n = Number(value || 0);
  if (!n) return fallback;
  return n > 99 ? `${n}+` : String(n).padStart(2, '0');
}

export function latestGalleryItems(gallery, limit = 5) {
  return (gallery || [])
    .slice()
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    .slice(0, limit);
}

export function fileLabelFromUrl(url) {
  const file =
    String(url || '')
      .split('/')
      .pop() || '';
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

export function assetUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return '/' + value.replace(/^\.?\//, '');
}

export function isImageDownload(item) {
  const mime = String(item?.mime_type || '').toLowerCase();
  const file = String(item?.file_url || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file);
}

export function fileKindLabel(item) {
  const file = String(item?.file_url || '').split('?')[0];
  const ext = (file.split('.').pop() || item?.category || 'file').slice(0, 4).toUpperCase();
  return ext || 'FILE';
}

export function fileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (!size) return '';
  if (size >= 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function matchesQuery(parts, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return true;
  return parts.filter(Boolean).join(' ').toLowerCase().includes(q);
}

export function fmtNewsDate(when) {
  if (!when) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(when)) {
    const dt = new Date(when);
    if (Number.isNaN(dt.getTime())) return '';
    return dt
      .toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      })
      .toUpperCase();
  }
  return when;
}
