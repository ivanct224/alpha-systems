/* =====================================================================
   CONFIGURACIÓN DE FIREBASE
   -----------------------------------------------------------------
   Estos valores NO son secretos (Firebase está diseñado para que el
   firebaseConfig sea público). Lo que protege tus datos son las
   REGLAS de Firestore (firestore.rules) y Storage (storage.rules),
   no este archivo.

   Cómo conseguir estos valores (una sola vez):
   1. https://console.firebase.google.com → crear proyecto
      (ej: "alpha-systems").
   2. ⚙️ Configuración del proyecto > "Tus apps" > ícono </> (Web)
      > registrar app > copiar el bloque "firebaseConfig".
   3. Pegar esos valores acá abajo.
   4. En "Compilación" > "Authentication" > activar el método
      "Correo electrónico/contraseña" y crear el usuario admin
      (tu email + una contraseña segura).
   5. En "Compilación" > "Firestore Database" > crear base de datos
      (modo producción, ya que vamos a subir firestore.rules).
   6. En "Compilación" > "Storage" > activar (para fotos/archivos).
   7. Copiar el UID del usuario admin (Authentication > Users) y
      crear manualmente un documento en la colección "admins" con
      ese UID como ID del documento (puede estar vacío, ej: {ok:true}).
      Esto es lo que le da permisos de administrador.
   ===================================================================== */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
