# Cuarenta Prolipa — GitHub Pages + Firebase

La app es solo frontend (Vue). No usa Laravel ni MySQL:

| Qué | Dónde vive |
|---|---|
| Lista de colaboradores (nombre y departamento) | `public/data/usuarios.json` |
| Reglas Prolipa | `public/data/reglas.json` (edítalo y vuelve a publicar) |
| Parejas inscritas, torneo y salas en línea | Firebase Realtime Database |
| Cuenta del administrador | Firebase Authentication (correo y contraseña, gratis) |

## 1. Crear Firebase (una vez)

1. https://console.firebase.google.com → **Agregar proyecto**. Desactiva Google Analytics y di **No** a Gemini / IA.
   Quédate en el plan **Spark (gratis)**: no pide tarjeta y nunca cobra (si se pasa el límite, solo deja de responder hasta el mes siguiente).
2. Menú izquierdo: **Bases de datos y almacenamiento → Realtime Database** (no Firestore, no SQL Connect)
   → **Crear base de datos** → ubicación **Estados Unidos (us-central1)** → **Comenzar en modo de prueba** → **Habilitar**.
3. Pestaña **Reglas**: pega esto y **Publicar**:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "admins": {
      "$uid": { ".read": "auth != null && auth.uid === $uid" }
    },
    "torneo": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).val() === true"
    },
    "inscripciones": {
      ".read": true,
      ".write": "!root.child('torneo').exists() || (auth != null && root.child('admins').child(auth.uid).val() === true)"
    },
    "salas": { ".read": true, ".indexOn": ["t"], "$codigo": { ".write": true } },
    "lobby": { ".read": true, ".indexOn": ["t"], "$codigo": { ".write": true } },
    "presencia": { ".read": true, "$codigo": { ".write": true } }
  }
}
```

4. **⚙️ Configuración del proyecto → Tus apps → `</>` Web** → registrar → copia el `firebaseConfig`
   en `src/firebase.config.js`.

> Cualquiera con el enlace puede inscribirse y jugar. Una vez hecho el sorteo, solo el administrador puede
> tocar las inscripciones, y el torneo (cuadro y resultados) solo lo puede cambiar el administrador.

### Administrador del torneo (una vez)

Página: `https://TU-USUARIO.github.io/TU-REPO/#/40-Prolipa/admin` (no aparece en el menú).

1. Menú izquierdo: **Seguridad → Authentication** → **Comenzar** → pestaña **Método de acceso** →
   **Correo electrónico/contraseña** → activar (solo la primera opción) → **Guardar**.
2. Pestaña **Usuarios** → **Agregar usuario** → tu correo y una contraseña.
3. Entra a la página de admin con ese correo. Te mostrará tu **UID** con un botón para copiarlo.
4. **Realtime Database → Datos** → en la raíz, botón **+** → nombre `admins` → dentro, otro **+** con
   nombre = tu UID y valor `true` (sin comillas) → **Agregar**.
5. Recarga la página de admin.

Para agregar a otro administrador: repite los pasos 2 a 4 con su correo.

Desde la página de admin se puede: borrar parejas mal inscritas, sortear el cuadro (si las parejas no son
8, 16, 32…, algunas pasan directo a la 2.ª ronda por sorteo), marcar ganadores con marcador opcional,
dar W.O., deshacer resultados, volver a sortear (si aún no hay resultados) y reiniciar el torneo.

### Límites del plan gratis (Spark)

- 100 personas conectadas a la vez (cada pestaña abierta de la app cuenta como una).
- 10 GB de descarga al mes. Una partida completa gasta ~10 MB si juegan 4 personas y ~3 MB si juegas
  solo contra la máquina: alcanza para unas mil partidas al mes. La lista de salas solo descarga un resumen (`lobby`), no las partidas.
- 1 GB guardado (las parejas y salas ocupan unos KB). Las salas sin actividad en un día se borran solas.

Puedes ver el consumo en Realtime Database → **Uso**.

## 2. Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `cuarenta-prolipa`) y sube **el contenido de esta carpeta `frontend`**.
2. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
3. Cada `push` a `main` publica solo (`.github/workflows/pages.yml`). Queda en
   `https://TU-USUARIO.github.io/cuarenta-prolipa/`.

Los enlaces usan `#` (por ejemplo `.../#/40-Prolipa/practica/ABCDE`) para que funcionen al recargar.

## Probar en tu PC sin Firebase real

Mientras `apiKey` esté vacío en `src/firebase.config.js`, la app usa el emulador local:

```bash
npm run emulador   # terminal 1 (necesita Java): base de datos + Authentication
npm run dev        # terminal 2 → http://localhost:5173
```

## Cómo funcionan las salas

Cada navegador corre el motor del 40 (`src/game/cuarenta.js`). Cada jugada es una transacción en Firebase:
si dos actúan a la vez, se aplica una y la otra se repite con el estado nuevo. Los navegadores conectados
se turnan para hacer jugar a la máquina (bots, jugadores que salieron o no responden en 45 s).

Limitación: el estado completo de la partida está en Firebase, así que alguien con conocimientos técnicos
podría ver las cartas de otros. Para práctica no importa; para el torneo oficial habría que cambiarlo.
