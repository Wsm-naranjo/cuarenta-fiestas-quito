<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import Carta from '../../components/Carta.vue'
import { opcionesCaptura, esCaida, nombreCarta } from '../../game/cuarenta.js'
import { nombreGuardado, guardarNombre } from '../../composables/identidad'
import { abrirSala } from '../../online/salas'

const route = useRoute()
const router = useRouter()
const codigo = String(route.params.codigo).toUpperCase()

const sala = ref(null)
const error = ref('')
const enviando = ref(false)
const nombre = ref(nombreGuardado())
const avisos = ref([])
const eligiendo = ref(null)
const hover = ref(null)
let ultimoEventoVisto = null
let conexion = null

const NIVELES = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' }
const IMPORTANTES = ['caida', 'limpia', 'caida_limpia', 'ronda', 'cuatro']

/* ---------------- Comunicación ---------------- */
function aplicar(s) {
  if (!s) return
  const hist = s.juego?.historial || []
  // Revancha: el juego nuevo vuelve a numerar desde 1
  if (ultimoEventoVisto !== null && hist[0] && hist[0].id < ultimoEventoVisto) ultimoEventoVisto = 0
  if (ultimoEventoVisto === null) {
    ultimoEventoVisto = hist[0]?.id ?? 0
  } else {
    hist
      .filter((h) => h.id > ultimoEventoVisto && IMPORTANTES.includes(h.tipo))
      .reverse()
      .forEach((h) => {
        const aviso = { id: h.id, texto: h.texto, nuestro: h.equipo === miEquipo(s) }
        avisos.value.push(aviso)
        setTimeout(() => (avisos.value = avisos.value.filter((a) => a.id !== aviso.id)), 2500)
      })
    if (hist[0]) ultimoEventoVisto = Math.max(ultimoEventoVisto, hist[0].id)
  }
  sala.value = s
}

async function accion(ruta, cuerpo = {}) {
  enviando.value = true
  try {
    await conexion.accion(ruta, cuerpo)
    return true
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Ups', text: e.message || 'Error de conexión', background: '#1a1a1a', color: '#fff', timer: 2500 })
    return false
  } finally {
    enviando.value = false
  }
}

/* ---------------- Datos derivados ---------------- */
const juego = computed(() => sala.value?.juego)
const mi = computed(() => sala.value?.miAsiento ?? null)
const sentado = computed(() => mi.value !== null)
const base = computed(() => mi.value ?? 0) // espectador: mira desde el asiento 0
const miEquipo = (s) => (s?.miAsiento ?? 0) % 2
const rel = (abs) => (abs - base.value + 4) % 4 // 0 abajo, 1 derecha, 2 arriba, 3 izquierda
const absDe = (r) => (r + base.value) % 4

const nosotros = computed(() => juego.value?.equipos[base.value % 2])
const ellos = computed(() => juego.value?.equipos[(base.value + 1) % 2])
const ganamos = computed(() => juego.value?.ganador === base.value % 2)

const miTurno = computed(() => sentado.value && juego.value?.fase === 'jugando' && juego.value.turno === mi.value && !eligiendo.value)

const ultimaAccion = computed(() => juego.value?.historial.find((h) => h.tipo === 'tira' || h.tipo === 'levanta')?.texto || '')

const estadoTurno = computed(() => {
  const j = juego.value
  if (!j || j.fase !== 'jugando') return ''
  if (miTurno.value) return textoHover.value || 'Tu turno: toca una carta'
  const a = sala.value.asientos[j.turno]
  return `Juega ${a.nombre}…`
})

/* ---------------- Mi jugada ---------------- */
function tocarCarta(c) {
  if (!miTurno.value || enviando.value) return
  const ops = opcionesCaptura(c, juego.value.mesa)
  if (ops.length > 1) {
    eligiendo.value = { carta: c, opciones: ops }
    return
  }
  hover.value = null
  accion('jugar', { carta: c.id })
}

function elegirOpcion(op) {
  const c = eligiendo.value.carta
  eligiendo.value = null
  accion('jugar', { carta: c.id, base: op.base.map((b) => b.id) })
}

const capturaHover = computed(() => (hover.value && miTurno.value ? opcionesCaptura(hover.value, juego.value.mesa)[0] || null : null))
const idsResaltados = computed(() => new Set(capturaHover.value?.total.map((c) => c.id) || []))
const textoHover = computed(() => {
  if (!hover.value || !miTurno.value) return ''
  const op = capturaHover.value
  if (!op) return `${nombreCarta(hover.value)} se queda en la mesa`
  const bonus = []
  if (esCaida({ ultimaTirada: juego.value.ultimaTirada }, mi.value, op)) bonus.push('caída')
  if (op.total.length === juego.value.mesa.length) bonus.push('limpia')
  return `Levantas ${op.total.length + 1} cartas` + (bonus.length ? ` · ¡${bonus.join(' y ')}!` : '')
})

/* ---------------- Sala de espera ---------------- */
const enlace = computed(() => location.href.split('#')[0] + '#/40-Prolipa/practica/' + codigo)
const hayBots = computed(() => sala.value?.asientos.some((a) => a?.tipo === 'bot'))
const puedoEntrar = computed(() => {
  if (!sala.value || sentado.value) return false
  return sala.value.estado === 'espera' ? sala.value.asientos.some((a) => a === null) : hayBots.value
})

async function copiarEnlace() {
  let ok = false
  try {
    // navigator.clipboard solo existe en https/localhost; por IP de red se usa el método antiguo
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(enlace.value)
      ok = true
    } else {
      const ta = document.createElement('textarea')
      ta.value = enlace.value
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ok = document.execCommand('copy')
      ta.remove()
    }
  } catch {
    ok = false
  }
  if (ok) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Enlace copiado', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#fff' })
  } else {
    Swal.fire({ title: 'Comparte este enlace', input: 'text', inputValue: enlace.value, background: '#1a1a1a', color: '#fff', confirmButtonColor: '#003da5' })
  }
}

async function entrar(asiento = null) {
  if (!nombre.value.trim()) {
    Swal.fire({ icon: 'info', title: 'Escribe tu nombre', background: '#1a1a1a', color: '#fff' })
    return
  }
  guardarNombre(nombre.value.trim())
  await accion('unirse', { nombre: nombre.value.trim(), asiento })
}

function clicAsiento(i) {
  const a = sala.value.asientos[i]
  if (sala.value.estado !== 'espera') return
  if (!sentado.value && a === null) return entrar(i)
  if (sentado.value && a === null) return accion('asiento', { asiento: i })
}

async function salir() {
  const r = await Swal.fire({
    icon: 'question',
    title: '¿Salir de la sala?',
    text: sala.value?.estado === 'jugando' ? 'La máquina seguirá jugando en tu lugar.' : '',
    showCancelButton: true,
    confirmButtonText: 'Salir',
    cancelButtonText: 'Quedarme',
    background: '#1a1a1a',
    color: '#fff',
    confirmButtonColor: '#E4002B',
  })
  if (!r.isConfirmed) return
  await conexion.accion('salir').catch(() => {})
  router.push('/40-Prolipa/practica')
}

const equipoDeAsiento = (i) => (i % 2 === 0 ? 'A' : 'B')

/* ---------------- Pantalla completa ---------------- */
const pantallaCompleta = ref(false)
const puedePantallaCompleta = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
function alternarPantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen().catch(() => {})
}
const alCambiarPantalla = () => (pantallaCompleta.value = !!document.fullscreenElement)

onMounted(() => {
  conexion = abrirSala(
    codigo,
    (s) => {
      error.value = ''
      aplicar(s)
    },
    (m) => (error.value = m),
  )
  document.addEventListener('fullscreenchange', alCambiarPantalla)
})
onUnmounted(() => {
  conexion?.cerrar()
  document.removeEventListener('fullscreenchange', alCambiarPantalla)
})
</script>

<template>
  <div class="sala">
    <div v-if="error" class="panel text-center py-5">
      <h2 class="h5">{{ error }}</h2>
      <router-link to="/40-Prolipa/practica" class="btn btn-quito-gold mt-2">Volver a las salas</router-link>
    </div>

    <div v-else-if="!sala" class="text-center py-5"><div class="spinner-border text-warning"></div></div>

    <!-- ======================= SALA DE ESPERA ======================= -->
    <div v-else-if="sala.estado === 'espera'" class="espera">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <div class="text-soft small">Sala</div>
          <h1 class="h2 fw-bold mb-0 codigo">{{ codigo }}</h1>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-light" @click="copiarEnlace"><i class="bi bi-link-45deg me-1"></i>Copiar enlace</button>
          <button v-if="sentado" class="btn btn-sm btn-outline-danger" @click="salir">Salir</button>
        </div>
      </header>

      <p class="text-soft small">Pasa el código <b>{{ codigo }}</b> o el enlace a tus compañeros. Tu pareja es quien se sienta frente a ti.</p>

      <div v-if="!sentado" class="panel panel-gold form-dark mb-3">
        <label class="form-label" for="n">Tu nombre</label>
        <div class="d-flex gap-2">
          <input id="n" v-model="nombre" maxlength="30" class="form-control" />
          <button class="btn btn-quito-gold text-nowrap" :disabled="!puedoEntrar || enviando" @click="entrar()">Sentarme</button>
        </div>
      </div>

      <div class="mesa-espera">
        <div v-for="i in [0, 1, 2, 3]" :key="i" class="asiento-espera" :class="['pos' + rel(i), 'eq' + equipoDeAsiento(i), { yo: i === mi }]">
          <div class="small text-soft">{{ i % 2 === base % 2 ? 'Tu equipo' : 'Rivales' }}</div>
          <template v-if="sala.asientos[i]">
            <div class="fw-bold text-truncate">
              <i class="bi me-1" :class="sala.asientos[i].tipo === 'bot' ? 'bi-robot' : 'bi-person-fill'"></i>{{ sala.asientos[i].nombre }}
            </div>
            <div class="small">
              <span v-if="i === mi" class="text-quito-gold">Tú</span>
              <span v-if="sala.asientos[i].anfitrion" class="text-soft"> · anfitrión</span>
            </div>
            <button v-if="sala.soyAnfitrion && sala.asientos[i].tipo === 'bot'" class="btn btn-link btn-sm p-0 text-white-50" @click="accion('bots', { asiento: i })">Quitar bot</button>
          </template>
          <template v-else>
            <div class="text-soft">Vacío</div>
            <div class="d-flex gap-2 justify-content-center flex-wrap mt-1">
              <button class="btn btn-sm btn-outline-light" :disabled="enviando" @click="clicAsiento(i)">{{ sentado ? 'Cambiarme aquí' : 'Sentarme aquí' }}</button>
              <button v-if="sala.soyAnfitrion" class="btn btn-sm btn-outline-secondary" :disabled="enviando" @click="accion('bots', { asiento: i })">+ Bot</button>
            </div>
          </template>
        </div>
        <div class="centro-espera">40</div>
      </div>

      <div class="panel mt-3 d-flex flex-wrap align-items-center gap-3 justify-content-between">
        <div class="d-flex align-items-center gap-2 form-dark">
          <label class="small text-soft" for="niv">Máquina:</label>
          <select id="niv" class="form-select form-select-sm w-auto" :value="sala.nivel" :disabled="!sala.soyAnfitrion" @change="accion('nivel', { nivel: $event.target.value })">
            <option v-for="(t, k) in NIVELES" :key="k" :value="k">{{ t }}</option>
          </select>
        </div>
        <button v-if="sala.soyAnfitrion" class="btn btn-quito-gold btn-lg" :disabled="enviando" @click="accion('iniciar')">
          <i class="bi bi-play-fill me-1"></i>Empezar
        </button>
        <div v-else class="text-soft small"><span class="spinner-grow spinner-grow-sm me-2"></span>Esperando a que el anfitrión empiece…</div>
      </div>
      <p v-if="sala.soyAnfitrion" class="small text-soft mt-2 mb-0">Los asientos vacíos los jugará la máquina.</p>
    </div>

    <!-- ======================= JUEGO ======================= -->
    <div v-else-if="juego" class="juego">
      <header class="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
        <div>
          <h1 class="h4 fw-bold mb-0">Sala {{ codigo }}</h1>
          <div class="text-soft small">Mano {{ juego.numeroMano }} · Mazo {{ juego.mazo }}</div>
        </div>
        <div class="d-flex gap-2 align-items-center form-dark">
          <select class="form-select form-select-sm w-auto" :value="sala.nivel" :disabled="!sala.soyAnfitrion" aria-label="Dificultad de la máquina" @change="accion('nivel', { nivel: $event.target.value })">
            <option v-for="(t, k) in NIVELES" :key="k" :value="k">Máquina: {{ t }}</option>
          </select>
          <button class="btn btn-sm btn-outline-light" title="Copiar enlace" aria-label="Copiar enlace" @click="copiarEnlace"><i class="bi bi-link-45deg"></i></button>
          <button v-if="puedePantallaCompleta" class="btn btn-sm btn-outline-light" :title="pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'" :aria-label="pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'" @click="alternarPantallaCompleta">
            <i class="bi" :class="pantallaCompleta ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" @click="sentado ? salir() : router.push('/40-Prolipa/practica')">Salir</button>
        </div>
      </header>

      <div v-if="puedoEntrar" class="panel panel-gold form-dark mb-3 d-flex gap-2 align-items-center flex-wrap">
        <span class="small">Estás mirando. ¿Quieres jugar en lugar de un bot?</span>
        <input v-model="nombre" maxlength="30" class="form-control form-control-sm w-auto" placeholder="Tu nombre" aria-label="Tu nombre" />
        <button class="btn btn-sm btn-quito-gold" @click="entrar()">Entrar a jugar</button>
      </div>

      <div class="juego-grid">
        <div class="col-juego">
          <!-- Marcador -->
          <div class="marcador mb-2">
            <div class="equipo"><span class="nombre">Nosotros</span><span class="pts nos">{{ nosotros.puntos }}</span></div>
            <div class="centro-info">a 40</div>
            <div class="equipo derecha"><span class="pts ellos">{{ ellos.puntos }}</span><span class="nombre">Ellos</span></div>
          </div>

          <!-- Mesa -->
          <div class="tapete">
            <div
              v-for="r in [2, 3, 1]"
              :key="r"
              class="asiento"
              :class="['pos' + r, { turno: juego.turno === absDe(r) && juego.fase === 'jugando', pareja: r === 2, off: !sala.asientos[absDe(r)].conectado }]"
            >
              <i v-if="sala.asientos[absDe(r)].tipo === 'bot'" class="bi bi-robot me-1"></i>{{ sala.asientos[absDe(r)].nombre }}
              <span class="n">{{ juego.cartas[absDe(r)] }}</span>
            </div>

            <div class="mesa">
              <div v-if="!juego.mesa.length" class="vacia">Mesa vacía</div>
              <TransitionGroup v-else name="mesa" tag="div" class="cartas">
                <div v-for="c in juego.mesa" :key="c.id" class="slot">
                  <Carta :carta="c" size="md" :resaltada="idsResaltados.has(c.id)" />
                  <span v-if="c.id === juego.ultimaTirada?.cartaId" class="ultima">última</span>
                </div>
              </TransitionGroup>
            </div>

            <div class="accion">{{ ultimaAccion }}</div>

            <div class="avisos" aria-live="polite">
              <TransitionGroup name="aviso">
                <div v-for="a in avisos" :key="a.id" class="aviso" :class="a.nuestro ? 'bueno' : 'malo'">{{ a.texto }}</div>
              </TransitionGroup>
            </div>
          </div>

          <!-- Mi mano -->
          <div v-if="sentado" class="mi-zona" :class="{ activo: miTurno }">
            <div class="estado-turno">{{ estadoTurno }}</div>
            <div class="mano">
              <button
                v-for="c in juego.miMano"
                :key="c.id"
                type="button"
                class="btn-carta"
                :disabled="!miTurno || enviando"
                :aria-label="'Jugar ' + nombreCarta(c)"
                @click="tocarCarta(c)"
                @mouseenter="hover = c"
                @mouseleave="hover = null"
              >
                <Carta :carta="c" size="lg" :jugable="miTurno" :atenuada="!miTurno" />
              </button>
            </div>
          </div>
          <div v-else class="text-center text-soft small mt-2">{{ estadoTurno }}</div>
        </div>

        <!-- Movimientos -->
        <div class="col-movs">
          <div class="panel movimientos">
            <h2 class="h6 mb-2">Movimientos</h2>
            <ul class="list-unstyled small mb-0">
              <li v-for="h in juego.historial" :key="h.id" :class="'ev-' + h.tipo">{{ h.texto }}</li>
            </ul>
          </div>
          <p class="small text-soft mt-2 mb-0">
            Caída +2 · Limpia +2 · Ronda +2 · Cartón 20 = 6 ·
            <router-link to="/40-Prolipa/reglas" class="text-quito-gold">Reglas</router-link>
          </p>
        </div>
      </div>

      <!-- Elegir forma de levantar -->
      <div v-if="eligiendo" class="overlay" @click.self="eligiendo = null">
        <div class="modal-40" role="dialog" aria-modal="true">
          <h3 class="h5 mb-3">¿Qué levantas con {{ nombreCarta(eligiendo.carta) }}?</h3>
          <button v-for="(op, i) in eligiendo.opciones" :key="i" class="opcion" @click="elegirOpcion(op)">
            <span class="d-flex gap-1 flex-wrap"><Carta v-for="c in op.total" :key="c.id" :carta="c" size="sm" /></span>
            <span class="small text-soft ms-auto">{{ op.total.length + 1 }} cartas</span>
          </button>
        </div>
      </div>

      <!-- Fin de mano -->
      <div v-if="juego.fase === 'fin_mano' && juego.resumenMano" class="overlay">
        <div class="modal-40 text-center" role="dialog" aria-modal="true">
          <h3 class="h4 mb-3">Fin de la mano</h3>
          <div v-for="r in juego.resumenMano.equipos" :key="r.equipo" class="fila-carton">
            <span class="fw-bold">{{ r.equipo === base % 2 ? 'Nosotros' : 'Ellos' }}</span>
            <span>{{ r.cartas }} cartas</span>
            <span :class="r.sumados ? 'text-success fw-bold' : 'text-soft'">+{{ r.sumados }}</span>
          </div>
          <div class="my-3 fs-5">{{ nosotros.puntos }} – {{ ellos.puntos }}</div>
          <button v-if="sentado" class="btn btn-quito-gold btn-lg w-100" @click="accion('siguiente')">Siguiente mano</button>
          <div class="small text-soft mt-2">Sigue sola en unos segundos…</div>
        </div>
      </div>

      <!-- Fin del juego -->
      <div v-if="juego.fase === 'fin'" class="overlay">
        <div class="modal-40 text-center" role="dialog" aria-modal="true">
          <div class="display-4 mb-2">{{ ganamos ? '🏆' : '😅' }}</div>
          <h3 class="h3 fw-bold">{{ ganamos ? '¡Ganaron!' : 'Perdieron' }}</h3>
          <p class="text-soft">{{ juego.motivoFin }} · {{ nosotros.puntos }} a {{ ellos.puntos }}</p>
          <button v-if="sentado" class="btn btn-quito-gold btn-lg w-100 mb-2" @click="accion('revancha')">Revancha</button>
          <router-link to="/40-Prolipa/practica" class="btn btn-outline-light w-100">Volver a las salas</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sala {
  width: 100%;
}
.espera {
  max-width: 900px;
  margin: 0 auto;
}

/* Juego a pantalla completa: ocupa todo el alto disponible bajo la barra */
.juego {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--alto-nav, 72px) - 1.5rem);
  min-height: 560px;
}
.juego > header { flex-shrink: 0; margin-bottom: 0.6rem !important; }
.juego-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(260px, 22vw, 360px);
  gap: 1rem;
}
.col-juego { display: flex; flex-direction: column; min-height: 0; }
.col-movs { display: flex; flex-direction: column; min-height: 0; }
.col-movs .movimientos { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.codigo {
  letter-spacing: 0.2em;
  color: #ffd700;
}

/* Sala de espera */
.mesa-espera {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  grid-template-areas:
    '. p2 .'
    'p3 c p1'
    '. p0 .';
  gap: 10px;
  background: radial-gradient(ellipse at center, #13753a 0%, #0a5428 70%, #073d1d 100%);
  border: 8px solid #5b3a1e;
  border-radius: 20px;
  padding: 14px;
}
.asiento-espera {
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 0.6rem;
  text-align: center;
  min-width: 0;
}
.asiento-espera.eqA { border-color: rgba(255, 215, 0, 0.45); }
.asiento-espera.eqB { border-color: rgba(255, 107, 129, 0.45); }
.asiento-espera.yo { box-shadow: 0 0 0 3px #ffd700; }
.pos0 { grid-area: p0; }
.pos1 { grid-area: p1; }
.pos2 { grid-area: p2; }
.pos3 { grid-area: p3; }
.centro-espera {
  grid-area: c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.15);
}

/* Marcador */
.marcador {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #161616;
  border: 1px solid #2c2c2c;
  border-radius: 14px;
  padding: 0.5rem 1rem;
}
.equipo { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
.equipo.derecha { justify-content: flex-end; }
.nombre { font-weight: 600; color: rgba(255, 255, 255, 0.8); }
.pts { font-size: 1.9rem; font-weight: 900; line-height: 1; }
.pts.nos { color: #ffd700; }
.pts.ellos { color: #ff6b81; }
.centro-info { color: rgba(255, 255, 255, 0.45); font-size: 0.85rem; }

/* Mesa */
.tapete {
  position: relative;
  border-radius: 20px;
  background: radial-gradient(ellipse at center, #13753a 0%, #0a5428 70%, #073d1d 100%);
  border: 8px solid #5b3a1e;
  flex: 1;
  min-height: 260px;
  padding: 3rem 1rem 2.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.asiento {
  position: absolute;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.45);
  color: #ff9aa8;
  white-space: nowrap;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asiento.pareja { color: #ffd700; }
.asiento.off { opacity: 0.55; }
.asiento .n {
  display: inline-block;
  min-width: 20px;
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  text-align: center;
}
.asiento.turno { background: #ffd700; color: #111; box-shadow: 0 0 14px rgba(255, 215, 0, 0.7); opacity: 1; }
.asiento.turno .n { background: rgba(0, 0, 0, 0.15); color: #111; }
.tapete .pos2 { top: 10px; left: 50%; transform: translateX(-50%); }
.tapete .pos3 { left: 10px; top: 50%; transform: translateY(-50%); }
.tapete .pos1 { right: 10px; top: 50%; transform: translateY(-50%); }
.mesa { max-width: min(900px, 90%); margin: 0 auto; }
.cartas { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(6px, 1vw, 14px); }
.cartas :deep(.naipe-md) { --w: clamp(50px, 5.5vw, 92px); }
.mano :deep(.naipe-lg) { --w: clamp(60px, 7vw, 116px); }
.slot { position: relative; }
.ultima {
  position: absolute;
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  background: #e4002b;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 99px;
}
.vacia { color: rgba(255, 255, 255, 0.35); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.accion { position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 0.9rem; color: rgba(255, 255, 255, 0.85); }
.avisos {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  pointer-events: none;
}
.aviso { padding: 0.5rem 1.2rem; border-radius: 99px; font-weight: 900; font-size: 1.05rem; white-space: nowrap; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5); }
.aviso.bueno { background: #ffd700; color: #111; }
.aviso.malo { background: #e4002b; color: #fff; }

/* Mi mano */
.mi-zona { flex-shrink: 0; margin-top: 0.75rem; border-radius: 16px; padding: 0.6rem 0.5rem 0.9rem; border: 2px solid transparent; transition: border-color 0.2s ease; }
.mi-zona.activo { border-color: rgba(255, 215, 0, 0.5); background: rgba(255, 215, 0, 0.04); }
.estado-turno { text-align: center; font-weight: 600; min-height: 1.5rem; margin-bottom: 0.5rem; }
.mi-zona.activo .estado-turno { color: #ffd700; }
.mano { display: flex; justify-content: center; gap: 8px; min-height: 132px; }
.btn-carta { background: none; border: 0; padding: 0; }
.btn-carta:disabled { cursor: default; }

/* Movimientos */
.movimientos ul { flex: 1; min-height: 0; overflow-y: auto; }
.movimientos li { padding: 4px 0; border-bottom: 1px solid #222; color: rgba(255, 255, 255, 0.7); }
.movimientos li.ev-caida, .movimientos li.ev-limpia, .movimientos li.ev-caida_limpia { color: #ffd700; font-weight: 700; }
.movimientos li.ev-ronda, .movimientos li.ev-cuatro { color: #7fb2ff; font-weight: 700; }
.movimientos li.ev-mano, .movimientos li.ev-carton { color: #fff; }
.movimientos li.ev-fin { color: #5fd39a; font-weight: 800; }

/* Ventanas */
.overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-40 { background: #1a1a1a; border: 2px solid #ffd700; border-radius: 18px; padding: 1.5rem; width: 100%; max-width: 400px; }
.opcion { display: flex; align-items: center; gap: 0.75rem; width: 100%; background: #111; border: 1px solid #333; border-radius: 12px; padding: 0.6rem; margin-bottom: 0.5rem; color: #fff; }
.opcion:hover { border-color: #ffd700; }
.fila-carton { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #2a2a2a; }

/* Animaciones */
.mesa-enter-active, .mesa-leave-active { transition: all 0.35s ease; }
.mesa-enter-from { opacity: 0; transform: translateY(25px) scale(0.85); }
.mesa-leave-to { opacity: 0; transform: scale(0.6); }
.aviso-enter-active, .aviso-leave-active { transition: all 0.3s ease; }
.aviso-enter-from { opacity: 0; transform: scale(0.6); }
.aviso-leave-to { opacity: 0; transform: translateY(-15px); }

/* Tablet y celular: una sola columna; la mesa ocupa la pantalla y los movimientos van debajo */
@media (max-width: 991px) {
  .juego { height: calc(100dvh - var(--alto-nav, 70px) - 1rem); min-height: 480px; }
  /* La mesa + mi mano ocupan exactamente el alto visible; los movimientos quedan debajo (deslizar) */
  .juego-grid { display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; }
  .col-juego { flex: 0 0 100%; }
  .col-movs { flex: 0 0 auto; }
  .col-movs .movimientos ul { max-height: 260px; }
  .juego > header h1 { font-size: 1.1rem; }
  .tapete { min-height: 180px; }
}

@media (max-width: 575px) {
  .tapete { padding: 2.6rem 0.4rem 2.2rem; min-height: 280px; border-width: 5px; }
  .tapete .pos3, .tapete .pos1 { top: auto; bottom: 34px; transform: none; font-size: 0.7rem; }
  .cartas { gap: 6px; }
  .cartas :deep(.naipe-md) { --w: 50px; }
  .mano { gap: 4px; min-height: 100px; }
  .mano :deep(.naipe-lg) { --w: 62px; }
  .pts { font-size: 1.6rem; }
  .aviso { font-size: 0.85rem; }
  .mesa-espera { grid-template-columns: 1fr 1fr; grid-template-areas: 'p2 p2' 'p3 p1' 'p0 p0'; }
  .centro-espera { display: none; }
  .movimientos ul { max-height: 220px; }
}
</style>
