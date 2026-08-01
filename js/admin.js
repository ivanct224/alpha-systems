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

/* ---------- SERVICIOS ----------
   Cada servicio guarda: title, desc (resumen corto para la tarjeta),
   imageUrl (foto), reqType (tipo de solicitud a prellenar) e items[]
   (detalle en viñetas que se muestra al hacer clic en la tarjeta). */
function renderServicesAdmin(){
  const list = document.getElementById('servicesAdminList');
  list.innerHTML = '';
  services.forEach(s=>{
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <div class="top-row">
        <input type="text" value="${s.title||''}" data-field="title" placeholder="Título" style="width:100%;">
        <button class="del" data-del>&times;</button>
      </div>
      <div class="field">
        <label>Foto del servicio (recomendada 4:3, ej. 800×600)</label>
        <input type="file" accept="image/*" data-imgupload>
        <div data-imgpreview style="margin-top:10px;">
          ${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%; max-height:160px; object-fit:cover; border-radius:8px; display:block;">
            <button class="btn ghost small" data-imgremove style="margin-top:8px;">Quitar imagen</button>` : ''}
        </div>
      </div>
      <div class="field">
        <label>Descripción corta (se ve en la tarjeta)</label>
        <textarea data-field="desc" placeholder="Ej: Diagnóstico, limpieza y revisión de rendimiento de tu equipo.">${s.desc||''}</textarea>
      </div>
      <div class="field">
        <label>Tipo de solicitud (al tocar "Solicitar por formulario")</label>
        <select data-field="reqType">
          <option value="soporte" ${s.reqType==='soporte'?'selected':''}>Soporte informático</option>
          <option value="optimizacion" ${s.reqType==='optimizacion'?'selected':''}>Optimización</option>
          <option value="seguridad" ${s.reqType==='seguridad'?'selected':''}>Seguridad &amp; soporte</option>
          <option value="otro" ${s.reqType==='otro'?'selected':''}>Otro</option>
        </select>
      </div>
      <div class="field">
        <label>Detalle (un ítem por línea, se muestra al hacer clic en la tarjeta)</label>
        <textarea data-field="items" placeholder="Un ítem por línea">${(s.items||[]).join('\n')}</textarea>
      </div>
    `;
    const imgInput = row.querySelector('[data-imgupload]');
    const imgPreview = row.querySelector('[data-imgpreview]');
    imgInput.addEventListener('change', async ()=>{
      const file = imgInput.files[0];
      if(!file) return;
      if(!file.type.startsWith('image/')){ toast('Elegí un archivo de imagen'); return; }
      toast('Subiendo imagen...');
      try{
        const path = `services/${s.id}/${Date.now()}_${file.name}`;
        const ref = storage.ref().child(path);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.collection('services').doc(s.id).set({ imageUrl: url }, { merge:true });
        s.imageUrl = url;
        imgPreview.innerHTML = `<img src="${url}" style="width:100%; max-height:160px; object-fit:cover; border-radius:8px; display:block;">
          <button class="btn ghost small" data-imgremove style="margin-top:8px;">Quitar imagen</button>`;
        imgPreview.querySelector('[data-imgremove]').addEventListener('click', async ()=>{
          await db.collection('services').doc(s.id).set({ imageUrl: '' }, { merge:true });
          s.imageUrl = '';
          imgPreview.innerHTML = '';
          toast('Imagen quitada');
        });
        toast('Imagen actualizada');
      }catch(err){
        console.error(err);
        toast('No se pudo subir la imagen. Revisá los permisos de Storage.');
      }
    });
    const removeBtn = row.querySelector('[data-imgremove]');
    if(removeBtn){
      removeBtn.addEventListener('click', async ()=>{
        await db.collection('services').doc(s.id).set({ imageUrl: '' }, { merge:true });
        s.imageUrl = '';
        imgPreview.innerHTML = '';
        toast('Imagen quitada');
      });
    }
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
    desc: 'Descripción breve del servicio.',
    imageUrl: '',
    reqType: 'soporte',
    items: ['Ítem de ejemplo'],
    order: services.length
  });
  toast('Servicio agregado');
  setTimeout(renderServicesAdmin, 400);
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
        <label>Imagen del banner (recomendada horizontal, ej. 1200×600 o más ancha)</label>
        <input type="file" accept="image/*" data-imgupload>
        <div data-imgpreview style="margin-top:10px;">
          ${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%; max-height:160px; object-fit:cover; border-radius:8px; display:block;">
            <button class="btn ghost small" data-imgremove style="margin-top:8px;">Quitar imagen</button>` : ''}
        </div>
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
        <label>Valor (opcional, ej: "Desde $19.990")</label>
        <input type="text" value="${s.price||''}" data-field="price" placeholder="Desde $19.990">
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
    const imgInput = row.querySelector('[data-imgupload]');
    const imgPreview = row.querySelector('[data-imgpreview]');
    imgInput.addEventListener('change', async ()=>{
      const file = imgInput.files[0];
      if(!file) return;
      if(!file.type.startsWith('image/')){ toast('Elegí un archivo de imagen'); return; }
      toast('Subiendo imagen...');
      try{
        const path = `featured/${s.id}/${Date.now()}_${file.name}`;
        const ref = storage.ref().child(path);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.collection('featuredServices').doc(s.id).set({ imageUrl: url }, { merge:true });
        s.imageUrl = url;
        imgPreview.innerHTML = `<img src="${url}" style="width:100%; max-height:160px; object-fit:cover; border-radius:8px; display:block;">
          <button class="btn ghost small" data-imgremove style="margin-top:8px;">Quitar imagen</button>`;
        imgPreview.querySelector('[data-imgremove]').addEventListener('click', async ()=>{
          await db.collection('featuredServices').doc(s.id).set({ imageUrl: '' }, { merge:true });
          s.imageUrl = '';
          imgPreview.innerHTML = '';
          toast('Imagen quitada');
        });
        toast('Imagen actualizada');
      }catch(err){
        console.error(err);
        toast('No se pudo subir la imagen. Revisá los permisos de Storage.');
      }
    });
    const removeBtn = row.querySelector('[data-imgremove]');
    if(removeBtn){
      removeBtn.addEventListener('click', async ()=>{
        await db.collection('featuredServices').doc(s.id).set({ imageUrl: '' }, { merge:true });
        s.imageUrl = '';
        imgPreview.innerHTML = '';
        toast('Imagen quitada');
      });
    }
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
      row.remove();
    });
    list.appendChild(row);
  });
}

document.getElementById('addFeatured').addEventListener('click', async ()=>{
  await db.collection('featuredServices').add({
    title: 'Nuevo destacado',
    tag: 'Servicio',
    badge: 'TOP',
    price: '',
    desc: 'Descripción breve del servicio.',
    reqType: 'soporte',
    items: ['Detalle 1'],
    order: featuredServices.length
  });
  toast('Destacado agregado al carrusel');
  setTimeout(renderFeaturedAdmin, 400);
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
