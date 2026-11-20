<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BuscadorPersona from '../../components/BuscadorPersona.vue'
import ParejaCard from '../../components/ParejaCard.vue'
import { usuarios as cargarUsuarios, escucharParejas, inscribir } from '../../online/inscripciones'
import { escucharTorneo } from '../../online/torneo'

const usuarios = ref([])
const parejas = ref([])
const cargando = ref(true)
const errorCarga = ref('')

const yo = ref(null)
const companero = ref(null)
const nombrePareja = ref('')
const enviando = ref(false)
const error = ref('')
const recienInscrita = ref(null)
let dejarDeEscuchar = null
const sorteado = ref(false) // ya se hizo el sorteo: inscripciones cerradas
let offTorneo = null

/** id → pareja en la que está */
const parejaDe = computed(() => {
  const m = new Map()
  parejas.value.forEach((p) => {
    m.set(p.jugador1.id, p)
    m.set(p.jugador2.id, p)
  })
  return m
})
const inscritos = computed(() => new Map([...parejaDe.value.keys()].map((id) => [id, true])))
const miPareja = computed(() => (yo.value ? parejaDe.value.get(yo.value.id) || null : null))

async function enviar() {
  error.value = ''
  enviando.value = true
  try {
    await inscribir(yo.value, companero.value, nombrePareja.value)
    recienInscrita.value = yo.value.id
    companero.value = null
    nombrePareja.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    enviando.value = false
  }
}

function otraPersona() {
  yo.value = null
  companero.value = null
  recienInscrita.value = null
  error.value = ''
}

onMounted(async () => {
  offTorneo = escucharTorneo((t) => (sorteado.value = !!t))
  try {
    usuarios.value = await cargarUsuarios()
    dejarDeEscuchar = escucharParejas(
      (lista) => {
        parejas.value = lista
        cargando.value = false
      },
      () => {
        errorCarga.value = 'No se pudo conectar con la base de datos.'
        cargando.value = false
      },
    )
  } catch {
    errorCarga.value = 'No se pudo cargar la lista de colaboradores.'
    cargando.value = false
  }
})
onUnmounted(() => {
  dejarDeEscuchar?.()
  offTorneo?.()
})
</script>

<template>
  <div class="inscripcion">
    <header class="page-head">
      <h1>Inscribe a tu pareja</h1>
      <p>Busca tu nombre en la lista de colaboradores Prolipa y elige a tu compañero. Cada persona puede estar en una sola pareja.</p>
    </header>

    <div v-if="cargando" class="text-center py-5"><div class="spinner-border text-warning"></div></div>
    <div v-else-if="errorCarga" class="alert alert-danger">{{ errorCarga }}</div>

    <template v-else>
      <!-- Ya inscrito -->
      <div v-if="miPareja" class="panel panel-gold resultado">
        <div class="text-center mb-3">
          <i class="bi display-5" :class="recienInscrita === yo.id ? 'bi-check-circle-fill text-success' : 'bi-info-circle-fill text-quito-gold'"></i>
          <h2 class="h4 mt-2 mb-1">{{ recienInscrita === yo.id ? '¡Pareja inscrita!' : 'Ya estás inscrito' }}</h2>
          <p class="text-soft mb-0">{{ yo.nombre }} juega en esta pareja:</p>
        </div>
        <div class="tarjeta"><ParejaCard :pareja="miPareja" resaltar /></div>
        <div class="d-flex flex-wrap gap-2 justify-content-center mt-3">
          <router-link to="/40-Prolipa/parejas" class="btn btn-quito-gold">Ver todas las parejas</router-link>
          <button class="btn btn-outline-light" @click="otraPersona">Inscribir a otra persona</button>
        </div>
        <p class="small text-soft text-center mt-3 mb-0">¿Hay un error? Pide al organizador que lo corrija.</p>
      </div>

      <!-- Sorteo hecho: ya no se puede inscribir -->
      <div v-else-if="sorteado" class="panel text-center py-5">
        <i class="bi bi-lock-fill display-5 text-warning"></i>
        <h2 class="h4 mt-3">Inscripciones cerradas</h2>
        <p class="text-soft">El sorteo ya se hizo y el torneo está en marcha.</p>
        <router-link to="/40-Prolipa/torneo" class="btn btn-quito-gold"><i class="bi bi-trophy me-1"></i>Ver el cuadro del torneo</router-link>
      </div>

      <!-- Formulario -->
      <form v-else class="panel form-dark" @submit.prevent="enviar">
        <div class="row g-4">
          <div class="col-lg-6">
            <BuscadorPersona id="yo" v-model="yo" etiqueta="1. ¿Quién eres?" :usuarios="usuarios" :inscritos="new Map()" />
          </div>
          <div class="col-lg-6">
            <BuscadorPersona
              v-if="yo"
              id="companero"
              v-model="companero"
              etiqueta="2. ¿Con quién juegas?"
              placeholder="Nombre y apellido de tu compañero"
              :usuarios="usuarios"
              :inscritos="inscritos"
              :excluir-id="yo.id"
            />
            <div v-else class="espera-paso">
              <span class="form-label d-block">2. ¿Con quién juegas?</span>
              <div class="text-soft small">Primero busca tu nombre.</div>
            </div>
          </div>
        </div>

        <div v-if="yo && companero" class="mt-4">
          <label class="form-label" for="nombre-pareja">Nombre de la pareja <span class="text-soft fw-normal">(opcional)</span></label>
          <input id="nombre-pareja" v-model="nombrePareja" class="form-control" maxlength="40" placeholder="Ej: Los Chullas" />
        </div>

        <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>

        <button class="btn btn-quito-gold btn-lg w-100 mt-4" :disabled="!yo || !companero || enviando">
          <span v-if="enviando" class="spinner-border spinner-border-sm me-2"></span>Inscribir pareja
        </button>
      </form>

      <p class="small text-soft mt-3">{{ parejas.length }} pareja(s) inscritas de {{ usuarios.length }} colaboradores.</p>
    </template>
  </div>
</template>

<style scoped>
.resultado .tarjeta {
  max-width: 460px;
  margin: 0 auto;
}
.espera-paso {
  border: 1px dashed #3a3a3a;
  border-radius: 12px;
  padding: 0.75rem 1rem;
}
</style>
