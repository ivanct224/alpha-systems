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
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', (e)=> e.target.closest('.overlay').classList.remove('show'));
});
document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click', (e)=>{ if(e.target === ov) ov.classList.remove('show'); });
});
