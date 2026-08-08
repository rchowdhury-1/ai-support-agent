/** Pure DOM/constants helpers for the widget — no component state. */

export const STORAGE_PREFIX = 'supportai_v2_';
export const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,6..72,400..600&family=Schibsted+Grotesk:wght@400;600;700&display=swap';

// Static, trusted SVG fragments (never interpolated with user data).
export const ICONS = {
  chat: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-4.4A8.4 8.4 0 1 1 21 11.5z"></path></svg>',
  close: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
  send: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4z"></path></svg>',
  doc: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>',
  thumb: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h9.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3H14z"></path><path d="M6 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2"></path></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F7D4F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
  mail: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H8l-4 4z"></path><path d="M12 8v3"></path><path d="M12 13.5v.01"></path></svg>',
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Perceptual luminance of a #rrggbb colour (0–1) — for ink-contrast choices. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 0.3;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
