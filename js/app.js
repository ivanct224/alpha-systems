/* =====================================================================
   APP.JS — lo que ve cualquier visitante del sitio
   ===================================================================== */

let services = [];
let settings = { whatsapp:"", instagram:"", tagline:"IC // Systems & Technology" };

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ---------- ESTADO DEL SISTEMA (content/status) ---------- */
function paintStatus(field, value){
  const dot = document.getElementById('dot'+field);
  const val = document.getElementById('val'+field);
  if(!dot || !val) return;
  val.textContent = value;
  dot.className = 'dot ' + (value === 'ONLINE' || value === 'READY' ? 'ok' : value === 'LIMITED' ? 'limited' : 'off');
}

db.collection('content').doc('status').onSnapshot(async (snap)=>{
  let data = snap.exists ? snap.data() : null;
  if(!data){
    data = { systems:'ONLINE', network:'ONLINE', support:'READY' };
    // Si no existe, algún admin autenticado lo creará al guardar por primera vez.
  }
  paintStatus('Systems', data.systems);
  paintStatus('Network', data.network);
  paintStatus('Support', data.support);
}, (err)=>console.error('status', err));

/* ---------- SETTINGS (content/settings) ---------- */
db.collection('content').doc('settings').onSnapshot((snap)=>{
  if(snap.exists){
    settings = snap.data();
    document.getElementById('footTagline').textContent = settings.tagline || 'IC // Systems & Technology';
    document.getElementById('waLink').href = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '#';
    document.getElementById('igLink').href = settings.instagram || '#';
  }
}, (err)=>console.error('settings', err));

/* ---------- SERVICIOS (services/) ---------- */
db.collection('services').orderBy('order').onSnapshot((snap)=>{
  services = [];
  snap.forEach(doc=> services.push({ id: doc.id, ...doc.data() }));
  renderServices();
}, (err)=>console.error('services', err));

function renderServices(){
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';
  services.forEach((s, i)=>{
    const card = document.createElement('div');
    card.className = 'card';
    const items = (s.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('');
    card.innerHTML = `
      <div class="code">// 0${i+1}</div>
      <h3>${escapeHtml(s.title||'')}</h3>
      <ul>${items}</ul>
    `;
    grid.appendChild(card);
  });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* =====================================================================
   SERVICIOS DESTACADOS — carrusel tipo vidriera / publicidad (03)
   Ahora vive en Firestore (colección "featuredServices"), igual que
   "services", así se edita 100% desde el panel de administración.
   Campos por doc: title, tag, badge, desc, reqType, items[], order
   ===================================================================== */
let featuredServices = [];

db.collection('featuredServices').orderBy('order').onSnapshot((snap)=>{
  featuredServices = [];
  snap.forEach(doc=> featuredServices.push({ id: doc.id, ...doc.data() }));
  renderFutureCarousel();
  if(typeof renderFeaturedAdmin === 'function' && isAdminUser) renderFeaturedAdmin();
}, (err)=>console.error('featuredServices', err));

function renderFutureCarousel(){
  const section = document.getElementById('destacados');
  const track = document.getElementById('futureCarousel');
  const dotsBox = document.getElementById('futureDots');
  if(!track || !dotsBox) return;

  if(!featuredServices.length){
    if(section) section.style.display = 'none';
    return;
  }
  if(section) section.style.display = '';

  track.innerHTML = '';
  dotsBox.innerHTML = '';

  featuredServices.forEach((s, i)=>{
    const card = document.createElement('div');
    card.className = 'future-card';
    card.innerHTML = `
      <span class="badge-bubble">${escapeHtml(s.badge||'')}</span>
      <span class="tag">${escapeHtml(s.tag||'')}</span>
      <h3>${escapeHtml(s.title||'')}</h3>
      <p>${escapeHtml(s.desc||'')}</p>
      <span class="more">Ver detalle →</span>
    `;
    card.addEventListener('click', ()=> openFutureDetail(i));
    track.appendChild(card);

    const dot = document.createElement('button');
    dot.className = 'future-dot' + (i===0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Ir a ' + (s.title||''));
    dot.addEventListener('click', ()=> scrollFutureTo(i));
    dotsBox.appendChild(dot);
  });

  updateFutureDots();
}

let futureScrollListenerAttached = false;
function attachFutureScrollListener(){
  if(futureScrollListenerAttached) return;
  const track = document.getElementById('futureCarousel');
  if(!track) return;
  track.addEventListener('scroll', debounce(updateFutureDots, 80));
  futureScrollListenerAttached = true;
}
attachFutureScrollListener();

function cardWidth(){
  const track = document.getElementById('futureCarousel');
  const first = track.querySelector('.future-card');
  if(!first) return 0;
  return first.getBoundingClientRect().width;
}

function currentFutureIndex(){
  const track = document.getElementById('futureCarousel');
  const w = cardWidth();
  if(!w) return 0;
  return Math.round(track.scrollLeft / w);
}

function scrollFutureTo(i){
  const track = document.getElementById('futureCarousel');
  const w = cardWidth();
  track.scrollTo({ left: i * w, behavior: 'smooth' });
}

function updateFutureDots(){
  if(!featuredServices.length) return;
  const idx = Math.min(Math.max(currentFutureIndex(), 0), featuredServices.length - 1);
  document.querySelectorAll('.future-dot').forEach((d, i)=>{
    d.classList.toggle('active', i === idx);
  });
}

function openFutureDetail(i){
  const s = featuredServices[i];
  if(!s) return;
  const box = document.getElementById('futureDetailContent');
  box.innerHTML = `
    <div class="future-detail">
      <span class="tag">${escapeHtml(s.tag||'')}</span>
      <h3>${escapeHtml(s.title||'')}</h3>
      <p class="desc">${escapeHtml(s.desc||'')}</p>
      <ul>${(s.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('')}</ul>
    </div>
    <button class="btn small" id="requestThisService" style="width:100%; justify-content:center;">Solicitar este servicio</button>
  `;
  document.getElementById('requestThisService').addEventListener('click', ()=>{
    document.getElementById('futureOverlay').classList.remove('show');
    document.getElementById('reqType').value = s.reqType || 'soporte';
    document.getElementById('reqDesc').value = `Quiero cotizar: ${s.title||''}`;
    document.getElementById('soporte').scrollIntoView({ behavior:'smooth' });
    document.getElementById('reqName').focus();
  });
  document.getElementById('futureOverlay').classList.add('show');
  attachCloseHandlers();
}

function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=> fn.apply(this, args), wait);
  };
}

document.getElementById('futurePrev')?.addEventListener('click', ()=>{
  const idx = Math.max(currentFutureIndex() - 1, 0);
  scrollFutureTo(idx);
});
document.getElementById('futureNext')?.addEventListener('click', ()=>{
  const idx = Math.min(currentFutureIndex() + 1, featuredServices.length - 1);
  scrollFutureTo(idx);
});

/* ---------- MISSION // SUPPORT: envío de solicitud ---------- */
document.getElementById('submitRequest').addEventListener('click', async ()=>{
  const name = document.getElementById('reqName').value.trim();
  const contact = document.getElementById('reqContact').value.trim();
  const serviceType = document.getElementById('reqType').value;
  const description = document.getElementById('reqDesc').value.trim();

  if(!name || !contact || !description){
    toast('Completá nombre, contacto y descripción');
    return;
  }

  try{
    await db.collection('requests').add({
      name, contact, serviceType, description,
      status: 'pendiente',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if(settings.whatsapp){
      const msg = encodeURIComponent(
        `Hola ALPHA SYSTEMS, soy ${name}. Necesito: ${serviceType}. ${description}`
      );
      window.open(`https://wa.me/${settings.whatsapp}?text=${msg}`, '_blank');
    }

    document.getElementById('reqName').value = '';
    document.getElementById('reqContact').value = '';
    document.getElementById('reqDesc').value = '';
    toast('Solicitud enviada. ¡Gracias!');
  }catch(err){
    console.error(err);
    toast('No se pudo enviar la solicitud. Intentá de nuevo.');
  }
});

/* ---------- Overlays genéricos ---------- */
function attachCloseHandlers(){
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.removeEventListener('click', closeOverlayFromBtn);
    btn.addEventListener('click', closeOverlayFromBtn);
  });
}
function closeOverlayFromBtn(e){
  const ov = e.target.closest('.overlay');
  if(ov) ov.classList.remove('show');
}
attachCloseHandlers();

document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click', (e)=>{ if(e.target === ov) ov.classList.remove('show'); });
});
