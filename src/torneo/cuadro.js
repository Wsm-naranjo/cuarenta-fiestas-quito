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
      return armarPartido(clave(r, i), r, i, a, b, resultados)
    })
    rondas.push({ numero: r, nombre: nombreRonda(r, total), partidos })
    if (partidos.length === 1) break
    lugares = []
    for (let i = 0; i < partidos.length; i += 2) lugares.push([partidos[i].ganador, partidos[i + 1].ganador])
  }
  const final = rondas[rondas.length - 1].partidos[0]
  const campeon = final.ganador && final.ganador !== BYE ? final.ganador : null
  const subcampeon = campeon ? (final.a === campeon ? final.b : final.a) : null

  // Tercer lugar: lo juegan las dos parejas que perdieron las semifinales
  let tercerLugar = null
  if (rondas.length >= 2) {
    const perdedor = (p) => (p.pase ? BYE : p.ganador ? (p.ganador === p.a ? p.b : p.a) : null)
    const [s1, s2] = rondas[rondas.length - 2].partidos
    const a = perdedor(s1)
    const b = perdedor(s2)
    if (!(a === BYE && b === BYE)) tercerLugar = armarPartido(TERCER, TERCER, 0, a, b, resultados)
  }
  const tercero = tercerLugar?.ganador && tercerLugar.ganador !== BYE ? tercerLugar.ganador : null
  const terminado = !!campeon && (!tercerLugar || !!tercero)
  return { rondas, tercerLugar, campeon, subcampeon, tercero, terminado }
}

/** Clave del partido por el tercer lugar */
export const TERCER = 'tercer'

function armarPartido(key, ronda, indice, a, b, resultados) {
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
  return { key, ronda, indice, a, b, ganador, resultado, pase, listo: !!(a && b && a !== BYE && b !== BYE) }
}

/** Todos los partidos del cuadro, incluido el del tercer lugar */
export const todosLosPartidos = (c) => [...c.rondas.flatMap((r) => r.partidos), ...(c.tercerLugar ? [c.tercerLugar] : [])]

/** Resultados que se invalidan si se deshace o cambia el partido `key` (los que dependen de él) */
export function dependientes(primera, resultados, key) {
  const sin = { ...resultados }
  delete sin[key]
  const antes = calcular(primera, resultados)
  const despues = calcular(primera, sin)
  const siguen = new Set(todosLosPartidos(despues).filter((p) => p.resultado).map((p) => p.key))
  return todosLosPartidos(antes)
    .filter((p) => p.resultado && p.key !== key && !siguen.has(p.key))
    .map((p) => p.key)
}

/** Claves de los resultados que cuentan en el cuadro (las parejas del partido siguen siendo las mismas) */
export function validos(primera, resultados) {
  return new Set(todosLosPartidos(calcular(primera, resultados)).filter((p) => p.resultado).map((p) => p.key))
}

/**
 * Pone `nuevo` (id de pareja o BYE) en un lugar de la primera ronda. Si `nuevo` ya estaba en otro
 * lugar, se intercambian. Devuelve { primera, invalidos, sale, error }:
 * - invalidos: resultados ya jugados que dejan de valer con el cambio
 * - sale: pareja que queda fuera del cuadro (o null)
 */
export function cambiarLugar(primera, resultados, indice, lado, nuevo) {
  const p = primera.map(([a, b]) => [a, b])
  const l = lado === 'a' ? 0 : 1
  const actual = p[indice][l]
  if (actual === nuevo) return { primera: p, invalidos: [], sale: null, error: '' }
  let sale = actual === BYE ? null : actual
  if (nuevo !== BYE) {
    for (let i = 0; i < p.length; i++)
      for (let k = 0; k < 2; k++)
        if (p[i][k] === nuevo) {
          p[i][k] = actual // intercambio
          sale = null
        }
  }
  p[indice][l] = nuevo
  if (p.some(([a, b]) => a === BYE && b === BYE)) return { primera: p, invalidos: [], sale, error: 'Un partido no puede quedar con dos pases libres.' }
  const despues = validos(p, resultados)
  const invalidos = [...validos(primera, resultados)].filter((k) => !despues.has(k))
  return { primera: p, invalidos, sale, error: '' }
}
