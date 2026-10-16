/* SmartBus / TrackB shared behaviour: newsletter, ad slider controls, help chatbot. */
(function () {
  'use strict';
  var script = document.currentScript || document.querySelector('script[data-root]');
  var ROOT = (script && script.getAttribute('data-root')) || './';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Newsletter ---------- */
  var nf = $('#sbfNews');
  if (nf) nf.addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('#sbfEmail'), msg = $('#sbfMsg'), v = inp.value.trim().toLowerCase();
    msg.className = 'sbf-msg';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.className = 'sbf-msg err'; msg.textContent = 'Enter a valid email address, like name@example.com.'; inp.focus(); return; }
    msg.textContent = 'Subscribing…';
    SB.post('/newsletter', { email: v }).then(function (r) { msg.textContent = r.message; if (!r.already) inp.value = ''; },
      function (err) { msg.className = 'sbf-msg err'; msg.textContent = err.message; });
  });


  /* ---------- Profile side menu: after a click, land on that section ---------- */
  (function () {
    var nav = document.getElementById('navs'), main = document.querySelector('.wrap .main, main.main');
    var KEY = 'sb_scroll_main';
    function toMain() { if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (nav) nav.addEventListener('click', function (e) {
      if (e.target.closest('.nv[data-t],.nv[data-v]') && !e.target.closest('.lo')) { try { sessionStorage.setItem(KEY, '1'); } catch (x) {} setTimeout(function () { try { sessionStorage.removeItem(KEY); } catch (x) {} }, 1500); setTimeout(toMain, 60); }
    }, true);
    var go = false; try { go = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (x) {}
    if (go && main) setTimeout(toMain, 120);
  })();
  /* ---------- Chatbot ---------- */
  // Answers come from the server (POST /api/chat, see backend/support.py). If the server is unreachable the built-in answers below are used.
  var P = function (p) { return ROOT + p; };
  var CITIES = ['Delhi','Mumbai','Pune','Bengaluru','Hyderabad','Chennai','Kolkata','Ahmedabad','Jaipur','Lucknow','Chandigarh','Manali','Shimla','Amritsar','Dehradun','Goa','Kochi','Nagpur','Indore','Bhopal','Surat','Udaipur','Coimbatore'];
  var L = {
    book:{t:'Book a bus',h:P('services/index.html?s=booking')}, search:{t:'Search routes',h:P('services/index.html?s=search')},
    seats:{t:'Choose seats',h:P('services/index.html?s=seats')}, pay:{t:'Online payment',h:P('services/index.html?s=pay')},
    cancel:{t:'Cancel a booking',h:P('services/index.html?s=cancel')}, track:{t:'Track a bus',h:P('tracking/index.html')},
    parcel:{t:'Parcel delivery',h:P('delivery/index.html')}, trips:{t:'My trips',h:P('history/index.html')}, offers:{t:'See offers',h:P('index.html#offers2')},
    profile:{t:'My profile',h:P('profile/index.html')}, cards:{t:'Payment methods',h:P('profile/payment-methods/index.html')},
    notif:{t:'Notifications',h:P('profile/notifications/index.html')}, settings:{t:'Settings',h:P('profile/settings/index.html')},
    saved:{t:'Saved routes',h:P('profile/saved-routes/index.html')}, help:{t:'Help Center',h:P('pages/help.html')},
    contact:{t:'Contact us',h:P('pages/contact.html')}, terms:{t:'Terms & Conditions',h:P('pages/terms.html')},
    privacy:{t:'Privacy Policy',h:P('pages/privacy.html')}, signup:{t:'Sign up',h:P('trackb-signup/index.html?mode=signup')},
    login:{t:'Log in',h:P('trackb-signup/index.html?mode=login')}, careers:{t:'Careers',h:P('pages/careers.html')}, about:{t:'About us',h:P('pages/about.html')}
  };
  var KB = [
    {k:['book','booking','ticket','reserve','buy ticket'],a:'To book a ticket:\n1. Enter **From** and **To** on the home page and press Search.\n2. Pick a bus and choose your seats.\n3. Pay with UPI, card or wallet. You get instant confirmation.',l:['book','search','seats']},
    {k:['seat','seats','window','aisle','sleeper','berth'],a:'You can pick your own seats on the live seat map. Booked seats are greyed out. You can select up to the number of passengers you entered.',l:['seats','book']},
    {k:['cancel','cancellation','cancelled'],a:'Open **My Trips**, tap an upcoming trip, then choose **Cancel**. The refund amount depends on how close to departure you cancel, and it goes back to your original payment method.',l:['cancel','trips']},
    {k:['refund','money back','refunded'],a:'Refunds go back to the original payment method. UPI and wallets are usually quicker than cards, and cards can take 5 to 7 working days. Cancelling earlier gets you a bigger refund.',l:['trips','terms']},
    {k:['track','tracking','live','where is my bus','location','eta','map','gps'],a:'Open **Track Bus** to see your bus moving on the map with live position and estimated arrival. You can also open the route in Google Maps from there.',l:['track']},
    {k:['pay','payment','upi','card','visa','mastercard','rupay','wallet','netbanking','failed payment','payment failed'],a:'We accept UPI, debit and credit cards (Visa, Mastercard, RuPay) and wallets. Saved cards live in **Payment Methods**. If money was deducted but you got no ticket, it is reversed automatically within 5 to 7 working days. Contact us if it is not.',l:['pay','cards','contact']},
    {k:['coupon','code','offer','offers','discount','promo','cashback','deal'],a:'Current codes:\n- **TRACKB20**: 20% off your first booking (up to ₹200)\n- **UPI10**: 10% cashback on UPI (up to ₹150)\n- **WEEKEND30**: 30% off Friday to Sunday trips\n- **STUDENT15**: 15% off with a valid student ID\n- **FRIEND100**: ₹100 off when you invite a friend\nUse one code per booking, at checkout.',l:['offers','book']},
    {k:['student','id card'],a:'Use **STUDENT15** for 15% off. Carry a valid student ID while travelling, as the conductor may check it.',l:['offers']},
    {k:['login','log in','sign in','signin','password','forgot','otp'],a:'Use **Log in** at the top of the page. If you forgot your password, choose the reset option on the login page.',l:['login','signup']},
    {k:['signup','sign up','register','create account','account','new user'],a:'Creating an account is free and takes under a minute. New users get 20% off the first trip with **TRACKB20**.',l:['signup']},
    {k:['profile','edit profile','name','phone number','email change','avatar','photo'],a:'You can update your name, email, phone and photo in **My Profile**.',l:['profile']},
    {k:['saved route','favourite','favorite','save route'],a:'Save the routes you travel often in **Saved Routes** to book them faster next time.',l:['saved']},
    {k:['notification','alert','reminder','sms','whatsapp'],a:'Choose which alerts you get (departure reminders, delay alerts, offers) in **Notifications** and **Settings**.',l:['notif','settings']},
    {k:['dark','theme','light mode','dark mode'],a:'Change Light, Dark or System theme in **Settings → Theme**. Every page follows it.',l:['settings']},
    {k:['parcel','courier','deliver','delivery','send luggage','send parcel','send material','material','cargo','shipment','consignment','send documents','send bag'],a:'You can send **luggage, documents, parcels and material** on a bus with TrackB Parcel Delivery. Choose the item, pick a bus, add sender and receiver details and pay. Hand it over at the bus stand (or choose pickup) and the receiver collects it with an OTP, or gets it at the door. Track it with your consignment ID.',l:['parcel','track']},
    {k:['luggage','baggage','bag','pet','child','infant','age','id proof','document'],a:'Each passenger can usually carry one cabin bag and one larger bag. Carry a government photo ID. Children above 5 need their own seat. Rules vary by operator, so check the operator note on the booking page.',l:['terms','contact']},
    {k:['delay','late','missed','miss bus','no show','breakdown'],a:'Delays are shown live on **Track Bus**, and you get an alert if your bus runs late. If you miss a bus, contact support right away and we will tell you what the operator allows.',l:['track','contact']},
    {k:['safe','safety','secure','security','privacy','data'],a:'Payments are processed through secure gateways and we never store full card numbers. See how we handle data in the Privacy Policy.',l:['privacy']},
    {k:['contact','support','agent','human','call','phone','email','helpline','complaint','talk'],a:'You can reach a person any time:\n- Phone: **+91 98765 43210** (24/7)\n- Email: **support@smartbus.in**\n- Office: Sector 62, Noida, Uttar Pradesh 201309',l:['contact','help']},
    {k:['career','job','hiring','work with','vacancy'],a:'We are hiring across engineering, operations and support. See open roles on the Careers page.',l:['careers']},
    {k:['about','company','who are you','founder','team','trackb','smartbus'],a:'TrackB (SmartBus) is an intercity bus platform for booking and live tracking, built in India.',l:['about']},
    {k:['terms','conditions','policy','policies'],a:'Our rules for bookings, cancellations and refunds are in the Terms & Conditions.',l:['terms','privacy']},
    {k:['trip','trips','history','booking history','my booking','upcoming','past'],a:'All your bookings, upcoming, completed and cancelled, are in **My Trips**. You can download a receipt, rate a trip or book it again from there.',l:['trips']},
    {k:['receipt','invoice','gst','bill'],a:'Open the trip in **My Trips** and choose **Download receipt**.',l:['trips']},
    {k:['hello','hi','hey','hii','namaste','good morning','good evening'],a:'Hi! I can help with booking, tracking, cancellations, payments and offers. What do you need?',l:[]},
    {k:['thanks','thank you','thx','ok thanks','great'],a:'Happy to help. Safe travels!',l:[]}
  ];
  var CHIPS = ['How do I book?','Track my bus','Cancel a booking','Refund status','Coupon codes','Talk to support'];
  var norm = function (s) { return ' ' + s.toLowerCase().replace(/[^a-z0-9₹ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; };
  function localAnswer(q) {
    var n = norm(q), m = q.match(/(?:from\s+)?([a-z() ]{3,})\s+(?:to|→|->)\s+([a-z() ]{3,})/i);
    if (m) {
      var f = CITIES.filter(function (c) { return n.indexOf(c.toLowerCase()) > -1; });
      var a = m[1].trim().toLowerCase(), b = m[2].trim().toLowerCase(), from = null, to = null;
      CITIES.forEach(function (c) { var lc = c.toLowerCase(); if (a.indexOf(lc) > -1) from = c; if (b.indexOf(lc) > -1) to = c; });
      if (from && to && from !== to) return {a:'Looking for buses from **' + from + '** to **' + to + '**? Open the search with the cities already filled in.',acts:[{t:'Search ' + from + ' → ' + to,h:P('index.html?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to))}]};
      if (f.length) return {a:'Tell me both cities, for example "Delhi to Manali", and I will open the search for you.',acts:[]};
    }
    var best = null, bs = 0;
    KB.forEach(function (e) {
      var s = 0; e.k.forEach(function (w) { if (n.indexOf(' ' + w + ' ') > -1 || (w.length > 4 && n.indexOf(w) > -1)) s += w.indexOf(' ') > -1 ? 3 : 2; });
      if (s > bs) { bs = s; best = e; }
    });
    if (best && bs >= 2) return {a:best.a,acts:best.l.map(function (x) { return L[x]; })};
    return {a:'I am not sure about that one. You could try the Help Center, or reach our support team directly. They are available 24/7.',acts:[L.help,L.contact]};
  }

  var SVG = {
    chat:'<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>',
    bot:'<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4M9 13.5h.01M15 13.5h.01M9.5 16.5h5"/></svg>',
    send:'<svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>'
  };
  var root = document.documentElement, hist = [], busy = false;
  try { hist = JSON.parse(sessionStorage.getItem('sb_chat') || '[]'); } catch (e) {}
  var launcher = document.createElement('button');
  launcher.className = 'sbc-btn'; launcher.type = 'button'; launcher.setAttribute('aria-label', 'Open help chat');
  launcher.innerHTML = SVG.chat + '<span>Help</span><i class="sbc-pulse"></i>';
  var box = document.createElement('section');
  box.className = 'sbc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'TrackB help assistant');
  box.innerHTML = '<div class="sbc-h"><span class="sbc-av">' + SVG.bot + '</span><div><b>TrackB Assistant</b><small>Online · replies instantly</small></div><button type="button" data-clear aria-label="Start a new chat" title="New chat">↺</button><button type="button" data-close aria-label="Close chat">×</button></div>' +
    '<div class="sbc-log" role="log" aria-live="polite"></div><div class="sbc-chips"></div>' +
    '<form class="sbc-f"><input type="text" maxlength="300" autocomplete="off" placeholder="Ask about booking, refunds, offers…" aria-label="Your message"><button type="submit" aria-label="Send">' + SVG.send + '</button></form>' +
    '<div class="sbc-note">Automated help. For anything urgent, call +91 98765 43210.</div>';
  document.body.appendChild(launcher); document.body.appendChild(box);
  var log = $('.sbc-log', box), inp = $('input', box), chips = $('.sbc-chips', box);
  CHIPS.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sbc-chip'; b.textContent = c; b.onclick = function () { ask(c); }; chips.appendChild(b); });

  function fmt(el, text) {                       // safe: **bold**, line breaks, "- " bullets, never innerHTML
    var ul = null;
    String(text).split('\n').forEach(function (line) {
      var isLi = /^\s*(-|\d+\.)\s+/.test(line), target;
      if (isLi) { if (!ul) { ul = document.createElement('ul'); el.appendChild(ul); } target = document.createElement('li'); ul.appendChild(target); line = line.replace(/^\s*(-|\d+\.)\s+/, ''); }
      else { ul = null; target = document.createElement('p'); el.appendChild(target); }
      line.split(/(\*\*[^*]+\*\*)/).forEach(function (part) {
        if (/^\*\*[^*]+\*\*$/.test(part)) { var b = document.createElement('b'); b.textContent = part.slice(2, -2); target.appendChild(b); }
        else target.appendChild(document.createTextNode(part));
      });
    });
  }
  function add(role, text, acts, silent) {
    var d = document.createElement('div'); d.className = 'sbc-m ' + (role === 'me' ? 'me' : 'bot');
    if (role === 'me') d.textContent = text; else fmt(d, text);
    if (acts && acts.length) { var w = document.createElement('div'); w.className = 'sbc-acts'; acts.forEach(function (a) { if (!a) return; var x = document.createElement('a'); x.href = a.h; x.textContent = a.t; w.appendChild(x); }); d.appendChild(w); }
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    if (!silent) { hist.push({role: role, text: text, acts: acts || []}); hist = hist.slice(-30); try { sessionStorage.setItem('sb_chat', JSON.stringify(hist)); } catch (e) {} }
    return d;
  }
  function greet() { add('bot', 'Hi, I am the TrackB assistant. I can help with booking, live tracking, cancellations, refunds, payments and offers. What do you need?', [], false); }
  if (hist.length) hist.forEach(function (m) { add(m.role, m.text, (m.acts || []).filter(Boolean), true); }); else greet();

  function ask(q) {
    q = (q || '').trim(); if (!q || busy) return;
    busy = true; add('me', q); inp.value = '';
    var t = document.createElement('div'); t.className = 'sbc-m bot'; t.innerHTML = '<span class="sbc-dots"><i></i><i></i><i></i></span>'; log.appendChild(t); log.scrollTop = log.scrollHeight;
    var done = function (r) { setTimeout(function () { t.remove(); add('bot', r.a, r.acts); busy = false; }, 350 + Math.min(r.a.length * 3, 600)); };
    SB.post('/chat', { message: q }).then(function (j) {
      var acts = (j.actions || []).map(function (a) {
        if (a.search) return { t: 'Search ' + a.search.from + ' → ' + a.search.to, h: P('index.html?from=' + encodeURIComponent(a.search.from) + '&to=' + encodeURIComponent(a.search.to)) };
        return L[a.key];
      }).filter(Boolean);
      done({ a: String(j.reply), acts: acts });
    }).catch(function () { done(localAnswer(q)); });   // offline: built-in answers
  }
  function open() { root.classList.add('sbc-open'); launcher.setAttribute('aria-expanded', 'true'); setTimeout(function () { inp.focus(); log.scrollTop = log.scrollHeight; }, 60); }
  function close() { root.classList.remove('sbc-open'); launcher.focus(); }
  launcher.onclick = open;
  $('[data-close]', box).onclick = close;
  $('[data-clear]', box).onclick = function () { hist = []; try { sessionStorage.removeItem('sb_chat'); } catch (e) {} log.innerHTML = ''; greet(); };
  $('form', box).addEventListener('submit', function (e) { e.preventDefault(); ask(inp.value); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('sbc-open')) close(); });
  document.addEventListener('click', function (e) { var o = e.target.closest('[data-open-chat]'); if (o) { e.preventDefault(); open(); } });
  window.SBChat = {open: open, close: close, ask: function (q) { open(); ask(q); }};
  if (/[?&]chat=1\b/.test(location.search)) open();
})();
