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
      <span class="eyebrow"><span class="punto-vivo"></span>En vivo</span>
      <h1>Cuadro del torneo</h1>
      <p>Cuadro de eliminación directa. Se actualiza solo con cada resultado.</p>
    </header>

    <div v-if="cargando" class="text-center py-5"><div class="spinner-border text-warning"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="!torneo?.sorteado" class="panel vacio-estado">
      <div class="icono"><i class="bi bi-hourglass-split"></i></div>
      <h2>El sorteo todavía no se hace</h2>
      <p v-if="torneo">Las inscripciones ya se cerraron con <b>{{ inscritas }}</b> parejas. Pronto se hace el sorteo y aquí verás quién juega contra quién.</p>
      <template v-else>
        <p>Hay <b>{{ inscritas }}</b> parejas inscritas. Cuando cierren las inscripciones aquí verás quién juega contra quién.</p>
        <router-link to="/40-Prolipa/inscripcion" class="btn btn-quito-gold"><i class="bi bi-pencil-square me-1"></i>Inscribir mi pareja</router-link>
      </template>
    </div>

    <template v-else>
      <div v-if="torneo.campeon" class="podio mb-3">
        <div class="lugar primero">
          <i class="bi bi-trophy-fill"></i>
          <div class="min-w-0">
            <div class="etiqueta">Campeones</div>
            <div class="nombre">{{ nombrePareja(torneo, torneo.campeon) }}</div>
          </div>
        </div>
        <div v-if="torneo.subcampeon" class="lugar segundo">
          <span class="medalla">2</span>
          <div class="min-w-0">
            <div class="etiqueta">Subcampeones</div>
            <div class="nombre">{{ nombrePareja(torneo, torneo.subcampeon) }}</div>
          </div>
        </div>
        <div v-if="torneo.tercerLugar" class="lugar tercero">
          <span class="medalla">3</span>
          <div class="min-w-0">
            <div class="etiqueta">Tercer lugar</div>
            <div class="nombre">{{ torneo.tercero ? nombrePareja(torneo, torneo.tercero) : 'Por jugarse' }}</div>
          </div>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-3 small text-soft mb-2 leyenda">
        <span><i class="bi bi-check-circle-fill text-quito-gold me-1"></i>Ganó el partido</span>
        <span><span class="num-ej">5</span> Número de inscripción</span>
        <span class="d-sm-none"><i class="bi bi-arrows me-1"></i>Desliza para ver las rondas</span>
      </div>
      <div class="panel">
        <CuadroTorneo :torneo="torneo" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.podio {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .podio {
    grid-template-columns: 2fr 1fr 1fr;
  }
}
.lugar {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
  padding: 1rem 1.2rem;
  border-radius: var(--radio);
  border: 1px solid var(--borde);
  background: linear-gradient(180deg, var(--superficie-2), var(--superficie));
}
.lugar.primero {
  border-color: rgba(255, 215, 0, 0.6);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(255, 215, 0, 0.03));
}
.lugar.primero > i {
  font-size: 2.6rem;
  color: var(--quito-gold);
}
.etiqueta {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--texto-suave);
}
.nombre {
  font-family: var(--fuente-titulos);
  font-weight: 700;
  font-size: 1.05rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.primero .nombre {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--quito-gold);
}
.medalla {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fuente-titulos);
  font-weight: 800;
  color: #111;
}
.segundo .medalla {
  background: #c9ced6;
}
.tercero .medalla {
  background: #d9a35b;
}
.min-w-0 {
  min-width: 0;
}
.num-ej {
  font-size: 0.68rem;
  font-weight: 800;
  background: #262a35;
  border-radius: 6px;
  padding: 0.05rem 0.35rem;
  color: rgba(255, 255, 255, 0.75);
}
</style>
