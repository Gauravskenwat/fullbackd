/* TrackB shared client: talks to the Flask backend (/api), keeps the login state in every page header,
   syncs the theme, and fills the notification bell. Loaded in <head> of every page that needs the server. */
(function () {
  'use strict';
  var me = document.currentScript;
  var ROOT = (me && me.getAttribute('data-root')) || './';
  var SB = window.SB = { ROOT: ROOT, user: null };

  /* ---------- API ---------- */
  function ApiErr(j, status) {
    var e = new Error((j && j.error) || 'Something went wrong. Please try again.');
    e.status = status; e.field = j && j.field; e.fields = j && j.fields; return e;
  }
  SB.api = function (method, url, body) {
    var opt = { method: method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch('/api' + url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.ok === false) throw ApiErr(j, r.status);
        return j;
      });
    }, function () { throw ApiErr({ error: 'Cannot reach the server. Check your connection and try again.' }, 0); });
  };
  SB.get = function (u) { return SB.api('GET', u); };
  SB.post = function (u, b) { return SB.api('POST', u, b || {}); };
  SB.put = function (u, b) { return SB.api('PUT', u, b || {}); };
  SB.del = function (u) { return SB.api('DELETE', u); };
  SB.say = function (m) { if (typeof toast === 'function') toast(m); else alert(m); };
  SB.fail = function (e) { if (e && e.status === 401) { SB.needLogin(); return; } SB.say(e && e.message ? e.message : 'Something went wrong.'); };
  SB.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  SB.first = function () { return SB.user ? SB.user.name.split(' ')[0] : ''; };
  SB.loginUrl = function (mode) {
    return ROOT + 'trackb-signup/index.html?mode=' + (mode || 'login') + '&next=' + encodeURIComponent(location.pathname + location.search + location.hash);
  };
  SB.needLogin = function () { SB.say('Please log in to continue.'); setTimeout(function () { location.href = SB.loginUrl('login'); }, 700); };

  /* ---------- session ---------- */
  var readyRes;
  SB.ready = new Promise(function (r) { readyRes = r; });
  function loadMe() {
    return SB.get('/auth/me').then(function (j) { SB.user = j.user; }, function () { SB.user = null; }).then(function () {
      if (SB.user && window.SBTheme && SB.user.theme && SB.user.theme !== SBTheme.mode()) SBTheme.set(SB.user.theme);
      readyRes(SB.user);
    });
  }
  /* Run fn once the session is known. requireLogin=true redirects guests to the login page first. */
  SB.boot = function (fn, requireLogin) {
    return SB.ready.then(function (u) {
      if (requireLogin && !u) { location.replace(SB.loginUrl('login')); return; }
      return fn(u);
    });
  };
  SB.logout = function () {
    return SB.post('/auth/logout').then(function () { SB.say('You have been logged out'); setTimeout(function () { location.href = ROOT + 'index.html'; }, 700); },
      function () { location.href = ROOT + 'index.html'; });
  };

  /* ---------- header ---------- */
  function paintAuth() {
    var u = SB.user;
    var box = document.getElementById('auth');                    // services / history / delivery / profile / developers
    if (box && u) { box.innerHTML = '<b style="white-space:nowrap">Hello, ' + SB.esc(SB.first()) + '</b><button class="lnk" id="logoutBtn" type="button">Logout</button>'; }
    document.querySelectorAll('.nav-actions [data-modal]').forEach(function (b) {   // home page
      if (u) b.remove();
    });
    var na = document.querySelector('.nav-actions');
    if (na && u && !document.getElementById('logoutBtn')) {
      var s = document.createElement('span'); s.style.cssText = 'display:flex;align-items:center;gap:10px;font-weight:600';
      s.innerHTML = '<span>Hello, ' + SB.esc(SB.first()) + '</span><button class="btn ghost" id="logoutBtn" type="button">Logout</button>';
      na.insertBefore(s, na.firstChild);
    }
    var um = document.getElementById('um');                       // tracking page
    if (um) {
      if (u) { um.childNodes[0].textContent = 'Hello, ' + SB.first() + ' '; }
      else { um.style.display = 'none';
        if (!document.getElementById('loginBtn')) { var a = document.createElement('a'); a.id = 'loginBtn'; a.className = 'btn ghost'; a.href = SB.loginUrl('login'); a.textContent = 'Login'; um.parentNode.insertBefore(a, um); } }
    }
    document.querySelectorAll('.who').forEach(function (w) {      // sidebar identity card
      var b = w.querySelector('b'), sm = w.querySelector('small');
      if (u) { if (b) b.textContent = u.name; if (sm) sm.textContent = u.email; }
      else { if (b) b.textContent = 'Guest'; if (sm) sm.textContent = 'Log in to see your details'; var v = w.querySelector('.vf'); if (v) v.style.display = 'none'; }
    });
    var cta = document.querySelector('section.cta'); if (cta && u) cta.style.display = 'none';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('#logoutBtn')) { e.preventDefault(); SB.logout(); return; }
    var us = e.target.closest('#upop [data-u]');
    if (us) { var k = us.getAttribute('data-u'); if (k === 'Signed out') { e.stopPropagation(); SB.logout(); } else if (k === 'My tickets') { e.stopPropagation(); location.href = ROOT + 'history/index.html'; } }
  }, true);

  /* ---------- notification bell ---------- */
  var DEST = { booking: 'history/index.html', reminder: 'tracking/index.html', service: 'tracking/index.html', promo: 'index.html#offers2', system: 'profile/index.html' };
  SB.paintBell = function () {
    var pop = document.getElementById('npop'), dot = document.getElementById('bdot');
    if (!pop) return Promise.resolve();
    pop.onclick = function (e) { e.stopPropagation(); };
    if (!SB.user) {
      if (dot) dot.style.display = 'none';
      pop.innerHTML = '<button data-login="1"><b>Log in to see notifications</b><small>Booking updates and trip alerts appear here</small></button>';
      pop.querySelector('button').onclick = function () { location.href = SB.loginUrl('login'); };
      return Promise.resolve();
    }
    return SB.get('/notifications').then(function (j) {
      var unread = j.items.filter(function (n) { return !n.r; });
      if (dot) dot.style.display = unread.length ? '' : 'none';
      var show = (unread.length ? unread : j.items).slice(0, 4);
      pop.innerHTML = show.length ? show.map(function (n) {
        return '<button data-n="' + n.id + '" data-k="' + n.k + '"><b>' + SB.esc({ booking: 'Booking update', reminder: 'Trip reminder', service: 'Service alert', promo: 'Offer', system: 'Update' }[n.k] || 'Notification') + '</b><small>' + SB.esc(n.t) + ' · ' + SB.esc(n.m) + '</small></button>';
      }).join('') + '<button data-all="1"><b>View all notifications</b></button>' : '<button>You are all caught up</button>';
      pop.querySelectorAll('button').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          if (b.dataset.all) { location.href = ROOT + 'profile/notifications/index.html'; return; }
          if (!b.dataset.n) return;
          SB.post('/notifications/' + b.dataset.n + '/read', { read: true }).then(function () { location.href = ROOT + (DEST[b.dataset.k] || 'profile/index.html'); }, function () { location.href = ROOT + (DEST[b.dataset.k] || 'profile/index.html'); });
        };
      });
    }, function () {});
  };

  /* ---------- offline hint ---------- */
  if (location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#b42318;color:#fff;padding:10px 14px;font:600 14px system-ui;text-align:center';
      d.textContent = 'This site needs its server. Run "python run.py" and open http://localhost:8000 instead of opening the file directly.';
      document.body.appendChild(d);
    });
  }

  loadMe().then(function () {
    function go() { paintAuth(); SB.paintBell(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { paintAuth(); SB.paintBell(); }, 0); });
  });
})();
