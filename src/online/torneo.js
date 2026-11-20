/**
 * Torneo en Firebase: torneo = { estado, ts, datos } (datos = texto JSON).
 * - datos.parejas: copia de las parejas al momento del sorteo { id: { n1, n2, nombre, numero } }
 * - datos.primera: primera ronda sorteada [[a, b], ...]
 * - datos.resultados: { "ronda-partido": { a, b, g, pa, pb, wo, ts } }
 * Si existe pero sin primera ronda: inscripciones cerradas, esperando el sorteo.
 * Solo el administrador puede escribir (lo controlan las reglas de Firebase).
 */
import { ref as dbRef, onValue, runTransaction, remove } from 'firebase/database'
import { db, ahora } from '../firebase'
import { sortear, calcular, cambiarLugar, BYE } from '../torneo/cuadro'

const RAIZ = 'torneo'

function leer(nodo) {
  if (!nodo) return null
  const d = JSON.parse(nodo.datos || '{}')
  const parejas = d.parejas || {}
  const primera = d.primera || []
  const resultados = d.resultados || {}
  // Sin primera ronda = inscripciones cerradas pero todavía sin sorteo
  if (!primera.length)
    return { estado: nodo.estado, ts: nodo.ts, sorteado: false, parejas, primera, resultados, rondas: [], tercerLugar: null, campeon: null, subcampeon: null, tercero: null, terminado: false }
  return { estado: nodo.estado, ts: nodo.ts, sorteado: true, parejas, primera, resultados, ...calcular(primera, resultados) }
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

const copiaPareja = (p) => ({ n1: p.jugador1.nombre, n2: p.jugador2.nombre, nombre: p.nombre_pareja || '', numero: p.numero })

/** Cierra las inscripciones sin sortear todavía */
export function cerrarInscripciones() {
  return cambiar((t) => (t ? 'Las inscripciones ya están cerradas.' : { estado: 'cerrado', parejas: {}, primera: [], resultados: {} }))
}

/** Vuelve a abrir las inscripciones (solo si todavía no hay sorteo) */
export function abrirInscripciones() {
  return cambiar((t) => (t?.sorteado ? 'Ya hay sorteo. Usa "Reiniciar torneo" para volver a inscripciones.' : null))
}

/** Sortea y comienza el torneo con las parejas inscritas */
export function comenzarTorneo(parejas) {
  return cambiar((t) => {
    if (t && Object.keys(t.resultados).length) return 'El torneo ya tiene resultados. Reinícialo si quieres volver a sortear.'
    if (parejas.length < 2) return 'Se necesitan al menos 2 parejas.'
    const copia = {}
    parejas.forEach((p) => (copia[p.id] = copiaPareja(p)))
    return { estado: 'en_curso', parejas: copia, primera: sortear(parejas.map((p) => p.id)), resultados: {} }
  })
}

/** Guarda quién ganó un partido (con marcador opcional o W.O.) */
export function guardarResultado(partido, ganador, { pa = null, pb = null, wo = false } = {}) {
  return cambiar((t) => {
    if (!t) return 'No hay torneo en curso.'
    t.resultados[partido.key] = { a: partido.a, b: partido.b, g: ganador, pa, pb, wo: !!wo, ts: ahora() }
    t.estado = calcular(t.primera, t.resultados).terminado ? 'finalizado' : 'en_curso'
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

/**
 * Organiza el cuadro a mano: pone una pareja (o un pase libre) en un lugar de la 1.ª ronda.
 * Si la pareja ya estaba en el cuadro se intercambian; si venía de fuera, entra al cuadro.
 * Los resultados que dejan de valer se borran.
 */
export function ponerEnLugar(indice, lado, nuevo, pareja = null) {
  return cambiar((t) => {
    if (!t?.sorteado) return 'Todavía no hay sorteo.'
    const c = cambiarLugar(t.primera, t.resultados, indice, lado, nuevo)
    if (c.error) return c.error
    t.primera = c.primera
    c.invalidos.forEach((k) => delete t.resultados[k])
    if (pareja && nuevo !== BYE) t.parejas[nuevo] = copiaPareja(pareja)
    const enCuadro = new Set(t.primera.flat())
    Object.keys(t.parejas).forEach((id) => !enCuadro.has(id) && delete t.parejas[id])
    t.estado = calcular(t.primera, t.resultados).terminado ? 'finalizado' : 'en_curso'
    return t
  })
}

/** Actualiza los nombres de una pareja que ya está en el cuadro */
export function actualizarPareja(pareja) {
  return cambiar((t) => {
    if (!t) return null
    if (t.parejas[pareja.id]) t.parejas[pareja.id] = { ...copiaPareja(pareja), numero: t.parejas[pareja.id].numero }
    return t
  })
}

/** Borra el torneo: se vuelve a la etapa de inscripción */
export function reiniciarTorneo() {
  return remove(dbRef(db, RAIZ))
}
