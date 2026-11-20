/**
 * Cuadro de eliminación directa del torneo.
 *
 * Solo se guarda la primera ronda (el sorteo) y los resultados; el resto del cuadro se calcula.
 * Si las parejas no son potencia de 2 (8, 16, 32...), algunas pasan directo a la 2.ª ronda ("pase libre").
 * Los pases libres se reparten para que nunca se enfrenten entre ellos.
 *
 * Valores de un lugar en el cuadro: id de pareja, BYE (pase libre) o null (por definir).
 */
export const BYE = 'BYE'

function barajar(lista, rng) {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Tamaño del cuadro (potencia de 2) y cuántos pases libres hay para `n` parejas */
export function tamano(n) {
  let t = 2
  while (t < n) t *= 2
  return { tamano: t, pases: t - n, partidos: t / 2 }
}

/** Sortea la primera ronda: [[a, b], ...] con b = BYE en los pases libres */
export function sortear(ids, rng = Math.random) {
  if (ids.length < 2) throw new Error('Se necesitan al menos 2 parejas para el torneo.')
  const orden = barajar(ids, rng)
  const { pases, partidos } = tamano(orden.length)
  // Posiciones con pase libre: primero las pares (0, 2, 4…) y luego las impares, así en la
  // 2.ª ronda quien tuvo pase libre juega contra quien ganó un partido.
  const posiciones = [...Array(partidos).keys()].sort((x, y) => (x % 2) - (y % 2) || x - y)
  const conPase = new Set(posiciones.slice(0, pases))
  let k = 0
  return [...Array(partidos).keys()].map((m) => (conPase.has(m) ? [orden[k++], BYE] : [orden[k++], orden[k++]]))
}

export function nombreRonda(r, total) {
  const faltan = total - r
  if (faltan === 1) return 'Final'
  if (faltan === 2) return 'Semifinal'
  if (faltan === 3) return 'Cuartos de final'
  if (faltan === 4) return 'Octavos de final'
  return `Ronda ${r + 1}`
}

const clave = (r, i) => `${r}-${i}`

/**
 * Calcula todo el cuadro. Un resultado guardado solo vale si las dos parejas del partido
 * siguen siendo las mismas (si se deshace un resultado anterior, los siguientes se ignoran).
 */
export function calcular(primera, resultados = {}) {
  const rondas = []
  let lugares = primera.map(([a, b]) => [a, b])
  const total = Math.log2(primera.length * 2)
  for (let r = 0; lugares.length >= 1; r++) {
    const partidos = lugares.map(([a, b], i) => {
      const key = clave(r, i)
      let ganador = null
      let resultado = null
      let pase = false
      if (a && b && a !== BYE && b !== BYE) {
        const res = resultados[key]
        if (res && res.a === a && res.b === b && (res.g === a || res.g === b)) {
          ganador = res.g
          resultado = res
        }
      } else if (a === BYE && b === BYE) {
        ganador = BYE
        pase = true
      } else if (a === BYE || b === BYE) {
        const otro = a === BYE ? b : a
        if (otro) {
          ganador = otro
          pase = true
        }
      }
      return { key, ronda: r, indice: i, a, b, ganador, resultado, pase, listo: !!(a && b && a !== BYE && b !== BYE) }
    })
    rondas.push({ numero: r, nombre: nombreRonda(r, total), partidos })
    if (partidos.length === 1) break
    lugares = []
    for (let i = 0; i < partidos.length; i += 2) lugares.push([partidos[i].ganador, partidos[i + 1].ganador])
  }
  const final = rondas[rondas.length - 1].partidos[0]
  const campeon = final.ganador && final.ganador !== BYE ? final.ganador : null
  const subcampeon = campeon ? (final.a === campeon ? final.b : final.a) : null
  return { rondas, campeon, subcampeon }
}

/** Resultados que se invalidan si se deshace o cambia el partido `key` (los que dependen de él) */
export function dependientes(primera, resultados, key) {
  const sin = { ...resultados }
  delete sin[key]
  const antes = calcular(primera, resultados)
  const despues = calcular(primera, sin)
  const fuera = []
  antes.rondas.forEach((ronda, r) =>
    ronda.partidos.forEach((p, i) => {
      if (p.resultado && p.key !== key && !despues.rondas[r].partidos[i].resultado) fuera.push(p.key)
    }),
  )
  return fuera
}
