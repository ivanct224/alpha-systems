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
  // Agrupamos visualmente por categoría, respetando el orden dentro de cada una.
  services.sort((a,b)=> (a.category||'').toLowerCase().localeCompare((b.category||'').toLowerCase()));
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
      ? ` style="background-image:linear-gradient(180deg, rgba(10,22,36,0.28) 0%, rgba(10,22,36,0) 28%, rgba(10,22,36,0) 72%, rgba(10,22,36,0.32) 100%), url('${s.imageUrl}')"`
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
        ${s.category ? `<span class="card-category">${escapeHtml(s.category)}</span>` : ''}
        <div class="card-title-row">
          <h3>${escapeHtml(s.title||'')}</h3>
          ${s.price ? `<span class="price-tag">${escapeHtml(s.price)}</span>` : ''}
        </div>
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

  renderCategoryFilters();
  applyCatalogSearch(document.getElementById('catalogSearch')?.value || '');
}

/* ---------- FILTRO POR CATEGORÍA ---------- */
let currentCategory = 'todos';

function renderCategoryFilters(){
  const box = document.getElementById('categoryFilters');
  if(!box) return;
  const cats = [...new Set(services.map(s=> (s.category||'').trim()).filter(Boolean))];

  if(cats.length === 0){
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';

  box.innerHTML = `
    <button type="button" class="category-chip ${currentCategory==='todos' ? 'active' : ''}" data-cat="todos">Todos</button>
    ${cats.map(c=> `<button type="button" class="category-chip ${currentCategory===c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
  `;

  box.querySelectorAll('[data-cat]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentCategory = btn.getAttribute('data-cat');
      renderCategoryFilters();
      applyCatalogSearch(document.getElementById('catalogSearch')?.value || '');
    });
  });
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
    const matchesCategory = currentCategory === 'todos' || (s.category||'').trim() === currentCategory;
    const haystack = [s.title, s.desc, s.category, ...(s.items||[])].filter(Boolean).join(' ').toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    const match = matchesCategory && matchesQuery;
    card.style.display = match ? '' : 'none';
    if(match) anyVisible = true;
  });

  if(noResults) noResults.style.display = anyVisible ? 'none' : 'block';
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
    ${s.imageUrl ? `<img src="${s.imageUrl}" alt="${escapeHtml(s.title||'')}" style="width:100%; aspect-ratio:3/2; object-fit:cover; border-radius:10px; margin-bottom:16px;">` : ''}
      <span class="tag">MOD-0${i+1}</span>
      <h3>${escapeHtml(s.title||'')}</h3>
      ${s.price ? `<div class="detail-price">${escapeHtml(s.price)}</div>` : ''}
      ${s.desc ? `<p class="desc">${escapeHtml(s.desc)}</p>` : ''}
      <ul>${(s.items||[]).map(it=>`<li>${escapeHtml(it)}</li>`).join('')}</ul>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn small" id="reserveServiceWa" style="width:100%; justify-content:center;">Reservar por WhatsApp</button>
    </div>
  `;
  document.getElementById('reserveServiceWa').addEventListener('click', ()=>{
    reserveServiceOnWhatsapp(s);
    document.getElementById('serviceOverlay').classList.remove('show');
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

/* ---------- MENÚ MÓVIL ---------- */
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');

function closeMobileNav(){
  mobileNav?.classList.remove('show');
  mobileNavBackdrop?.classList.remove('show');
  menuToggle?.classList.remove('active');
  menuToggle?.setAttribute('aria-expanded','false');
}
menuToggle?.addEventListener('click', ()=>{
  const isOpen = mobileNav.classList.toggle('show');
  mobileNavBackdrop.classList.toggle('show', isOpen);
  menuToggle.classList.toggle('active', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
mobileNavBackdrop?.addEventListener('click', closeMobileNav);
mobileNav?.querySelectorAll('a').forEach(a=> a.addEventListener('click', closeMobileNav));

/* ---------- RESEÑAS (reviews/) ---------- */
let reviews = [];
let selectedStars = 0;

db.collection('reviews').orderBy('createdAt','desc').onSnapshot((snap)=>{
  reviews = [];
  snap.forEach(doc=> reviews.push({ id: doc.id, ...doc.data() }));
  renderReviews();
}, (err)=>console.error('reviews', err));

function starsHtml(n){
  let s = '';
  for(let i=1;i<=5;i++){ s += i<=n ? '★' : '☆'; }
  return s;
}

function renderReviews(){
  const grid = document.getElementById('reviewsGrid');
  const summary = document.getElementById('reviewsSummary');
  const empty = document.getElementById('noReviews');
  if(!grid) return;
  grid.innerHTML = '';

  if(reviews.length === 0){
    empty.style.display = 'block';
    summary.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  const avg = reviews.reduce((sum,r)=> sum + (r.rating||0), 0) / reviews.length;
  summary.innerHTML = `
    <span class="avg-score">${avg.toFixed(1)}</span>
    <div>
      <div class="avg-stars">${starsHtml(Math.round(avg))}</div>
      <div class="avg-count">${reviews.length} reseña${reviews.length===1?'':'s'}</div>
    </div>
  `;

  reviews.forEach(r=>{
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="stars">${starsHtml(r.rating||0)}</div>
      <div class="review-name">${escapeHtml(r.name||'Anónimo')}</div>
      <p class="review-comment">${escapeHtml(r.comment||'')}</p>
    `;
    grid.appendChild(card);
  });
}

const starPicker = document.getElementById('starPicker');
starPicker?.querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    selectedStars = parseInt(btn.getAttribute('data-star'),10);
    starPicker.querySelectorAll('button').forEach(b=>{
      b.classList.toggle('active', parseInt(b.getAttribute('data-star'),10) <= selectedStars);
    });
  });
});

document.getElementById('submitReview')?.addEventListener('click', async ()=>{
  const name = document.getElementById('revName').value.trim();
  const comment = document.getElementById('revComment').value.trim();

  if(!name || !comment){
    toast('Completá tu nombre y contanos tu experiencia');
    return;
  }
  if(!selectedStars){
    toast('Elegí una puntuación en estrellas');
    return;
  }

  try{
    await db.collection('reviews').add({
      name, comment, rating: selectedStars,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('revName').value = '';
    document.getElementById('revComment').value = '';
    selectedStars = 0;
    starPicker?.querySelectorAll('button').forEach(b=> b.classList.remove('active'));
    toast('¡Gracias por tu reseña!');
  }catch(err){
    console.error(err);
    toast('No se pudo enviar la reseña. Intentá de nuevo.');
  }
});
