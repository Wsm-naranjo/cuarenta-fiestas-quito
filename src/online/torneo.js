/**
 * Torneo en Firebase: torneo = { estado, ts, datos } (datos = texto JSON).
 * - datos.parejas: copia de las parejas al momento del sorteo { id: { n1, n2, nombre, numero } }
 * - datos.primera: primera ronda sorteada [[a, b], ...]
 * - datos.resultados: { "ronda-partido": { a, b, g, pa, pb, wo, ts } }
 * Solo el administrador puede escribir (lo controlan las reglas de Firebase).
 */
import { ref as dbRef, onValue, runTransaction, remove } from 'firebase/database'
import { db, ahora } from '../firebase'
import { sortear, calcular, BYE } from '../torneo/cuadro'

const RAIZ = 'torneo'

function leer(nodo) {
  if (!nodo) return null
  const d = JSON.parse(nodo.datos || '{}')
  const parejas = d.parejas || {}
  const primera = d.primera || []
  const resultados = d.resultados || {}
  return { estado: nodo.estado, ts: nodo.ts, parejas, primera, resultados, ...calcular(primera, resultados) }
}

const escribir = (t) => ({
  estado: t.estado,
  ts: ahora(),
  datos: JSON.stringify({ parejas: t.parejas, primera: t.primera, resultados: t.resultados }),
})

/** Escucha el torneo. callback(torneo | null) — null = todavía no se sortea */
export function escucharTorneo(callback, alFallar) {
  return onValue(
    dbRef(db, RAIZ),
    (snap) => callback(leer(snap.val())),
    (e) => alFallar?.(e),
  )
}

/** Nombre a mostrar de una pareja */
export function nombrePareja(t, id) {
  if (id === BYE) return 'Pase libre'
  const p = t?.parejas?.[id]
  if (!p) return 'Por definir'
  return p.nombre || `${p.n1} y ${p.n2}`
}

async function cambiar(fn) {
  let error = null
  const res = await runTransaction(dbRef(db, RAIZ), (nodo) => {
    error = null
    const t = leer(nodo)
    const r = fn(t)
    if (typeof r === 'string') {
      error = r
      return
    }
    return r === null ? null : escribir(r)
  })
  if (error) throw new Error(error)
  if (!res.committed) throw new Error('No se pudo guardar.')
}

/** Sortea y comienza el torneo con las parejas inscritas */
export function comenzarTorneo(parejas) {
  return cambiar((t) => {
    if (t && Object.keys(t.resultados).length) return 'El torneo ya tiene resultados. Reinícialo si quieres volver a sortear.'
    if (parejas.length < 2) return 'Se necesitan al menos 2 parejas.'
    const copia = {}
    parejas.forEach((p) => {
      copia[p.id] = { n1: p.jugador1.nombre, n2: p.jugador2.nombre, nombre: p.nombre_pareja || '', numero: p.numero }
    })
    return { estado: 'en_curso', parejas: copia, primera: sortear(parejas.map((p) => p.id)), resultados: {} }
  })
}

/** Guarda quién ganó un partido (con marcador opcional o W.O.) */
export function guardarResultado(partido, ganador, { pa = null, pb = null, wo = false } = {}) {
  return cambiar((t) => {
    if (!t) return 'No hay torneo en curso.'
    t.resultados[partido.key] = { a: partido.a, b: partido.b, g: ganador, pa, pb, wo: !!wo, ts: ahora() }
    const c = calcular(t.primera, t.resultados)
    t.estado = c.campeon ? 'finalizado' : 'en_curso'
    return t
  })
}

/** Borra el resultado de un partido (los partidos que dependían de él quedan por jugar) */
export function deshacerResultado(key, dependientes = []) {
  return cambiar((t) => {
    if (!t) return 'No hay torneo en curso.'
    delete t.resultados[key]
    dependientes.forEach((k) => delete t.resultados[k])
    t.estado = 'en_curso'
    return t
  })
}

/** Borra el torneo: se vuelve a la etapa de inscripción */
export function reiniciarTorneo() {
  return remove(dbRef(db, RAIZ))
}
