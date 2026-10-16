const I={menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
cal:'<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/>',
pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',book:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M3 10h6M3 15h6"/>',
card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',chev:'<path d="M9 18l6-6-6-6"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const hydrate=r=>r.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=ic(e.dataset.i));hydrate(document);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600)};
const dlg=$('#dlg'),open=(t,h)=>{$('#dt').textContent=t;$('#dbody').innerHTML=h;if(!dlg.open)dlg.showModal()};
$('#dx').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
const EM=/^\S+@\S+\.\S+$/,inr=n=>'₹'+Number(n).toLocaleString('en-IN');


/* Profile side menu (Developers is its own option, after Settings) */
const TABS=[['bookings','My Bookings','book','../profile/index.html?tab=bookings'],['profile','My Profile','user','../profile/index.html?tab=profile'],['payments','Payment Methods','card','../profile/payment-methods/index.html'],['notifications','Notifications','bell','../profile/notifications/index.html'],['routes','Saved Routes','pin','../profile/saved-routes/index.html'],['settings','Settings','gear','../profile/settings/index.html'],['developers','Developers','users','index.html']];
$('#navs').innerHTML=TABS.map(t=>`<button class="nv${t[0]=='developers'?' on':''}" data-t="${t[0]}">${ic(t[2])}<span>${t[1]}</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`).join('')+`<button class="nv lo" id="lo">${ic('out')}<span>Logout</span></button>`;
$('#navs').onclick=e=>{const b=e.target.closest('.nv');if(!b)return;if(b.id=='lo'){open('Log out?','<div>Are you sure you want to log out of SmartBus?</div><div style="display:flex;gap:10px"><button class="btn o" id="no" style="flex:1">Stay</button><button class="btn red" id="yes" style="flex:1">Log out</button></div>');$('#no').onclick=()=>dlg.close();$('#yes').onclick=()=>{SB.logout()};return}const t=TABS.find(x=>x[0]==b.dataset.t);if(t&&t[0]!='developers')location.href=t[3]};

/* Team */
const TEAM=[{id:'gaurav',n:'Gaurav Kenwat',r:'CEO & Founder',i:'GK',c:'#e5560c'},{id:'devesh',n:'Devesh Kaushik',r:'Co-Founder & CTO',i:'DK',c:'#2f6fed'},{id:'nishant',n:'Nishant Paul',r:'Co-Founder & CFO',i:'NP',c:'#1f9d55'}];
let TP={};   /* photo URLs come from the server (GET /api/team); only the admin account can change them */
const mono=t=>`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c}"/><stop offset="1" stop-color="#17130f"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><text x="100" y="118" font-family="Arial,sans-serif" font-size="68" font-weight="700" fill="#fff" text-anchor="middle">${t.i}</text></svg>`)}`;
const camI='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
const draw=()=>{$('#team').innerHTML=TEAM.map(t=>`<figure class="tm"><div class="ph"><img src="${TP[t.id]||'assets/team/'+t.id+'.jpg'}" alt="${esc(t.n)}" data-fb="${t.id}" loading="lazy">${SB.user&&SB.user.isAdmin?'':'<span hidden>'}<label class="up" title="Add or change photo"><input type="file" accept="image/*" data-up="${t.id}" hidden>${camI}<span>Add photo</span></label>${SB.user&&SB.user.isAdmin?'':'</span>'}</div><figcaption><b>${esc(t.n)}</b><span>${esc(t.r)}</span></figcaption></figure>`).join('')};
document.addEventListener('error',e=>{const im=e.target;if(im.tagName=='IMG'&&im.dataset.fb){const t=TEAM.find(x=>x.id==im.dataset.fb);im.removeAttribute('data-fb');im.src=mono(t)}},true);
document.addEventListener('change',e=>{const f=e.target.dataset&&e.target.dataset.up;if(!f||!e.target.files[0])return;const file=e.target.files[0];if(!/^image\//.test(file.type))return toast('Please choose an image file');
 const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement('canvas'),z=400,m=Math.min(img.width,img.height);c.width=c.height=z;c.getContext('2d').drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,z,z);URL.revokeObjectURL(u);
  const data=c.toDataURL('image/jpeg',.85);SB.post('/team/'+f+'/photo',{image:data}).then(r=>{r.team.forEach(t=>{if(t.photo)TP[t.id]=t.photo});draw();toast('Photo updated')},SB.fail)};img.onerror=()=>toast('Could not read that image');img.src=u});
draw();SB.ready.then(async()=>{try{(await SB.get('/team')).team.forEach(t=>{if(t.photo)TP[t.id]=t.photo})}catch(e){}draw()});
/* Header / footer */
$('#menu').onclick=()=>$('#nav').classList.toggle('show');
const NAVTO={'Track Bus':'../tracking/index.html','History':'../history/index.html','Profile':'../profile/index.html'};
$$('[data-nav]').forEach(b=>b.onclick=()=>{const n=b.dataset.nav;$('#nav').classList.remove('show');if(NAVTO[n])location.href=NAVTO[n];else location.href='../services/index.html'});
$('#bell').onclick=e=>{e.stopPropagation();$('#npop').classList.toggle('show')};
document.addEventListener('click',()=>$('#npop').classList.remove('show'));
$('#login').onclick=()=>{location.href=SB.loginUrl('login')};$('#signup').onclick=()=>{location.href=SB.loginUrl('signup')};
const LINKTO={'Home':'../index.html','Book Ticket':'../index.html#routes','Track Bus':'../tracking/index.html','My Trips':'../history/index.html'};

