// Identidad anónima de este navegador para las salas de práctica (no requiere cuenta)

function leer(k) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function guardar(k, v) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* sin almacenamiento */
  }
}

let tokenMemoria = null

export function tokenSala() {
  let t = leer('sala40_token') || tokenMemoria
  if (!t) {
    // getRandomValues funciona también por http con IP de red (randomUUID solo en https/localhost)
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    t = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') + 'x0'
    guardar('sala40_token', t)
  }
  tokenMemoria = t
  return t
}

export const nombreGuardado = () => leer('sala40_nombre') || ''
export const guardarNombre = (n) => guardar('sala40_nombre', n)
