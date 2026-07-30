# ALPHA SYSTEMS — sitio web

Sitio estático (HTML/CSS/JS puro, sin build) con Firebase como backend:
Authentication (login del admin), Firestore (servicios, estado, solicitudes)
y Storage (para futuras imágenes).

## 1. Crear el repo en GitHub

1. Creá un repositorio nuevo (ej: `alpha-systems`).
2. Subí esta carpeta completa.
3. En **Settings > Pages**, elegí "GitHub Actions" como fuente. El workflow
   en `.github/workflows/deploy.yml` publica el sitio automáticamente en
   cada push a `main`.

## 2. Crear el proyecto de Firebase

1. Andá a [console.firebase.google.com](https://console.firebase.google.com)
   y creá un proyecto (ej: `alpha-systems`).
2. **Authentication** → método "Correo electrónico/contraseña" → activar.
   Ahí mismo, en la pestaña "Users", creá tu usuario admin (tu email +
   una contraseña segura).
3. **Firestore Database** → crear base de datos → modo producción (las
   reglas ya están escritas en `firestore.rules`).
4. **Storage** → activar (para cuando agreguemos imágenes).
5. **Configuración del proyecto** (ícono ⚙️) → "Tus apps" → ícono `</>`
   (Web) → registrar app → copiar el bloque `firebaseConfig`.
6. Pegar esos valores en `js/firebase-config.js`, reemplazando los
   placeholders (`TU_API_KEY`, etc). Estos valores no son secretos —
   lo que protege los datos son las reglas de Firestore/Storage, no
   este archivo.

## 3. Dar permisos de administrador

1. En **Authentication > Users**, copiá el UID del usuario que creaste.
2. En **Firestore Database**, creá manualmente una colección `admins`
   con un documento cuyo ID sea ese UID (el contenido puede ser
   `{ ok: true }` o quedar vacío). Sin ese documento, aunque alguien
   inicie sesión con Firebase Auth, las reglas le van a negar la
   escritura — el login por sí solo no alcanza.

## 4. Subir las reglas de seguridad

Necesitás Firebase CLI (una sola vez):

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # elegí tu proyecto, aceptá usar firestore.rules existente
firebase deploy --only firestore:rules,storage:rules
```

Sin este paso, las reglas por default de Firebase (o las de "modo prueba")
pueden dejar la base de datos abierta a cualquiera.

## 5. Cargar los primeros servicios

Una vez que entrás al panel (botón "panel" al pie del sitio) con tu
email y contraseña de admin, usá "+ Agregar servicio" para cargar:
- Soporte Informático
- Optimización
- Seguridad & Soporte

(cada uno con sus ítems, uno por línea).

## Estructura de datos en Firestore

| Colección/Doc | Contenido | Quién escribe |
|---|---|---|
| `services/{id}` | `title`, `items[]`, `order` | admin |
| `content/status` | `systems`, `network`, `support` | admin |
| `content/settings` | `whatsapp`, `instagram`, `tagline` | admin |
| `requests/{id}` | `name`, `contact`, `serviceType`, `description`, `status`, `createdAt` | cualquiera (solo crear) |
| `admins/{uid}` | marcador de administrador | manual, desde la consola |

## Próximos pasos (cuando el negocio crezca)

- Subir fotos/logo a Firebase Storage y referenciarlas en `services`.
- Agregar página de seguimiento de solicitud para el cliente.
- Historial de servicios por cliente.
- Dominio propio (alphasystems.cl / .tech) apuntando al sitio de GitHub Pages.
