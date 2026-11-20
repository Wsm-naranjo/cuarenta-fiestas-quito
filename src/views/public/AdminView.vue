<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Swal from 'sweetalert2'
import CuadroTorneo from '../../components/CuadroTorneo.vue'
import { escucharSesion, entrar, salir } from '../../online/admin'
import { escucharParejas } from '../../online/inscripciones'
import { escucharTorneo, comenzarTorneo, guardarResultado, deshacerResultado, reiniciarTorneo, nombrePareja } from '../../online/torneo'
import { tamano, dependientes } from '../../torneo/cuadro'
import { ref as dbRef, remove } from 'firebase/database'
import { db } from '../../firebase'

const OSCURO = { background: '#1a1a1a', color: '#fff', confirmButtonColor: '#003da5' }

const sesion = ref({ cargando: true, usuario: null, esAdmin: false })
const correo = ref('')
const clave = ref('')
const entrando = ref(false)
const parejas = ref([])
const torneo = ref(null)
const ocupado = ref(false)
const offs = []

onMounted(() => {
  offs.push(escucharSesion((s) => (sesion.value = { cargando: false, ...s })))
  offs.push(escucharParejas((l) => (parejas.value = l)))
  offs.push(escucharTorneo((t) => (torneo.value = t)))
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
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'UID copiado', timer: 1500, showConfirmButton: false, ...OSCURO })
}

async function hacer(fn) {
  ocupado.value = true
  try {
    await fn()
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

/* ---------- Antes del sorteo ---------- */
const info = computed(() => (parejas.value.length >= 2 ? tamano(parejas.value.length) : null))

async function borrarPareja(p) {
  const r = await Swal.fire({
    icon: 'warning',
    title: '¿Borrar esta pareja?',
    text: `#${p.numero} ${p.jugador1.nombre} y ${p.jugador2.nombre}. Podrán volver a inscribirse.`,
    showCancelButton: true,
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar',
    ...OSCURO,
    confirmButtonColor: '#e4002b',
  })
  if (r.isConfirmed) hacer(() => remove(dbRef(db, `inscripciones/${p.id}`)))
}

async function sortear() {
  const n = parejas.value.length
  const { tamano: t, pases } = info.value
  const r = await Swal.fire({
    icon: 'question',
    title: '¿Sortear y comenzar el torneo?',
    html:
      `<p>${n} parejas · cuadro de ${t}.</p>` +
      (pases ? `<p><b>${pases}</b> pareja(s) sacan <b>pase libre</b> a la 2.ª ronda por sorteo (las parejas no son potencia de 2).</p>` : '') +
      '<p class="small">Las inscripciones se cierran. Las parejas que se inscriban después no entran al cuadro.</p>',
    showCancelButton: true,
    confirmButtonText: 'Sortear',
    cancelButtonText: 'Cancelar',
    ...OSCURO,
  })
  if (r.isConfirmed) hacer(() => comenzarTorneo(parejas.value))
}

/* ---------- Torneo en curso ---------- */
const jugados = computed(() => torneo.value?.rondas.flatMap((r) => r.partidos).filter((p) => p.listo && p.resultado).length || 0)
const totalPartidos = computed(() => torneo.value?.rondas.flatMap((r) => r.partidos).filter((p) => !p.pase).length || 0)
const tardias = computed(() => (torneo.value ? parejas.value.filter((p) => !torneo.value.parejas[p.id]) : []))
const hayResultados = computed(() => !!torneo.value && Object.keys(torneo.value.resultados).length > 0)

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

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
        <input id="pa" type="number" min="0" max="999" placeholder="pts" class="form-control form-control-sm ms-auto" style="width:80px" value="${r?.pa ?? ''}">
      </label>
      <label class="d-flex align-items-center gap-2 p-2 rounded border border-secondary mb-2" style="cursor:pointer">
        <input type="radio" name="g" value="b" ${r?.g === p.b ? 'checked' : ''}> <b>${nb}</b>
        <input id="pb" type="number" min="0" max="999" placeholder="pts" class="form-control form-control-sm ms-auto" style="width:80px" value="${r?.pb ?? ''}">
      </label>
      <label class="d-flex align-items-center gap-2 small"><input id="wo" type="checkbox" ${r?.wo ? 'checked' : ''}> Ganó por W.O. (la otra pareja no se presentó o se retiró)</label>
      <p class="small mt-2 mb-0" style="opacity:.6">Los puntos son opcionales.</p>
    </div>`
  const res = await Swal.fire({
    title: t.rondas[p.ronda].nombre,
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
      const ok = await Swal.fire({
        icon: 'warning',
        title: 'Cambia el cuadro',
        text: `Hay ${dep.length} resultado(s) más adelante que se jugaron con la otra pareja. Se borrarán.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar',
        ...OSCURO,
      })
      if (!ok.isConfirmed) return
      await hacer(() => deshacerResultado('__ninguno__', dep))
    }
    hacer(() => guardarResultado(p, ganador, { pa, pb, wo }))
  } else if (res.isDenied) {
    const dep = dependientes(t.primera, t.resultados, p.key)
    if (dep.length) {
      const ok = await Swal.fire({
        icon: 'warning',
        title: '¿Deshacer?',
        text: `También se borrarán ${dep.length} resultado(s) de rondas siguientes que dependen de este partido.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, deshacer',
        cancelButtonText: 'Cancelar',
        ...OSCURO,
        confirmButtonColor: '#e4002b',
      })
      if (!ok.isConfirmed) return
    }
    hacer(() => deshacerResultado(p.key, dep))
  }
}

async function volverASortear() {
  const r = await Swal.fire({
    icon: 'question',
    title: '¿Volver a sortear?',
    text: 'Se hace un sorteo nuevo con las parejas inscritas ahora (incluye a las que se inscribieron después).',
    showCancelButton: true,
    confirmButtonText: 'Sortear de nuevo',
    cancelButtonText: 'Cancelar',
    ...OSCURO,
  })
  if (r.isConfirmed) hacer(() => comenzarTorneo(parejas.value))
}

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
  if (r.isConfirmed) hacer(reiniciarTorneo)
}

const enlacePublico = computed(() => location.href.split('#')[0] + '#/40-Prolipa/torneo')
</script>

<template>
  <div class="admin">
    <header class="page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
      <div>
        <h1><i class="bi bi-shield-lock me-2"></i>Administración del torneo</h1>
        <p>Sorteo, resultados y cuadro. Lo que cambies aquí se ve al instante en la página pública.</p>
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
      <!-- Etapa de inscripción -->
      <template v-if="!torneo">
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="panel">
              <span class="chip chip-gold mb-2">Inscripciones abiertas</span>
              <div class="grande">{{ parejas.length }}</div>
              <div class="text-soft mb-3">parejas inscritas</div>
              <p v-if="info" class="small">
                Cuadro de <b>{{ info.tamano }}</b>.
                <template v-if="info.pases">Como no es potencia de 2, <b>{{ info.pases }}</b> pareja(s) pasan directo a la 2.ª ronda por sorteo.</template>
                <template v-else>Todas juegan la 1.ª ronda.</template>
              </p>
              <p v-else class="small text-soft">Se necesitan al menos 2 parejas.</p>
              <button class="btn btn-quito-gold w-100 mb-2" :disabled="!info || ocupado" @click="sortear"><i class="bi bi-shuffle me-1"></i>Sortear y comenzar</button>
              <router-link to="/40-Prolipa/inscripcion" class="btn btn-outline-light w-100 btn-sm"><i class="bi bi-plus-lg me-1"></i>Inscribir una pareja</router-link>
            </div>
          </div>
          <div class="col-lg-8">
            <div class="panel">
              <h2 class="h6 mb-3">Parejas inscritas</h2>
              <p v-if="!parejas.length" class="text-soft small mb-0">Nadie se ha inscrito todavía.</p>
              <div v-for="p in parejas" :key="p.id" class="item">
                <span class="num">{{ p.numero }}</span>
                <div class="flex-grow-1 min-w-0">
                  <div class="fw-bold text-truncate">{{ p.jugador1.nombre }} y {{ p.jugador2.nombre }}</div>
                  <div v-if="p.nombre_pareja" class="small text-soft">"{{ p.nombre_pareja }}"</div>
                </div>
                <button class="btn btn-sm btn-outline-danger" :disabled="ocupado" title="Borrar pareja" @click="borrarPareja(p)"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Torneo sorteado -->
      <template v-else>
        <div class="resumen panel mb-3">
          <div>
            <span class="chip" :class="torneo.campeon ? 'chip-gold' : ''">{{ torneo.campeon ? 'Torneo terminado' : 'Torneo en curso' }}</span>
            <div class="mt-2"><b>{{ Object.keys(torneo.parejas).length }}</b> parejas · <b>{{ jugados }}</b> de {{ totalPartidos }} partidos jugados</div>
            <div v-if="torneo.campeon" class="mt-1 campeon"><i class="bi bi-trophy-fill me-1"></i>Campeones: {{ nombrePareja(torneo, torneo.campeon) }}</div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <a :href="enlacePublico" target="_blank" class="btn btn-sm btn-outline-light"><i class="bi bi-box-arrow-up-right me-1"></i>Ver página pública</a>
            <button v-if="!hayResultados" class="btn btn-sm btn-outline-light" :disabled="ocupado" @click="volverASortear"><i class="bi bi-shuffle me-1"></i>Volver a sortear</button>
            <button class="btn btn-sm btn-outline-danger" :disabled="ocupado" @click="reiniciar"><i class="bi bi-arrow-counterclockwise me-1"></i>Reiniciar torneo</button>
          </div>
        </div>

        <div v-if="tardias.length" class="alert alert-warning py-2 small">
          <i class="bi bi-exclamation-triangle me-1"></i>{{ tardias.length }} pareja(s) se inscribieron después del sorteo y no están en el cuadro:
          {{ tardias.map((p) => `${p.jugador1.nombre} y ${p.jugador2.nombre}`).join(' · ') }}.
          <template v-if="!hayResultados"> Usa "Volver a sortear" para incluirlas.</template>
        </div>

        <p class="small text-soft mb-2"><i class="bi bi-hand-index me-1"></i>Toca un partido para marcar quién ganó, poner el marcador, dar un W.O. o deshacer.</p>
        <div class="panel">
          <CuadroTorneo :torneo="torneo" editable @elegir="elegir" />
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
.grande {
  font-size: 3rem;
  font-weight: 900;
  color: #ffd700;
  line-height: 1;
}
.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-top: 1px solid #262626;
}
.min-w-0 {
  min-width: 0;
}
.num {
  font-size: 0.75rem;
  font-weight: 800;
  background: #2a2a2a;
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
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
