import { ref as dbRef, onValue, runTransaction, push } from 'firebase/database'
import { db, ahora, cargarJSON } from '../firebase'

/** Colaboradores Prolipa (public/data/usuarios.json) */
export async function usuarios() {
  const lista = await cargarJSON('usuarios')
  return lista.map((u) => ({ id: u.id, nombre: u.nombre, nombre_corto: u.corto, iniciales: u.ini, departamento: u.depto || '' }))
}

const RAIZ = 'inscripciones'

/** Escucha las parejas inscritas. Devuelve la función para dejar de escuchar. */
export function escucharParejas(callback, alFallar) {
  const porId = usuarios().then((l) => new Map(l.map((u) => [u.id, u])))
  return onValue(
    dbRef(db, RAIZ),
    async (snap) => {
      const mapa = await porId
      const datos = snap.val() || {}
      const parejas = Object.entries(datos)
        .map(([id, p]) => ({
          id,
          ts: p.ts || 0,
          nombre_pareja: p.nombre || '',
          jugador1: mapa.get(p.u1) || { id: p.u1, nombre: p.n1 || '?', iniciales: '?' },
          jugador2: mapa.get(p.u2) || { id: p.u2, nombre: p.n2 || '?', iniciales: '?' },
        }))
        .sort((a, b) => a.ts - b.ts)
        .map((p, i) => ({ ...p, numero: i + 1 }))
      callback(parejas)
    },
    (e) => alFallar?.(e),
  )
}

/**
 * Inscribe una pareja. Verifica en el mismo paso (transacción) que ninguno de los dos
 * ya esté inscrito, así no hay duplicados aunque dos personas lo hagan al mismo tiempo.
 */
export async function inscribir(yo, companero, nombrePareja = '') {
  if (!yo || !companero) throw new Error('Elige a los dos jugadores.')
  if (yo.id === companero.id) throw new Error('No puedes ser tu propia pareja.')

  const id = push(dbRef(db, RAIZ)).key
  let error = null
  const res = await runTransaction(dbRef(db, RAIZ), (actual) => {
    error = null
    const datos = actual || {}
    for (const p of Object.values(datos)) {
      for (const u of [yo, companero]) {
        if (p.u1 === u.id || p.u2 === u.id) {
          error = `${u.nombre} ya está inscrito en otra pareja.`
          return // cancela la transacción
        }
      }
    }
    datos[id] = {
      u1: yo.id,
      u2: companero.id,
      n1: yo.nombre,
      n2: companero.nombre,
      nombre: String(nombrePareja).trim().slice(0, 40),
      ts: ahora(),
    }
    return datos
  })
  if (error) throw new Error(error)
  if (!res.committed) throw new Error('No se pudo guardar. Intenta de nuevo.')
  return id
}
