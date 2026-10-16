const I={menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
cal:'<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>',
pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',book:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M3 10h6M3 15h6"/>',
card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',chev:'<path d="M9 18l6-6-6-6"/>',lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',palette:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a4 4 0 0 0 4-4 9 9 0 0 0-9-10z"/>',ruler:'<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',ux:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 9l5 5M22 9l-5 5"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',cam:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const hydrate=r=>r.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=ic(e.dataset.i));hydrate(document);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)};
const dlg=$('#dlg'),open=(t,h)=>{$('#dt').textContent=t;$('#dbody').innerHTML=h;if(!dlg.open)dlg.showModal()};
$('#dx').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
const EM=/^\S+@\S+\.\S+$/;

/* State (saved in this browser when allowed) */
const DEF={P:{name:'Aarav Mehta',email:'aarav.mehta@gmail.com',phone:'+91 98765 43210',dob:'1990-03-15',gender:'Male',address:'B-204, Shivaji Nagar, Pune, Maharashtra 411005'},
cards:[{n:'Visa ending 4242',e:'Exp 08/27'},{n:'Mastercard ending 1881',e:'Exp 02/29'}],
routes:[['Delhi','Manali'],['Mumbai','Pune'],['Bengaluru','Hyderabad']],
notif:{'Trip reminders':1,'Offers and discounts':0,'Booking updates':1,'Bus delay alerts':1},set:{theme:'Light',lang:'English',units:'Metric (km, °C)'},priv:{usage:1,offers:0,profile:1},loc:1,blocked:['Imran Qureshi','Karthik Subramanian','Pooja Deshmukh']};
let ST=JSON.parse(JSON.stringify(DEF));
const save=()=>{};   /* nothing is kept in the browser: every change is saved by the server through an API call */
let BK=[];
const loadState=async()=>{const [a,n,b]=await Promise.all([SB.get('/account'),SB.get('/notifications'),SB.get('/bookings')]);
ST.P=a.profile;ST.cards=a.cards;ST.routes=a.routes;ST.notif=a.notif;ST.recent=n.items;ST.blocked=a.blocked.map(x=>x.name);ST.blockedIds=a.blocked.map(x=>x.id);
ST.set=Object.assign({},ST.set,a.settings);ST.priv=a.settings.priv;ST.loc=a.settings.loc;
BK=b.trips.map(t=>[t.id,t.from+' → '+t.to,new Date(t.date+'T00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),t.status[0].toUpperCase()+t.status.slice(1)])};
const dfmt=v=>v?new Date(v+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'—';
const modeOf=()=>window.SBTheme?SBTheme.mode():'system';ST.set.theme=modeOf()[0].toUpperCase()+modeOf().slice(1);


/* Theme switch - the only place in the whole site where the theme can be changed */
const themeRow=()=>{const m=modeOf(),o=[['light','Light','sun'],['dark','Dark','moon'],['system','System','monitor']];
return `<div class="sr tr"><span class="pi">${ic('palette')}</span><span class="grow"><b>Theme</b><small>Applies to every page: home, login, sign up, live map, services and history</small></span><span class="seg" role="radiogroup" aria-label="Theme">${o.map(x=>`<button type="button" role="radio" aria-checked="${m==x[0]}" class="${m==x[0]?'on':''}" data-theme-set="${x[0]}">${ic(x[2])}<span>${x[1]}</span></button>`).join('')}</span></div>`};
document.addEventListener('click',e=>{const b=e.target.closest('[data-theme-set]');if(!b)return;SBTheme.set(b.dataset.themeSet);ST.set.theme=b.textContent.trim();render();SB.put('/settings',{theme:b.dataset.themeSet}).then(()=>toast('Theme: '+b.textContent.trim()),SB.fail)});

/* Sidebar */
const TABS=[['bookings','My Bookings','book','Your recent trips with SmartBus.'],['profile','My Profile','user','Update your personal information.'],['payments','Payment Methods','card','Manage the cards you pay with.'],['notifications','Notifications','bell','Choose which updates you receive.'],['routes','Saved Routes','pin','Quick access to your favourite trips.'],['settings','Settings','gear','Manage your account preferences and app settings.']];
let tab='settings',edit=false,errs={};
$('#navs').innerHTML=TABS.map(t=>`<button class="nv" data-t="${t[0]}">${ic(t[2])}<span>${t[1]}</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`).join('')+`<button class="nv" data-t="developers">${ic('users')}<span>Developers</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`+`<button class="nv lo" id="lo">${ic('out')}<span>Logout</span></button>`;
const TABURL={'bookings': '../index.html?tab=bookings', 'profile': '../index.html?tab=profile', 'payments': '../payment-methods/index.html', 'notifications': '../notifications/index.html', 'routes': '../saved-routes/index.html', 'settings': null, 'developers': '../../developers/index.html'};
$('#navs').onclick=e=>{const b=e.target.closest('.nv');if(!b)return;if(b.id=='lo')return logout();if(TABURL[b.dataset.t]){location.href=TABURL[b.dataset.t];return}tab=b.dataset.t;edit=false;errs={};render();if(innerWidth<1000)$('.main').scrollIntoView({behavior:'smooth'})};
function logout(){open('Log out?','<div>Are you sure you want to log out of SmartBus?</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Stay</button><button class="btn red" id="yes" style="flex:1">Log out</button></div>');$('#no').onclick=()=>dlg.close();$('#yes').onclick=()=>{dlg.close();SB.logout()}}

/* Panels */
function render(){const t=TABS.find(x=>x[0]==tab);$$('.nv[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));
$('#mt').textContent=t[1];$('#ms').textContent=t[3];$('#sn').textContent=ST.P.name;$('#se').textContent=ST.P.email;
$('#mact').innerHTML=tab=='profile'&&!edit?'<button class="btn o sm" id="ed">Edit</button>':tab=='payments'?'<button class="btn sm" id="addc">Add card</button>':tab=='routes'?'<button class="btn sm" id="addr">Add route</button>':'';
$('#body').innerHTML=({profile:pProfile,bookings:pBook,payments:pPay,notifications:pNot,routes:pRoutes,settings:pSet})[tab]();hydrate($('#body'))}
const row=(i,k,v)=>`<div class="pr">${ic(i)}<span class="k">${k}</span><span class="v">${v}</span></div>`;
let draft=null;function pProfile(){const p=edit&&draft?draft:ST.P;if(!edit)return row('user','Full Name',esc(p.name))+row('mail','Email Address',esc(p.email))+row('phone','Phone Number',esc(p.phone))+row('cal','Date of Birth',dfmt(p.dob))+row('users','Gender',esc(p.gender))+row('pin','Address',esc(p.address));
const f=(i,k,id,inp)=>`<div class="pr">${ic(i)}<label class="k" for="${id}">${k}</label><span class="fld">${inp}</span>${errs[id]?`<span class="er">${errs[id]}</span>`:''}</div>`;
return f('user','Full Name','f_name',`<input id="f_name" value="${esc(p.name)}">`)+f('mail','Email Address','f_email',`<input id="f_email" type="email" value="${esc(p.email)}">`)+f('phone','Phone Number','f_phone',`<input id="f_phone" value="${esc(p.phone)}">`)+f('cal','Date of Birth','f_dob',`<input id="f_dob" type="date" value="${p.dob}">`)+f('users','Gender','f_gender',`<select id="f_gender">${['Male','Female','Other','Prefer not to say'].map(g=>`<option${g==p.gender?' selected':''}>${g}</option>`).join('')}</select>`)+f('pin','Address','f_address',`<input id="f_address" value="${esc(p.address)}">`)+`<div class="ac"><button class="btn o sm" id="cn">Cancel</button><button class="btn sm" id="sv">Save changes</button></div>`}
const pBook=()=>BK.map(b=>`<div class="li"><div class="grow"><b>${b[1]}</b><small>${b[0]} · ${b[2]}</small></div><span class="pill ${b[3]=='Cancelled'?'c':''}">${b[3]}</span></div>`).join('');
const pPay=()=>ST.cards.length?ST.cards.map((c,i)=>`<div class="li">${ic('card')}<div class="grow"><b>${esc(c.n)}</b><small>${esc(c.e)}</small></div><button class="rm" data-rc="${i}">Remove</button></div>`).join(''):'<p style="color:var(--mut)">No saved cards yet. Use “Add card” to save one.</p>';
const sw=(id,on)=>`<span class="sw"><input type="checkbox" id="${id}" ${on?'checked':''}><i></i></span>`;
const pNot=()=>Object.keys(ST.notif).map(k=>`<div class="li"><label class="grow" for="n_${k}"><b>${k}</b></label>${sw('n_'+k,ST.notif[k])}</div>`).join('');
const pRoutes=()=>ST.routes.length?ST.routes.map((r,i)=>`<div class="li">${ic('pin')}<div class="grow"><b>${esc(r[0])} → ${esc(r[1])}</b></div><button class="btn o sm" data-rt="${i}">Book</button><button class="rm" data-rr="${i}">Remove</button></div>`).join(''):'<p style="color:var(--mut)">No saved routes. Use “Add route” to create one.</p>';
const sbtn=(a,i,t,d,r,cls='')=>`<button class="sr ${cls}" data-sa="${a}"><span class="pi">${ic(i)}</span><span class="grow"><b>${t}</b><small>${d}</small></span>${r||ic('chev').replace('class="ic"','class="ic ch"')}</button>`;
const ssel=(id,i,t,d,o,v)=>`<div class="sr"><span class="pi">${ic(i)}</span><label class="grow" for="${id}"><b>${t}</b><small>${d}</small></label><select id="${id}" class="ss">${o.map(x=>`<option${x==v?' selected':''}>${x}</option>`).join('')}</select></div>`;
const pSet=()=>`<h2 class="sh2">Account Settings</h2>${sbtn('personal','user','Personal Information','Update your name, email, and contact details')}${sbtn('password','lock','Change Password','Update your password for account security')}
<h2 class="sh2 gap">App Preferences</h2>${ssel('sl','globe','Language','Choose your preferred language',['English','हिन्दी','ગુજરાતી'],ST.set.lang)}${themeRow()}${ssel('su','ruler','Units','Choose your preferred units of measurement',['Metric (km, °C)','Imperial (mi, °F)'],ST.set.units)}
<h2 class="sh2 gap">Privacy &amp; Security</h2>${sbtn('privacy','shield','Privacy Settings','Manage your privacy and data sharing preferences')}${sbtn('location','pin','Location Permissions','Manage location access for better service')}${sbtn('blocked','ux','Blocked Users','Manage blocked users and contacts')}
<h2 class="sh2 gap">Support &amp; About</h2>${sbtn('help','help','Help Center','Get help and find answers to common questions')}${sbtn('about','info','About SmartBus','App version, terms and policies','<span class="vb">v2.1.0</span>')}${sbtn('delete','trash','Delete Account','Permanently delete your account and all data','','dng')}`;


/* Actions */
document.addEventListener('click',e=>{const id=e.target.id,d=e.target.dataset;
if(id=='ed'){draft=null;edit=true;errs={};render();$('#f_name').focus()}
if(id=='cn'){draft=null;edit=false;errs={};render()}
if(id=='sv')saveProfile();
if(id=='addc')addCard();if(id=='addr')addRoute();
if(d.rc!==undefined){ST.cards.splice(+d.rc,1);save();render();toast('Card removed')}
if(d.rr!==undefined){ST.routes.splice(+d.rr,1);save();render();toast('Route removed')}
if(d.rt!==undefined){const r=ST.routes[+d.rt];location.href='../../services/index.html?s=search&from='+encodeURIComponent(r[0])+'&to='+encodeURIComponent(r[1])}
if(id=='del')open('Delete account?','<div>This clears your saved profile, cards and routes from this browser.</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Keep it</button><button class="btn red" id="dy" style="flex:1">Delete</button></div>');
if(id=='no')dlg.close();
if(id=='dy'){ST=JSON.parse(JSON.stringify(DEF));try{localStorage.removeItem('sb_settings')}catch(x){}SBTheme.set('system');dlg.close();toast('Account data cleared');setTimeout(()=>{location.href='../index.html'},700)}});
document.addEventListener('change',e=>{const id=e.target.id||'';
if(id.startsWith('n_')){ST.notif[id.slice(2)]=+e.target.checked;save();toast(`${id.slice(2)} ${e.target.checked?'on':'off'}`)}
if(id=='s_news'){ST.set.news=+e.target.checked;save();toast('Preference saved')}
if(id=='s_lang'){ST.set.lang=e.target.value;save();toast('Language set to '+e.target.value)}});
function saveProfile(){const v=k=>$('#f_'+k).value.trim();errs={};
if(v('name').length<2)errs.f_name='Enter your full name';
if(!EM.test(v('email')))errs.f_email='Enter a valid email address';
if(!/^\+?[\d\s-]{7,}$/.test(v('phone')))errs.f_phone='Enter a valid phone number';
if(!v('dob')||v('dob')>new Date().toISOString().slice(0,10))errs.f_dob='Choose a valid birth date';
if(v('address').length<5)errs.f_address='Enter your address';
if(Object.keys(errs).length){const keep={name:v('name'),email:v('email'),phone:v('phone'),dob:v('dob'),gender:v('gender'),address:v('address')};draft=keep;render();return toast('Please fix the highlighted fields')}
const payload={name:v('name'),email:v('email'),phone:v('phone'),dob:v('dob'),gender:v('gender'),address:v('address')};
SB.put('/profile',payload).then(r=>{ST.P=r.profile;edit=false;draft=null;render();toast('Profile updated')},e=>{if(e.fields){errs=e.fields;draft=payload;render();toast('Please fix the highlighted fields')}else SB.fail(e)})}
function addCard(){open('Add card','<label>Card number<input id="cnum" inputmode="numeric" placeholder="1234 5678 9012 3456" maxlength="19"></label><label>Expiry (MM/YY)<input id="cexp" placeholder="08/27" maxlength="5"></label><button class="btn" id="cok">Save card</button>');
$('#cnum').oninput=e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
$('#cok').onclick=()=>{const n=$('#cnum').value.replace(/\s/g,''),x=$('#cexp').value;if(n.length<13)return toast('Enter a valid card number');if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(x))return toast('Expiry must be MM/YY');ST.cards.push({n:'Card ending '+n.slice(-4),e:'Exp '+x});save();dlg.close();render();toast('Card saved')}}
function addRoute(){open('Add route','<label>From<input id="rf" placeholder="e.g. Delhi"></label><label>To<input id="rto" placeholder="e.g. Shimla"></label><button class="btn" id="rok">Save route</button>');
$('#rok').onclick=()=>{const a=$('#rf').value.trim(),b=$('#rto').value.trim();if(!a||!b)return toast('Enter both cities');if(a.toLowerCase()==b.toLowerCase())return toast('Choose two different cities');ST.routes.push([a,b]);save();dlg.close();render();toast('Route saved')}}
SB.boot(async()=>{try{await loadState()}catch(e){SB.fail(e)}render()},true);

/* Header */
$('#menu').onclick=()=>$('#nav').classList.toggle('show');
const NAVTO={'Track Bus':'../../tracking/index.html','Services':'../../services/index.html','Profile':'../index.html','History':'../../history/index.html'};
$$('[data-nav]').forEach(b=>b.onclick=()=>{const n=b.dataset.nav;$('#nav').classList.remove('show');if(NAVTO[n]){location.href=NAVTO[n];return}});
$('#bell').onclick=e=>{e.stopPropagation();$('#npop').classList.toggle('show')};
document.addEventListener('click',()=>$('#npop').classList.remove('show'));
$('#login').onclick=()=>{location.href=SB.loginUrl('login')};$('#signup').onclick=()=>{location.href=SB.loginUrl('signup')};

/* Footer */
const LINKTO={'Home':'../../index.html','Book Ticket':'../../index.html#routes','Track Bus':'../../tracking/index.html','My Trips':'../../history/index.html'};

/* Settings actions */
const dr=(id,t,d,on)=>`<div class="dr2"><label for="${id}"><b>${t}</b><small style="display:block;color:var(--mut)">${d}</small></label>${sw(id,on)}</div>`;
const fld=(id,l,v='',ty='text',ph='')=>`<label>${l}<input id="${id}" type="${ty}" value="${esc(v)}" placeholder="${ph}"></label>`;
function settingsAct(a){const p=ST.P;
if(a=='personal'){open('Personal information',fld('x_n','Full name',p.name)+fld('x_e','Email address',p.email,'email')+fld('x_p','Phone number',p.phone)+'<button class="btn" id="pgo">Save changes</button>')}
if(a=='password'){open('Change password',fld('w0','Current password','','password')+fld('w1','New password','','password','At least 8 characters, with a number')+fld('w2','Confirm new password','','password')+'<button class="btn" id="wgo">Update password</button>')}
if(a=='privacy'){open('Privacy settings',dr('pv_usage','Share usage data','Help us improve SmartBus',ST.priv.usage)+dr('pv_offers','Personalised offers','Use my trips to suggest deals',ST.priv.offers)+dr('pv_profile','Show profile to drivers','Drivers see your first name',ST.priv.profile))}
if(a=='location'){open('Location permissions',dr('lc','Allow location access','Used to find nearby stops and show your trip on the map',ST.loc)+'<small style="color:var(--mut)">You can also change this in your browser or device settings.</small>')}
if(a=='blocked'){open('Blocked users',ST.blocked.length?ST.blocked.map((n,i)=>`<div class="dr2"><b>${esc(n)}</b><button class="btn o sm" data-ub="${i}">Unblock</button></div>`).join(''):'<div style="color:var(--mut)">You have not blocked anyone.</div>')}
if(a=='help'){open('Help Center',[['How do I cancel a booking?','Open Booking History, choose the trip and tap View Details. Cancelled bookings are refunded to your original payment method.'],['How do I track my bus?','Open Track Bus to see your bus on the map with its next stop and arrival time.'],['When will I get my refund?','Refunds usually reach your account in 5–7 working days.']].map(q=>`<details class="fq"><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join('')+'<div style="display:grid;gap:8px"><button class="btn" id="hchat">Chat with the assistant</button><button class="btn o" id="hsup">Contact support</button><button class="btn o" id="hfull">Open the Help Center</button></div>')}
if(a=='about'){open('About SmartBus','<div class="dr2"><span>Version</span><b>v2.1.0</b></div><div class="dr2"><span>Terms &amp; Conditions</span><button class="btn o sm" data-ab="Terms &amp; Conditions">Read</button></div><div class="dr2"><span>Privacy Policy</span><button class="btn o sm" data-ab="Privacy Policy">Read</button></div><small style="color:var(--mut)">© 2026 SmartBus. All rights reserved.</small>')}
if(a=='delete'){open('Delete account?','<div>This permanently removes your profile, cards, routes and settings from this browser. Type <b>DELETE</b> to confirm.</div><input id="dc" autocomplete="off" placeholder="DELETE"><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Cancel</button><button class="btn red" id="dgo" style="flex:1" disabled>Delete account</button></div>')}}
document.addEventListener('click',e=>{const t=e.target,a=t.closest('[data-sa]');if(a){settingsAct(a.dataset.sa);return}
if(t.dataset&&t.dataset.ub!==undefined){const i=+t.dataset.ub;SB.del('/blocked/'+ST.blockedIds[i]).then(r=>{ST.blocked=r.blocked.map(x=>x.name);ST.blockedIds=r.blocked.map(x=>x.id);settingsAct('blocked');toast('User unblocked')},SB.fail)}
if(t.dataset&&t.dataset.ab)location.href='../../pages/'+(/Terms/.test(t.dataset.ab)?'terms':'privacy')+'.html';
if(t.id=='hsup')location.href='../../pages/contact.html';if(t.id=='hfull')location.href='../../pages/help.html';if(t.id=='hchat'){dlg.close();window.SBChat?SBChat.open():toast('Assistant is loading, try again')}
if(t.id=='pgo'){const n=$('#x_n').value.trim(),m=$('#x_e').value.trim(),ph=$('#x_p').value.trim();
if(n.length<2)return toast('Enter your full name');if(!EM.test(m))return toast('Enter a valid email address');if(!/^\+?[\d\s-]{7,}$/.test(ph))return toast('Enter a valid phone number');
SB.put('/profile',{name:n,email:m,phone:ph}).then(r=>{Object.assign(ST.P,r.profile);dlg.close();render();toast('Personal information updated')},e=>toast(e.fields?Object.values(e.fields)[0]:e.message))}
if(t.id=='wgo'){const c=$('#w0').value,n=$('#w1').value,f=$('#w2').value;
if(!c)return toast('Enter your current password');if(n.length<8||!/\d/.test(n)||!/[A-Za-z]/.test(n))return toast('New password needs 8+ characters with letters and a number');if(n==c)return toast('Choose a different password');if(n!==f)return toast('Passwords do not match');
SB.post('/auth/password',{current:c,new:n,confirm:f}).then(()=>{dlg.close();toast('Password updated')},e=>toast(e.message))}
if(t.id=='dgo'){SB.post('/auth/delete',{confirm:'DELETE'}).then(()=>{SBTheme.set('system');dlg.close();toast('Account deleted');setTimeout(()=>{location.href='../../index.html'},900)},e=>toast(e.message))}});
document.addEventListener('input',e=>{if(e.target.id=='dc')$('#dgo').disabled=e.target.value!='DELETE'});
document.addEventListener('change',e=>{const i=e.target.id||'',v=e.target.value;
if(i=='sl'){ST.set.lang=v;SB.put('/settings',{lang:v}).then(()=>toast('Language set to '+v),SB.fail)}
if(i=='su'){ST.set.units=v;SB.put('/settings',{units:v}).then(()=>toast('Units: '+v),SB.fail)}
if(i.startsWith('pv_')){const k=i.slice(3);ST.priv[k]=+e.target.checked;SB.put('/settings',{priv:{[k]:e.target.checked}}).then(()=>toast('Privacy preference saved'),SB.fail)}
if(i=='lc'){const on=e.target.checked;if(!on){ST.loc=0;SB.put('/settings',{loc:false});return toast('Location access turned off')}if(!navigator.geolocation){e.target.checked=false;return toast('This browser does not support location')}toast('Asking your browser for location…');navigator.geolocation.getCurrentPosition(()=>{ST.loc=1;SB.put('/settings',{loc:true});toast('Location access allowed')},()=>{ST.loc=0;e.target.checked=false;SB.put('/settings',{loc:false});toast('Location blocked. Allow it in your browser settings')},{timeout:8000})}});
