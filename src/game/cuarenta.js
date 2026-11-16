/**
 * Motor del juego de 40 (tradicional ecuatoriano / quiteño) para 4 jugadores en 2 parejas.
 *
 * Asientos: 0 = tú (abajo), 1 = derecha (rival), 2 = arriba (tu pareja), 3 = izquierda (rival).
 * Se juega en sentido contrario a las agujas del reloj: 0 -> 1 -> 2 -> 3 -> 0.
 * Equipos: asientos pares (0 y 2) = equipo 0, impares (1 y 3) = equipo 1.
 *
 * El estado es un objeto plano para poder envolverlo en reactive() de Vue.
 */

export const RANGOS = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K']

export const PALOS = [
  { id: 'c', simbolo: '♥', nombre: 'Corazones', rojo: true },
  { id: 'd', simbolo: '♦', nombre: 'Diamantes', rojo: true },
  { id: 't', simbolo: '♣', nombre: 'Tréboles', rojo: false },
  { id: 'p', simbolo: '♠', nombre: 'Picas', rojo: false },
]

export const REGLAS_TRADICIONALES = {
  meta: 40,
  puntosCaida: 2,
  puntosLimpia: 2,
  puntosRonda: 2, // Regla Prolipa: TODO 2
  cuatroIgualesGana: false, // Regla Prolipa: 4 iguales también vale 2
  /** El cartón solo suma si el equipo tiene hasta estos puntos (null = siempre) */
  cartonHasta: 30,
  /** En 38 solo se gana con caída (la limpia sola o la ronda no sirven) */
  en38SoloCaida: true,
  /** Las cartas que quedan en la mesa al final se las lleva quien levantó por última vez */
  sobrantesAlUltimo: true,
}

export const equipoDe = (jugador) => jugador % 2
export const siguiente = (jugador) => (jugador + 1) % 4
export const anterior = (jugador) => (jugador + 3) % 4
export const esNumero = (carta) => carta.orden <= 7

export function crearMazo() {
  const mazo = []
  for (const palo of PALOS) {
    RANGOS.forEach((rango, i) => {
      mazo.push({
        id: rango + palo.id,
        rango,
        orden: i + 1, // A=1 ... 7=7, J=8, Q=9, K=10 (la escalera sigue este orden)
        palo: palo.id,
        simbolo: palo.simbolo,
        rojo: palo.rojo,
      })
    })
  }
  return mazo
}

export function barajar(cartas, rng = Math.random) {
  const a = [...cartas]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const nombreCarta = (c) => `${c.rango}${c.simbolo}`

/** Continúa la escalera (orden+1, orden+2, ...) con las cartas que queden en la mesa */
function escaleraDesde(orden, mesaRestante) {
  const tomadas = []
  let r = orden
  let restante = [...mesaRestante]
  for (;;) {
    const sig = restante.find((c) => c.orden === r + 1)
    if (!sig) break
    tomadas.push(sig)
    restante = restante.filter((c) => c.id !== sig.id)
    r++
  }
  return tomadas
}

/**
 * Formas de levantar con `carta` sobre la `mesa`.
 * - igual: carta del mismo valor (+ escalera)
 * - suma: dos cartas numéricas que suman el valor de la carta (+ escalera). Las figuras no suman.
 */
export function opcionesCaptura(carta, mesa) {
  const opciones = []

  const igual = mesa.find((c) => c.orden === carta.orden)
  if (igual) {
    const resto = mesa.filter((c) => c.id !== igual.id)
    const escalera = escaleraDesde(carta.orden, resto)
    opciones.push({ tipo: 'igual', base: [igual], escalera, total: [igual, ...escalera] })
  }

  if (esNumero(carta)) {
    const nums = mesa.filter(esNumero)
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        if (nums[i].orden + nums[j].orden === carta.orden) {
          const base = [nums[i], nums[j]]
          const resto = mesa.filter((c) => !base.some((b) => b.id === c.id))
          const escalera = escaleraDesde(carta.orden, resto)
          opciones.push({ tipo: 'suma', base, escalera, total: [...base, ...escalera] })
        }
      }
    }
  }

  // La que más cartas levanta primero
  opciones.sort((a, b) => b.total.length - a.total.length)
  return opciones
}

/** ¿Jugar esta carta con esta opción sería caída? */
export function esCaida(estado, jugador, opcion) {
  const ult = estado.ultimaTirada
  return Boolean(
    opcion &&
      opcion.tipo === 'igual' &&
      ult &&
      ult.jugador === anterior(jugador) &&
      opcion.base[0].id === ult.cartaId,
  )
}

/* ============================================================
 *  ESTADO Y FLUJO
 * ============================================================ */

export function nuevoJuego({ reglas = {}, nombres, rng = Math.random } = {}) {
  const estado = {
    reglas: { ...REGLAS_TRADICIONALES, ...reglas },
    nombres: nombres || ['Tú', 'Rival derecha', 'Tu pareja', 'Rival izquierda'],
    fase: 'jugando', // jugando | fin
    equipos: [
      { nombre: 'Nosotros', puntos: 0, carton: [] },
      { nombre: 'Ellos', puntos: 0, carton: [] },
    ],
    manos: [[], [], [], []],
    mesa: [],
    mazo: [],
    repartidor: Math.floor(rng() * 4),
    turno: 0,
    numeroMano: 0,
    reparto: 0, // 1 o 2 dentro de cada mano
    ultimaTirada: null, // { jugador, cartaId } carta que quedó en mesa en la jugada anterior
    ultimoQueLevanto: null,
    jugadasMano: [], // ids de cartas jugadas en la mano (información pública)
    ganador: null,
    motivoFin: '',
    eventos: [], // cola para animaciones/avisos en la UI
    historial: [], // bitácora legible
    resumenMano: null,
    seq: 0,
  }
  estado._rng = rng
  nuevaMano(estado)
  return estado
}

const CON_PUNTOS = new Set(['mano', 'caida', 'limpia', 'caida_limpia', 'ronda', 'cuatro', 'sobrantes', 'carton', 'fin'])

function evento(estado, tipo, texto, extra = {}) {
  const ev = { id: ++estado.seq, tipo, texto, ...extra }
  estado.eventos.push(ev)
  estado.historial.unshift(ev)
  // Se guardan las últimas 30 jugadas y TODOS los eventos que dan puntos (para poder revisar el marcador)
  if (estado.historial.length > 30) {
    estado.historial = estado.historial.filter((h, i) => i < 30 || CON_PUNTOS.has(h.tipo))
  }
  return ev
}

export function nuevaMano(estado) {
  estado.numeroMano++
  estado.repartidor = siguiente(estado.repartidor)
  estado.mazo = barajar(crearMazo(), estado._rng || Math.random)
  estado.mesa = []
  estado.equipos.forEach((e) => (e.carton = []))
  estado.ultimaTirada = null
  estado.ultimoQueLevanto = null
  estado.jugadasMano = []
  estado.reparto = 0
  estado.resumenMano = null
  evento(estado, 'mano', `Mano ${estado.numeroMano}: reparte ${estado.nombres[estado.repartidor]}`)
  repartir(estado)
}

function repartir(estado) {
  estado.reparto++
  const inicio = siguiente(estado.repartidor)
  for (let k = 0; k < 4; k++) {
    const j = (inicio + k) % 4
    estado.manos[j] = estado.mazo.splice(0, 5)
  }
  estado.turno = inicio
  revisarRondas(estado)
}

/** Ronda = 3 cartas iguales en la mano repartida. 4 iguales = gana el juego (tradicional). */
function revisarRondas(estado) {
  const R = estado.reglas
  for (let j = 0; j < 4 && estado.fase === 'jugando'; j++) {
    const conteo = {}
    estado.manos[j].forEach((c) => (conteo[c.rango] = (conteo[c.rango] || 0) + 1))
    for (const [rango, n] of Object.entries(conteo)) {
      if (n === 4 && R.cuatroIgualesGana) {
        evento(estado, 'cuatro', `¡${estado.nombres[j]} tiene CUATRO ${rango}! Gana el juego.`, { jugador: j, equipo: equipoDe(j) })
        terminar(estado, equipoDe(j), `Cuatro cartas iguales (${rango})`)
        return
      }
      if (n >= 3) {
        const pts = sumarPuntos(estado, equipoDe(j), R.puntosRonda, 'ronda')
        evento(estado, 'ronda', `${estado.nombres[j]} tiene RONDA de ${rango}${pts ? ` (+${pts})` : ' (no suma en 38)'}`, {
          jugador: j,
          equipo: equipoDe(j),
          puntos: pts,
        })
      }
    }
  }
}

/**
 * Suma puntos respetando las reglas de 38 y la meta.
 * motivo: caida | limpia | caida_limpia | ronda | carton
 */
function sumarPuntos(estado, equipo, pts, motivo) {
  const R = estado.reglas
  const e = estado.equipos[equipo]
  if (estado.fase !== 'jugando' || pts <= 0) return 0

  if (R.en38SoloCaida && e.puntos >= R.meta - 2) {
    // En 38 solo vale la caída (con o sin limpia)
    if (motivo !== 'caida' && motivo !== 'caida_limpia') return 0
  }

  const antes = e.puntos
  e.puntos = Math.min(R.meta, e.puntos + pts)
  if (e.puntos >= R.meta) {
    terminar(estado, equipo, motivo === 'carton' ? 'Llegó a 40 con el cartón' : `Llegó a 40 con ${textoMotivo(motivo)}`)
  }
  return e.puntos - antes
}

const textoMotivo = (m) =>
  ({ caida: 'caída', limpia: 'limpia', caida_limpia: 'caída y limpia', ronda: 'ronda', carton: 'cartón' })[m] || m

function terminar(estado, equipo, motivo) {
  if (estado.fase === 'fin') return
  estado.fase = 'fin'
  estado.ganador = equipo
  estado.motivoFin = motivo
  evento(estado, 'fin', `¡${estado.equipos[equipo].nombre} gana! ${motivo}`, { equipo })
}

/**
 * Juega una carta. `opcionIndex` elige entre las formas de levantar (por defecto la que más levanta).
 * Devuelve un resumen de la jugada.
 */
export function jugarCarta(estado, jugador, cartaId, opcionIndex = 0) {
  if (estado.fase !== 'jugando') throw new Error('El juego terminó')
  if (estado.turno !== jugador) throw new Error('No es tu turno')
  const mano = estado.manos[jugador]
  const idx = mano.findIndex((c) => c.id === cartaId)
  if (idx < 0) throw new Error('Esa carta no está en la mano')

  const carta = mano.splice(idx, 1)[0]
  estado.jugadasMano.push(carta.id)
  const opciones = opcionesCaptura(carta, estado.mesa)
  let opcion = opciones[0] || null
  if (Array.isArray(opcionIndex)) {
    // Elegida por las cartas base (ids), como la envía la pantalla
    const pedido = [...opcionIndex].sort().join(',')
    opcion = opciones.find((op) => op.base.map((b) => b.id).sort().join(',') === pedido) || opcion
  } else if (opciones[opcionIndex]) {
    opcion = opciones[opcionIndex]
  }
  const equipo = equipoDe(jugador)
  const quien = estado.nombres[jugador]

  const res = { jugador, carta, opcion, caida: false, limpia: false, puntos: 0, levantadas: [] }

  if (!opcion) {
    estado.mesa.push(carta)
    estado.ultimaTirada = { jugador, cartaId: carta.id }
    evento(estado, 'tira', `${quien} tira ${nombreCarta(carta)}`, { jugador, cartaId: carta.id })
  } else {
    const caida = esCaida(estado, jugador, opcion)
    const ids = new Set(opcion.total.map((c) => c.id))
    estado.mesa = estado.mesa.filter((c) => !ids.has(c.id))
    const limpia = estado.mesa.length === 0
    res.levantadas = [carta, ...opcion.total]
    estado.equipos[equipo].carton.push(...res.levantadas)
    estado.ultimaTirada = null
    estado.ultimoQueLevanto = jugador
    res.caida = caida
    res.limpia = limpia

    const detalle = opcion.tipo === 'suma' ? `suma ${opcion.base.map(nombreCarta).join('+')}` : `${nombreCarta(opcion.base[0])}`
    const esc = opcion.escalera.length ? ` y escalera ${opcion.escalera.map(nombreCarta).join(' ')}` : ''
    evento(estado, 'levanta', `${quien} levanta con ${nombreCarta(carta)}: ${detalle}${esc}`, {
      jugador,
      cartaId: carta.id,
      cantidad: res.levantadas.length,
    })

    if (caida || limpia) {
      const motivo = caida && limpia ? 'caida_limpia' : caida ? 'caida' : 'limpia'
      const pts = (caida ? estado.reglas.puntosCaida : 0) + (limpia ? estado.reglas.puntosLimpia : 0)
      res.puntos = sumarPuntos(estado, equipo, pts, motivo)
      const nombre = caida && limpia ? '¡CAÍDA Y LIMPIA!' : caida ? '¡CAÍDA!' : '¡LIMPIA!'
      evento(estado, motivo, `${nombre} ${quien} ${res.puntos ? `+${res.puntos}` : '(no suma en 38)'}`, {
        jugador,
        equipo,
        puntos: res.puntos,
      })
    }
  }

  if (estado.fase === 'jugando') avanzar(estado)
  return res
}

function avanzar(estado) {
  const sinCartas = estado.manos.every((m) => m.length === 0)
  if (!sinCartas) {
    estado.turno = siguiente(estado.turno)
    return
  }
  if (estado.mazo.length > 0) {
    // Segundo reparto de la misma mano: la mesa se mantiene
    evento(estado, 'reparto', 'Se reparten 5 cartas más')
    estado.ultimaTirada = null
    repartir(estado)
    return
  }
  cerrarMano(estado)
}

/** Fin de la mano: sobrantes de la mesa y conteo del cartón */
function cerrarMano(estado) {
  const R = estado.reglas
  if (estado.mesa.length && R.sobrantesAlUltimo && estado.ultimoQueLevanto !== null) {
    const eq = equipoDe(estado.ultimoQueLevanto)
    estado.equipos[eq].carton.push(...estado.mesa)
    evento(estado, 'sobrantes', `${estado.mesa.length} carta(s) de la mesa para ${estado.equipos[eq].nombre}`)
    estado.mesa = []
  }

  const resumen = estado.equipos.map((e, i) => {
    const cartas = e.carton.length
    let pts = calcularCarton(cartas)
    const permitido = R.cartonHasta == null || e.puntos <= R.cartonHasta
    return { equipo: i, cartas, puntosCarton: pts, permitido, sumados: 0, puntosAntes: e.puntos }
  })

  // Suma primero quien tenga más cartas (desempate si ambos llegan a 40)
  ;[...resumen]
    .sort((a, b) => b.cartas - a.cartas)
    .forEach((r) => {
      if (r.puntosCarton > 0 && r.permitido) {
        r.sumados = sumarPuntos(estado, r.equipo, r.puntosCarton, 'carton')
      }
    })

  resumen.forEach((r) => {
    const e = estado.equipos[r.equipo]
    const txt = r.puntosCarton
      ? r.permitido
        ? `cartón ${r.cartas} cartas = +${r.sumados}`
        : `cartón ${r.cartas} cartas (no cuenta: tiene más de ${R.cartonHasta})`
      : `${r.cartas} cartas (menos de 20, no suma)`
    evento(estado, 'carton', `${e.nombre}: ${txt}`, { equipo: r.equipo, puntos: r.sumados })
  })

  estado.resumenMano = { numero: estado.numeroMano, equipos: resumen }
  if (estado.fase === 'jugando') estado.fase = 'fin_mano'
}

/** 20 cartas = 6 puntos, cada carta extra = 1 punto; se redondea al par superior */
export function calcularCarton(cartas) {
  if (cartas < 20) return 0
  let pts = 6 + (cartas - 20)
  if (pts % 2) pts++
  return pts
}

export function continuarMano(estado) {
  if (estado.fase !== 'fin_mano') return
  estado.fase = 'jugando'
  nuevaMano(estado)
}
