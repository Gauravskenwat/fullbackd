const I={menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
cal:'<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>',
pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',book:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M3 10h6M3 15h6"/>',
card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',chev:'<path d="M9 18l6-6-6-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'};
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
cards:[{b:'Visa',l:'4242',e:'12/29',d:1},{b:'Mastercard',l:'8888',e:'09/28',d:0},{b:'RuPay',l:'1234',e:'07/29',d:0}],
routes:[['Delhi','Manali'],['Mumbai','Pune'],['Bengaluru','Hyderabad']],
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
const TABS=[['bookings','My Bookings','book','Your recent trips with SmartBus.'],['profile','My Profile','user','Update your personal information.'],['payments','Payment Methods','card','Manage the cards you pay with.'],['notifications','Notifications','bell','Choose which updates you receive.'],['routes','Saved Routes','pin','Quick access to your favourite trips.'],['settings','Settings','gear','Adjust your app preferences.']];
let tab='payments',edit=false,errs={};
$('#navs').innerHTML=TABS.map(t=>`<button class="nv" data-t="${t[0]}">${ic(t[2])}<span>${t[1]}</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`).join('')+`<button class="nv" data-t="developers">${ic('users')}<span>Developers</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`+`<button class="nv lo" id="lo">${ic('out')}<span>Logout</span></button>`;
const TABURL={'bookings': '../index.html?tab=bookings', 'profile': '../index.html?tab=profile', 'payments': null, 'notifications': '../notifications/index.html', 'routes': '../saved-routes/index.html', 'settings': '../settings/index.html', 'developers': '../../developers/index.html'};
$('#navs').onclick=e=>{const b=e.target.closest('.nv');if(!b)return;if(b.id=='lo')return logout();if(TABURL[b.dataset.t]){location.href=TABURL[b.dataset.t];return}tab=b.dataset.t;edit=false;errs={};render();if(innerWidth<1000)$('.main').scrollIntoView({behavior:'smooth'})};
function logout(){open('Log out?','<div>Are you sure you want to log out of SmartBus?</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Stay</button><button class="btn red" id="yes" style="flex:1">Log out</button></div>');$('#no').onclick=()=>dlg.close();$('#yes').onclick=()=>{dlg.close();SB.logout()}}

/* Panels */
function render(){const t=TABS.find(x=>x[0]==tab);$$('.nv[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));
$('#mt').textContent=t[1];$('#ms').textContent=t[3];$('#sn').textContent=ST.P.name;$('#se').textContent=ST.P.email;
$('#mact').innerHTML=tab=='profile'&&!edit?'<button class="btn o sm" id="ed">Edit</button>':tab=='payments'?'':tab=='routes'?'<button class="btn sm" id="addr">Add route</button>':'';
$('#body').innerHTML=({profile:pProfile,bookings:pBook,payments:pPay,notifications:pNot,routes:pRoutes,settings:pSet})[tab]();hydrate($('#body'))}
const row=(i,k,v)=>`<div class="pr">${ic(i)}<span class="k">${k}</span><span class="v">${v}</span></div>`;
let draft=null;function pProfile(){const p=edit&&draft?draft:ST.P;if(!edit)return row('user','Full Name',esc(p.name))+row('mail','Email Address',esc(p.email))+row('phone','Phone Number',esc(p.phone))+row('cal','Date of Birth',dfmt(p.dob))+row('users','Gender',esc(p.gender))+row('pin','Address',esc(p.address));
const f=(i,k,id,inp)=>`<div class="pr">${ic(i)}<label class="k" for="${id}">${k}</label><span class="fld">${inp}</span>${errs[id]?`<span class="er">${errs[id]}</span>`:''}</div>`;
return f('user','Full Name','f_name',`<input id="f_name" value="${esc(p.name)}">`)+f('mail','Email Address','f_email',`<input id="f_email" type="email" value="${esc(p.email)}">`)+f('phone','Phone Number','f_phone',`<input id="f_phone" value="${esc(p.phone)}">`)+f('cal','Date of Birth','f_dob',`<input id="f_dob" type="date" value="${p.dob}">`)+f('users','Gender','f_gender',`<select id="f_gender">${['Male','Female','Other','Prefer not to say'].map(g=>`<option${g==p.gender?' selected':''}>${g}</option>`).join('')}</select>`)+f('pin','Address','f_address',`<input id="f_address" value="${esc(p.address)}">`)+`<div class="ac"><button class="btn o sm" id="cn">Cancel</button><button class="btn sm" id="sv">Save changes</button></div>`}
const pBook=()=>BK.map(b=>`<div class="li"><div class="grow"><b>${b[1]}</b><small>${b[0]} · ${b[2]}</small></div><span class="pill ${b[3]=='Cancelled'?'c':''}">${b[3]}</span></div>`).join('');
const LG={Visa:'assets/visa.png',Mastercard:'assets/mastercard.png',RuPay:'assets/rupay.png'};
const isExp=e=>{const[m,y]=e.split('/');return new Date(2000+ +y,+m,1)<=new Date()};
const brandOf=n=>/^4/.test(n)?'Visa':/^(5[1-5]|2[2-7])/.test(n)?'Mastercard':/^(60|65|81|82|508)/.test(n)?'RuPay':'';
const luhn=n=>{let s=0,a=0;for(let i=n.length-1;i>=0;i--){let d=+n[i];if(a){d*=2;if(d>9)d-=9}s+=d;a=!a}return s%10==0};
const pPay=()=>`<div class="sh"><h2>Saved Payment Methods</h2><button class="btn sm" id="addc">${ic('plus')}Add New Card</button></div>
<div class="cl">${ST.cards.length?ST.cards.map((c,i)=>`<div class="cr"><img class="bl" src="${LG[c.b]}" alt="${c.b}"><div class="grow"><b>${c.b} •••• ${c.l}</b><small>${isExp(c.e)?'Expired '+c.e:'Expires '+c.e}</small></div>${c.d?'<span class="pill">Default</span>':`<button class="btn o sm" data-df="${i}">Set as Default</button>`}<span class="kb"><button class="km" data-km="${i}" aria-label="More options for ${c.b} ${c.l}" aria-haspopup="menu">⋮</button><span class="pop2" role="menu">${c.d?'':`<button data-df="${i}">Set as default</button>`}<button data-rm="${i}" style="color:var(--rd)">Remove card</button></span></span></div>`).join(''):'<p class="cr" style="color:var(--mut)">No saved cards yet. Add one below.</p>'}</div>
<div class="an"><h3>Add New Payment Method</h3><p class="ms2">Add a new card to your account for secure and fast payments.</p>
<label for="c_num">Card Number</label><div class="nw"><input id="c_num" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456"><span class="bs">${['Visa','Mastercard','RuPay'].map(b=>`<img data-b="${b}" src="${LG[b]}" alt="${b}">`).join('')}</span></div><span class="er" id="e_num"></span>
<div class="g3"><div><label for="c_name">Cardholder Name</label><input id="c_name" autocomplete="cc-name" placeholder="Aarav Mehta"><span class="er" id="e_name"></span></div>
<div><label for="c_exp">Expiry Date</label><input id="c_exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY"><span class="er" id="e_exp"></span></div>
<div><label for="c_cvv">CVV</label><div class="cw"><input id="c_cvv" inputmode="numeric" type="password" autocomplete="cc-csc" placeholder="123"><button id="cvi" aria-label="What is CVV?">${ic('info')}</button></div><span class="er" id="e_cvv"></span></div></div>
<label class="ck"><input type="checkbox" id="c_def" checked>Set as default payment method</label>
<div class="ar"><button class="btn" id="cadd">Add Card</button></div></div>
<p class="sec">${ic('lock')}Your payment information is encrypted and secure.</p>`;
const sw=(id,on)=>`<span class="sw"><input type="checkbox" id="${id}" ${on?'checked':''}><i></i></span>`;
const pNot=()=>Object.keys(ST.notif).map(k=>`<div class="li"><label class="grow" for="n_${k}"><b>${k}</b></label>${sw('n_'+k,ST.notif[k])}</div>`).join('');
const pRoutes=()=>ST.routes.length?ST.routes.map((r,i)=>`<div class="li">${ic('pin')}<div class="grow"><b>${esc(r[0])} → ${esc(r[1])}</b></div><button class="btn o sm" data-rt="${i}">Book</button><button class="rm" data-rr="${i}">Remove</button></div>`).join(''):'<p style="color:var(--mut)">No saved routes. Use “Add route” to create one.</p>';
const pSet=()=>`<div class="li"><label class="grow" for="s_news"><b>Email newsletter</b><small>Offers and travel tips</small></label>${sw('s_news',ST.set.news)}</div>
<div class="li"><label class="grow" for="s_lang"><b>Language</b></label><select id="s_lang" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--tx)">${['English','हिन्दी','ગુજરાતી'].map(l=>`<option${l==ST.set.lang?' selected':''}>${l}</option>`).join('')}</select></div>
<div class="li"><div class="grow"><b>Delete account</b><small>This removes your saved data from this browser</small></div><button class="btn red sm" id="del">Delete</button></div>`;

/* Actions */
document.addEventListener('click',e=>{const id=e.target.id,d=e.target.dataset;
if(id=='ed'){draft=null;edit=true;errs={};render();$('#f_name').focus()}
if(id=='cn'){draft=null;edit=false;errs={};render()}
if(id=='sv')saveProfile();
if(id=='addc'){const f=$('#c_num');if(f){f.scrollIntoView({behavior:'smooth',block:'center'});f.focus({preventScroll:true})}}if(id=='addr')addRoute();

if(d.rr!==undefined){ST.routes.splice(+d.rr,1);save();render();toast('Route removed')}
if(d.rt!==undefined){const r=ST.routes[+d.rt];location.href='../../services/index.html?s=search&from='+encodeURIComponent(r[0])+'&to='+encodeURIComponent(r[1])}
if(id=='del')open('Delete account?','<div>This clears your saved profile, cards and routes from this browser.</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Keep it</button><button class="btn red" id="dy" style="flex:1">Delete</button></div>');
if(id=='no')dlg.close();
if(id=='dy'){ST=JSON.parse(JSON.stringify(DEF));try{localStorage.removeItem('sb_pay')}catch(x){}setTheme(0);dlg.close();toast('Account data cleared');setTimeout(()=>{location.href='../index.html'},700)}});
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

/* Payment actions */
let pend=-1;
const setDef=i=>SB.put('/cards/'+ST.cards[i].id+'/default').then(r=>{ST.cards=r.cards;render();toast('Default card updated')},SB.fail);
document.addEventListener('click',e=>{const t=e.target,d=t.dataset||{};
if(!t.closest('.kb'))$$('.pop2.show').forEach(p=>p.classList.remove('show'));
if(d.km!==undefined){const p=t.nextElementSibling,o=p.classList.contains('show');$$('.pop2.show').forEach(x=>x.classList.remove('show'));p.classList.toggle('show',!o)}
if(d.df!==undefined)setDef(+d.df);
if(d.rm!==undefined){pend=+d.rm;const c=ST.cards[pend];open('Remove card?',`<div>Remove ${c.b} •••• ${c.l} from your account?</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Keep it</button><button class="btn red" id="rmy" style="flex:1">Remove</button></div>`)}
if(t.id=='rmy'){SB.del('/cards/'+ST.cards[pend].id).then(r=>{ST.cards=r.cards;dlg.close();render();toast('Card removed')},err=>{dlg.close();SB.fail(err)})}
if(t.closest('#cvi'))toast('CVV is the 3-digit code on the back of your card');
if(t.id=='cadd')addPay()});
document.addEventListener('input',e=>{const t=e.target;
if(t.id=='c_num'){t.value=t.value.replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim();const b=brandOf(t.value.replace(/\s/g,''));$$('.bs img').forEach(i=>i.style.opacity=!b||i.dataset.b==b?1:.3)}
if(t.id=='c_exp'){const v=t.value.replace(/\D/g,'').slice(0,4);t.value=v.length>2?v.slice(0,2)+' / '+v.slice(2):v}
if(t.id=='c_cvv')t.value=t.value.replace(/\D/g,'').slice(0,3)});
function addPay(){const num=$('#c_num').value.replace(/\s/g,''),name=$('#c_name').value.trim(),ex=$('#c_exp').value.replace(/\s/g,''),cv=$('#c_cvv').value,er={},b=brandOf(num);
if(num.length<13||!luhn(num))er.num='Enter a valid card number';else if(!b)er.num='We accept Visa, Mastercard and RuPay';
if(!/^[A-Za-z][A-Za-z .'-]+$/.test(name))er.name='Enter the name on the card';
if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(ex))er.exp='Use MM / YY';else if(isExp(ex))er.exp='This card has expired';
if(!/^\d{3}$/.test(cv))er.cvv='Enter the 3-digit CVV';
['num','name','exp','cvv'].forEach(k=>$('#e_'+k).textContent=er[k]||'');
if(Object.keys(er).length)return toast('Please fix the highlighted fields');
const def=$('#c_def').checked;
SB.post('/cards',{number:num,name,expiry:ex,cvv:cv,makeDefault:def}).then(r=>{ST.cards=r.cards;render();toast(r.added+' added')},e=>{if(e.fields){['num','name','exp','cvv'].forEach(k=>$('#e_'+k).textContent=e.fields[k]||'')}toast(e.message)})}
