<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { nombreGuardado, guardarNombre } from '../../composables/identidad'
import { crearSala, iniciarSala, unirseSala, escucharLobby } from '../../online/salas'

const router = useRouter()

const nombre = ref(nombreGuardado())
const nivel = ref('normal')
const codigo = ref('')
const salas = ref([]) // en espera
const enCurso = ref([])
const jugadores = ref(0)
const ocupado = ref(false)
let dejarDeEscuchar = null

watch(nombre, (n) => guardarNombre(n.trim()))

const NIVELES = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' }

function errorAlerta(e) {
  Swal.fire({ icon: 'error', title: 'Ups', text: e?.message || 'No se pudo conectar.', background: '#1a1a1a', color: '#fff' })
}

function validarNombre() {
  if (nombre.value.trim()) return true
  Swal.fire({ icon: 'info', title: 'Escribe tu nombre', text: 'Así te verán los demás en la mesa.', background: '#1a1a1a', color: '#fff' })
  return false
}

async function crear(soloContraMaquina) {
  if (!validarNombre() || ocupado.value) return
  ocupado.value = true
  try {
    const cod = await crearSala({ nombre: nombre.value.trim(), nivel: nivel.value })
    if (soloContraMaquina) await iniciarSala(cod)
    router.push(`/40-Prolipa/practica/${cod}`)
  } catch (e) {
    errorAlerta(e)
  } finally {
    ocupado.value = false
  }
}

async function unirse(cod) {
  cod = String(cod || '').trim().toUpperCase()
  if (!cod || !validarNombre() || ocupado.value) return
  ocupado.value = true
  try {
    await unirseSala(cod, nombre.value.trim())
    router.push(`/40-Prolipa/practica/${cod}`)
  } catch (e) {
    errorAlerta(e)
  } finally {
    ocupado.value = false
  }
}

onMounted(() => {
  dejarDeEscuchar = escucharLobby((r) => {
    salas.value = r.espera
    enCurso.value = r.jugando
    jugadores.value = r.jugadores
  })
})
onUnmounted(() => dejarDeEscuchar?.())
</script>

<template>
  <div class="lobby">
    <header class="mb-4">
      <h1 class="h3 fw-bold mb-1">Practica el 40</h1>
      <p class="text-soft mb-0">Juega solo contra la máquina o crea una sala para jugar con tus compañeros (2 vs 2). Los asientos vacíos los juega la máquina.</p>
    </header>

    <div class="row g-4">
    <div class="col-lg-7">
    <div class="panel mb-3 form-dark">
      <div class="row g-2 align-items-end">
        <div class="col-sm-7">
          <label class="form-label" for="nombre">Tu nombre en la mesa</label>
          <input id="nombre" v-model="nombre" maxlength="30" class="form-control" placeholder="Ej: Sebas" />
        </div>
        <div class="col-sm-5">
          <label class="form-label" for="nivel">Dificultad de la máquina</label>
          <select id="nivel" v-model="nivel" class="form-select">
            <option v-for="(t, k) in NIVELES" :key="k" :value="k">{{ t }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-6">
        <button class="opcion-grande" :disabled="ocupado" @click="crear(true)">
          <i class="bi bi-robot"></i>
          <span class="t">Jugar contra la máquina</span>
          <span class="d">Empieza ya: tu pareja y los rivales son bots.</span>
        </button>
      </div>
      <div class="col-md-6">
        <button class="opcion-grande dorada" :disabled="ocupado" @click="crear(false)">
          <i class="bi bi-people-fill"></i>
          <span class="t">Crear sala con amigos</span>
          <span class="d">Comparte el código y espera a que entren.</span>
        </button>
      </div>
    </div>

    <div class="panel mb-3 form-dark">
      <label class="form-label" for="codigo">¿Te pasaron un código?</label>
      <form class="d-flex gap-2" @submit.prevent="unirse(codigo)">
        <input id="codigo" v-model="codigo" maxlength="5" class="form-control text-uppercase codigo" placeholder="ABCDE" />
        <button class="btn btn-quito-gold px-4" :disabled="ocupado || codigo.trim().length < 5">Entrar</button>
      </form>
    </div>

    </div>
    <div class="col-lg-5">
    <div class="panel h-100">
      <div class="contadores mb-3">
        <div><span class="n">{{ jugadores }}</span><span class="l">jugadores conectados</span></div>
        <div><span class="n">{{ enCurso.length }}</span><span class="l">partidas en curso</span></div>
        <div><span class="n">{{ salas.length }}</span><span class="l">salas esperando</span></div>
      </div>
      <h2 class="h6 mb-3">Salas esperando jugadores</h2>
      <p v-if="!salas.length" class="text-soft small mb-0">No hay salas abiertas ahora. ¡Crea una!</p>
      <div v-for="s in salas" :key="s.codigo" class="sala-item">
        <div>
          <div class="fw-bold">Sala de {{ s.anfitrion }} <span class="chip ms-1">{{ s.codigo }}</span></div>
          <div class="small text-soft">{{ s.jugadores }} jugador(es) · {{ s.libres }} asiento(s) libre(s) · {{ NIVELES[s.nivel] }}</div>
        </div>
        <button class="btn btn-sm btn-outline-light" :disabled="ocupado" @click="unirse(s.codigo)">Unirme</button>
      </div>

      <template v-if="enCurso.length">
        <h2 class="h6 mt-4 mb-3">Partidas en curso</h2>
        <div v-for="s in enCurso" :key="s.codigo" class="sala-item">
          <div>
            <div class="fw-bold">Mesa de {{ s.anfitrion }} <span class="chip ms-1">{{ s.codigo }}</span></div>
            <div class="small text-soft">
              <i class="bi bi-circle-fill text-success" style="font-size: 0.5rem"></i> {{ s.conectados }} conectado(s)
              <template v-if="s.bots"> · {{ s.bots }} bot(s)</template> · {{ NIVELES[s.nivel] }}
            </div>
          </div>
          <button class="btn btn-sm btn-outline-light" @click="router.push(`/40-Prolipa/practica/${s.codigo}`)">Ver</button>
        </div>
      </template>
    </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  width: 100%;
}
.opcion-grande {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  text-align: left;
  background: #181818;
  border: 2px solid #2f2f2f;
  border-radius: 16px;
  padding: 1.1rem 1.2rem;
  color: #fff;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.opcion-grande:hover:not(:disabled) {
  border-color: #ffd700;
  transform: translateY(-2px);
}
.opcion-grande i {
  font-size: 1.8rem;
  color: #7fb2ff;
}
.opcion-grande.dorada i {
  color: #ffd700;
}
.opcion-grande .t {
  font-weight: 800;
  font-size: 1.1rem;
}
.opcion-grande .d {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}
.codigo {
  letter-spacing: 0.3em;
  font-weight: 800;
  max-width: 200px;
}
.contadores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  text-align: center;
}
.contadores > div {
  background: #1d1d1d;
  border-radius: 12px;
  padding: 0.6rem 0.3rem;
}
.contadores .n {
  display: block;
  font-size: 1.6rem;
  font-weight: 900;
  color: #ffd700;
  line-height: 1.1;
}
.contadores .l {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}
.sala-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-top: 1px solid #262626;
}
</style>
