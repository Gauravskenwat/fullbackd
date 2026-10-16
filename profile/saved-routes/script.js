const I={menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
cal:'<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>',
pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',book:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M3 10h6M3 15h6"/>',
card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',chev:'<path d="M9 18l6-6-6-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',home:'<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',school:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',bag:'<path d="M5 8h14l1 13H4z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',star:'<polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.6"/>'};
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
routes:[{id:1,name:'Home to Work',icon:'home',line:'City Express (TC 56789)',from:'Tech City',to:'Central Square',freq:'Mon - Fri',time:'09:00',on:1},
{id:2,name:'Work to Home',icon:'work',line:'City Express (TC 56789)',from:'Central Square',to:'Tech City',freq:'Mon - Fri',time:'18:00',on:1},
{id:3,name:'Home to University',icon:'school',line:'City Line (TC 12345)',from:'Tech City',to:'State University',freq:'Mon - Sat',time:'08:30',on:1},
{id:4,name:'Weekend Shopping',icon:'bag',line:'Market Express (TC 98765)',from:'Tech City',to:'Grand Mall',freq:'Sat - Sun',time:'17:00',on:1}],
notif:{'Trip reminders':1,'Offers and discounts':0,'Booking updates':1,'Bus delay alerts':1},set:{theme:0,lang:'English',news:1}};
let ST=JSON.parse(JSON.stringify(DEF));
const save=()=>{};   /* nothing is kept in the browser: every change is saved by the server through an API call */
let BK=[];
const loadState=async()=>{const [a,n,b]=await Promise.all([SB.get('/account'),SB.get('/notifications'),SB.get('/bookings')]);
ST.P=a.profile;ST.cards=a.cards;ST.routes=a.routes;ST.notif=a.notif;ST.recent=n.items;ST.blocked=a.blocked.map(x=>x.name);ST.blockedIds=a.blocked.map(x=>x.id);
ST.set=Object.assign({},ST.set,a.settings);ST.priv=a.settings.priv;ST.loc=a.settings.loc;
BK=b.trips.map(t=>[t.id,t.from+' → '+t.to,new Date(t.date+'T00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),t.status[0].toUpperCase()+t.status.slice(1)])};
const dfmt=v=>v?new Date(v+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'—';
const setTheme=()=>{};/* theme is changed only in Profile > Settings */

/* Sidebar */
const TABS=[['bookings','My Bookings','book','Your recent trips with SmartBus.'],['profile','My Profile','user','Update your personal information.'],['payments','Payment Methods','card','Manage the cards you pay with.'],['notifications','Notifications','bell','Choose which updates you receive.'],['routes','Saved Routes','pin','Manage your frequently used routes for quick access.'],['settings','Settings','gear','Adjust your app preferences.']];
let tab='routes',edit=false,errs={};
$('#navs').innerHTML=TABS.map(t=>`<button class="nv" data-t="${t[0]}">${ic(t[2])}<span>${t[1]}</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`).join('')+`<button class="nv" data-t="developers">${ic('users')}<span>Developers</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`+`<button class="nv lo" id="lo">${ic('out')}<span>Logout</span></button>`;
const TABURL={'bookings': '../index.html?tab=bookings', 'profile': '../index.html?tab=profile', 'payments': '../payment-methods/index.html', 'notifications': '../notifications/index.html', 'routes': null, 'settings': '../settings/index.html', 'developers': '../../developers/index.html'};
$('#navs').onclick=e=>{const b=e.target.closest('.nv');if(!b)return;if(b.id=='lo')return logout();if(TABURL[b.dataset.t]){location.href=TABURL[b.dataset.t];return}tab=b.dataset.t;edit=false;errs={};render();if(innerWidth<1000)$('.main').scrollIntoView({behavior:'smooth'})};
function logout(){open('Log out?','<div>Are you sure you want to log out of SmartBus?</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Stay</button><button class="btn red" id="yes" style="flex:1">Log out</button></div>');$('#no').onclick=()=>dlg.close();$('#yes').onclick=()=>{dlg.close();SB.logout()}}

/* Panels */
function render(){const t=TABS.find(x=>x[0]==tab);$$('.nv[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));
$('#mt').textContent=t[1];$('#ms').textContent=t[3];$('#sn').textContent=ST.P.name;$('#se').textContent=ST.P.email;
$('#mact').innerHTML=tab=='profile'&&!edit?'<button class="btn o sm" id="ed">Edit</button>':tab=='payments'?'<button class="btn sm" id="addc">Add card</button>':tab=='routes'?'<button class="btn sm" id="addr">'+ic('plus')+'Add New Route</button>':'';
$('#body').innerHTML=({profile:pProfile,bookings:pBook,payments:pPay,notifications:pNot,routes:pRoutes,settings:pSet})[tab]();hydrate($('#body'))}
const row=(i,k,v)=>`<div class="pr">${ic(i)}<span class="k">${k}</span><span class="v">${v}</span></div>`;
let draft=null;function pProfile(){const p=edit&&draft?draft:ST.P;if(!edit)return row('user','Full Name',esc(p.name))+row('mail','Email Address',esc(p.email))+row('phone','Phone Number',esc(p.phone))+row('cal','Date of Birth',dfmt(p.dob))+row('users','Gender',esc(p.gender))+row('pin','Address',esc(p.address));
const f=(i,k,id,inp)=>`<div class="pr">${ic(i)}<label class="k" for="${id}">${k}</label><span class="fld">${inp}</span>${errs[id]?`<span class="er">${errs[id]}</span>`:''}</div>`;
return f('user','Full Name','f_name',`<input id="f_name" value="${esc(p.name)}">`)+f('mail','Email Address','f_email',`<input id="f_email" type="email" value="${esc(p.email)}">`)+f('phone','Phone Number','f_phone',`<input id="f_phone" value="${esc(p.phone)}">`)+f('cal','Date of Birth','f_dob',`<input id="f_dob" type="date" value="${p.dob}">`)+f('users','Gender','f_gender',`<select id="f_gender">${['Male','Female','Other','Prefer not to say'].map(g=>`<option${g==p.gender?' selected':''}>${g}</option>`).join('')}</select>`)+f('pin','Address','f_address',`<input id="f_address" value="${esc(p.address)}">`)+`<div class="ac"><button class="btn o sm" id="cn">Cancel</button><button class="btn sm" id="sv">Save changes</button></div>`}
const pBook=()=>BK.map(b=>`<div class="li"><div class="grow"><b>${b[1]}</b><small>${b[0]} · ${b[2]}</small></div><span class="pill ${b[3]=='Cancelled'?'c':''}">${b[3]}</span></div>`).join('');
const pPay=()=>ST.cards.length?ST.cards.map((c,i)=>`<div class="li">${ic('card')}<div class="grow"><b>${esc(c.n)}</b><small>${esc(c.e)}</small></div><button class="rm" data-rc="${i}">Remove</button></div>`).join(''):'<p style="color:var(--mut)">No saved cards yet. Use “Add card” to save one.</p>';
const sw=(id,on)=>`<span class="sw"><input type="checkbox" id="${id}" ${on?'checked':''}><i></i></span>`;
const pNot=()=>Object.keys(ST.notif).map(k=>`<div class="li"><label class="grow" for="n_${k}"><b>${k}</b></label>${sw('n_'+k,ST.notif[k])}</div>`).join('');
const fmtT=t=>{const[h,m]=t.split(':'),H=+h;return `${String(H%12||12).padStart(2,'0')}:${m} ${H<12?'AM':'PM'}`};
const LINES=['HRTC Volvo','MSRTC Shivneri','SRS Travels','RSRTC Volvo','KSRTC Airavat','Any bus'];
const pRoutes=()=>`${ST.routes.length?ST.routes.map(r=>`<div class="rc"><span class="ri">${ic(r.icon)}</span><div class="rinf"><b>${esc(r.name)}</b><div class="l">${esc(r.line)}</div><div class="t">${esc(r.from)} → ${esc(r.to)}</div></div><div class="rm2"><div><small>Frequency</small><b>${r.freq}</b></div><div><small>Time</small><b>${fmtT(r.time)}</b></div></div><span class="ra"><span class="sw"><input type="checkbox" data-rs="${r.id}" aria-label="Alerts for ${esc(r.name)}" ${r.on?'checked':''}><i></i></span><span class="kb"><button class="km" data-km aria-label="More options for ${esc(r.name)}" aria-haspopup="menu">⋮</button><span class="pop2" role="menu"><button data-rb="${r.id}">Book now</button><button data-re="${r.id}">Edit route</button><button data-rd="${r.id}" style="color:var(--rd)">Delete</button></span></span></span></div>`).join(''):'<p style="color:var(--mut);text-align:center;padding:30px 0">No saved routes yet. Use “Add New Route” to create one.</p>'}<div class="tip">${ic('star')}<div style="flex:1"><b>Quick Tip</b>Enable notifications for your saved routes to get real-time updates about your favorite routes.</div><button class="btn o sm" id="allon">Turn on all</button></div>`;

const pSet=()=>`<div class="li"><label class="grow" for="s_news"><b>Email newsletter</b><small>Offers and travel tips</small></label>${sw('s_news',ST.set.news)}</div>
<div class="li"><label class="grow" for="s_lang"><b>Language</b></label><select id="s_lang" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--tx)">${['English','हिन्दी','ગુજરાતી'].map(l=>`<option${l==ST.set.lang?' selected':''}>${l}</option>`).join('')}</select></div>
<div class="li"><div class="grow"><b>Delete account</b><small>This removes your saved data from this browser</small></div><button class="btn red sm" id="del">Delete</button></div>`;

/* Actions */
document.addEventListener('click',e=>{const id=e.target.id,d=e.target.dataset;
if(id=='ed'){draft=null;edit=true;errs={};render();$('#f_name').focus()}
if(id=='cn'){draft=null;edit=false;errs={};render()}
if(id=='sv')saveProfile();
if(id=='addc')addCard();
if(d.rc!==undefined){ST.cards.splice(+d.rc,1);save();render();toast('Card removed')}
if(id=='del')open('Delete account?','<div>This clears your saved profile, cards and routes from this browser.</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Keep it</button><button class="btn red" id="dy" style="flex:1">Delete</button></div>');
if(id=='no')dlg.close();
if(id=='dy'){ST=JSON.parse(JSON.stringify(DEF));try{localStorage.removeItem('sb_routes')}catch(x){}setTheme(0);dlg.close();toast('Account data cleared');setTimeout(()=>{location.href='../index.html'},700)}});
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

/* Route actions */
document.addEventListener('click',e=>{const t=e.target,d=t.dataset||{};
if(!t.closest('.kb'))$$('.pop2.show').forEach(p=>p.classList.remove('show'));
if(d.km!==undefined){const p=t.nextElementSibling,o=p.classList.contains('show');$$('.pop2.show').forEach(x=>x.classList.remove('show'));p.classList.toggle('show',!o)}
if(t.closest('#addr'))routeForm();
if(d.re!==undefined)routeForm(+d.re);
if(d.rb!==undefined)bookRoute(+d.rb);
if(d.rd!==undefined){const r=ST.routes.find(x=>x.id==d.rd);open('Delete route?',`<div>Delete “${esc(r.name)}” from your saved routes?</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Keep it</button><button class="btn red" id="rdy" data-id="${r.id}" style="flex:1">Delete</button></div>`)}
if(t.id=='rdy'){SB.del('/saved-routes/'+t.dataset.id).then(r=>{ST.routes=r.routes;dlg.close();render();toast('Route deleted')},err=>{dlg.close();SB.fail(err)})}
if(t.id=='allon'){SB.post('/saved-routes/alerts',{on:true}).then(r=>{ST.routes=r.routes;render();toast('Alerts turned on for all routes')},SB.fail)}});
document.addEventListener('change',e=>{const id=e.target.dataset&&e.target.dataset.rs;if(id){const r=ST.routes.find(x=>x.id==id),on=e.target.checked;SB.put('/saved-routes/'+id,{on:on}).then(()=>{r.on=+on;toast(`Alerts ${on?'on':'off'} for ${r.name}`)},err=>{e.target.checked=!on;SB.fail(err)})}});
function routeForm(id){const r=id?ST.routes.find(x=>x.id==id):{name:'',icon:'pin',line:LINES[0],from:'',to:'',freq:'Mon - Fri',time:'09:00'};
const sel=(arr,v)=>arr.map(a=>{const[k,l]=Array.isArray(a)?a:[a,a];return `<option value="${k}"${k==v?' selected':''}>${l}</option>`}).join('');
open(id?'Edit route':'Add new route',`<label>Route name<input id="rn" value="${esc(r.name)}" placeholder="e.g. Weekend trip home"></label><label>Icon<select id="ri">${sel([['home','Home'],['work','Work'],['school','University'],['bag','Shopping'],['pin','Other']],r.icon)}</select></label><label>Bus service<select id="rl">${sel(LINES,r.line)}</select></label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>From<input id="rf" value="${esc(r.from)}"></label><label>To<input id="rto" value="${esc(r.to)}"></label></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Frequency<select id="rq">${sel(['Daily','Mon - Fri','Mon - Sat','Sat - Sun','Fri - Sun'],r.freq)}</select></label><label>Time<input id="rtm" type="time" value="${r.time}"></label></div><button class="btn" id="rok">${id?'Save changes':'Save route'}</button>`);
$('#rok').onclick=()=>{const v=k=>$('#'+k).value.trim(),n=v('rn'),a=v('rf'),b=v('rto');
if(n.length<2)return toast('Enter a route name');if(!a||!b)return toast('Enter both From and To');if(a.toLowerCase()==b.toLowerCase())return toast('Choose two different places');if(!v('rtm'))return toast('Choose a departure time');
const o={name:n,icon:v('ri'),line:v('rl'),from:a,to:b,freq:v('rq'),time:v('rtm')};
(id?SB.put('/saved-routes/'+id,o):SB.post('/saved-routes',o)).then(x=>{ST.routes=x.routes;dlg.close();render();toast(id?'Route updated':'Route added')},SB.fail)}}
function bookRoute(id){const r=ST.routes.find(x=>x.id==id);location.href='../../services/index.html?s=search&from='+encodeURIComponent(r.from)+'&to='+encodeURIComponent(r.to)}
