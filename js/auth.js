/* =====================================================================
   AUTH.JS — login del admin con Firebase Authentication real
   (nada de contraseñas escritas en el código)
   ===================================================================== */

document.getElementById('openAdmin').addEventListener('click', ()=>{
  document.getElementById('adminOverlay').classList.add('show');
});

document.getElementById('adminLoginBtn').addEventListener('click', async ()=>{
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  if(!email || !password){ toast('Completá email y contraseña'); return; }
  try{
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged (en admin.js) se encarga de mostrar el panel
  }catch(err){
    console.error(err);
    toast('Credenciales incorrectas');
  }
});

document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
  await auth.signOut();
});
