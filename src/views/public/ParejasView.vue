<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ParejaCard from '../../components/ParejaCard.vue'
import { escucharParejas } from '../../online/inscripciones'
import { escucharTorneo } from '../../online/torneo'

const parejas = ref([])
const cargando = ref(true)
const error = ref('')
const filtro = ref('')
const depto = ref('')
let dejarDeEscuchar = null

const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const departamentos = computed(() => {
  const set = new Set()
  parejas.value.forEach((p) => {
    set.add(p.jugador1.departamento)
    set.add(p.jugador2.departamento)
  })
  return [...set].sort()
})

const visibles = computed(() => {
  const f = normalizar(filtro.value)
  return parejas.value.filter((p) => {
    const texto = normalizar([p.nombre_pareja, p.jugador1.nombre, p.jugador2.nombre].join(' '))
    const okTexto = !f || texto.includes(f)
    const okDepto = !depto.value || p.jugador1.departamento === depto.value || p.jugador2.departamento === depto.value
    return okTexto && okDepto
  })
})

onMounted(() => {
  dejarDeEscuchar = escucharParejas(
    (lista) => {
      parejas.value = lista
      cargando.value = false
      error.value = ''
    },
    () => {
      error.value = 'No se pudieron cargar las parejas. Revisa tu conexión.'
      cargando.value = false
    },
  )
})
onUnmounted(() => {
  dejarDeEscuchar?.()
  offTorneo?.()
})

// Si el administrador cerró las inscripciones, no se ofrece inscribirse
const cerradas = ref(false)
const offTorneo = escucharTorneo((t) => (cerradas.value = !!t))
</script>

<template>
  <div>
    <header class="page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
      <div>
        <span class="eyebrow"><i class="bi bi-people-fill"></i>Torneo de 40</span>
        <h1>Parejas formadas</h1>
        <p>La lista se actualiza sola en cuanto alguien se inscribe.</p>
      </div>
      <router-link v-if="!cerradas" to="/40-Prolipa/inscripcion" class="btn btn-quito-gold"><i class="bi bi-plus-lg me-1"></i>Inscribir mi pareja</router-link>
    </header>

    <div class="panel mb-4 form-dark">
      <div class="row g-2 align-items-center">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input v-model="filtro" class="form-control" placeholder="Buscar jugador o nombre de pareja…" aria-label="Buscar pareja" />
          </div>
        </div>
        <div class="col-md-4">
          <select v-model="depto" class="form-select" aria-label="Filtrar por departamento">
            <option value="">Todos los departamentos</option>
            <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="col-md-2 text-md-end">
          <span class="chip chip-gold">{{ visibles.length }} / {{ parejas.length }} parejas</span>
        </div>
      </div>
    </div>

    <div v-if="cargando" class="text-center py-5"><div class="spinner-border text-warning"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="!parejas.length" class="panel vacio-estado">
      <div class="icono"><i class="bi bi-people"></i></div>
      <h2>Todavía no hay parejas inscritas</h2>
      <p>¡Sé el primero! Inscríbete con tu compañero de Prolipa.</p>
      <router-link v-if="!cerradas" to="/40-Prolipa/inscripcion" class="btn btn-quito-gold"><i class="bi bi-pencil-square me-1"></i>Inscribirme</router-link>
    </div>
    <div v-else-if="!visibles.length" class="panel vacio-estado">
      <div class="icono"><i class="bi bi-search"></i></div>
      <h2>Sin coincidencias</h2>
      <p>Ninguna pareja coincide con la búsqueda. Prueba con otro nombre o quita el filtro de departamento.</p>
      <button class="btn btn-outline-light" @click="((filtro = ''), (depto = ''))">Limpiar búsqueda</button>
    </div>
    <div v-else class="row g-3">
      <div v-for="p in visibles" :key="p.id" class="col-sm-6 col-lg-4 col-xxl-3">
        <ParejaCard :pareja="p" />
      </div>
    </div>
  </div>
</template>
