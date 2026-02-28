/**
 * Inline script run before first paint to set data-theme and avoid FOUC.
 * Must be placed in <head>.
 */
export function ThemeScript() {
  const script = `
(function() {
  var key = 'secondbrain-theme';
  var stored = localStorage.getItem(key);
  var theme = stored === 'dark' || stored === 'light' ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
