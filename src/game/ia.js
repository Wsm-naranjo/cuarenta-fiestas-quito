/**
 * Jugador automático para el simulador de 40.
 * Solo usa información pública: su mano, la mesa y las cartas ya jugadas en la mano.
 */
import { opcionesCaptura, esCaida, equipoDe, nombreCarta } from './cuarenta.js'

/** Probabilidad de que una mano de `h` cartas, sacada de un pozo de `pozo`, tenga al menos 1 de `k` cartas buscadas */
function probAlMenosUna(k, h, pozo) {
  if (k <= 0 || h <= 0 || pozo <= 0) return 0
  let pNinguna = 1
  for (let i = 0; i < h; i++) {
    pNinguna *= Math.max(0, pozo - k - i) / (pozo - i)
  }
  return 1 - pNinguna
}

/** Cuántas cartas de ese valor siguen ocultas para `jugador` */
function ocultasDeValor(estado, jugador, orden) {
  const vistas = new Set(estado.jugadasMano)
  estado.manos[jugador].forEach((c) => vistas.add(c.id))
  estado.mesa.forEach((c) => vistas.add(c.id))
  // ids son rango+palo, comparamos por orden usando el rango
  const rango = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'][orden - 1]
  let vistasValor = 0
  vistas.forEach((id) => {
    if (id.slice(0, -1) === rango) vistasValor++
  })
  return 4 - vistasValor
}

function pozoOculto(estado, jugador) {
  const vistas = new Set(estado.jugadasMano)
  estado.manos[jugador].forEach((c) => vistas.add(c.id))
  estado.mesa.forEach((c) => vistas.add(c.id))
  return 40 - vistas.size
}

/** Evalúa todas las jugadas posibles y las ordena de mejor a peor */
export function evaluarJugadas(estado, jugador) {
  const R = estado.reglas
  const eq = equipoDe(jugador)
  const misPuntos = estado.equipos[eq].puntos
  const valorCarta = R.cartonHasta == null || misPuntos <= R.cartonHasta ? 1.1 : 0.15
  const rival = (jugador + 1) % 4
  const manoRival = estado.manos[rival].length
  const pozo = pozoOculto(estado, jugador)

  const jugadas = []
  for (const carta of estado.manos[jugador]) {
    const opciones = opcionesCaptura(carta, estado.mesa)

    if (opciones.length === 0) {
      // Tirar: riesgo de que el siguiente rival haga caída (y limpia si la mesa queda con 1 carta)
      const k = ocultasDeValor(estado, jugador, carta.orden)
      const p = probAlMenosUna(k, manoRival, pozo)
      const mesaQueda = estado.mesa.length + 1
      const riesgo = p * (R.puntosCaida + (mesaQueda === 1 ? R.puntosLimpia : 0)) * 10
      // Preferir botar figuras / cartas con escaleras difíciles, conservar cartas "seguras"
      const puntaje = -riesgo - carta.orden * 0.05
      jugadas.push({
        cartaId: carta.id,
        opcionIndex: -1,
        puntaje,
        explicacion: `Tirar ${nombreCarta(carta)} (riesgo de caída ${Math.round(p * 100)}%)`,
      })
      continue
    }

    opciones.forEach((op, i) => {
      const caida = esCaida(estado, jugador, op)
      const quedan = estado.mesa.length - op.total.length
      const limpia = quedan === 0
      let pts = (caida ? R.puntosCaida : 0) + (limpia ? R.puntosLimpia : 0)
      if (R.en38SoloCaida && misPuntos >= R.meta - 2 && !caida) pts = 0
      const ganaYa = misPuntos + pts >= R.meta
      // Si queda una sola carta en la mesa, el rival podría limpiar con caída de esa carta
      let riesgo = 0
      if (quedan === 1) {
        const resto = estado.mesa.find((c) => !op.total.some((t) => t.id === c.id))
        const k = ocultasDeValor(estado, jugador, resto.orden)
        riesgo = probAlMenosUna(k, manoRival, pozo) * R.puntosLimpia * 5
      }
      const puntaje = (ganaYa ? 1000 : 0) + pts * 10 + (op.total.length + 1) * valorCarta - riesgo
      const partes = []
      if (caida) partes.push('caída')
      if (limpia) partes.push('limpia')
      const tipo = op.tipo === 'suma' ? `suma ${op.base.map(nombreCarta).join('+')}` : `con ${nombreCarta(op.base[0])}`
      jugadas.push({
        cartaId: carta.id,
        opcionIndex: i,
        puntaje,
        explicacion:
          `Levantar ${tipo} con ${nombreCarta(carta)}` +
          (op.escalera.length ? ` + escalera (${op.escalera.length})` : '') +
          (partes.length ? ` → ¡${partes.join(' y ')}! +${pts}` : ` (${op.total.length + 1} cartas al cartón)`),
      })
    })
  }

  return jugadas.sort((a, b) => b.puntaje - a.puntaje)
}

/**
 * nivel: 'facil' | 'normal' | 'dificil'
 */
export function elegirJugada(estado, jugador, nivel = 'normal', rng = Math.random) {
  const jugadas = evaluarJugadas(estado, jugador)
  if (nivel === 'facil' && rng() < 0.45) {
    return jugadas[Math.floor(rng() * jugadas.length)]
  }
  if (nivel === 'normal' && jugadas.length > 1 && rng() < 0.15) {
    return jugadas[1]
  }
  return jugadas[0]
}
