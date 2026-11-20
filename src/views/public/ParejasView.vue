<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import BuscadorPersona from '../../components/BuscadorPersona.vue'
import ParejaCard from '../../components/ParejaCard.vue'
import { usuarios as cargarUsuarios, escucharParejas, inscribir } from '../../online/inscripciones'
import { escucharTorneo } from '../../online/torneo'

// ---------- Datos ----------
const usuarios = ref([])
const parejas = ref([])
const cargando = ref(true)
const errorCarga = ref('')
const errorUsuarios = ref('')
const cerradas = ref(false) // el administrador cerró las inscripciones (o ya hay sorteo)
const conCuadro = ref(false) // ya hay sorteo
let offParejas = null
let offTorneo = null

// ---------- Inscripción ----------
const yo = ref(null)
const companero = ref(null)
const nombrePareja = ref('')
const enviando = ref(false)
const error = ref('')
const recienInscrita = ref(false)

/** id de persona → pareja en la que está */
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
    recienInscrita.value = true
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
  recienInscrita.value = false
  error.value = ''
}

async function verEnLista() {
  filtro.value = ''
  depto.value = ''
  await nextTick()
  document.getElementById('pareja-' + miPareja.value?.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ---------- Lista ----------
const filtro = ref('')
const depto = ref('')
const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const departamentos = computed(() => {
  const set = new Set()
  parejas.value.forEach((p) => {
    set.add(p.jugador1.departamento)
    set.add(p.jugador2.departamento)
  })
  return [...set].filter(Boolean).sort()
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

onMounted(async () => {
  offTorneo = escucharTorneo((t) => {
    cerradas.value = !!t
    conCuadro.value = !!t?.sorteado
  })
  offParejas = escucharParejas(
    (lista) => {
      parejas.value = lista
      cargando.value = false
      errorCarga.value = ''
    },
    () => {
      errorCarga.value = 'No se pudieron cargar las parejas. Revisa tu conexión.'
      cargando.value = false
    },
  )
  try {
    usuarios.value = await cargarUsuarios()
  } catch {
    errorUsuarios.value = 'No se pudo cargar la lista de colaboradores. Recarga la página.'
  }
})
onUnmounted(() => {
  offParejas?.()
  offTorneo?.()
})
</script>

<template>
  <div>
    <header class="page-head">
      <span class="eyebrow"><i class="bi bi-people-fill"></i>Inscripción y parejas</span>
      <h1>Parejas del torneo</h1>
      <p v-if="!cerradas">Inscribe a tu pareja aquí mismo y mira quiénes ya están anotados. La lista se actualiza sola.</p>
      <p v-else>Estas son las parejas que juegan el torneo.</p>
    </header>

    <div v-if="cargando" class="text-center py-5"><div class="spinner-border text-warning"></div></div>
    <div v-else-if="errorCarga" class="alert alert-danger">{{ errorCarga }}</div>

    <template v-else>
      <!-- ===== Inscripción ===== -->
      <section class="mb-4" aria-labelledby="titulo-inscribir">
        <!-- Ya inscrito -->
        <div v-if="miPareja" class="panel panel-gold resultado">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <i class="bi fs-1" :class="recienInscrita ? 'bi-check-circle-fill text-success' : 'bi-info-circle-fill text-quito-gold'"></i>
            <div class="flex-grow-1 min-w-0">
              <h2 id="titulo-inscribir" class="h5 mb-1">{{ recienInscrita ? '¡Pareja inscrita!' : 'Ya estás inscrito' }}</h2>
              <p class="text-soft small mb-0">{{ yo.nombre }} juega en la pareja #{{ miPareja.numero }}. ¿Hay un error? Pide al organizador que lo corrija.</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-quito-gold btn-sm" @click="verEnLista"><i class="bi bi-arrow-down me-1"></i>Verla en la lista</button>
              <button v-if="!cerradas" class="btn btn-outline-light btn-sm" @click="otraPersona">Inscribir a otra persona</button>
            </div>
          </div>
        </div>

        <!-- Inscripciones cerradas -->
        <div v-else-if="cerradas" class="panel cerradas">
          <i class="bi bi-lock-fill"></i>
          <div class="flex-grow-1">
            <h2 id="titulo-inscribir" class="h6 mb-1">Inscripciones cerradas</h2>
            <p class="small text-soft mb-0">{{ conCuadro ? 'El sorteo ya se hizo y el torneo está en marcha.' : 'Ya no se aceptan más parejas. Pronto se hace el sorteo.' }}</p>
          </div>
          <router-link to="/40-Prolipa/torneo" class="btn btn-quito-gold btn-sm"><i class="bi bi-trophy me-1"></i>Ver el cuadro</router-link>
        </div>

        <!-- Formulario -->
        <form v-else class="panel form-dark" @submit.prevent="enviar">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 id="titulo-inscribir" class="h5 mb-0"><i class="bi bi-pencil-square text-quito-gold me-2"></i>Inscribe a tu pareja</h2>
            <span class="chip chip-gold"><span class="punto-vivo"></span>Inscripciones abiertas</span>
          </div>
          <div v-if="errorUsuarios" class="alert alert-danger">{{ errorUsuarios }}</div>
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

          <div class="d-flex flex-wrap align-items-center gap-3 mt-4">
            <button class="btn btn-quito-gold btn-lg flex-grow-1" :disabled="!yo || !companero || enviando">
              <span v-if="enviando" class="spinner-border spinner-border-sm me-2"></span>Inscribir pareja
            </button>
          </div>
          <p class="small text-soft mt-2 mb-0">Cada persona puede estar en una sola pareja.</p>
        </form>
      </section>

      <!-- ===== Lista ===== -->
      <section aria-labelledby="titulo-lista">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 id="titulo-lista" class="h5 mb-0">Parejas inscritas</h2>
          <span class="chip chip-gold">
            {{ filtro || depto ? `${visibles.length} de ${parejas.length}` : parejas.length }} {{ parejas.length === 1 ? 'pareja' : 'parejas' }}
            <template v-if="usuarios.length"> · {{ usuarios.length }} colaboradores</template>
          </span>
        </div>

        <div v-if="!parejas.length" class="panel vacio-estado">
          <div class="icono"><i class="bi bi-people"></i></div>
          <h2>Todavía no hay parejas</h2>
          <p>{{ cerradas ? 'No se inscribió ninguna pareja.' : '¡Sé el primero! Llena el formulario de arriba con tu compañero.' }}</p>
        </div>

        <template v-else>
          <div class="row g-2 mb-3 form-dark">
            <div class="col-md-7">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input v-model="filtro" class="form-control" placeholder="Buscar jugador o nombre de pareja…" aria-label="Buscar pareja" />
              </div>
            </div>
            <div class="col-md-5">
              <select v-model="depto" class="form-select" aria-label="Filtrar por departamento">
                <option value="">Todos los departamentos</option>
                <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
          </div>

          <div v-if="!visibles.length" class="panel vacio-estado">
            <div class="icono"><i class="bi bi-search"></i></div>
            <h2>Sin coincidencias</h2>
            <p>Ninguna pareja coincide con la búsqueda. Prueba con otro nombre o quita el filtro de departamento.</p>
            <button class="btn btn-outline-light" @click="((filtro = ''), (depto = ''))">Limpiar búsqueda</button>
          </div>
          <div v-else class="row g-3">
            <div v-for="p in visibles" :id="'pareja-' + p.id" :key="p.id" class="col-sm-6 col-lg-4 col-xxl-3">
              <ParejaCard :pareja="p" :resaltar="miPareja?.id === p.id" />
            </div>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.espera-paso {
  border: 1px dashed var(--borde-fuerte);
  border-radius: 12px;
  padding: 0.75rem 1rem;
}
.cerradas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.cerradas > i {
  font-size: 1.6rem;
  color: #f0b44c;
}
.min-w-0 {
  min-width: 0;
}
</style>
