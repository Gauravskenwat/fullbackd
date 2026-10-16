/* SmartBus shared theme (light / dark / system).
   Loaded in <head> of every page so there is no flash. The ONLY place a user
   can change it is Profile -> Settings -> Theme; every other page just follows it. */
(function () {
  var KEY = 'sb_theme', root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
      // migrate older keys
      var s = JSON.parse(localStorage.getItem('sb_settings') || 'null');
      if (s && s.set && /^(Light|Dark|System)$/.test(s.set.theme)) return s.set.theme.toLowerCase();
      var p = JSON.parse(localStorage.getItem('sb_profile') || 'null');
      if (p && p.set && p.set.theme) return 'dark';
    } catch (e) {}
    return 'system';
  }
  function resolve(mode) { return mode === 'system' ? (mq && mq.matches ? 'dark' : 'light') : mode; }

  function apply(mode) {
    var r = resolve(mode);
    root.dataset.theme = r;            // 'light' | 'dark' (what every stylesheet keys on)
    root.dataset.themeMode = mode;     // what the user picked
    root.style.colorScheme = r;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', r === 'dark' ? '#17130f' : '#df5a00');
    try { window.dispatchEvent(new CustomEvent('sbthemechange', { detail: { mode: mode, theme: r } })); } catch (e) {}
  }

  var mode = read();
  apply(mode);

  window.SBTheme = {
    mode: function () { return mode; },
    theme: function () { return resolve(mode); },
    set: function (m) {
      if (m !== 'light' && m !== 'dark' && m !== 'system') return;
      mode = m;
      try { localStorage.setItem(KEY, m); } catch (e) {}
      apply(m);
    }
  };
  if (mq) (mq.addEventListener ? mq.addEventListener('change', function () { if (mode === 'system') apply(mode); })
                              : mq.addListener(function () { if (mode === 'system') apply(mode); }));
  window.addEventListener('storage', function (e) { if (e.key === KEY) { mode = read(); apply(mode); } });
})();
