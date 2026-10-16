const I={back:'<path d="M15 18l-6-6 6-6"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',chev:'<path d="M6 9l6 6 6-6"/>',
phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',share:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/>',
help:'<path d="M3 14v-2a9 9 0 0 1 18 0v2M3 14h3v5H4a1 1 0 0 1-1-1zM21 14h-3v5h2a1 1 0 0 0 1-1z"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
cal:'<path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',locate:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
seat:'<path d="M7 3v9a2 2 0 0 0 2 2h7M5 21h14M17 14v7"/>',gauge:'<path d="M12 14l4-4M3.3 17a10 10 0 1 1 17.4 0"/>',route:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6"/>',
bus:'<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21v-4M16 21v-4"/>',star:'<polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.6"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
document.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=ic(e.dataset.i));
const $=s=>document.querySelector(s);
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)};
const dlg=$('#dlg');let onClose=null;
const open=(t,h)=>{$('#dt').textContent=t;$('#dbody').innerHTML=h;if(!dlg.open)dlg.showModal()};
dlg.addEventListener('close',()=>{onClose&&onClose();onClose=null});
$('#dx').onclick=()=>dlg.close();
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});

/* Route & stops - real coordinates, Delhi to Manali via Chandigarh, Bilaspur, Mandi and Kullu */
(async()=>{
/* Load the trip from the server: ?booking=SB… (your ticket), ?bus=&from=&to=&date= (shared link) or the demo bus */
const qs=new URLSearchParams(location.search),qstr=['booking','bus','from','to','date'].filter(k=>qs.get(k)).map(k=>k+'='+encodeURIComponent(qs.get(k))).join('&');
let T;try{await SB.ready;T=await SB.get('/tracking'+(qstr?'?'+qstr:''))}catch(e){
 if(e.status==401){location.replace(SB.loginUrl('login'));return}
 document.querySelector('main').innerHTML='<section class="card" style="text-align:center;padding:40px 20px"><h1 style="margin:0 0 8px">Cannot track this bus</h1><p class="mut">'+SB.esc(e.message)+'</p><p style="margin-top:18px"><a class="btn" href="index.html">Track the demo bus</a> <a class="btn ghost" href="../history/index.html">My trips</a></p></section>';return}
const S=T.stops.map(s=>[s.name,s.time,s.lat,s.lng,s.state]);
let CUR=1;
const paintStops=()=>{$('#stops').innerHTML=S.map((s,i)=>{const c=i<CUR?'done':i==CUR?'cur':'',e=i==S.length-1?' end':'';
return `<li class="${c}${e}" data-s="${i}"><div><b>${s[0]}${i==CUR?' (Last crossed)':''}</b><div class="mut">${s[1]}${i==CUR?'<span class="live">Live</span>':''}</div></div>${i<CUR?'<span class="tag">Departed</span>':i==CUR?`<span class="here">${ic('bus').replace('class="ic"','class="ic" style="width:14px;height:14px"')}Bus is ahead</span>`:''}</li>`}).join('')};
paintStops();
/* Fill the static header from the server data */
(()=>{const B=T.bus,f=(k,v)=>{const el=document.querySelector(k);if(el)el.textContent=v};
 f('#bcode',B.operator);f('.trip .r1 > b',B.from+' → '+B.to);f('#breg',B.reg+' · '+B.type);
 const m=document.querySelectorAll('.trip .r2 .meta');if(m[1])m[1].lastChild.textContent=B.dep;
 f('#seats',B.seatsLeft+' Seats Left');
 const dn=document.querySelector('.drv .big');if(dn)dn.textContent=T.driver.name;
 const dr=document.querySelectorAll('.drv .mut')[1];if(dr)dr.innerHTML='<span style="color:var(--or)">★</span> <b style="color:var(--tx)">'+T.driver.rating+'</b> ('+T.driver.reviews+' Reviews)';
 const im=document.querySelector('.drv .av');if(im)im.alt='Driver '+T.driver.name;
 const sb=document.querySelectorAll('.sum b');if(sb[0])sb[0].textContent=T.totalKm+' km';if(sb[1])sb[1].textContent=Math.floor(T.durationMin/60)+'h '+String(T.durationMin%60).padStart(2,'0')+'m';if(sb[2])sb[2].textContent=S[S.length-1][1];
 document.title=B.operator+' · '+B.from+' → '+B.to+' | Live tracking';
 const lbl=document.querySelector('.trip .r1 + .r2, .trip .r2');})();
$('#stops').onclick=e=>{const li=e.target.closest('li');if(!li)return;const i=+li.dataset.s,s=S[i];flyTo(i);toast(i<CUR?`${s[0]} – departed (scheduled ${s[1]})`:i==CUR?`The bus last crossed ${s[0]}`:`${s[0]} – scheduled arrival ${s[1]}`)};

/* Panel */
const shell=$('#shell'),mq=matchMedia('(max-width:960px)');
const setPanel=o=>{shell.dataset.open=o;shell.classList.toggle('closed',!o)};
setPanel(!mq.matches);mq.onchange=()=>setPanel(!mq.matches);
$('#openR').onclick=()=>setPanel(mq.matches?true:shell.dataset.open!=='true');
$('#closeR').onclick=$('#bd').onclick=()=>setPanel(false);
document.querySelector('.stops').closest('aside').addEventListener('keydown',e=>{if(e.key==='Escape'&&mq.matches)setPanel(false)});

/* Header */
$('#menu').onclick=()=>$('#nav').classList.toggle('show');
const pops=['#npop','#upop'];
const closePops=()=>pops.forEach(p=>$(p).classList.remove('show'));
$('#bell').onclick=e=>{e.stopPropagation();const o=!$('#npop').classList.contains('show');closePops();$('#npop').classList.toggle('show',o)};
$('#um').onclick=e=>{e.stopPropagation();const o=!$('#upop').classList.contains('show');closePops();$('#upop').classList.toggle('show',o)};
document.addEventListener('click',closePops);
$('#upop').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.u==='My profile'){location.href='../profile/index.html';return}toast(b.dataset.u)};
const NAVPAGE={services:'../services/index.html',history:'../history/index.html',profile:'../profile/index.html'};
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{$('#nav').classList.remove('show');if(NAVPAGE[b.dataset.nav])location.href=NAVPAGE[b.dataset.nav]});
$('#back').onclick=()=>{location.href='../history/index.html'};

/* Book a ticket: the full flow (bus, seats, payment) is on the Services page */
$('#book').onclick=()=>{const B=T.bus;location.href='../services/index.html?s=search&from='+encodeURIComponent(B.from)+'&to='+encodeURIComponent(B.to)};

/* Driver */
let ct;
$('#call').onclick=async()=>{if(!SB.user)return SB.needLogin();try{await SB.post('/tracking/call',{bus:T.bus.code})}catch(e){return SB.fail(e)}open('Calling driver',`<div class="call"><img class="av" src="${document.querySelector('.av').src}" alt=""><b>${SB.esc(T.driver.name)}</b><span class="mut" id="ctime">Ringing…</span><button class="btn" id="end" style="background:var(--rd);border-color:var(--rd)">End call</button></div>`);let s=-2;clearInterval(ct);ct=setInterval(()=>{s++;if(s>=0)$('#ctime').textContent=`Connected · ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`},1000);$('#end').onclick=()=>dlg.close();onClose=()=>{clearInterval(ct);toast('Call ended')}};
$('#chat').onclick=async()=>{if(!SB.user)return SB.needLogin();
open('Chat with '+T.driver.name.split(' ')[0],`<div class="msgs" id="msgs"><div class="m">Hi! I'm driving your bus. How can I help?</div></div><div style="display:flex;gap:8px"><input id="ci" maxlength="300" placeholder="Type a message" style="flex:1;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--tx)"><button class="btn" id="cs">Send</button></div>`);
const add=(t,me)=>{const d=document.createElement('div');d.className='m'+(me?' me':'');d.textContent=t;$('#msgs').append(d);$('#msgs').scrollTop=1e5};
try{(await SB.get('/tracking/messages?bus='+encodeURIComponent(T.bus.code))).messages.forEach(m=>add(m.text,m.me))}catch(e){}
const send=async()=>{const v=$('#ci').value.trim();if(!v)return;add(v,1);$('#ci').value='';try{const r=await SB.post('/tracking/messages',{bus:T.bus.code,text:v});setTimeout(()=>add(r.reply),700)}catch(e){SB.fail(e)}};
$('#cs').onclick=send;$('#ci').onkeydown=e=>{if(e.key==='Enter')send()};$('#ci').focus()};

/* Rating */
let rating=0;const st=$('#stars');
st.innerHTML=[1,2,3,4,5].map(n=>`<button data-n="${n}" aria-label="${n} star${n>1?'s':''}">${ic('star')}</button>`).join('');
const paint=n=>[...st.children].forEach((b,i)=>b.classList.toggle('f',i<n));
st.onmouseover=e=>{const b=e.target.closest('button');if(b)paint(+b.dataset.n)};st.onmouseleave=()=>paint(rating);
st.onclick=e=>{const b=e.target.closest('button');if(!b)return;rating=+b.dataset.n;paint(rating);$('#rtxt').textContent=`You rated this trip ${rating}/5`;toast('Thanks for your feedback!')};

/* ===== Bus reviews (stored on the server: /api/reviews) ===== */
(()=>{
const BUSKEY=T.bus.operator,BUS=T.bus.operator+' · '+T.bus.reg;
let ALL=[],pick=0,filter='all',shown=4;
const esc=SB.esc;
const stars=(n,cls)=>`<span class="${cls}" aria-label="${n} out of 5">${[1,2,3,4,5].map(i=>`<span class="${i<=Math.round(n)?'f':''}">${ic('star')}</span>`).join('')}</span>`;
const fmt=d=>{const x=new Date(d+'T00:00');return isNaN(x)?d:x.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})};
$('#revBus').textContent=BUS;
function draw(){
 const L=ALL,n=L.length,avg=n?L.reduce((a,x)=>a+x.r,0)/n:0;
 $('#revAvg').textContent=avg.toFixed(1);$('#revStars').innerHTML=[1,2,3,4,5].map(i=>`<span class="${i<=Math.round(avg)?'f':''}">${ic('star')}</span>`).join('');
 $('#revCnt').textContent=`${n} review${n==1?'':'s'}`;
 $('#revBars').innerHTML=[5,4,3,2,1].map(s=>{const c=L.filter(x=>x.r==s).length;return `<div class="rev-b"><span>${s}★</span><i><b style="width:${n?c/n*100:0}%"></b></i><span>${c}</span></div>`}).join('');
 const tag={};L.forEach(x=>{if(x.a&&x.r>=4)tag[x.a]=(tag[x.a]||0)+1});
 $('#revTags').innerHTML=Object.entries(tag).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`<span>${esc(k)} · ${v}</span>`).join('');
 $('#revF').innerHTML=[['all','All'],['5','5 ★'],['4','4 ★'],['low','3 ★ & below']].map(([k,t])=>`<button type="button" data-f="${k}" class="${filter==k?'on':''}" aria-pressed="${filter==k}">${t}</button>`).join('');
 const F=L.filter(x=>filter=='all'||(filter=='low'?x.r<=3:x.r==+filter));
 $('#revList').innerHTML=F.length?F.slice(0,shown).map(x=>`<article class="rv"><div class="rv-h"><span class="rv-a">${esc(x.n.trim().charAt(0).toUpperCase()||'?')}</span><div><b>${esc(x.n)}</b><small>${fmt(x.d)}</small></div>${stars(x.r,'rv-s')}</div><p>${esc(x.t)}</p><div class="rv-m">${x.v?'<span class="tg">Verified trip</span>':''}${x.a?`<span class="mut">${esc(x.a)}</span>`:''}<button type="button" data-h="${x.id}" class="${x.liked?'on':''}" aria-pressed="${!!x.liked}">Helpful (${x.h})</button></div></article>`).join('')+(F.length>shown?`<button type="button" class="btn ghost rev-more" id="revMore">Show more reviews (${F.length-shown})</button>`:''):'<div class="rev-empty">No reviews for this filter yet.</div>';
}
async function load(){try{ALL=(await SB.get('/reviews?bus='+encodeURIComponent(BUSKEY))).reviews}catch(e){ALL=[]}draw()}
function paintPick(n){[...$('#revPick').children].forEach((b,i)=>{b.classList.toggle('f',i<n);b.setAttribute('aria-checked',String(i+1==pick))})}
$('#revPick').innerHTML=[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="false" data-n="${n}" aria-label="${n} star${n>1?'s':''}">${ic('star')}</button>`).join('');
$('#revPick').onmouseover=e=>{const b=e.target.closest('button');if(b)paintPick(+b.dataset.n)};$('#revPick').onmouseleave=()=>paintPick(pick);
$('#revPick').onclick=e=>{const b=e.target.closest('button');if(!b)return;pick=+b.dataset.n;paintPick(pick);$('#revMsg').textContent=''};
function openForm(r){if(!SB.user){SB.needLogin();return}const f=$('#revForm');f.hidden=false;if(r){pick=r;paintPick(r)}$('#revName').value=$('#revName').value||SB.user.name;f.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('#revTxt').focus({preventScroll:true}),350)}
$('#revWrite').onclick=()=>openForm();
$('#revCancel').onclick=()=>{$('#revForm').hidden=true;$('#revMsg').textContent=''};
$('#revF').onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;shown=4;draw()};
$('#revList').onclick=async e=>{if(e.target.closest('#revMore')){shown+=4;draw();return}const h=e.target.closest('[data-h]');if(h){if(!SB.user)return SB.needLogin();try{const r=await SB.post('/reviews/'+h.dataset.h+'/helpful');const it=ALL.find(x=>x.id==h.dataset.h);it.liked=r.liked;it.h=r.helpful;draw()}catch(err){SB.fail(err)}}};
$('#revForm').onsubmit=async e=>{e.preventDefault();const txt=$('#revTxt').value.trim(),msg=$('#revMsg');msg.style.color='var(--rd)';
 if(!pick){msg.textContent='Please choose a star rating.';return}
 if(txt.length<10){msg.textContent='Write at least 10 characters about your trip.';return}
 try{const r=await SB.post('/reviews',{bus:BUSKEY,rating:pick,text:txt,aspect:$('#revAsp').value,name:$('#revName').value.trim()});ALL.unshift(r.review);
  pick=0;paintPick(0);$('#revTxt').value='';$('#revAsp').value='';$('#revForm').hidden=true;msg.textContent='';filter='all';draw();toast('Thanks! Your review has been posted');$('#revList').scrollIntoView({behavior:'smooth',block:'nearest'})}
 catch(err){if(err.status==401)SB.needLogin();else msg.textContent=err.message}};
const q=$('#stars');if(q)q.addEventListener('click',e=>{const b=e.target.closest('button');if(b)openForm(+b.dataset.n)});
load();
})();

/* Share & help */
$('#share').onclick=async()=>{const B=T.bus,url=location.origin+location.pathname+'?bus='+encodeURIComponent(B.code)+'&from='+encodeURIComponent(B.from)+'&to='+encodeURIComponent(B.to)+'&date='+B.date;   /* the link never includes your booking ID */
const d={title:`TrackB live tracking · ${B.from} to ${B.to}`,text:`Track my ${B.from} → ${B.to} bus live`,url};
try{if(navigator.share){await navigator.share(d);return}await navigator.clipboard.writeText(d.url);toast('Tracking link copied')}catch(e){if(e&&e.name==='AbortError')return;toast('Could not copy the link')}};
$('#help').onclick=()=>open('How can we help?','<button class="opt" data-k="delay">Report a delay</button><button class="opt" data-k="lost">Lost an item</button><button class="opt" data-k="support">Talk to support</button><button class="opt" data-k="emergency">Emergency</button>');
$('#dbody').addEventListener('click',async e=>{const o=e.target.closest('[data-k]');if(!o)return;try{const r=await SB.post('/tickets',{kind:o.dataset.k,bus:T.bus.code,bookingId:T.bus.booking});dlg.close();toast(r.message+' · ref '+r.ticket)}catch(err){SB.fail(err)}});

/* ===== Live map: real road route, Google-Maps-style controls ===== */
const R_EARTH=6371,rad=d=>d*Math.PI/180;
const hav=(a,b)=>{const x=Math.sin(rad(b[0]-a[0])/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(rad(b[1]-a[1])/2)**2;return 2*R_EARTH*Math.asin(Math.sqrt(x))};
let path=S.map(s=>[s[2],s[3]]),cum=[],total=0,stopKm=[];
function build(coords){path=coords;cum=[0];for(let i=1;i<path.length;i++)cum[i]=cum[i-1]+hav(path[i-1],path[i]);total=cum[cum.length-1];
let from=0;stopKm=S.map(s=>{let best=from,bd=1e9;for(let i=from;i<path.length;i++){const d=hav(path[i],[s[2],s[3]]);if(d<bd){bd=d;best=i}}from=best;return cum[best]})}
const pointAt=km=>{km=Math.max(0,Math.min(total,km));let lo=0,hi=cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;cum[m]<=km?lo=m:hi=m}const t=(km-cum[lo])/((cum[hi]-cum[lo])||1);return[path[lo][0]+(path[hi][0]-path[lo][0])*t,path[lo][1]+(path[hi][1]-path[lo][1])*t,lo]};
const fmtLL=(la,lo)=>`${Math.abs(la).toFixed(5)}° ${la>=0?'N':'S'}, ${Math.abs(lo).toFixed(5)}° ${lo>=0?'E':'W'}`;
build(path);

const hasL=typeof L!=='undefined'&&$('#gmap');
let map=null,busM=null,casing=null,line=null,done=null,mine=null,mineAcc=null,follow=false,baseType='map',baseLayer=null;
let prog=T.progress,speed=T.speed||0,arrived=false;
const themeNow=()=>window.SBTheme?SBTheme.theme():'light';

if(hasL){
 $('#map').classList.add('live');
 const attr='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
 const bases={light:()=>L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:attr}),
  dark:()=>L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:attr}),
  sat:()=>L.layerGroup([L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics'}),L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19})])};
 map=L.map('gmap',{zoomControl:false,zoomSnap:.5,zoomDelta:1,minZoom:4,maxZoom:18,worldCopyJump:false,tap:true});
 map.attributionControl.setPosition('bottomleft');
 const paintBase=()=>{if(baseLayer)map.removeLayer(baseLayer);baseLayer=bases[baseType=='sat'?'sat':themeNow()=='dark'?'dark':'light']();baseLayer.addTo(map);paintRoute()};
 const paintRoute=()=>{const d=themeNow()=='dark'||baseType=='sat';casing&&casing.setStyle({color:d?'#0b2447':'#ffffff'});};
 map.setView([30.3,77.0],7);
 casing=L.polyline(path,{color:'#fff',weight:9,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(map);
 line=L.polyline(path,{color:'#4285f4',weight:6,opacity:1,lineCap:'round',lineJoin:'round'}).addTo(map);
 done=L.polyline([],{color:'#8a94a6',weight:6,opacity:1,lineCap:'round',lineJoin:'round'}).addTo(map);
 S.forEach((s,i)=>{const end=i==0||i==S.length-1;const m=L.circleMarker([s[2],s[3]],{radius:end?8:5,color:i==0?'#1f9d55':i==S.length-1?'#d93a2b':'#4285f4',weight:3,fillColor:'#fff',fillOpacity:1}).addTo(map);
  m.bindTooltip(`<b>${s[0]}</b><br>${s[1]}`,{direction:'top',offset:[0,-6],permanent:end,className:'stip'});s.m=m});
 busM=L.marker(pointAt(prog*total).slice(0,2),{icon:L.divIcon({className:'busmk',html:`<span class="pulse"></span><span class="bm">${ic('bus')}</span>`,iconSize:[44,44],iconAnchor:[22,22]}),zIndexOffset:1000,keyboard:false}).addTo(map);
 busM.bindTooltip('HRTC Volvo · live',{direction:'top',offset:[0,-22],className:'stip'});
 map.fitBounds(L.latLngBounds(path),{padding:[30,30]});
 paintBase();
 window.addEventListener('sbthemechange',paintBase);
 map.on('dragstart',()=>{follow=false});
 $('#mtype').onclick=e=>{const b=e.target.closest('button');if(!b)return;baseType=b.dataset.l;[...$('#mtype').children].forEach(x=>x.classList.toggle('on',x===b));paintBase()};
 $('#zi').onclick=()=>map.zoomIn();$('#zo').onclick=()=>map.zoomOut();
 $('#loc').onclick=()=>{follow=true;map.flyTo(busM.getLatLng(),13,{duration:.9});toast('Centred on your bus')};
 $('#full').onclick=()=>{const m=$('#map'),on=m.classList.toggle('fs');document.body.classList.toggle('nofs',on);setTimeout(()=>map.invalidateSize(),50)};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#map').classList.contains('fs'))$('#full').click()});
 $('#myloc').onclick=()=>{if(!navigator.geolocation)return toast('Location is not available on this device');toast('Finding your location…');
  navigator.geolocation.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude];
   if(!mine){mineAcc=L.circle(ll,{radius:p.coords.accuracy,color:'#4285f4',weight:1,fillColor:'#4285f4',fillOpacity:.15}).addTo(map);mine=L.marker(ll,{icon:L.divIcon({className:'memk',html:'<span></span>',iconSize:[18,18]}),keyboard:false}).addTo(map).bindTooltip('You are here',{direction:'top',className:'stip'})}
   else{mine.setLatLng(ll);mineAcc.setLatLng(ll).setRadius(p.coords.accuracy)}
   follow=false;map.flyTo(ll,15,{duration:.9});toast(`Your location (±${Math.round(p.coords.accuracy)} m)`)},
  ()=>toast('Could not get your location. Allow location access and try again'),{enableHighAccuracy:true,timeout:12000,maximumAge:15000})};
}else{
 $('#mtype').style.display='none';$('#myloc').style.display='none';$('#full').style.display='none';$('#gl').style.display='none';
 let z=1;const zoom=v=>{z=Math.min(2.6,Math.max(1,v));$('#mapin').style.transform=`scale(${z})`};
 $('#zi').onclick=()=>zoom(z+.4);$('#zo').onclick=()=>zoom(z-.4);$('#loc').onclick=()=>{zoom(1.8);toast('Centred on your bus')};
}
const flyTo=i=>{if(!map)return;follow=false;map.flyTo([S[i][2],S[i][3]],12,{duration:.9});setTimeout(()=>S[i].m&&S[i].m.openTooltip(),950)};

/* Road-following geometry from the public OSRM router (falls back to straight legs between stops) */
const thin=c=>{const o=[c[0]];for(let i=1;i<c.length-1;i++)if(hav(o[o.length-1],c[i])>.15)o.push(c[i]);o.push(c[c.length-1]);return o};
async function loadRoad(){try{let c=null;try{c=JSON.parse(sessionStorage.getItem('sb_road_v1'))}catch(e){}
 if(!c){const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),15000);
  const r=await fetch('https://router.project-osrm.org/route/v1/driving/'+S.map(s=>s[3]+','+s[2]).join(';')+'?overview=full&geometries=geojson',{signal:ctl.signal});clearTimeout(to);
  const j=await r.json();if(j.code!=='Ok')throw 0;c=thin(j.routes[0].geometry.coordinates.map(p=>[p[1],p[0]]));try{sessionStorage.setItem('sb_road_v1',JSON.stringify(c))}catch(e){}}
 build(c);if(map){casing.setLatLngs(path);line.setLatLngs(path);map.fitBounds(L.latLngBounds(path),{padding:[30,30]})}update(true)}catch(e){}}

/* Reverse geocode (OpenStreetMap Nominatim) so the exact place name is shown */
let geoBusy=false,geoAt=-99;
async function reverse(la,lo,km){if(geoBusy||Math.abs(km-geoAt)<4)return;geoBusy=true;geoAt=km;
 try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=13&lat=${la}&lon=${lo}`,{headers:{'Accept-Language':'en'}});const j=await r.json(),a=j.address||{};
  const place=a.suburb||a.village||a.town||a.city||a.hamlet||a.county;if(place){$('#locn').dataset.set=1;$('#locn').textContent=place+(a.state_district&&a.state_district!==place?', '+a.state_district:'');$('#locs').textContent=[a.state,'India'].filter(Boolean).join(', ')}}catch(e){}geoBusy=false}

function update(force){const km=prog*total,p=pointAt(km),la=p[0],lo=p[1];
 if(busM)busM.setLatLng([la,lo]);
 if(done)done.setLatLngs(path.slice(0,p[2]+1).concat([[la,lo]]));
 if(follow&&map)map.panTo([la,lo],{animate:false});
 let cur=0;stopKm.forEach((k,i)=>{if(k<=km+.05)cur=i});
 if(cur!==CUR||force){CUR=cur;paintStops()}
 const nx=Math.min(S.length-1,cur+1),rem=Math.max(0,stopKm[nx]-km);
 arrived=km>=total-.05;
 $('#nxt').textContent=S[nx][0].replace(/ \(.*\)/,'');$('#rem').textContent=(rem<10?rem.toFixed(1):Math.round(rem))+' km';
 const mins=Math.max(1,Math.round(rem/Math.max(speed,20)*60)),eta=new Date(Date.now()+mins*6e4);
 $('#eta').textContent=arrived?'Arrived':`ETA: ${eta.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase()} (${mins} mins)`;
 $('#spd').textContent=arrived?'0 km/h':Math.round(speed)+' km/h';
 if(T.state==='scheduled'){$('#status').textContent='Scheduled';$('#status').className='ok';$('#eta').textContent=`Departs ${T.bus.dep} · ${new Date(T.bus.date+'T00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`;$('#spd').textContent='0 km/h'}
 else if(arrived)$('#status').textContent='Arrived';else $('#status').textContent=T.source==='gps'?'Live GPS':'On Time';
 const c=fmtLL(la,lo);$('#mcoord').textContent='Live · '+c;$('#gl').href=`https://www.google.com/maps?q=${la.toFixed(6)},${lo.toFixed(6)}`;
 if(!$('#locn').dataset.set){$('#locn').textContent='Near '+S[cur][0].replace(/ \(.*\)/,'');$('#locs').textContent=S[cur][4]+', India'}
 reverse(la,lo,km)}
let tk=0;setInterval(()=>{if(document.hidden||arrived||T.source!=='demo')return;prog=Math.min(1,prog+(speed*8/3600)/total);update()},1000);   /* demo bus: smooth 8x time-lapse between server updates */
const poll=async()=>{if(document.hidden)return;try{const n=await SB.get('/tracking'+(qstr?'?'+qstr:''));T.state=n.state;T.source=n.source;T.bus.seatsLeft=n.bus.seatsLeft;speed=n.speed;prog=n.progress;$('#seats').textContent=n.bus.seatsLeft+' Seats Left';update()}catch(e){}};
setInterval(poll,5000);   /* the server is the source of truth: real GPS when a device reports, else the schedule */
update(true);loadRoad();
$('#tdate').textContent=new Date(T.bus.date+'T00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
})();
