/* Icons */
const I={menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
chev:'<path d="M9 18l6-6-6-6"/>',cal:'<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',bus:'<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21v-4M16 21v-4"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',star:'<polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.6"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',seat:'<path d="M7 3v9a2 2 0 0 0 2 2h7M5 21h14M17 14v7"/>',
dl:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',redo:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',route:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const hydrate=r=>r.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=ic(e.dataset.i));hydrate(document);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600)};
const dlg=$('#dlg'),open=(t,h)=>{$('#dt').textContent=t;$('#dbody').innerHTML=h;hydrate($('#dbody'));if(!dlg.open)dlg.showModal()};
$('#dx').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
const EM=/^\S+@\S+\.\S+$/;


/* Data: trips come from the server (GET /api/bookings) */
let TRIPS=[],REMOVED=0;
const stat=t=>t.status;
const LBL={upcoming:'Upcoming',completed:'Completed',cancelled:'Cancelled'};
const inr=n=>'₹'+Number(n).toLocaleString('en-IN');
const total=t=>t.total;
const dparts=d=>{const x=new Date(d+'T00:00');return{day:x.getDate(),mon:x.toLocaleDateString('en-GB',{month:'short'}),full:x.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}};
const visible=()=>TRIPS;

/* State */
const FILTERS=[['all','All trips','hist'],['upcoming','Upcoming','cal'],['completed','Completed','check'],['cancelled','Cancelled','close']];
const qf=new URLSearchParams(location.search).get('filter');
let filter=FILTERS.some(f=>f[0]==qf)?qf:'all',query='',sort='new';

/* Sidebar + chip buttons */
function renderButtons(){const v=visible(),n=k=>k=='all'?v.length:v.filter(t=>stat(t)==k).length;
$('#navs').innerHTML=FILTERS.map(f=>`<button class="nv${filter==f[0]?' on':''}" data-f="${f[0]}" aria-pressed="${filter==f[0]}">${ic(f[2])}<span>${f[1]}</span><span class="cnt">${n(f[0])}</span></button>`).join('')+`<button class="nv sub" id="toprof">${ic('user')}<span>My Profile</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`;
$('#chips').innerHTML=FILTERS.map(f=>`<button class="cb${filter==f[0]?' on':''}" data-f="${f[0]}" aria-pressed="${filter==f[0]}">${f[1]} (${n(f[0])})</button>`).join('')}
function renderStats(){const done=visible().filter(t=>stat(t)=='completed');
$('#stats').innerHTML=[['Trips completed',done.length],['Distance travelled',done.reduce((a,t)=>a+t.km,0).toLocaleString('en-IN')+' km'],['Total spent',inr(done.reduce((a,t)=>a+total(t),0))]].map(s=>`<div class="st"><small>${s[0]}</small><b>${s[1]}</b></div>`).join('')}

/* List */
function filtered(){const q=query.trim().toLowerCase();
let r=visible().filter(t=>(filter=='all'||stat(t)==filter)&&(!q||[t.from,t.to,t.bus,t.id,t.from+' '+t.to].join(' ').toLowerCase().includes(q)));
const by={new:(a,b)=>b.date.localeCompare(a.date),old:(a,b)=>a.date.localeCompare(b.date),fare:(a,b)=>total(b)-total(a),dist:(a,b)=>b.km-a.km};
return r.sort(by[sort])}
function card(t){const d=dparts(t.date),s=stat(t),r=t.rating;
const primary=s=='upcoming'?`<button class="btn sm" data-a="track" data-id="${t.id}">Track bus</button>`:`<button class="btn sm" data-a="rebook" data-id="${t.id}">Book again</button>`;
return `<article class="tc"><div class="dt"><b>${d.day}</b><span>${d.mon}</span></div>
<div><div class="rt">${esc(t.from)} → ${esc(t.to)}<span class="pill ${s=='cancelled'?'c':s=='upcoming'?'u':''}">${LBL[s]}</span></div>
<div class="mt"><span>${ic('bus')}${esc(t.bus)}</span><span>${ic('clock')}${esc(t.dep)}</span><span>${ic('seat')}Seat ${esc(t.seat)}</span><span>${t.id}</span>${r&&s=='completed'?`<span style="color:#f5a623">${ic('star').replace('<svg','<svg fill="currentColor"')}${r}/5</span>`:''}</div></div>
<div class="rr"><span class="fare">${inr(total(t))}</span><div class="bt"><button class="btn o sm" data-a="view" data-id="${t.id}">Details</button>${primary}</div></div></article>`}
function renderList(){const r=filtered(),all=visible().length;
$('#list').innerHTML=r.length?r.map(card).join(''):`<div class="empty">${ic('hist')}<b>${all?'No trips match':'No trips in your history'}</b>${all?'Try a different filter or search term.':'Your completed and upcoming journeys will appear here.'}</div>`;
$('#ms').textContent=`Showing ${r.length} of ${all} trip${all==1?'':'s'}.`;$('#rest').hidden=!REMOVED}
const refresh=()=>{renderButtons();renderStats();renderList()};
const setFilter=f=>{filter=f;refresh()};

/* Details dialog */
function stars(n){return [1,2,3,4,5].map(i=>`<button data-rate="${i}" aria-label="${i} star${i>1?'s':''}" class="${i<=n?'f':''}">${ic('star')}</button>`).join('')}
function details(id){const t=TRIPS.find(x=>x.id==id);if(!t)return;const s=stat(t),d=dparts(t.date),r=t.rating||0;
const row=(k,v)=>`<div class="dr"><span>${k}</span><b>${v}</b></div>`;
const acts=(s=='upcoming'?`<button class="btn" data-a="track" data-id="${id}">Track bus</button>${t.canCancel?`<button class="btn red" data-a="cancel" data-id="${id}">Cancel booking</button>`:''}`:`<button class="btn" data-a="rebook" data-id="${id}">Book again</button>`)+`<button class="btn o" data-a="receipt" data-id="${id}">${ic('dl')}Receipt</button>`;
open(`${t.from} → ${t.to}`,`<div style="display:flex;align-items:center;gap:10px"><span class="pill ${s=='cancelled'?'c':s=='upcoming'?'u':''}">${LBL[s]}</span><span style="color:var(--mut)">${d.full}</span></div>
<div class="tl">${ic('pin')}<i></i>${ic('bus')}<i></i>${ic('pin')}</div>
<div>${row('Booking ID',t.id)}${row('Bus',t.bus)}${row('Boarding',esc(t.board)+' · '+t.dep)}${row('Drop-off',esc(t.drop)+' · '+t.arr)}${row('Seat'+(t.pax>1?'s':''),esc(t.seat))}${t.discount?row('Coupon',esc(t.coupon)+' (− '+inr(t.discount)+')'):''}${row('Passengers',t.pax)}${row('Distance',t.km+' km')}${row('Payment',esc(t.pay))}${row(s=='cancelled'?'Refunded':'Total paid',inr(s=='cancelled'?t.refund:total(t)))}</div>
${s=='completed'?`<div class="rate" id="rate" aria-label="Rate this trip">${stars(r)}<span id="rtx">${r?'You rated '+r+'/5':'Rate this trip'}</span></div>`:''}
<div class="da">${acts}</div>
${s!='upcoming'?`<div style="text-align:center"><button class="lk" data-a="remove" data-id="${id}">Remove from history</button></div>`:''}`);
dlg.dataset.id=id}

/* Cancel flow */
function cancelTrip(id){const t=TRIPS.find(x=>x.id==id);open('Cancel booking?',`<div>Cancel <b>${esc(t.from)} → ${esc(t.to)}</b> on ${dparts(t.date).full}? ${t.refundAmount?`You get <b>${inr(t.refundAmount)}</b> back (${t.refundPercent}% of ${inr(total(t))}) on ${esc(t.pay)} in 5–7 working days.`:'This is too close to departure, so <b>no refund</b> applies.'}<br><small style="color:var(--mut)">Refund rules: 24h+ before departure 100%, 6–24h 75%, 2–6h 50%, under 2h none.</small></div><div style="display:flex;gap:10px"><button class="btn o" data-a="keep" style="flex:1">Keep booking</button><button class="btn red" data-a="confirmcancel" data-id="${id}" style="flex:1">Cancel booking</button></div>`)}

/* Receipt download (generated by the server) */
function receipt(id){const a=document.createElement('a');a.href='/api/bookings/'+encodeURIComponent(id)+'/receipt';a.download='';document.body.append(a);a.click();a.remove();toast('Receipt downloaded')}

/* Actions */
document.addEventListener('click',e=>{
const f=e.target.closest('[data-f]');if(f){setFilter(f.dataset.f);if(f.closest('.side')&&innerWidth<1000)$('.main').scrollIntoView({behavior:'smooth'});return}
if(e.target.closest('#toprof')){location.href='../profile/index.html';return}
if(e.target.closest('#rest')){SB.post('/bookings/restore').then(()=>load()).then(()=>toast('Removed trips restored'),SB.fail);return}
const r=e.target.closest('[data-rate]');if(r){const id=dlg.dataset.id,n=+r.dataset.rate;SB.post(`/bookings/${id}/rating`,{rating:n}).then(()=>{TRIPS.find(x=>x.id==id).rating=n;$('#rate').innerHTML=stars(n)+`<span id="rtx">You rated ${n}/5</span>`;hydrate($('#rate'));renderList();toast('Thanks for your feedback!')},SB.fail);return}
const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,id=b.dataset.id,t=TRIPS.find(x=>x.id==id);
if(a=='view')details(id);
else if(a=='track')location.href='../tracking/index.html?booking='+encodeURIComponent(id);
else if(a=='rebook')location.href='../index.html?from='+encodeURIComponent(t.from)+'&to='+encodeURIComponent(t.to)+'#routes';
else if(a=='receipt')receipt(id);
else if(a=='cancel')cancelTrip(id);
else if(a=='keep')details(dlg.dataset.id);
else if(a=='confirmcancel'){SB.post(`/bookings/${id}/cancel`).then(r=>{Object.assign(TRIPS.find(x=>x.id==id),r.booking);dlg.close();refresh();toast(`Booking cancelled · ₹${r.booking.refund} refund on its way`)},err=>{dlg.close();SB.fail(err);load()})}
else if(a=='remove'){SB.post(`/bookings/${id}/hide`).then(()=>{TRIPS=TRIPS.filter(x=>x.id!=id);REMOVED++;dlg.close();refresh();toast('Trip removed from history')},SB.fail)}});

/* Search + sort */
$('#q').addEventListener('input',e=>{query=e.target.value;renderList()});
$('#sort').addEventListener('change',e=>{sort=e.target.value;renderList()});

/* Header */
$('#menu').onclick=()=>$('#nav').classList.toggle('show');
const NAVTO={'Track Bus':'../tracking/index.html','Services':'../index.html#services','Profile':'../profile/index.html'};
$$('[data-nav]').forEach(b=>b.onclick=()=>{const n=b.dataset.nav;$('#nav').classList.remove('show');if(NAVTO[n]){location.href=NAVTO[n];return}if(n=='History'){setFilter('all');window.scrollTo({top:0,behavior:'smooth'})}});
$('#bell').onclick=e=>{e.stopPropagation();$('#npop').classList.toggle('show')};
document.addEventListener('click',()=>$('#npop').classList.remove('show'));
$('#login').onclick=()=>{location.href=SB.loginUrl('login')};$('#signup').onclick=()=>{location.href=SB.loginUrl('signup')};

/* Footer */
const LINKTO={'Home':'../index.html','Book Ticket':'../index.html#routes','Track Bus':'../tracking/index.html','My Trips':'index.html'};

async function load(){const r=await SB.get('/bookings');TRIPS=r.trips;REMOVED=r.removed;refresh()}
$('#list').innerHTML='<div class="empty"><b>Loading your trips…</b></div>';
SB.boot(()=>load().catch(SB.fail),true);
