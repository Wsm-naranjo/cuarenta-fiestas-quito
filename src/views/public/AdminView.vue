<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Swal from 'sweetalert2'
import CuadroTorneo from '../../components/CuadroTorneo.vue'
import BuscadorPersona from '../../components/BuscadorPersona.vue'
import { escucharSesion, entrar, salir } from '../../online/admin'
import { usuarios as cargarUsuarios, escucharParejas, inscribir, editarPareja, borrarInscripcion } from '../../online/inscripciones'
import {
  escucharTorneo,
  comenzarTorneo,
  guardarResultado,
  deshacerResultado,
  reiniciarTorneo,
  cerrarInscripciones,
  abrirInscripciones,
  ponerEnLugar,
  actualizarPareja,
  nombrePareja,
} from '../../online/torneo'
import { escucharLobby, cerrarSala, limpiarAbandonadas } from '../../online/salas'
import { tamano, dependientes, cambiarLugar, todosLosPartidos, BYE, TERCER } from '../../torneo/cuadro'

const OSCURO = { background: '#1a1c22', color: '#fff', confirmButtonColor: '#003da5' }

const sesion = ref({ cargando: true, usuario: null, esAdmin: false })
const correo = ref('')
const clave = ref('')
const entrando = ref(false)
const parejas = ref([])
const torneo = ref(null)
const usuarios = ref([])
const lobby = ref({ espera: [], jugando: [], jugadores: 0 })
const ocupado = ref(false)
const pestana = ref('torneo')
const modo = ref('resultados') // resultados | organizar
const offs = []

onMounted(() => {
  offs.push(escucharSesion((s) => (sesion.value = { cargando: false, ...s })))
  offs.push(escucharParejas((l) => (parejas.value = l)))
  offs.push(escucharTorneo((t) => (torneo.value = t)))
  offs.push(escucharLobby((l) => (lobby.value = l)))
  cargarUsuarios()
    .then((l) => (usuarios.value = l))
    .catch(() => {})
})
onUnmounted(() => offs.forEach((f) => f?.()))

async function login() {
  entrando.value = true
  try {
    await entrar(correo.value, clave.value)
    clave.value = ''
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'No se pudo entrar', text: e.message, ...OSCURO })
  } finally {
    entrando.value = false
  }
}

function copiarUid() {
  navigator.clipboard?.writeText(sesion.value.usuario.uid).catch(() => {})
  aviso('UID copiado')
}

const aviso = (title) => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title, timer: 1800, showConfirmButton: false, ...OSCURO })

async function confirmar(opciones) {
  const r = await Swal.fire({ showCancelButton: true, cancelButtonText: 'Cancelar', ...OSCURO, ...opciones })
  return r.isConfirmed
}

async function hacer(fn, hecho) {
  ocupado.value = true
  try {
    await fn()
    if (hecho) aviso(hecho)
    return true
  } catch (e) {
    const sinPermiso = String(e?.message || e).toLowerCase().includes('permission')
    Swal.fire({
      icon: 'error',
      title: 'Ups',
      text: sinPermiso ? 'Firebase no dejó guardar: revisa que esta cuenta esté en "admins" y que las reglas estén publicadas.' : e.message,
      ...OSCURO,
    })
    return false
  } finally {
    ocupado.value = false
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const nombreDe = (p) => `${p.jugador1.nombre} y ${p.jugador2.nombre}`

/* ---------- Etapas ---------- */
const etapa = computed(() => (!torneo.value ? 'abiertas' : torneo.value.sorteado ? 'sorteado' : 'cerradas'))
const info = computed(() => (parejas.value.length >= 2 ? tamano(parejas.value.length) : null))
const enCuadro = (id) => !!torneo.value?.sorteado && !!torneo.value.parejas[id]

async function sortear() {
  const n = parejas.value.length
  const { tamano: t, pases } = info.value
  const ok = await confirmar({
    icon: 'question',
    title: etapa.value === 'sorteado' ? '¿Volver a sortear?' : '¿Sortear y comenzar el torneo?',
    html:
      `<p>${n} parejas · cuadro de ${t}.</p>` +
      (pases ? `<p><b>${pases}</b> pareja(s) sacan <b>pase libre</b> a la 2.ª ronda por sorteo (las parejas no son potencia de 2).</p>` : '') +
      '<p class="small">Las inscripciones quedan cerradas. Después puedes acomodar el cuadro a mano en "Organizar cuadro".</p>',
    confirmButtonText: 'Sortear',
  })
  if (ok) hacer(() => comenzarTorneo(parejas.value), 'Sorteo hecho')
}

async function cerrar() {
  const ok = await confirmar({
    icon: 'question',
    title: '¿Cerrar inscripciones?',
    text: 'Nadie más podrá inscribirse desde la página. Tú sí puedes agregar, editar o borrar parejas. El sorteo lo haces cuando quieras.',
    confirmButtonText: 'Cerrar inscripciones',
  })
  if (ok) hacer(cerrarInscripciones, 'Inscripciones cerradas')
}
const abrir = () => hacer(abrirInscripciones, 'Inscripciones abiertas')

async function reiniciar() {
  const r = await Swal.fire({
    icon: 'warning',
    title: '¿Reiniciar el torneo?',
    html: 'Se borra el cuadro y <b>todos los resultados</b>. Las parejas inscritas se mantienen y se vuelven a abrir las inscripciones.',
    input: 'text',
    inputPlaceholder: 'Escribe REINICIAR',
    showCancelButton: true,
    confirmButtonText: 'Reiniciar',
    cancelButtonText: 'Cancelar',
    ...OSCURO,
    confirmButtonColor: '#e4002b',
    preConfirm: (v) => (v?.trim().toUpperCase() === 'REINICIAR' ? true : (Swal.showValidationMessage('Escribe REINICIAR para confirmar'), false)),
  })
  if (r.isConfirmed) hacer(reiniciarTorneo, 'Torneo reiniciado')
}

/* ---------- Torneo sorteado: resultados ---------- */
const partidos = computed(() => (torneo.value?.sorteado ? todosLosPartidos(torneo.value) : []))
const jugados = computed(() => partidos.value.filter((p) => p.listo && p.resultado).length)
const totalPartidos = computed(() => partidos.value.filter((p) => !p.pase).length)
const tardias = computed(() => (etapa.value === 'sorteado' ? parejas.value.filter((p) => !torneo.value.parejas[p.id]) : []))
const hayResultados = computed(() => !!torneo.value && Object.keys(torneo.value.resultados).length > 0)
const pasesLibres = computed(() => (torneo.value?.primera || []).flat().filter((x) => x === BYE).length)

async function elegir(p) {
  const t = torneo.value
  const na = esc(nombrePareja(t, p.a))
  const nb = esc(nombrePareja(t, p.b))
  const r = p.resultado
  const html = `
    <div class="text-start">
      <p class="mb-2">¿Quién ganó?</p>
      <label class="d-flex align-items-center gap-2 p-2 rounded border border-secondary mb-2" style="cursor:pointer">
        <input type="radio" name="g" value="a" ${r?.g === p.a ? 'checked' : ''}> <b>${na}</b>
        <input id="pa" type="number" min="0" max="999" placeholder="0" class="form-control form-control-sm ms-auto" style="width:80px" value="${r?.pa ?? ''}">
      </label>
      <label class="d-flex align-items-center gap-2 p-2 rounded border border-secondary mb-2" style="cursor:pointer">
        <input type="radio" name="g" value="b" ${r?.g === p.b ? 'checked' : ''}> <b>${nb}</b>
        <input id="pb" type="number" min="0" max="999" placeholder="0" class="form-control form-control-sm ms-auto" style="width:80px" value="${r?.pb ?? ''}">
      </label>
      <label class="d-flex align-items-center gap-2 small"><input id="wo" type="checkbox" ${r?.wo ? 'checked' : ''}> Ganó por W.O. (la otra pareja no se presentó o se retiró)</label>
      <p class="small mt-2 mb-0" style="opacity:.6">Opcional: anota las partidas ganadas de cada pareja (por ejemplo 2 y 1).</p>
    </div>`
  const res = await Swal.fire({
    title: p.ronda === TERCER ? 'Tercer lugar' : t.rondas[p.ronda].nombre,
    html,
    showCancelButton: true,
    showDenyButton: !!r,
    confirmButtonText: 'Guardar',
    denyButtonText: 'Deshacer resultado',
    cancelButtonText: 'Cancelar',
    ...OSCURO,
    denyButtonColor: '#e4002b',
    preConfirm: () => {
      const g = document.querySelector('input[name="g"]:checked')?.value
      if (!g) {
        Swal.showValidationMessage('Elige la pareja ganadora')
        return false
      }
      const num = (id) => {
        const v = document.getElementById(id).value
        return v === '' ? null : Math.max(0, Math.min(999, Number(v)))
      }
      return { g, pa: num('pa'), pb: num('pb'), wo: document.getElementById('wo').checked }
    },
  })
  if (res.isConfirmed) {
    const { g, pa, pb, wo } = res.value
    const ganador = g === 'a' ? p.a : p.b
    // Si cambia el ganador, los partidos siguientes que ya se jugaron con el otro quedan sin efecto
    const dep = r && r.g !== ganador ? dependientes(t.primera, t.resultados, p.key) : []
    if (dep.length) {
      const ok = await confirmar({
        icon: 'warning',
        title: 'Cambia el cuadro',
        text: `Hay ${dep.length} resultado(s) más adelante que se jugaron con la otra pareja. Se borrarán.`,
        confirmButtonText: 'Sí, cambiar',
      })
      if (!ok) return
      await hacer(() => deshacerResultado('__ninguno__', dep))
    }
    hacer(() => guardarResultado(p, ganador, { pa, pb, wo }), 'Resultado guardado')
  } else if (res.isDenied) {
    const dep = dependientes(t.primera, t.resultados, p.key)
    if (dep.length) {
      const ok = await confirmar({
        icon: 'warning',
        title: '¿Deshacer?',
        text: `También se borrarán ${dep.length} resultado(s) de rondas siguientes que dependen de este partido.`,
        confirmButtonText: 'Sí, deshacer',
        confirmButtonColor: '#e4002b',
      })
      if (!ok) return
    }
    hacer(() => deshacerResultado(p.key, dep), 'Resultado borrado')
  }
}

/* ---------- Torneo sorteado: organizar el cuadro a mano ---------- */
async function lugar({ indice, lado, id }) {
  const t = torneo.value
  const actual = id === BYE ? 'Pase libre' : nombrePareja(t, id)
  const dentro = {}
  const fuera = {}
  t.primera.forEach((partido, i) =>
    partido.forEach((x, k) => {
      if (x === BYE || x === id) return
      dentro[x] = `#${t.parejas[x]?.numero ?? '?'} ${nombrePareja(t, x)} (partido ${i + 1}${k === 0 ? 'A' : 'B'})`
    }),
  )
  tardias.value.forEach((p) => (fuera[p.id] = `#${p.numero} ${nombreDe(p)}`))
  const opciones = {}
  if (id !== BYE) opciones[BYE] = 'Pase libre (deja el lugar vacío; la pareja sale del cuadro)'
  if (Object.keys(fuera).length) opciones['Meter una pareja que está fuera del cuadro'] = fuera
  if (Object.keys(dentro).length) opciones['Intercambiar con una pareja del cuadro'] = dentro

  const r = await Swal.fire({
    title: `Partido ${indice + 1} · lugar ${lado === 'a' ? 'A' : 'B'}`,
    html: `<p class="mb-1">Ahora: <b>${esc(actual)}</b></p><p class="small" style="opacity:.7">¿Qué pareja va en este lugar?</p>`,
    input: 'select',
    inputOptions: opciones,
    inputPlaceholder: 'Elige…',
    showCancelButton: true,
    confirmButtonText: 'Continuar',
    cancelButtonText: 'Cancelar',
    ...OSCURO,
    inputValidator: (v) => (!v ? 'Elige una opción' : undefined),
  })
  if (!r.isConfirmed) return
  const nuevo = r.value
  const c = cambiarLugar(t.primera, t.resultados, indice, lado, nuevo)
  if (c.error) return Swal.fire({ icon: 'error', title: 'No se puede', text: c.error, ...OSCURO })

  const avisos = []
  if (c.sale) avisos.push(`<b>${esc(nombrePareja(t, c.sale))}</b> sale del cuadro (sigue inscrita).`)
  if (c.invalidos.length) avisos.push(`Se borrarán <b>${c.invalidos.length}</b> resultado(s) ya jugados que dependen de este lugar.`)
  if (avisos.length) {
    const ok = await confirmar({ icon: 'warning', title: '¿Hacer el cambio?', html: avisos.map((a) => `<p>${a}</p>`).join(''), confirmButtonText: 'Sí, cambiar' })
    if (!ok) return
  }
  const pareja = parejas.value.find((p) => p.id === nuevo) || null
  hacer(() => ponerEnLugar(indice, lado, nuevo, pareja), 'Cuadro actualizado')
}

/* ---------- Parejas: agregar, editar, borrar ---------- */
const form = ref(null) // { id | null, j1, j2, nombre }
const ocupados = computed(() => {
  const m = new Map()
  parejas.value.forEach((p) => {
    if (p.id === form.value?.id) return
    m.set(p.jugador1.id, true)
    m.set(p.jugador2.id, true)
  })
  return m
})

const nuevaPareja = () => (form.value = { id: null, j1: null, j2: null, nombre: '' })
const editar = (p) => (form.value = { id: p.id, j1: p.jugador1, j2: p.jugador2, nombre: p.nombre_pareja })

async function guardarPareja() {
  const f = form.value
  const ok = await hacer(async () => {
    if (!f.id) return inscribir(f.j1, f.j2, f.nombre)
    await editarPareja(f.id, f.j1, f.j2, f.nombre)
    if (enCuadro(f.id) || torneo.value?.parejas?.[f.id]) {
      const actual = parejas.value.find((p) => p.id === f.id)
      await actualizarPareja({ id: f.id, jugador1: f.j1, jugador2: f.j2, nombre_pareja: f.nombre.trim(), numero: actual?.numero })
    }
  }, f.id ? 'Pareja actualizada' : 'Pareja agregada')
  if (ok) form.value = null
}

async function borrarPareja(p) {
  if (enCuadro(p.id)) {
    return Swal.fire({
      icon: 'info',
      title: 'Está en el cuadro',
      html: `<b>${esc(nombreDe(p))}</b> ya está jugando el torneo. Primero sácala del cuadro en <b>Torneo → Organizar cuadro</b> (ponle "Pase libre" o cámbiala por otra pareja), o márcale W.O. en su partido.`,
      ...OSCURO,
    })
  }
  const ok = await confirmar({
    icon: 'warning',
    title: '¿Borrar esta pareja?',
    text: `#${p.numero} ${nombreDe(p)}. Podrán volver a inscribirse.`,
    confirmButtonText: 'Sí, borrar',
    confirmButtonColor: '#e4002b',
  })
  if (ok) hacer(() => borrarInscripcion(p.id), 'Pareja borrada')
}

/* ---------- Salas de juego ---------- */
const salas = computed(() => [...lobby.value.jugando, ...lobby.value.espera])

async function cerrarUna(s) {
  const ok = await confirmar({
    icon: 'warning',
    title: `¿Cerrar la sala ${s.codigo}?`,
    text: `Se borra la sala y la partida. ${s.conectados} persona(s) conectada(s) verán "Esta sala ya no existe".`,
    confirmButtonText: 'Cerrar sala',
    confirmButtonColor: '#e4002b',
  })
  if (ok) hacer(() => cerrarSala(s.codigo), 'Sala cerrada')
}

async function limpiar() {
  let n = 0
  const ok = await hacer(async () => (n = await limpiarAbandonadas()))
  if (ok) aviso(n ? `${n} sala(s) abandonada(s) borradas` : 'No había salas abandonadas')
}

const enlacePublico = computed(() => location.href.split('#')[0] + '#/40-Prolipa/torneo')
</script>

<template>
  <div class="admin">
    <header class="page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
      <div>
        <span class="eyebrow"><i class="bi bi-shield-lock-fill"></i>Solo organizadores</span>
        <h1>Administración del torneo</h1>
        <p>Inscripciones, sorteo, cuadro, resultados y salas. Lo que cambies aquí se ve al instante en la página pública.</p>
      </div>
      <div v-if="sesion.usuario" class="d-flex align-items-center gap-2">
        <span class="small text-soft">{{ sesion.usuario.email }}</span>
        <button class="btn btn-sm btn-outline-light" @click="salir"><i class="bi bi-box-arrow-right me-1"></i>Salir</button>
      </div>
    </header>

    <div v-if="sesion.cargando" class="text-center py-5"><div class="spinner-border text-warning"></div></div>

    <!-- Inicio de sesión -->
    <div v-else-if="!sesion.usuario" class="panel form-dark login">
      <h2 class="h5 mb-3">Entrar como administrador</h2>
      <form @submit.prevent="login">
        <label class="form-label" for="correo">Correo</label>
        <input id="correo" v-model="correo" type="email" class="form-control mb-3" autocomplete="username" required />
        <label class="form-label" for="clave">Contraseña</label>
        <input id="clave" v-model="clave" type="password" class="form-control mb-3" autocomplete="current-password" required />
        <button class="btn btn-quito-gold w-100" :disabled="entrando">{{ entrando ? 'Entrando…' : 'Entrar' }}</button>
      </form>
    </div>

    <!-- Cuenta sin permiso -->
    <div v-else-if="!sesion.esAdmin" class="panel login">
      <h2 class="h5"><i class="bi bi-exclamation-triangle text-warning me-1"></i>Esta cuenta todavía no es administradora</h2>
      <p class="text-soft">En la consola de Firebase, en <b>Realtime Database → Datos</b>, agrega <code>admins / (este UID) = true</code>:</p>
      <div class="d-flex gap-2 align-items-center mb-2">
        <code class="uid">{{ sesion.usuario.uid }}</code>
        <button class="btn btn-sm btn-outline-light" @click="copiarUid"><i class="bi bi-clipboard"></i></button>
      </div>
      <p class="small text-soft mb-0">Luego recarga esta página.</p>
    </div>

    <!-- Administrador -->
    <template v-else>
      <ul class="nav nav-pills pestanas mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: pestana === 'torneo' }" @click="pestana = 'torneo'"><i class="bi bi-trophy me-1"></i>Torneo</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: pestana === 'parejas' }" @click="pestana = 'parejas'">
            <i class="bi bi-people me-1"></i>Parejas <span class="badge text-bg-dark">{{ parejas.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: pestana === 'salas' }" @click="pestana = 'salas'">
            <i class="bi bi-controller me-1"></i>Salas de juego <span class="badge text-bg-dark">{{ salas.length }}</span>
          </button>
        </li>
      </ul>

      <!-- ===== TORNEO ===== -->
      <template v-if="pestana === 'torneo'">
        <!-- Antes del sorteo -->
        <div v-if="etapa !== 'sorteado'" class="row g-4">
          <div class="col-lg-5">
            <div class="panel">
              <span class="chip mb-2" :class="etapa === 'abiertas' ? 'chip-gold' : 'chip-amber'">
                {{ etapa === 'abiertas' ? 'Inscripciones abiertas' : 'Inscripciones cerradas' }}
              </span>
              <div class="grande">{{ parejas.length }}</div>
              <div class="text-soft mb-3">parejas inscritas</div>
              <p v-if="info" class="small">
                Cuadro de <b>{{ info.tamano }}</b>.
                <template v-if="info.pases">Como no es potencia de 2, <b>{{ info.pases }}</b> pareja(s) pasan directo a la 2.ª ronda por sorteo.</template>
                <template v-else>Todas juegan la 1.ª ronda.</template>
              </p>
              <p v-else class="small text-warning"><i class="bi bi-info-circle me-1"></i>Se necesitan al menos 2 parejas para sortear.</p>
              <button class="btn btn-quito-gold w-100 mb-2" :disabled="!info || ocupado" @click="sortear"><i class="bi bi-shuffle me-1"></i>Sortear y comenzar</button>
              <button v-if="etapa === 'abiertas'" class="btn btn-outline-light w-100 btn-sm mb-2" :disabled="ocupado" @click="cerrar">
                <i class="bi bi-lock me-1"></i>Cerrar inscripciones (sin sortear)
              </button>
              <button v-else class="btn btn-outline-light w-100 btn-sm mb-2" :disabled="ocupado" @click="abrir"><i class="bi bi-unlock me-1"></i>Volver a abrir inscripciones</button>
              <button class="btn btn-outline-light w-100 btn-sm" @click="pestana = 'parejas'"><i class="bi bi-people me-1"></i>Agregar, editar o borrar parejas</button>
            </div>
          </div>
          <div class="col-lg-7">
            <div class="panel pasos">
              <h2 class="h6 mb-3">Cómo se organiza el torneo</h2>
              <ol class="small mb-0">
                <li><b>Inscripciones:</b> la gente se inscribe sola. En <b>Parejas</b> puedes agregar, corregir o borrar.</li>
                <li><b>Cerrar:</b> cuando ya no se acepten más parejas (opcional: el sorteo también las cierra).</li>
                <li><b>Sortear:</b> se arma el cuadro al azar. Si las parejas no son 2, 4, 8, 16, 32…, algunas pasan directo a la 2.ª ronda (<b>pase libre</b>).</li>
                <li><b>Organizar cuadro:</b> si algo no te gusta, mueve parejas a mano, mete una que llegó tarde en un pase libre o reemplaza una que se retiró.</li>
                <li><b>Resultados:</b> toca cada partido para marcar quién ganó, los puntos o un W.O.</li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Torneo sorteado -->
        <template v-else>
          <div class="resumen panel mb-3">
            <div>
              <span class="chip" :class="torneo.terminado ? 'chip-gold' : ''">{{ torneo.terminado ? 'Torneo terminado' : 'Torneo en curso' }}</span>
              <div class="mt-2">
                <b>{{ Object.keys(torneo.parejas).length }}</b> parejas en el cuadro · <b>{{ jugados }}</b> de {{ totalPartidos }} partidos jugados
                <template v-if="pasesLibres"> · {{ pasesLibres }} pase(s) libre(s)</template>
              </div>
              <div v-if="torneo.campeon" class="mt-1 campeon"><i class="bi bi-trophy-fill me-1"></i>Campeones: {{ nombrePareja(torneo, torneo.campeon) }}</div>
              <div v-if="torneo.tercero" class="small text-soft"><i class="bi bi-award me-1"></i>Tercer lugar: {{ nombrePareja(torneo, torneo.tercero) }}</div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <a :href="enlacePublico" target="_blank" class="btn btn-sm btn-outline-light"><i class="bi bi-box-arrow-up-right me-1"></i>Ver página pública</a>
              <button v-if="!hayResultados" class="btn btn-sm btn-outline-light" :disabled="ocupado || !info" @click="sortear"><i class="bi bi-shuffle me-1"></i>Volver a sortear</button>
              <button class="btn btn-sm btn-outline-danger" :disabled="ocupado" @click="reiniciar"><i class="bi bi-arrow-counterclockwise me-1"></i>Reiniciar torneo</button>
            </div>
          </div>

          <div v-if="tardias.length" class="alert alert-warning py-2 small">
            <i class="bi bi-exclamation-triangle me-1"></i>{{ tardias.length }} pareja(s) inscritas no están en el cuadro:
            {{ tardias.map(nombreDe).join(' · ') }}.
            <template v-if="!hayResultados"> Usa "Volver a sortear" o</template>
            <template v-else> Puedes</template>
            meterlas en un pase libre o en lugar de otra con <b>Organizar cuadro</b>.
          </div>

          <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn" :class="modo === 'resultados' ? 'btn-quito-gold' : 'btn-outline-light'" @click="modo = 'resultados'">
                <i class="bi bi-check2-square me-1"></i>Resultados
              </button>
              <button class="btn" :class="modo === 'organizar' ? 'btn-quito-gold' : 'btn-outline-light'" @click="modo = 'organizar'">
                <i class="bi bi-arrow-left-right me-1"></i>Organizar cuadro
              </button>
            </div>
            <span class="small text-soft">
              <template v-if="modo === 'resultados'"><i class="bi bi-hand-index me-1"></i>Toca un partido para marcar quién ganó, poner el marcador, dar un W.O. o deshacer.</template>
              <template v-else><i class="bi bi-hand-index me-1"></i>Toca un lugar de la 1.ª ronda para cambiar la pareja: intercambiar, meter una de fuera o dejar pase libre.</template>
            </span>
          </div>
          <div class="panel">
            <CuadroTorneo :torneo="torneo" editable :organizar="modo === 'organizar'" :ocultar-pases="modo !== 'organizar'" @elegir="elegir" @lugar="lugar" />
          </div>
        </template>
      </template>

      <!-- ===== PAREJAS ===== -->
      <template v-else-if="pestana === 'parejas'">
        <div v-if="form" class="panel form-dark mb-3">
          <h2 class="h6 mb-3">{{ form.id ? 'Editar pareja' : 'Agregar pareja' }}</h2>
          <div class="row g-3">
            <div class="col-md-6">
              <BuscadorPersona id="admin-j1" v-model="form.j1" etiqueta="Jugador 1" :usuarios="usuarios" :inscritos="ocupados" :excluir-id="form.j2?.id ?? null" />
            </div>
            <div class="col-md-6">
              <BuscadorPersona id="admin-j2" v-model="form.j2" etiqueta="Jugador 2" :usuarios="usuarios" :inscritos="ocupados" :excluir-id="form.j1?.id ?? null" />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="admin-nombre">Nombre de la pareja <span class="text-soft fw-normal">(opcional)</span></label>
              <input id="admin-nombre" v-model="form.nombre" class="form-control" maxlength="40" placeholder="Ej: Los Chullas" />
            </div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-quito-gold" :disabled="!form.j1 || !form.j2 || ocupado" @click="guardarPareja"><i class="bi bi-check-lg me-1"></i>Guardar</button>
            <button class="btn btn-outline-light" @click="form = null">Cancelar</button>
          </div>
        </div>

        <div class="panel">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h2 class="h6 mb-0">Parejas inscritas ({{ parejas.length }})</h2>
            <button v-if="!form" class="btn btn-sm btn-quito-gold" @click="nuevaPareja"><i class="bi bi-plus-lg me-1"></i>Agregar pareja</button>
          </div>
          <p class="small text-soft">Como administrador puedes agregar y corregir parejas aunque las inscripciones estén cerradas.</p>
          <p v-if="!parejas.length" class="text-soft small mb-0">Nadie se ha inscrito todavía.</p>
          <div v-for="p in parejas" :key="p.id" class="item">
            <span class="num">{{ p.numero }}</span>
            <div class="flex-grow-1 min-w-0">
              <div class="fw-bold text-truncate">{{ nombreDe(p) }}</div>
              <div class="small text-soft">
                <span v-if="p.nombre_pareja">"{{ p.nombre_pareja }}"</span>
                <span v-if="etapa === 'sorteado'" class="chip ms-1" :class="enCuadro(p.id) ? 'chip-gold' : 'chip-amber'">{{ enCuadro(p.id) ? 'En el cuadro' : 'Fuera del cuadro' }}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-light" :disabled="ocupado" title="Editar pareja" @click="editar(p)"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" :disabled="ocupado" title="Borrar pareja" @click="borrarPareja(p)"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </template>

      <!-- ===== SALAS ===== -->
      <template v-else>
        <div class="panel">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h2 class="h6 mb-0">Salas con gente conectada · {{ lobby.jugadores }} jugador(es)</h2>
            <button class="btn btn-sm btn-outline-light" :disabled="ocupado" @click="limpiar"><i class="bi bi-trash3 me-1"></i>Borrar salas abandonadas</button>
          </div>
          <p class="small text-soft">"Borrar salas abandonadas" quita las salas sin nadie conectado y sin movimiento en la última hora.</p>
          <p v-if="!salas.length" class="text-soft small mb-0">No hay salas con gente ahora mismo.</p>
          <div v-for="s in salas" :key="s.codigo" class="item">
            <span class="codigo">{{ s.codigo }}</span>
            <div class="flex-grow-1 min-w-0">
              <div class="fw-bold text-truncate">{{ s.anfitrion || 'Mesa' }}</div>
              <div class="small text-soft">
                <span class="chip" :class="s.estado === 'jugando' ? 'chip-gold' : ''">{{ s.estado === 'jugando' ? 'Jugando' : 'Esperando' }}</span>
                {{ s.conectados }} conectado(s)<template v-if="s.bots"> · {{ s.bots }} bot(s)</template>
              </div>
            </div>
            <router-link :to="`/40-Prolipa/practica/${s.codigo}`" class="btn btn-sm btn-outline-light" title="Ver sala"><i class="bi bi-eye"></i></router-link>
            <button class="btn btn-sm btn-outline-danger" :disabled="ocupado" title="Cerrar sala" @click="cerrarUna(s)"><i class="bi bi-x-octagon"></i></button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.login {
  max-width: 440px;
}
.uid {
  background: #111;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  color: #ffd700;
  word-break: break-all;
}
.pestanas .nav-link {
  color: #ddd;
  border-radius: 999px;
}
.pestanas .nav-link.active {
  background: #ffd700;
  color: #111;
  font-weight: 800;
}
.grande {
  font-size: 3rem;
  font-weight: 900;
  color: #ffd700;
  line-height: 1;
}
.pasos li + li {
  margin-top: 0.5rem;
}
.item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0;
  border-top: 1px solid var(--borde);
}
.min-w-0 {
  min-width: 0;
}
.num {
  font-size: 0.75rem;
  font-weight: 800;
  background: #262a35;
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
}
.codigo {
  font-family: monospace;
  font-weight: 800;
  color: #ffd700;
  letter-spacing: 0.1em;
}
.resumen {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.campeon {
  color: #ffd700;
  font-weight: 800;
}
</style>
