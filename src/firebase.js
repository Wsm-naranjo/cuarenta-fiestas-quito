import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, onValue } from 'firebase/database'
import { firebaseConfig } from './firebase.config.js'

// Sin configuración real (o con VITE_EMULADOR=1) se usa el emulador local de Firebase
export const usaEmulador = import.meta.env.VITE_EMULADOR === '1' || !firebaseConfig.apiKey

const config = usaEmulador
  ? { projectId: 'demo-cuarenta', databaseURL: 'https://demo-cuarenta-default-rtdb.firebaseio.com', apiKey: 'demo' }
  : firebaseConfig

const app = initializeApp(config)
export const db = getDatabase(app)

// En `npm run dev` el emulador pasa por el proxy de Vite (mismo puerto); en un build, directo al 9000
if (usaEmulador) connectDatabaseEmulator(db, location.hostname, import.meta.env.DEV ? Number(location.port || 80) : 9000)

// Hora del servidor (para que todos los navegadores usen el mismo reloj)
let desfase = 0
onValue(ref(db, '.info/serverTimeOffset'), (s) => (desfase = s.val() || 0))
export const ahora = () => Date.now() + desfase

// Archivos JSON publicados junto a la app (public/data)
const cache = {}
export function cargarJSON(nombre) {
  cache[nombre] ??= fetch(`${import.meta.env.BASE_URL}data/${nombre}.json`).then((r) => {
    if (!r.ok) throw new Error('No se pudo cargar ' + nombre)
    return r.json()
  })
  return cache[nombre]
}

export const normalizar = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
