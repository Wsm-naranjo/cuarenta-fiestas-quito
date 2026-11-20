/**
 * Acceso de administrador con Firebase Authentication (correo y contraseña, gratis en el plan Spark).
 * Una cuenta es administradora si existe admins/{uid} = true en la base (se agrega desde la consola).
 * Este archivo solo se carga en la página de administración.
 */
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { ref as dbRef, get } from 'firebase/database'
import { app, db, usaEmulador } from '../firebase'

export const auth = getAuth(app)
// En `npm run dev` el emulador de Auth pasa por el proxy de Vite; en un build, directo al 9099
if (usaEmulador) connectAuthEmulator(auth, import.meta.env.DEV ? location.origin : `http://${location.hostname}:9099`, { disableWarnings: true })

/** callback({ usuario, esAdmin }) cada vez que cambia la sesión */
export function escucharSesion(callback) {
  return onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) return callback({ usuario: null, esAdmin: false })
    let esAdmin = false
    try {
      esAdmin = (await get(dbRef(db, `admins/${usuario.uid}`))).val() === true
    } catch {
      esAdmin = false
    }
    callback({ usuario, esAdmin })
  })
}

export async function entrar(correo, clave) {
  try {
    await signInWithEmailAndPassword(auth, correo.trim(), clave)
  } catch (e) {
    const c = e?.code || ''
    if (c.includes('invalid') || c.includes('wrong-password') || c.includes('user-not-found')) throw new Error('Correo o contraseña incorrectos.')
    if (c.includes('too-many-requests')) throw new Error('Demasiados intentos. Espera un momento.')
    if (c.includes('operation-not-allowed') || c.includes('configuration-not-found')) throw new Error('Falta activar "Correo electrónico/contraseña" en Firebase Authentication.')
    throw new Error('No se pudo entrar. Revisa tu conexión.')
  }
}

export const salir = () => signOut(auth)
