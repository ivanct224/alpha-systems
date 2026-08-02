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
    document.getElementById('ttLink').href = settings.tiktok || '#';
  }
}, (err)=>console.error('settings', err));

/* ---------- SERVICIOS (services/) ----------
   Cada servicio puede tener: title, desc (resumen corto para la
   tarjeta), imageUrl (foto), reqType (para prellenar el formulario)
   e items[] (detalle en viñetas que se ve al hacer clic). */
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
    card.dataset.serviceIndex = i;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver detalle de ${s.title||'servicio'}`);

    const summary = (s.desc && s.desc.trim())
      ? s.desc
      : ((s.items||[])[0] || 'Servicio profesional de sistemas y soporte técnico.');

    const mediaStyle = s.imageUrl
      ? ` style="background-image:linear-gradient(180deg, rgba(22,58,92,0.05) 0%, rgba(22,58,92,0.55) 100%), url('${s.imageUrl}')"`
      : '';

    card.innerHTML = `
      <div class="card-media"${mediaStyle}>
        <span class="code">MOD-0${i+1}</span>
        <button class="wa-btn" type="button" data-wa-reserve aria-label="Reservar ${escapeHtml(s.title||'este servicio')} por WhatsApp">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 10.5c0 2.8 2.2 5 5 5"/></svg>
          Reservar
        </button>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(s.title||'')}</h3>
        <p class="summary">${escapeHtml(summary)}</p>
        <span class="view-detail">Ver detalle →</span>
      </div>
    `;

    card.querySelector('[data-wa-reserve]').addEventListener('click', (e)=>{
      e.stopPropagation();
      reserveServiceOnWhatsapp(s);
    });
    card.addEventListener('click', ()=> openServiceDetail(i));
    card.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openServiceDetail(i);
      }
    });

    grid.appendChild(card);
  });

  applyCatalogSearch(document.getElementById('catalogSearch')?.value || '');
}

/* ---------- BUSCADOR DEL CATÁLOGO (header) ----------
   Filtra en vivo las tarjetas de "Áreas de trabajo" según lo que
   escriba el usuario, buscando en el título, la descripción corta
   y el detalle de cada servicio publicado. */
function applyCatalogSearch(rawQuery){
  const grid = document.getElementById('servicesGrid');
  const noResults = document.getElementById('noServicesMatch');
  if(!grid) return;
  const q = (rawQuery||'').trim().toLowerCase();
  let anyVisible = false;

  grid.querySelectorAll('.card').forEach(card=>{
    const s = services[Number(card.dataset.serviceIndex)];
    if(!s){ card.style.display = ''; return; }
    const haystack = [s.title, s.desc, ...(s.items||[])].filter(Boolean).join(' ').toLowerCase();
    const match = !q || haystack.includes(q);
    card.style.display = match ? '' : 'none';
    if(match) anyVisible = true;
  });

  if(noResults) noResults.style.display = (q && !anyVisible) ? 'block' : 'none';
}

const catalogSearchInput = document.getElementById('catalogSearch');
const navSearchBox = document.querySelector('.nav-search');

catalogSearchInput?.addEventListener('input', (e)=>{
  applyCatalogSearch(e.target.value);
});

catalogSearchInput?.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    document.getElementById('servicios')?.scrollIntoView({ behavior:'smooth' });
  }
});

/* En pantallas angostas el buscador arranca colapsado (solo el ícono);
   se expande al tocarlo y vuelve a colapsar si queda vacío. */
navSearchBox?.addEventListener('click', ()=>{
  if(!navSearchBox.classList.contains('active')){
    navSearchBox.classList.add('active');
    catalogSearchInput?.focus();
  }
});
catalogSearchInput?.addEventListener('blur', ()=>{
  if(!catalogSearchInput.value.trim()){
    navSearchBox?.classList.remove('active');
  }
});

function reserveServiceOnWhatsapp(s){
  if(!settings.whatsapp){
    toast('Todavía no hay un WhatsApp configurado en el panel');
    return;
  }
  const msg = encodeURIComponent(`Hola ALPHA SYSTEMS, quiero reservar/cotizar: ${s.title||''}`);
  window.open(`https://wa.me/${settings.whatsapp}?text=${msg}`, '_blank');
}

function openServiceDetail(i){
  const s = services[i];
  if(!s) return;
  const box = document.getElementById('serviceDetailContent');
  box.innerHTML = `
    <div class="future-detail">
      ${s.imageUrl ? `<img src="${s.imageUrl}" alt="${escapeHtml(s.title||'')}" style="width:100%; height:190px; object-fit:cover; border-radius:10px; margin-bottom:16px;">` : ''}
      <span class="tag">MOD-0${i+1}</span>
      <h3>${escapeHtml(s.title||'')}</h3>
      ${s.desc ? `<p class="desc">${escapeHtml(s.desc)}</p>` : ''}
      <ul>${(s.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('')}</ul>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn small" id="reserveServiceWa" style="width:100%; justify-content:center;">Reservar por WhatsApp</button>
      <button class="btn ghost small" id="requestThisServiceForm" style="width:100%; justify-content:center;">Solicitar por formulario</button>
    </div>
  `;
  document.getElementById('reserveServiceWa').addEventListener('click', ()=>{
    reserveServiceOnWhatsapp(s);
    document.getElementById('serviceOverlay').classList.remove('show');
  });
  document.getElementById('requestThisServiceForm').addEventListener('click', ()=>{
    document.getElementById('serviceOverlay').classList.remove('show');
    document.getElementById('reqType').value = s.reqType || 'soporte';
    document.getElementById('reqDesc').value = `Quiero cotizar: ${s.title||''}`;
    document.getElementById('soporte').scrollIntoView({ behavior:'smooth' });
    document.getElementById('reqName').focus();
  });
  document.getElementById('serviceOverlay').classList.add('show');
  attachCloseHandlers();
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
 if(s.imageUrl){
      card.style.backgroundImage = `url('${s.imageUrl}')`;
    }
    card.addEventListener('click', ()=> openFutureDetail(i));
    track.appendChild(card);

    const dot = document.createElement('button');
    dot.className = 'future-dot' + (i===0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Ir a ' + (s.title||''));
    dot.addEventListener('click', ()=>{ scrollFutureTo(i); startFutureAutoplay(); });
    dotsBox.appendChild(dot);
  });

  updateFutureDots();
  startFutureAutoplay();
}

let futureScrollListenerAttached = false;
function attachFutureScrollListener(){
  if(futureScrollListenerAttached) return;
  const track = document.getElementById('futureCarousel');
  if(!track) return;
  track.addEventListener('scroll', debounce(updateFutureDots, 80));
  track.addEventListener('mouseenter', stopFutureAutoplay);
  track.addEventListener('mouseleave', startFutureAutoplay);
  track.addEventListener('touchstart', stopFutureAutoplay, { passive:true });
  track.addEventListener('touchend', ()=> setTimeout(startFutureAutoplay, 2500), { passive:true });
  futureScrollListenerAttached = true;
}
attachFutureScrollListener();

/* ---------- Auto-avance del carrusel (tipo publicidad) ---------- */
const FUTURE_AUTOPLAY_MS = 4500; // tiempo por card: ni tan rápido ni tan lento para alcanzar a leer
let futureAutoplayTimer = null;

function startFutureAutoplay(){
  stopFutureAutoplay();
  if(featuredServices.length <= 1) return;
  futureAutoplayTimer = setInterval(()=>{
    const next = (currentFutureIndex() + 1) % featuredServices.length;
    scrollFutureTo(next);
  }, FUTURE_AUTOPLAY_MS);
}

function stopFutureAutoplay(){
  if(futureAutoplayTimer){
    clearInterval(futureAutoplayTimer);
    futureAutoplayTimer = null;
  }
}

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
  stopFutureAutoplay();
  const box = document.getElementById('futureDetailContent');
  box.innerHTML = `
    <div class="future-detail">
      <span class="tag">${escapeHtml(s.tag||'')}</span>
      <h3>${escapeHtml(s.title||'')}</h3>
      ${s.price ? `<div class="detail-price">${escapeHtml(s.price)}</div>` : ''}
      <p class="desc">${escapeHtml(s.desc||'')}</p>
      <ul>${(s.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('')}</ul>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn small" id="reserveOnWhatsapp" style="width:100%; justify-content:center;">Reservar por WhatsApp</button>
      <button class="btn ghost small" id="requestThisService" style="width:100%; justify-content:center;">Solicitar por formulario</button>
    </div>
  `;
  document.getElementById('reserveOnWhatsapp').addEventListener('click', ()=>{
    if(!settings.whatsapp){
      toast('Todavía no hay un WhatsApp configurado en el panel');
      return;
    }
    const msg = encodeURIComponent(`Hola ALPHA SYSTEMS, quiero reservar/cotizar: ${s.title||''}`);
    window.open(`https://wa.me/${settings.whatsapp}?text=${msg}`, '_blank');
    document.getElementById('futureOverlay').classList.remove('show');
    startFutureAutoplay();
  });
  document.getElementById('requestThisService').addEventListener('click', ()=>{
    document.getElementById('futureOverlay').classList.remove('show');
    startFutureAutoplay();
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
  startFutureAutoplay();
});
document.getElementById('futureNext')?.addEventListener('click', ()=>{
  const idx = Math.min(currentFutureIndex() + 1, featuredServices.length - 1);
  scrollFutureTo(idx);
  startFutureAutoplay();
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
  if(ov){
    ov.classList.remove('show');
    if(ov.id === 'futureOverlay') startFutureAutoplay();
  }
}
attachCloseHandlers();

document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click', (e)=>{
    if(e.target === ov){
      ov.classList.remove('show');
      if(ov.id === 'futureOverlay') startFutureAutoplay();
    }
  });
});
