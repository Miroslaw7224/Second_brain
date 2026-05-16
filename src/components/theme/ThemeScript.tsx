/**
 * Inline script run before first paint to set data-theme and avoid FOUC.
 * Must be placed in <head>.
 */
export function ThemeScript() {
  const script = `
(function() {
  var oldKey = 'secondbrain-theme';
  var key = 'nexus-theme';
  var migrated = localStorage.getItem(oldKey);
  var prev = localStorage.getItem(key);
  if ((!prev || (prev !== 'dark' && prev !== 'light')) && (migrated === 'dark' || migrated === 'light')) {
    localStorage.setItem(key, migrated);
    localStorage.removeItem(oldKey);
  }
  var stored = localStorage.getItem(key);
  var theme = stored === 'dark' || stored === 'light' ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
