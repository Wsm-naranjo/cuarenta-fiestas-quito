<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import CuadroTorneo from '../../components/CuadroTorneo.vue'
import { escucharTorneo, nombrePareja } from '../../online/torneo'
import { escucharParejas } from '../../online/inscripciones'

const torneo = ref(null)
const cargando = ref(true)
const error = ref('')
const inscritas = ref(0)
const offs = []

onMounted(() => {
  offs.push(
    escucharTorneo(
      (t) => {
        torneo.value = t
        cargando.value = false
      },
      () => {
        error.value = 'No se pudo cargar el torneo. Revisa tu conexión.'
        cargando.value = false
      },
    ),
  )
  offs.push(escucharParejas((l) => (inscritas.value = l.length)))
})
onUnmounted(() => offs.forEach((f) => f?.()))
</script>

<template>
  <div>
    <header class="page-head">
      <h1><i class="bi bi-trophy me-2"></i>Torneo</h1>
      <p>Cuadro de eliminación directa. Se actualiza solo con cada resultado.</p>
    </header>

    <div v-if="cargando" class="text-center py-5"><div class="spinner-border text-warning"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="!torneo" class="panel text-center py-5">
      <i class="bi bi-hourglass-split display-5 text-warning"></i>
      <h2 class="h4 mt-3">El sorteo todavía no se hace</h2>
      <p class="text-soft">Hay <b>{{ inscritas }}</b> parejas inscritas. Cuando cierren las inscripciones aquí verás quién juega contra quién.</p>
      <router-link to="/40-Prolipa/inscripcion" class="btn btn-quito-gold"><i class="bi bi-pencil-square me-1"></i>Inscribir mi pareja</router-link>
    </div>

    <template v-else>
      <div v-if="torneo.campeon" class="campeones panel mb-3">
        <i class="bi bi-trophy-fill"></i>
        <div>
          <div class="small text-uppercase fw-bold">Campeones del torneo</div>
          <div class="nombre">{{ nombrePareja(torneo, torneo.campeon) }}</div>
          <div v-if="torneo.subcampeon" class="small text-soft">Subcampeones: {{ nombrePareja(torneo, torneo.subcampeon) }}</div>
        </div>
      </div>
      <div class="panel">
        <CuadroTorneo :torneo="torneo" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.campeones {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 2px solid #ffd700;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), transparent);
}
.campeones i {
  font-size: 3rem;
  color: #ffd700;
}
.campeones .nombre {
  font-size: 1.5rem;
  font-weight: 900;
  color: #ffd700;
}
</style>
