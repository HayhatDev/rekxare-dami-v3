(function () {
  // Anti-flash bootstrap: runs synchronously in <head> before the first
  // paint, while the app bundle is still downloading. Applies the stored
  // theme (data-theme + .dark) and a matching background color so dark-theme
  // PWA launches don't flash white before React mounts. Palette hexes mirror
  // src/themes/palette.ts (THEME_COLORS[x].bg).
  var bg = {
    clay: { light: '#F0EAF8', dark: '#1E1C2E' },
    clarity: { light: '#F5F0E8', dark: '#161513' },
    mountain: { light: '#E8EEE4', dark: '#1A2418' },
    forest: { light: '#D4E8D0', dark: '#0C160B' },
    ocean: { light: '#EBF4FB', dark: '#06101E' },
    'night-sky': { light: '#EEF2FA', dark: '#06091A' }
  };
  var root = document.documentElement;
  var id = null;
  var dark = false;
  try {
    var stored = localStorage.getItem('rekxare_theme');
    if (stored && bg[stored]) id = stored;
    dark = localStorage.getItem('rekxare_dark') === 'true';
  } catch (e) {}
  if (!id) id = 'clarity';
  root.setAttribute('data-theme', id);
  if (dark) root.classList.add('dark');
  else root.classList.remove('dark');
  var color = bg[id][dark ? 'dark' : 'light'];
  root.style.backgroundColor = color;
  if (document.body) document.body.style.backgroundColor = color;
})();