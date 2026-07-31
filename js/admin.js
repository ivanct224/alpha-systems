/* =====================================================================
   ADMIN.JS — todo lo que solo el admin autenticado puede hacer.
   La UI se muestra solo si Firestore confirma que el UID está en
   /admins/{uid}; la protección REAL, de todas formas, vive en
   firestore.rules (esto es solo para mostrar/ocultar el panel).
   ===================================================================== */

let isAdminUser = false;

auth.onAuthStateChanged(async (user)=>{
  if(!user){
    isAdminUser = false;
    document.getElementById('adminGate').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    return;
  }
  try{
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if(adminDoc.exists){
      isAdminUser = true;
      document.getElementById('adminGate').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      loadSettingsIntoForm();
      renderServicesAdmin();
      renderFeaturedAdmin();
      renderRequests();
    }else{
      toast('Esta cuenta no tiene permisos de administrador');
      await auth.signOut();
    }
  }catch(err){
    console.error(err);
  }
});

/* ---------- ESTADO ---------- */
db.collection('content').doc('status').onSnapshot((snap)=>{
  if(!snap.exists) return;
  const d = snap.data();
  document.getElementById('editSystems').value = d.systems || 'ONLINE';
  document.getElementById('editNetwork').value = d.network || 'ONLINE';
  document.getElementById('editSupport').value = d.support || 'READY';
});

document.getElementById('saveStatus').addEventListener('click', async ()=>{
  await db.collection('content').doc('status').set({
    systems: document.getElementById('editSystems').value,
    network: document.getElementById('editNetwork').value,
    support: document.getElementById('editSupport').value
  });
  toast('Estado actualizado');
});

/* ---------- SETTINGS ---------- */
function loadSettingsIntoForm(){
  document.getElementById('settingWa').value = settings.whatsapp || '';
  document.getElementById('settingIg').value = settings.instagram || '';
  document.getElementById('settingTag').value = settings.tagline || '';
}

document.getElementById('saveSettings').addEventListener('click', async ()=>{
  await db.collection('content').doc('settings').set({
    whatsapp: document.getElementById('settingWa').value.replace(/\D/g,''),
    instagram: document.getElementById('settingIg').value.trim(),
    tagline: document.getElementById('settingTag').value.trim()
  });
  toast('Contacto actualizado');
});

/* ---------- SERVICIOS ---------- */
function renderServicesAdmin(){
  const list = document.getElementById('servicesAdminList');
  list.innerHTML = '';
  services.forEach(s=>{
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <div class="top-row">
        <input type="text" value="${s.title||''}" data-field="title" style="width:70%;">
        <button class="del" data-del>&times;</button>
      </div>
      <textarea data-field="items" placeholder="Un ítem por línea">${(s.items||[]).join('\n')}</textarea>
    `;
    row.querySelectorAll('[data-field]').forEach(inp=>{
      inp.addEventListener('change', async ()=>{
        const field = inp.getAttribute('data-field');
        const value = field === 'items'
          ? inp.value.split('\n').map(x=>x.trim()).filter(Boolean)
          : inp.value;
        await db.collection('services').doc(s.id).set({ [field]: value }, { merge:true });
      });
    });
    row.querySelector('[data-del]').addEventListener('click', async ()=>{
      if(!confirm('¿Borrar este servicio?')) return;
      await db.collection('services').doc(s.id).delete();
    });
    list.appendChild(row);
  });
}

document.getElementById('addService').addEventListener('click', async ()=>{
  await db.collection('services').add({
    title: 'Nuevo servicio',
    items: ['Ítem de ejemplo'],
    order: services.length
  });
  toast('Servicio agregado');
});

/* ---------- DESTACADOS (carrusel de inicio, colección "featuredServices") ---------- */
function renderFeaturedAdmin(){
  const list = document.getElementById('featuredAdminList');
  if(!list) return;
  list.innerHTML = '';
  featuredServices.forEach(s=>{
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <div class="top-row">
        <input type="text" value="${s.title||''}" data-field="title" placeholder="Título" style="width:100%;">
        <button class="del" data-del>&times;</button>
      </div>
      <div class="field">
        <label>Etiqueta pequeña (ej: Mantención)</label>
        <input type="text" value="${s.tag||''}" data-field="tag">
      </div>
      <div class="field">
        <label>Badge / burbuja (ej: TOP, MÁS PEDIDO, PREFERIDO)</label>
        <input type="text" value="${s.badge||''}" data-field="badge">
      </div>
      <div class="field">
        <label>Descripción corta</label>
        <textarea data-field="desc" placeholder="Descripción breve del servicio">${s.desc||''}</textarea>
      </div>
      <div class="field">
        <label>Tipo de solicitud (al tocar "Solicitar este servicio")</label>
        <select data-field="reqType">
          <option value="soporte" ${s.reqType==='soporte'?'selected':''}>Soporte informático</option>
          <option value="optimizacion" ${s.reqType==='optimizacion'?'selected':''}>Optimización</option>
          <option value="seguridad" ${s.reqType==='seguridad'?'selected':''}>Seguridad &amp; soporte</option>
          <option value="otro" ${s.reqType==='otro'?'selected':''}>Otro</option>
        </select>
      </div>
      <div class="field">
        <label>Detalle (un ítem por línea, se muestra al hacer clic)</label>
        <textarea data-field="items" placeholder="Un ítem por línea">${(s.items||[]).join('\n')}</textarea>
      </div>
    `;
    row.querySelectorAll('[data-field]').forEach(inp=>{
      inp.addEventListener('change', async ()=>{
        const field = inp.getAttribute('data-field');
        const value = field === 'items'
          ? inp.value.split('\n').map(x=>x.trim()).filter(Boolean)
          : inp.value;
        await db.collection('featuredServices').doc(s.id).set({ [field]: value }, { merge:true });
      });
    });
    row.querySelector('[data-del]').addEventListener('click', async ()=>{
      if(!confirm('¿Borrar este destacado del carrusel?')) return;
      await db.collection('featuredServices').doc(s.id).delete();
    });
    list.appendChild(row);
  });
}

document.getElementById('addFeatured').addEventListener('click', async ()=>{
  await db.collection('featuredServices').add({
    title: 'Nuevo destacado',
    tag: 'Servicio',
    badge: 'TOP',
    desc: 'Descripción breve del servicio.',
    reqType: 'soporte',
    items: ['Detalle 1'],
    order: featuredServices.length
  });
  toast('Destacado agregado al carrusel');
});

/* ---------- SOLICITUDES ---------- */
function renderRequests(){
  db.collection('requests').orderBy('createdAt','desc').limit(50)
    .onSnapshot((snap)=>{
      const box = document.getElementById('requestsList');
      box.innerHTML = '';
      if(snap.empty){
        box.innerHTML = '<p class="modal-note">No hay solicitudes todavía.</p>';
        return;
      }
      snap.forEach(doc=>{
        const r = doc.data();
        const item = document.createElement('div');
        item.className = 'request-item';
        item.innerHTML = `
          <strong>${escapeHtml(r.name)}</strong> — ${escapeHtml(r.contact)}
          <div class="meta">${escapeHtml(r.serviceType)}</div>
          <p style="margin-top:6px;">${escapeHtml(r.description)}</p>
          <span class="status-badge status-${r.status}">${r.status.toUpperCase()}</span>
          <select data-status style="margin-left:10px; width:auto; display:inline-block; padding:4px 8px; font-size:11px;">
            <option value="pendiente" ${r.status==='pendiente'?'selected':''}>Pendiente</option>
            <option value="en_curso" ${r.status==='en_curso'?'selected':''}>En curso</option>
            <option value="resuelto" ${r.status==='resuelto'?'selected':''}>Resuelto</option>
          </select>
        `;
        item.querySelector('[data-status]').addEventListener('change', async (e)=>{
          await db.collection('requests').doc(doc.id).update({ status: e.target.value });
        });
        box.appendChild(item);
      });
    }, (err)=>console.error('requests', err));
}
