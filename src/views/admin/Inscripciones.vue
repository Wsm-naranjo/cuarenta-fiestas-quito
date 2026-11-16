<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import Avatar from '../../components/Avatar.vue'

const swalBase = { background: '#1a1a1a', color: '#fff', confirmButtonColor: '#003DA5' }

const inscripciones = ref([])
const abierta = ref(true)
const totalUsuarios = ref(0)
const usuariosLibres = ref(0)
const cargando = ref(true)
const filtro = ref('todas')

async function cargar() {
  try {
    const { data } = await axios.get('/admin/inscripciones')
    inscripciones.value = data.inscripciones
    abierta.value = data.abierta
    totalUsuarios.value = data.total_usuarios
    usuariosLibres.value = data.usuarios_libres
  } catch (e) {
    Swal.fire({ ...swalBase, icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo cargar' })
  } finally {
    cargando.value = false
  }
}

const confirmadas = computed(() => inscripciones.value.filter((i) => i.estado === 'confirmada'))
const pendientes = computed(() => inscripciones.value.filter((i) => i.estado === 'pendiente'))
const visibles = computed(() =>
  filtro.value === 'todas' ? inscripciones.value : inscripciones.value.filter((i) => i.estado === filtro.value),
)

/* ---------- Crear pareja manual ---------- */
const buscador = ref({ 1: '', 2: '' })
const resultados = ref({ 1: [], 2: [] })
const elegido = ref({ 1: null, 2: null })
const nombrePareja = ref('')
const guardando = ref(false)
const timers = {}

async function buscarUsuarios(slot) {
  const { data } = await axios.get('/admin/inscripciones/usuarios', { params: { q: buscador.value[slot], libres: 1 } })
  const otro = elegido.value[slot === 1 ? 2 : 1]
  resultados.value[slot] = data.usuarios.filter((u) => u.id !== otro?.id).slice(0, 8)
}

watch(
  () => [buscador.value[1], buscador.value[2]],
  ([a, b], [pa, pb]) => {
    ;[
      [1, a, pa],
      [2, b, pb],
    ].forEach(([slot, v, prev]) => {
      if (v === prev) return
      clearTimeout(timers[slot])
      if (!v || v.length < 2) {
        resultados.value[slot] = []
        return
      }
      timers[slot] = setTimeout(() => buscarUsuarios(slot), 250)
    })
  },
)

function elegir(slot, u) {
  elegido.value[slot] = u
  buscador.value[slot] = ''
  resultados.value[slot] = []
}

async function crearPareja() {
  guardando.value = true
  try {
    const { data } = await axios.post('/admin/inscripciones', {
      usuario1_id: elegido.value[1].id,
      usuario2_id: elegido.value[2].id,
      nombre_pareja: nombrePareja.value.trim() || null,
    })
    elegido.value = { 1: null, 2: null }
    nombrePareja.value = ''
    await cargar()
    Swal.fire({ ...swalBase, icon: 'success', title: data.message, toast: true, position: 'top-end', timer: 2200, showConfirmButton: false })
  } catch (e) {
    Swal.fire({ ...swalBase, icon: 'error', title: 'No se pudo inscribir', text: e.response?.data?.message || 'Error' })
  } finally {
    guardando.value = false
  }
}

/* ---------- Acciones ---------- */
async function confirmar(i) {
  await axios.post(`/admin/inscripciones/${i.id}/confirmar`)
  await cargar()
}

async function eliminar(i) {
  const r = await Swal.fire({
    ...swalBase,
    icon: 'warning',
    title: '¿Eliminar inscripción?',
    html: `<b>${i.jugador1.nombre}</b> y <b>${i.jugador2.nombre}</b> quedarán libres.${i.en_torneo ? '<br><small>Ya está en la gestión del torneo: también bórrala allí si hace falta.</small>' : ''}`,
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#E4002B',
  })
  if (!r.isConfirmed) return
  await axios.delete(`/admin/inscripciones/${i.id}`)
  await cargar()
}

async function cambiarFase() {
  const nueva = !abierta.value
  const r = await Swal.fire({
    ...swalBase,
    icon: 'question',
    title: nueva ? '¿Abrir inscripciones?' : '¿Cerrar inscripciones?',
    text: nueva ? 'Los colaboradores podrán volver a inscribirse.' : 'Nadie podrá inscribirse, aceptar ni cancelar desde la página pública.',
    showCancelButton: true,
    confirmButtonText: nueva ? 'Abrir' : 'Cerrar',
    cancelButtonText: 'Volver',
  })
  if (!r.isConfirmed) return
  const { data } = await axios.post('/admin/inscripciones/fase', { abierta: nueva })
  abierta.value = data.abierta
}

async function pasarAlTorneo() {
  const r = await Swal.fire({
    ...swalBase,
    icon: 'question',
    title: 'Pasar parejas al torneo',
    html: `Se crearán las <b>${confirmadas.value.length}</b> parejas confirmadas en <i>Gestión de Parejas</i>.<br><br>
      <label class="d-flex gap-2 align-items-center justify-content-center small">
        <input type="checkbox" id="reemplazar"> Borrar antes las parejas y partidas anteriores (torneo pasado)
      </label>`,
    showCancelButton: true,
    confirmButtonText: 'Pasar al torneo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#FFD700',
    preConfirm: () => document.getElementById('reemplazar').checked,
  })
  if (!r.isConfirmed) return
  if (r.value) {
    const ok = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: '¿Seguro?',
      text: 'Se borrarán TODAS las parejas, jugadores y partidas actuales del torneo. No se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar y pasar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E4002B',
    })
    if (!ok.isConfirmed) return
  }
  try {
    const { data } = await axios.post('/admin/inscripciones/pasar-torneo', { reemplazar: r.value })
    await cargar()
    Swal.fire({ ...swalBase, icon: 'success', title: 'Listo', text: data.message })
  } catch (e) {
    Swal.fire({ ...swalBase, icon: 'error', title: 'Error', text: e.response?.data?.message || 'Error' })
  }
}

function exportarCSV() {
  const filas = [['#', 'Estado', 'Nombre pareja', 'Jugador 1', 'Departamento 1', 'Jugador 2', 'Departamento 2']]
  inscripciones.value.forEach((i, n) =>
    filas.push([n + 1, i.estado, i.nombre_pareja || '', i.jugador1.nombre, i.jugador1.departamento, i.jugador2.nombre, i.jugador2.departamento]),
  )
  const csv = filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'inscripciones-40-prolipa.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—')

onMounted(cargar)
</script>

<template>
  <div class="text-white">
    <!-- Resumen -->
    <div class="row g-3 mb-4">
      <div class="col-md-3 col-6">
        <div class="panel h-100"><div class="small text-soft">Confirmadas</div><div class="fs-2 fw-bold text-quito-gold">{{ confirmadas.length }}</div></div>
      </div>
      <div class="col-md-3 col-6">
        <div class="panel h-100"><div class="small text-soft">Pendientes</div><div class="fs-2 fw-bold">{{ pendientes.length }}</div></div>
      </div>
      <div class="col-md-3 col-6">
        <div class="panel h-100"><div class="small text-soft">Colaboradores libres</div><div class="fs-2 fw-bold">{{ usuariosLibres }} <small class="fs-6 text-soft">/ {{ totalUsuarios }}</small></div></div>
      </div>
      <div class="col-md-3 col-6">
        <div class="panel h-100 d-flex flex-column justify-content-between">
          <div class="small text-soft">Fase de inscripción</div>
          <button class="btn btn-sm mt-1" :class="abierta ? 'btn-success' : 'btn-secondary'" @click="cambiarFase">
            <i class="bi" :class="abierta ? 'bi-unlock-fill' : 'bi-lock-fill'"></i>
            {{ abierta ? 'Abierta — cerrar' : 'Cerrada — abrir' }}
          </button>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <!-- Crear pareja -->
      <div class="col-xl-4">
        <div class="panel panel-gold form-dark">
          <h2 class="h6 mb-3"><i class="bi bi-person-plus-fill text-quito-gold me-2"></i>Inscribir pareja manualmente</h2>
          <p class="small text-soft">Para quienes no pueden ingresar. Queda confirmada de inmediato.</p>

          <div v-for="slot in [1, 2]" :key="slot" class="mb-3 position-relative">
            <label class="form-label">Jugador {{ slot }}</label>
            <div v-if="elegido[slot]" class="d-flex align-items-center gap-2 elegido">
              <Avatar :usuario="elegido[slot]" size="sm" />
              <div class="flex-grow-1 min-w-0">
                <div class="fw-semibold text-truncate">{{ elegido[slot].nombre }}</div>
                <div class="small text-soft">{{ elegido[slot].departamento }}</div>
              </div>
              <button class="btn btn-sm btn-outline-light" aria-label="Quitar" @click="elegido[slot] = null"><i class="bi bi-x"></i></button>
            </div>
            <template v-else>
              <input v-model="buscador[slot]" class="form-control" placeholder="Escribe al menos 2 letras…" :aria-label="'Buscar jugador ' + slot" />
              <div v-if="resultados[slot].length" class="sugerencias">
                <button v-for="u in resultados[slot]" :key="u.id" type="button" class="sug" @click="elegir(slot, u)">
                  <Avatar :usuario="u" size="sm" />
                  <span class="text-start min-w-0">
                    <span class="d-block text-truncate">{{ u.nombre }}</span>
                    <span class="d-block small text-soft">{{ u.departamento }}</span>
                  </span>
                </button>
              </div>
            </template>
          </div>

          <label class="form-label">Nombre de la pareja (opcional)</label>
          <input v-model="nombrePareja" maxlength="60" class="form-control mb-3" />
          <button class="btn btn-quito-gold w-100" :disabled="!elegido[1] || !elegido[2] || guardando" @click="crearPareja">
            <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>Inscribir pareja
          </button>
        </div>

        <div class="panel mt-3">
          <h2 class="h6"><i class="bi bi-diagram-3-fill text-quito-gold me-2"></i>Siguiente fase</h2>
          <p class="small text-soft">Cuando cierres la inscripción, pasa las parejas confirmadas a la gestión del torneo para generar las llaves.</p>
          <button class="btn btn-outline-warning w-100 mb-2" :disabled="!confirmadas.length" @click="pasarAlTorneo">
            <i class="bi bi-box-arrow-in-right me-1"></i>Pasar {{ confirmadas.length }} parejas al torneo
          </button>
          <button class="btn btn-outline-light w-100 btn-sm" :disabled="!inscripciones.length" @click="exportarCSV">
            <i class="bi bi-download me-1"></i>Exportar lista (CSV)
          </button>
        </div>
      </div>

      <!-- Lista -->
      <div class="col-xl-8">
        <div class="panel">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 class="h6 mb-0">Inscripciones</h2>
            <div class="btn-group btn-group-sm" role="group" aria-label="Filtro">
              <button class="btn" :class="filtro === 'todas' ? 'btn-light' : 'btn-outline-light'" @click="filtro = 'todas'">Todas ({{ inscripciones.length }})</button>
              <button class="btn" :class="filtro === 'confirmada' ? 'btn-light' : 'btn-outline-light'" @click="filtro = 'confirmada'">Confirmadas</button>
              <button class="btn" :class="filtro === 'pendiente' ? 'btn-light' : 'btn-outline-light'" @click="filtro = 'pendiente'">Pendientes</button>
            </div>
          </div>

          <div v-if="cargando" class="text-center py-4"><div class="spinner-border text-warning"></div></div>
          <div v-else-if="!visibles.length" class="text-center text-soft py-5">No hay inscripciones todavía.</div>
          <div v-else class="table-responsive">
            <table class="table table-dark table-hover align-middle mb-0 tabla">
              <thead>
                <tr><th>Pareja</th><th>Jugadores</th><th>Estado</th><th class="text-end">Acciones</th></tr>
              </thead>
              <tbody>
                <tr v-for="i in visibles" :key="i.id">
                  <td>
                    <div class="fw-bold">{{ i.nombre_pareja || 'Sin nombre' }}</div>
                    <div class="small text-soft">{{ i.creado_por === 'admin' ? 'Inscrita por admin' : 'Por ' + i.jugador1.nombre_corto }} · {{ fecha(i.created_at) }}</div>
                  </td>
                  <td>
                    <div v-for="j in [i.jugador1, i.jugador2]" :key="j.id" class="d-flex align-items-center gap-2 py-1">
                      <Avatar :usuario="j" size="sm" />
                      <div class="min-w-0">
                        <div class="small fw-semibold text-truncate">{{ j.nombre }}</div>
                        <div class="small text-soft">{{ j.departamento }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span v-if="i.estado === 'pendiente'" class="chip chip-amber">Pendiente</span>
                    <span v-else class="chip chip-green">Confirmada</span>
                    <span v-if="i.en_torneo" class="chip chip-gold mt-1">En torneo</span>
                  </td>
                  <td class="text-end text-nowrap">
                    <button v-if="i.estado === 'pendiente'" class="btn btn-sm btn-success me-1" title="Confirmar" @click="confirmar(i)"><i class="bi bi-check-lg"></i></button>
                    <button class="btn btn-sm btn-outline-danger" title="Eliminar" @click="eliminar(i)"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabla {
  --bs-table-bg: transparent;
}
.min-w-0 {
  min-width: 0;
}
.elegido {
  background: #101010;
  border: 1px solid #ffd700;
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
}
.sugerencias {
  position: absolute;
  z-index: 10;
  left: 0;
  right: 0;
  background: #101010;
  border: 1px solid #444;
  border-radius: 10px;
  margin-top: 4px;
  max-height: 280px;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
}
.sug {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  background: none;
  border: 0;
  border-bottom: 1px solid #222;
  padding: 0.45rem 0.6rem;
  color: #fff;
}
.sug:hover {
  background: #1d1d1d;
}
</style>
