/** Create elements without interpolating content-managed strings into HTML. */
export function h(tag, attrs, ...kids) {
  const element = document.createElement(tag);
  for (const [key, rawValue] of Object.entries(attrs || {})) {
    let value = key === 'href' ? safeHref(rawValue) : rawValue;
    if (
      key === 'href' &&
      /^#(?:home|research|people|person|white-papers|publications|facilities|facility|news|gallery|apps|downloads|join|contact)(?:\/[^/]+)?$/.test(
        value || '',
      )
    )
      value = value === '#home' ? '/' : '/' + value.slice(1);
    if (key === 'class') element.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else if (key === 'html') element.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function')
      element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value != null && value !== false) element.setAttribute(key, value);
  }
  if (tag === 'button' && !element.hasAttribute('type')) element.setAttribute('type', 'button');
  for (const child of kids.flat()) {
    if (child == null || child === false) continue;
    element.appendChild(
      typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(String(child))
        : child,
    );
  }
  return element;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

/** Prevent content-managed link fields from creating executable URLs. */
export function safeHref(value) {
  if (value == null) return null;
  const href = String(value).trim();
  try {
    const url = new URL(href, 'https://site.invalid/');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}
