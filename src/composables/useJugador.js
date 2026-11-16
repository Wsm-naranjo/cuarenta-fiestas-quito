import { ref, computed } from 'vue'
import axios from 'axios'

// Estado compartido de la sesión del jugador (usuario Prolipa)
const usuario = ref(null)
const inscripcion = ref(null)
const abierta = ref(true)
const cargando = ref(false)

const token = () => localStorage.getItem('jugador_token')

export function useJugador() {
  const autenticado = computed(() => Boolean(usuario.value))

  async function refrescar() {
    if (!token()) {
      usuario.value = null
      inscripcion.value = null
      return
    }
    cargando.value = true
    try {
      const { data } = await axios.get('/public/inscripcion/yo')
      usuario.value = data.usuario
      inscripcion.value = data.inscripcion
      abierta.value = data.abierta
    } catch (e) {
      if (e.response?.status === 401) salir()
      else throw e
    } finally {
      cargando.value = false
    }
  }

  async function ingresar(identificador, password) {
    const { data } = await axios.post('/public/inscripcion/login', { usuario: identificador, password })
    localStorage.setItem('jugador_token', data.token)
    usuario.value = data.usuario
    await refrescar()
  }

  function salir() {
    localStorage.removeItem('jugador_token')
    usuario.value = null
    inscripcion.value = null
  }

  return { usuario, inscripcion, abierta, cargando, autenticado, refrescar, ingresar, salir }
}
