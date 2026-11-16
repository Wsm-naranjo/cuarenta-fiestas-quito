/**
 * Salas del 40 en línea sobre Firebase Realtime Database (sin servidor propio).
 *
 * - salas/{CODIGO}: resumen (estado, nivel, anfitrión, asientos libres...) + `datos`, un texto JSON
 *   con los asientos y el estado completo del juego. Se guarda como texto porque Firebase
 *   borra los arreglos vacíos (la mesa vacía, una mano sin cartas...).
 * - presencia/{CODIGO}/{token}: última vez que se vio a cada navegador.
 * - lobby/{CODIGO}: resumen chico de las salas en espera (la lista de salas solo descarga esto,
 *   no las partidas: así se gasta muy poca descarga del plan gratis de Firebase).
 *
 * Cada cambio es una transacción: si dos personas actúan a la vez, Firebase aplica una y
 * repite la otra con el estado nuevo. Los navegadores conectados se turnan para hacer jugar a
 * la máquina (bots y jugadores ausentes): la transacción garantiza que la jugada se haga una vez.
 */
import { ref as dbRef, onValue, runTransaction, set, remove, query, orderByChild, startAt, endAt, get } from 'firebase/database'
import { db, ahora } from '../firebase'
import { nuevoJuego, jugarCarta, continuarMano } from '../game/cuarenta.js'
import { elegirJugada } from '../game/ia.js'
import { tokenSala } from '../composables/identidad'

const PAUSA_BOT = 1200 // ms entre jugadas automáticas
const PAUSA_FIN_MANO = 8000 // ms mostrando el resumen de la mano
const AUSENTE = 45000 // sin señales = la máquina juega por él
const CONECTADO = 20000
const BOTS = ['Bot Pancho', 'Bot Rosa', 'Bot Lucho', 'Bot Chela']
const NIVELES = ['facil', 'normal', 'dificil']

const refSala = (c) => dbRef(db, `salas/${c}`)
const refPresencia = (c) => dbRef(db, `presencia/${c}`)
const refLobby = (c) => dbRef(db, `lobby/${c}`)

/** Publica (o quita) la sala en la lista de salas abiertas */
function publicarLobby(codigo, nodo) {
  const p =
    nodo && nodo.estado === 'espera' && nodo.libres > 0
      ? set(refLobby(codigo), { codigo, anfitrion: nodo.host, jugadores: nodo.jugadores, libres: nodo.libres, nivel: nodo.nivel, t: nodo.t })
      : remove(refLobby(codigo))
  p.catch(() => {})
}
// Acciones que cambian lo que se ve en la lista de salas
const CAMBIAN_LOBBY = new Set(['unirse', 'salir', 'asiento', 'bots', 'nivel', 'iniciar'])

/* ============================ Utilidades ============================ */

function leer(nodo) {
  if (!nodo) return null
  const d = JSON.parse(nodo.datos || '{}')
  return {
    codigo: nodo.codigo,
    estado: nodo.estado,
    nivel: nodo.nivel,
    anfitrion: nodo.anfitrion,
    version: nodo.version || 0,
    asientos: d.asientos || [null, null, null, null],
    juego: d.juego || null,
  }
}

function escribir(s) {
  if (s.juego) s.juego.eventos = [] // cola de animaciones local: no se guarda
  const humanos = s.asientos.filter((a) => a?.tipo === 'humano')
  const anf = s.asientos.find((a) => a?.token === s.anfitrion)
  return {
    codigo: s.codigo,
    estado: s.estado,
    nivel: s.nivel,
    anfitrion: s.anfitrion,
    host: anf?.nombre || humanos[0]?.nombre || '—',
    jugadores: humanos.length,
    libres: s.asientos.filter((a) => a === null).length,
    version: s.version + 1,
    t: ahora(),
    datos: JSON.stringify({ asientos: s.asientos, juego: s.juego }),
  }
}

const limpiarNombre = (n) => String(n || '').replace(/[<>]/g, '').trim().slice(0, 30) || 'Jugador'
const humano = (nombre, token) => ({ tipo: 'humano', nombre: limpiarNombre(nombre), token })
const bot = (i, reemplaza = null) => ({ tipo: 'bot', nombre: reemplaza ? `Bot (${reemplaza})` : BOTS[i], token: null })
const asientoDe = (s, token) => {
  const i = s.asientos.findIndex((a) => a && a.token === token)
  return i < 0 ? null : i
}

function juegoNuevo(asientos) {
  const nombres = asientos.map((a) => a.nombre)
  const j = nuevoJuego({ nombres })
  j.equipos[0].nombre = `${nombres[0]} y ${nombres[2]}`
  j.equipos[1].nombre = `${nombres[1]} y ${nombres[3]}`
  j._meta = { ultimoMovTs: ahora(), finManoTs: j.fase === 'fin_mano' ? ahora() : 0 }
  return j
}

function despuesDeMover(j) {
  j._meta.ultimoMovTs = ahora()
  if (j.fase === 'fin_mano') j._meta.finManoTs = ahora()
}

function renombrarEnJuego(s, i) {
  if (s.juego) s.juego.nombres[i] = s.asientos[i].nombre
}

function codigoAleatorio() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return Array.from(bytes, (b) => abc[b % abc.length]).join('')
}

/** La ronda se canta, pero el valor (de qué carta es) solo lo ve quien la tiene */
function ocultarAjeno(h, asiento) {
  if ((h.tipo === 'ronda' || h.tipo === 'cuatro') && h.jugador !== asiento) {
    return { ...h, texto: h.texto.replace(/(RONDA|CUATRO) de \S+/, '$1').replace(/CUATRO \S+!/, 'CUATRO iguales!') }
  }
  return h
}

/** Lo que ve cada jugador: solo sus propias cartas */
function vista(j, asiento) {
  return {
    miMano: asiento === null ? [] : j.manos[asiento],
    cartas: j.manos.map((m) => m.length),
    mesa: j.mesa,
    ultimaTirada: j.ultimaTirada,
    turno: j.turno,
    fase: j.fase,
    numeroMano: j.numeroMano,
    reparto: j.reparto,
    mazo: j.mazo.length,
    equipos: j.equipos.map((q) => ({ nombre: q.nombre, puntos: q.puntos, carton: q.carton.length })),
    historial: j.historial.slice(0, 30).map((h) => ocultarAjeno(h, asiento)),
    resumenMano: j.resumenMano,
    ganador: j.ganador,
    motivoFin: j.motivoFin,
  }
}

function presentar(s, token, presencia) {
  const mi = asientoDe(s, token)
  const t = ahora()
  return {
    codigo: s.codigo,
    estado: s.estado,
    nivel: s.nivel,
    version: s.version,
    miAsiento: mi,
    soyAnfitrion: s.anfitrion === token,
    asientos: s.asientos.map((a) =>
      a
        ? {
            tipo: a.tipo,
            nombre: a.nombre,
            anfitrion: a.token === s.anfitrion,
            conectado: a.tipo === 'bot' || t - (presencia[a.token] || 0) < CONECTADO,
          }
        : null,
    ),
    juego: s.juego ? vista(s.juego, mi) : null,
  }
}

/* ============================ Acciones ============================ */
// Cada acción recibe la sala (ya leída), el token y el cuerpo; devuelve
// null (ok), 'eliminada' o un texto de error.

const ACCIONES = {
  unirse(s, token, { nombre, asiento = null }) {
    if (asientoDe(s, token) !== null) return null
    const libre = (a) => (s.estado === 'espera' ? a === null : a?.tipo === 'bot')
    let destino = asiento !== null && libre(s.asientos[asiento]) ? asiento : s.asientos.findIndex(libre)
    if (destino < 0) return 'La sala está llena.'
    s.asientos[destino] = humano(nombre, token)
    if (s.estado === 'jugando') renombrarEnJuego(s, destino)
    return null
  },

  salir(s, token) {
    const i = asientoDe(s, token)
    if (i === null) return null
    s.asientos[i] = s.estado === 'espera' ? null : bot(i, s.asientos[i].nombre)
    if (s.estado === 'jugando') renombrarEnJuego(s, i)
    const humanos = s.asientos.filter((a) => a?.tipo === 'humano')
    if (!humanos.length) return 'eliminada'
    if (s.anfitrion === token) s.anfitrion = humanos[0].token
    return null
  },

  asiento(s, token, { asiento }) {
    const i = asientoDe(s, token)
    if (i === null || s.estado !== 'espera') return 'No puedes cambiar de asiento ahora.'
    if (s.asientos[asiento] !== null) return 'Ese asiento está ocupado.'
    s.asientos[asiento] = s.asientos[i]
    s.asientos[i] = null
    return null
  },

  bots(s, token, { asiento }) {
    if (s.anfitrion !== token || s.estado !== 'espera') return 'Solo el anfitrión puede hacerlo antes de empezar.'
    const a = s.asientos[asiento]
    if (a === null) s.asientos[asiento] = bot(asiento)
    else if (a.tipo === 'bot') s.asientos[asiento] = null
    else return 'Ese asiento tiene un jugador.'
    return null
  },

  nivel(s, token, { nivel }) {
    if (s.anfitrion !== token) return 'Solo el anfitrión puede cambiar la dificultad.'
    if (!NIVELES.includes(nivel)) return 'Dificultad no válida.'
    s.nivel = nivel
    return null
  },

  iniciar(s, token) {
    if (s.anfitrion !== token) return 'Solo el anfitrión puede empezar.'
    if (s.estado !== 'espera') return null
    s.asientos = s.asientos.map((a, i) => a || bot(i))
    s.estado = 'jugando'
    s.juego = juegoNuevo(s.asientos)
    return null
  },

  revancha(s, token) {
    if (asientoDe(s, token) === null) return 'No estás en esta sala.'
    if (s.juego?.fase !== 'fin') return null
    s.juego = juegoNuevo(s.asientos)
    return null
  },

  jugar(s, token, { carta, base = null }) {
    const i = asientoDe(s, token)
    if (i === null || s.estado !== 'jugando') return 'No estás jugando en esta sala.'
    try {
      jugarCarta(s.juego, i, carta, base && base.length ? base : 0)
    } catch (e) {
      return e.message
    }
    despuesDeMover(s.juego)
    return null
  },

  siguiente(s, token) {
    if (asientoDe(s, token) === null) return 'No estás en esta sala.'
    if (s.juego?.fase !== 'fin_mano') return null
    continuarMano(s.juego)
    s.juego._meta.ultimoMovTs = ahora()
    return null
  },
}

/** Ejecuta una acción como transacción. Lanza Error con el mensaje si no se puede. */
async function transaccion(codigo, cambio, actualizarLobby = false) {
  let error = null
  let eliminada = false
  let vacia = false
  const res = await runTransaction(refSala(codigo), (nodo) => {
    error = null
    eliminada = false
    vacia = false
    const s = leer(nodo)
    if (!s) {
      // La copia local puede estar vacía todavía: devolver null hace que Firebase compare con el
      // servidor y repita con los datos reales. Si de verdad no existe, no se escribe nada.
      vacia = true
      return null
    }
    const r = cambio(s)
    if (r === 'eliminada') {
      eliminada = true
      return null
    }
    if (r === false) return // nada que hacer
    if (typeof r === 'string') {
      error = r
      return
    }
    return escribir(s)
  })
  if (error) throw new Error(error)
  if (vacia) throw new Error('La sala no existe o ya se cerró.')
  if (eliminada) remove(refPresencia(codigo)).catch(() => {})
  if (res.committed && (actualizarLobby || eliminada)) publicarLobby(codigo, eliminada ? null : res.snapshot.val())
  return res.committed
}

/* ============================ API pública ============================ */

export async function crearSala({ nombre, nivel = 'normal' }) {
  const token = tokenSala()
  limpiarViejas()
  for (let intento = 0; intento < 5; intento++) {
    const codigo = codigoAleatorio()
    const res = await runTransaction(refSala(codigo), (nodo) => {
      if (nodo) return // código ocupado: probar otro
      return escribir({
        codigo,
        estado: 'espera',
        nivel: NIVELES.includes(nivel) ? nivel : 'normal',
        anfitrion: token,
        version: 0,
        asientos: [humano(nombre, token), null, null, null],
        juego: null,
      })
    })
    if (res.committed) {
      publicarLobby(codigo, res.snapshot.val())
      return codigo
    }
  }
  throw new Error('No se pudo crear la sala. Intenta de nuevo.')
}

export async function iniciarSala(codigo) {
  return transaccion(codigo, (s) => ACCIONES.iniciar(s, tokenSala()), true)
}

export async function unirseSala(codigo, nombre) {
  return transaccion(codigo, (s) => ACCIONES.unirse(s, tokenSala(), { nombre }), true)
}

/** Salas en espera con asientos libres (actualizadas en los últimos 30 min) */
export function escucharLobby(callback) {
  const q = query(dbRef(db, 'lobby'), orderByChild('t'), startAt(ahora() - 30 * 60000))
  return onValue(q, (snap) => {
    const lista = []
    snap.forEach((h) => {
      lista.push(h.val())
    })
    callback(lista.sort((a, b) => b.t - a.t).slice(0, 20))
  })
}

/** Borra salas sin actividad en más de un día */
async function limpiarViejas() {
  try {
    const snap = await get(query(dbRef(db, 'salas'), orderByChild('t'), endAt(ahora() - 24 * 3600000)))
    snap.forEach((h) => {
      remove(h.ref).catch(() => {})
      remove(refPresencia(h.key)).catch(() => {})
      remove(refLobby(h.key)).catch(() => {})
    })
  } catch {
    /* sin importancia */
  }
}

/**
 * Abre una sala: avisa cada cambio con `alCambiar(salaPresentada)` y `alFallar(mensaje)`.
 * Devuelve { accion(ruta, cuerpo), cerrar() }.
 */
export function abrirSala(codigo, alCambiar, alFallar) {
  const token = tokenSala()
  let sala = null // estado completo actual
  let presencia = {}
  let cargada = false
  let avanzando = false

  const emitir = () => {
    if (sala) alCambiar(presentar(sala, token, presencia))
  }

  const offSala = onValue(
    refSala(codigo),
    (snap) => {
      cargada = true
      sala = leer(snap.val())
      if (!sala) alFallar('Esta sala ya no existe.')
      else emitir()
    },
    () => alFallar('No se pudo conectar con la sala.'),
  )
  const offPresencia = onValue(refPresencia(codigo), (snap) => {
    presencia = snap.val() || {}
  })

  // Señal de vida cada 5 s
  const latido = () => {
    if (sala && asientoDe(sala, token) !== null) set(dbRef(db, `presencia/${codigo}/${token}`), ahora()).catch(() => {})
  }

  // ¿Le toca jugar a la máquina (bot o ausente) o pasar a la siguiente mano?
  function pendiente(s) {
    const j = s?.juego
    if (!s || s.estado !== 'jugando' || !j) return false
    const t = ahora()
    if (j.fase === 'fin_mano') return t - (j._meta?.finManoTs || 0) >= PAUSA_FIN_MANO
    if (j.fase !== 'jugando') return false
    if (t - (j._meta?.ultimoMovTs || 0) < PAUSA_BOT) return false
    const a = s.asientos[j.turno]
    return a.tipo === 'bot' || t - (presencia[a.token] || 0) > AUSENTE
  }

  async function avanzar() {
    if (avanzando || !pendiente(sala)) return
    avanzando = true
    try {
      await transaccion(codigo, (s) => {
        if (!pendiente(s)) return false
        const j = s.juego
        if (j.fase === 'fin_mano') {
          continuarMano(j)
          j._meta.ultimoMovTs = ahora()
        } else {
          const t = j.turno
          const b = elegirJugada(j, t, s.nivel)
          jugarCarta(j, t, b.cartaId, b.opcionIndex)
          despuesDeMover(j)
        }
        return null
      })
    } catch {
      /* otro navegador ya hizo la jugada */
    } finally {
      avanzando = false
    }
  }

  const reloj = setInterval(() => {
    avanzar()
    emitir() // refresca "conectado" y la espera
  }, 500)
  const relojLatido = setInterval(latido, 5000)
  setTimeout(latido, 300)

  return {
    get cargada() {
      return cargada
    },
    async accion(ruta, cuerpo = {}) {
      const fn = ACCIONES[ruta]
      if (!fn) throw new Error('Acción desconocida')
      await transaccion(codigo, (s) => fn(s, token, cuerpo), CAMBIAN_LOBBY.has(ruta))
      if (ruta === 'unirse' || ruta === 'asiento') latido()
      if (ruta === 'salir') remove(dbRef(db, `presencia/${codigo}/${token}`)).catch(() => {})
    },
    cerrar() {
      clearInterval(reloj)
      clearInterval(relojLatido)
      offSala()
      offPresencia()
    },
  }
}
