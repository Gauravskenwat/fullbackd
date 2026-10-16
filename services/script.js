const I={menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',close:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',pin:'<path d="M12 22s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',chev:'<path d="M9 18l6-6-6-6"/>',hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',bus:'<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21v-4M16 21v-4"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',seat:'<path d="M7 3v9a2 2 0 0 0 2 2h7M5 21h14M17 14v7"/>',card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',route:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const hydrate=r=>r.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=ic(e.dataset.i));hydrate(document);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600)};
const dlg=$('#dlg'),open=(t,h)=>{$('#dt').textContent=t;$('#dbody').innerHTML=h;if(!dlg.open)dlg.showModal()};
$('#dx').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
const EM=/^\S+@\S+\.\S+$/,inr=n=>'₹'+Number(n).toLocaleString('en-IN');

/* Services: Route Search, Bus Booking, Seat Reservation, Online Payment, Cancel Booking.
   All data (buses, seats, prices, coupons, payments, bookings) comes from the server (/api). */
const SV=[['search','Route Search','search'],['booking','Bus Booking','bus'],['seats','Seat Reservation','seat'],['pay','Online Payment','card'],['track','Live Tracking','route'],['hist','Booking History','hist'],['cancel','Cancel Booking','close'],['delivery','Parcel Delivery','box']];
const INFO={search:['Route Search','Find buses between any two cities.'],booking:['Bus Booking','Choose the bus that suits your schedule.'],seats:['Seat Reservation','Pick your seats on the bus.'],pay:['Online Payment','Pay securely to confirm your booking.'],cancel:['Cancel Booking','Cancel an upcoming trip and get a refund.'],done:['Booking confirmed','Your ticket is ready.']};
let CITIES=['Delhi','Manali','Shimla','Chandigarh','Jaipur','Mumbai','Pune','Bengaluru','Hyderabad','Chennai','Panaji','Ahmedabad','Rajkot','Kolkata','Lucknow','Nagpur','Indore','Bhopal','Surat','Kochi','Coimbatore','Amritsar','Dehradun','Udaipur'];
const STEPS=['Search','Select bus','Seats','Payment'];
const today=()=>new Date().toLocaleDateString('en-CA');
let view='search',R=null,CARDS=[],MINE=[],busy=false;
let B={from:'Delhi',to:'Manali',date:today(),pax:1,bus:null,seats:[],taken:new Set(),coupon:'',discount:0,couponMsg:'',method:'upi'};
const sname=i=>(Math.floor(i/4)+1)+'ABCD'[i%4];
const ST=n=>`<div class="stp">${STEPS.map((s,i)=>`<span class="${i+1==n?'on':i+1<n?'dn':''}">${i+1}. ${s}</span>`).join('')}</div>`;
const sum=()=>`<div class="sum"><b>${esc(B.from)} → ${esc(B.to)}</b> · ${B.date} · ${B.pax} passenger${B.pax>1?'s':''}${B.bus?`<br><small style="color:var(--mut)">${esc(B.bus.operator)} · ${esc(B.bus.type)} · departs ${B.bus.dep}${B.seats.length?' · Seats '+B.seats.slice().sort((a,b)=>a-b).map(sname).join(', '):''}</small>`:''}</div>`;
const subtotal=()=>B.bus?B.bus.price*B.pax:0, total=()=>Math.max(0,subtotal()-B.discount);
const loading=()=>{$('#body').innerHTML='<div class="empty"><b>Loading…</b></div>'};

function pSearch(){return ST(1)+`<div class="fm"><label>From<select id="f">${CITIES.map(c=>`<option${c==B.from?' selected':''}>${c}</option>`).join('')}</select></label><label>To<select id="t">${CITIES.map(c=>`<option${c==B.to?' selected':''}>${c}</option>`).join('')}</select></label><label>Date<input id="d" type="date" min="${today()}" value="${B.date}"></label><label>Passengers<select id="p">${[1,2,3,4,5,6].map(n=>`<option${n==B.pax?' selected':''}>${n}</option>`).join('')}</select></label></div><div class="bar"><button class="btn o" data-a="swap">Swap cities</button><button class="btn" data-a="search">Search buses</button></div>`}
function pBus(){const L=R?R.buses:[];return ST(2)+sum()+(L.length?L.map(b=>`<div class="bus"><div><b>${b.dep} · ${esc(b.type)}</b>${b.featured?' <span class="pill">Popular</span>':''}<div class="mt">${esc(b.operator)} · about ${b.hours} hrs · arrives ${esc(b.arr)} · ${b.seatsLeft} of 40 seats left</div></div><div class="rr"><b>${inr(b.price)}</b>${b.bookable?`<button class="btn sm" data-a="pick" data-id="${esc(b.code)}">Select seats</button>`:`<button class="btn sm o" disabled>${b.seatsLeft<B.pax?'Sold out':'Closed'}</button>`}</div></div>`).join(''):'<div class="empty"><b>No buses found</b>Try another date.</div>')+`<button class="btn o" data-a="tosearch">Change search</button>`}
function pSeats(){const tk=B.taken;return ST(3)+sum()+`<div class="lg"><span><i></i>Available</span><span><i class="s"></i>Selected</span><span><i class="t"></i>Booked</span></div><div class="deck">${Array.from({length:50},(_,i)=>{const c=i%5;if(c==2)return'<span class="a"></span>';const n=Math.floor(i/5)*4+(c<2?c:c-1);return`<button class="seat${tk.has(n)?' t':B.seats.includes(n)?' s':''}" data-seat="${n}" ${tk.has(n)?'disabled':''} aria-label="Seat ${sname(n)}">${sname(n)}</button>`}).join('')}</div><div class="bar"><span>Selected ${B.seats.length} of ${B.pax} · <b>${inr(subtotal())}</b></span><span style="display:flex;gap:8px"><button class="btn o" data-a="tobus">Back</button><button class="btn" data-a="topay">Continue to payment</button></span></div>`}
const METHODS=()=>[['upi','UPI'],['card','Credit / Debit card']].concat(CARDS.length?[['saved','Saved card']]:[],[['net','Net banking']]);
function pPay(){return ST(4)+sum()+`<div class="fm" style="margin-bottom:12px"><label style="grid-column:1/-1">Coupon code (optional)<span style="display:flex;gap:8px"><input id="cp" value="${esc(B.coupon)}" placeholder="e.g. TRACKB20" maxlength="20" style="flex:1;text-transform:uppercase"><button type="button" class="btn o sm" data-a="coupon">Apply</button></span></label></div><div id="cpm" style="margin:-4px 0 10px;font-size:13px;color:${B.discount?'#1f9d55':'var(--mut)'}">${esc(B.couponMsg)}</div>
<div style="margin-bottom:12px">${B.discount?`<small style="color:var(--mut)">Fare ${inr(subtotal())} − discount ${inr(B.discount)}</small><br>`:''}<b>Total payable: ${inr(total())}</b></div>${METHODS().map(m=>`<label class="opt"><input type="radio" name="m" value="${m[0]}"${m[0]==B.method?' checked':''}>${m[1]}</label>`).join('')}<div class="fm" id="mf" style="margin-top:12px"></div><div class="fm"><label>Passenger name<input id="pn" placeholder="Full name" value="${esc(SB.user?SB.user.name:'')}"></label><label>Phone<input id="ph" inputmode="tel" placeholder="+91 98765 43210" value="${esc(SB.user&&SB.user.phone||'')}"></label></div><div class="bar"><button class="btn o" data-a="toseats">Back</button><button class="btn" data-a="pay">Pay ${inr(total())}</button></div>`}
const MF=m=>({upi:'<label>UPI ID<input id="m1" placeholder="name@bank" autocomplete="off"></label>',card:'<label>Card number<input id="m1" inputmode="numeric" maxlength="19" placeholder="4242 4242 4242 4242" autocomplete="off"></label><label>Expiry (MM/YY)<input id="m2" maxlength="5" placeholder="08/30"></label><label>CVV<input id="m3" type="password" inputmode="numeric" maxlength="3" placeholder="•••"></label>',saved:`<label>Saved card<select id="m1">${CARDS.map(c=>`<option value="${c.id}">${esc(c.b)} •••• ${esc(c.l)} (exp ${esc(c.e)})${c.d?' – default':''}</option>`).join('')}</select></label><label>CVV<input id="m3" type="password" inputmode="numeric" maxlength="3" placeholder="•••"></label>`,net:'<label>Bank<select id="m1"><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option></select></label>'})[m];
function pCancel(){if(!SB.user)return `<div class="empty">${ic('check')}<b>Log in to manage your bookings</b><a class="btn" href="${SB.loginUrl('login')}">Log in</a></div>`;
return MINE.length?MINE.map(t=>`<div class="li"><div class="grow"><b>${esc(t.from)} → ${esc(t.to)}</b><small>${t.id} · ${t.date} · ${esc(t.dep)} · ${inr(t.total)}</small></div><button class="btn red sm" data-a="cancel" data-id="${t.id}">Cancel</button></div>`).join(''):'<div class="empty">'+ic('check')+'<b>No upcoming bookings</b>Nothing to cancel right now.</div>'}
function pDone(){const t=B.done;return `<div class="ok">${ic('check')}<h2>Payment successful</h2><p>Booking <b>${t.id}</b> · ${esc(t.from)} → ${esc(t.to)} · Seats ${esc(t.seat)}<br>Paid ${inr(t.total)} with ${esc(t.pay)}${t.discount?` (saved ${inr(t.discount)} with ${esc(t.coupon)})`:''}</p><div class="go"><a class="btn" style="text-decoration:none" href="../history/index.html">View in history</a><a class="btn o" style="text-decoration:none" href="../tracking/index.html?booking=${t.id}">Track bus</a><button class="btn o" data-a="again">Book another</button></div></div>`}

function render(){const key=view=='done'?'booking':view;$$('#navs .nv[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==key));
const i=INFO[view],step={search:pSearch,booking:pBus,seats:pSeats,pay:pPay,cancel:pCancel,done:pDone}[view];
$('#mt').textContent=i[0];$('#ms').textContent=i[1];$('#body').innerHTML=step();hydrate($('#body'));if(view=='pay')mf()}
const mf=()=>{B.method=document.querySelector('input[name=m]:checked').value;$('#mf').innerHTML=MF(B.method)};
const urlFor=v=>'?s='+v+'&from='+encodeURIComponent(B.from)+'&to='+encodeURIComponent(B.to)+'&date='+B.date+'&pax='+B.pax;
async function go(v){
if(v=='booking'&&!R){toast('Search a route first');v='search'}
if(v=='seats'&&!B.bus){toast('Pick a bus first');v=R?'booking':'search'}
if(v=='pay'&&!(B.bus&&B.seats.length==B.pax)){toast(B.bus?`Select ${B.pax} seat${B.pax>1?'s':''} first`:'Pick a bus first');v=B.bus?'seats':R?'booking':'search'}
if(v=='pay'){if(!SB.user){toast('Please log in to pay');setTimeout(()=>{history.replaceState(null,'',urlFor('search'));location.href=SB.loginUrl('login')},800);return}
 try{CARDS=(await SB.get('/cards')).cards}catch(e){CARDS=[]}if(!CARDS.length&&B.method=='saved')B.method='upi'}
if(v=='cancel'){loading();if(SB.user){try{MINE=(await SB.get('/bookings')).trips.filter(t=>t.status=='upcoming'&&t.canCancel)}catch(e){MINE=[]}}}
view=v;render();history.replaceState(null,'',['search','booking','seats','pay'].includes(v)?urlFor(v):'?s='+v);if(innerWidth<1000)$('.main').scrollIntoView({behavior:'smooth'})}

/* Sidebar */
$('#navs').innerHTML=SV.map(s=>`<button class="nv" data-v="${s[0]}">${ic(s[2])}<span>${s[1]}</span>${ic('chev').replace('class="ic"','class="ic ch"')}</button>`).join('');
$('#navs').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;if(v=='track')location.href='../tracking/index.html';else if(v=='hist')location.href='../history/index.html';else if(v=='delivery')location.href='../delivery/index.html';else if(v=='booking'&&!R){go('search');toast('Search a route first')}else go(v)};

/* Actions */
const quoteNow=async()=>{try{const q=await SB.post('/bookings/quote',{from:B.from,to:B.to,date:B.date,bus:B.bus.code,pax:B.pax,coupon:B.coupon,method:B.method});B.discount=q.discount;B.couponMsg=q.message;return q}catch(e){B.discount=0;B.couponMsg=e.message}};
document.addEventListener('change',async e=>{if(e.target.name=='m'){mf();if(B.coupon){await quoteNow();const keep=B.method;render();}}});
document.addEventListener('input',e=>{if(e.target.id=='m1'&&$('input[name=m]:checked')?.value=='card')e.target.value=e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()});
document.addEventListener('click',async e=>{
const s=e.target.closest('[data-seat]');if(s){const n=+s.dataset.seat,i=B.seats.indexOf(n);if(i>=0)B.seats.splice(i,1);else if(B.seats.length<B.pax)B.seats.push(n);else return toast(`You can select ${B.pax} seat${B.pax>1?'s':''} only`);render();return}
const b=e.target.closest('[data-a]');if(!b||busy)return;const a=b.dataset.a;
if(a=='swap'){const f=$('#f').value,t=$('#t').value;B.from=t;B.to=f;B.date=$('#d').value||B.date;B.pax=+$('#p').value;render()}
else if(a=='search'){const f=$('#f').value,t=$('#t').value,d=$('#d').value;if(f==t)return toast('Choose two different cities');if(!d||d<today())return toast('Choose today or a future date');
 busy=true;try{R=await SB.get(`/search?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&date=${d}&pax=${$('#p').value}`);Object.assign(B,{from:f,to:t,date:d,pax:+$('#p').value,bus:null,seats:[],coupon:'',discount:0,couponMsg:''});go('booking')}catch(err){SB.fail(err)}busy=false}
else if(a=='pick'){busy=true;try{const bus=R.buses.find(x=>x.code==b.dataset.id);const r=await SB.get(`/seats?from=${encodeURIComponent(B.from)}&to=${encodeURIComponent(B.to)}&date=${B.date}&bus=${encodeURIComponent(bus.code)}`);B.bus=bus;B.taken=new Set(r.taken);B.seats=[];B.coupon='';B.discount=0;B.couponMsg='';go('seats')}catch(err){SB.fail(err)}busy=false}
else if(a=='tosearch')go('search');else if(a=='tobus')go('booking');else if(a=='toseats')go('seats');
else if(a=='topay')go('pay');
else if(a=='coupon'){B.coupon=($('#cp').value||'').trim().toUpperCase();if(!B.coupon){B.discount=0;B.couponMsg='';return render()}B.method=document.querySelector('input[name=m]:checked').value;const keepN=$('#pn').value,keepP=$('#ph').value;await quoteNow();render();$('#pn').value=keepN;$('#ph').value=keepP}
else if(a=='pay')payNow();
else if(a=='again'){B={from:B.from,to:B.to,date:B.date,pax:1,bus:null,seats:[],taken:new Set(),coupon:'',discount:0,couponMsg:'',method:'upi'};R=null;go('search')}
else if(a=='cancel'){const t=MINE.find(x=>x.id==b.dataset.id);open('Cancel booking?',`<div>Cancel <b>${esc(t.from)} → ${esc(t.to)}</b> (${t.date})? You get <b>${inr(t.refundAmount)}</b> back (${t.refundPercent}% of ${inr(t.total)}) on your original payment method in 5–7 working days.</div><div style="display:flex;gap:10px"><button class="btn o" data-a="keep" style="flex:1">Keep booking</button><button class="btn red" data-a="yes" data-id="${t.id}" style="flex:1">Cancel booking</button></div>`)}
else if(a=='keep')dlg.close();
else if(a=='yes'){try{const r=await SB.post(`/bookings/${b.dataset.id}/cancel`);dlg.close();MINE=MINE.filter(x=>x.id!=b.dataset.id);render();toast(`Booking cancelled · ₹${r.booking.refund} refund on its way`)}catch(err){dlg.close();SB.fail(err)}}});
async function payNow(){const m=$('input[name=m]:checked').value,v=i=>($('#m'+i)?.value||'').trim(),name=$('#pn').value.trim(),ph=$('#ph').value.trim();
if(name.length<2)return toast('Enter the passenger name');if(!/^\+?[\d\s-]{10,}$/.test(ph))return toast('Enter a valid phone number');
const payment=m=='upi'?{method:'upi',upi:v(1)}:m=='card'?{method:'card',number:v(1),expiry:v(2),cvv:v(3)}:m=='saved'?{method:'saved',cardId:+v(1),cvv:v(3)}:{method:'net',bank:v(1)};
busy=true;const btn=$('[data-a=pay]');btn.disabled=true;btn.textContent='Processing payment…';
try{const r=await SB.post('/bookings',{from:B.from,to:B.to,date:B.date,bus:B.bus.code,pax:B.pax,seats:B.seats,passengerName:name,phone:ph,coupon:B.coupon,payment});B.done=r.booking;view='done';render();history.replaceState(null,'','?s=done');toast('Payment successful')}
catch(err){if(err.status==401)SB.needLogin();else{toast(err.message);if(err.status==409&&err.field=='seats'){try{const s=await SB.get(`/seats?from=${encodeURIComponent(B.from)}&to=${encodeURIComponent(B.to)}&date=${B.date}&bus=${encodeURIComponent(B.bus.code)}`);B.taken=new Set(s.taken);B.seats=B.seats.filter(x=>!B.taken.has(x));view='seats';render()}catch(x){}}else{btn.disabled=false;btn.textContent='Pay '+inr(total())}}}
busy=false}

/* Header */
$('#menu').onclick=()=>$('#nav').classList.toggle('show');
const NAVTO={'Track Bus':'../tracking/index.html','History':'../history/index.html','Profile':'../profile/index.html'};
$$('[data-nav]').forEach(b=>b.onclick=()=>{const n=b.dataset.nav;$('#nav').classList.remove('show');if(NAVTO[n])location.href=NAVTO[n];else go('search')});
$('#bell').onclick=e=>{e.stopPropagation();$('#npop').classList.toggle('show')};
document.addEventListener('click',()=>$('#npop').classList.remove('show'));
$('#login').onclick=()=>{location.href='../trackb-signup/index.html?mode=login&next='+encodeURIComponent(location.pathname+location.search)};$('#signup').onclick=()=>{location.href='../trackb-signup/index.html?mode=signup&next='+encodeURIComponent(location.pathname+location.search)};

/* Start: open the requested step; city list and prefill (?from=&to=&date=&pax=) */
(async()=>{try{const c=await SB.get('/cities');CITIES=c.cities}catch(e){}
const qp=new URLSearchParams(location.search),q=qp.get('s');const fixC=v=>{v=(v||'').replace(/^Goa \(Panaji\)$/,'Panaji');return CITIES.includes(v)?v:null};
B.from=fixC(qp.get('from'))||B.from;B.to=fixC(qp.get('to'))||B.to;const d=qp.get('date');if(d&&d>=today())B.date=d;const p=+qp.get('pax');if(p>=1&&p<=6)B.pax=p;
await SB.ready;
if(q=='cancel'){go('cancel')}else{view='search';render();if(['booking','seats','pay'].includes(q))toast('Search a route first')}})();
