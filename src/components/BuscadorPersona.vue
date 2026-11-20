<script setup>
import { ref, computed } from 'vue'
import Avatar from './Avatar.vue'
import { normalizar } from '../firebase'

const props = defineProps({
  modelValue: { type: Object, default: null },
  usuarios: { type: Array, required: true },
  /** Map id → texto (con quién está inscrito) */
  inscritos: { type: Map, default: () => new Map() },
  excluirId: { type: Number, default: null },
  etiqueta: { type: String, required: true },
  id: { type: String, required: true },
  placeholder: { type: String, default: 'Escribe nombre y apellido' },
})
const emit = defineEmits(['update:modelValue'])

const texto = ref('')
const abierto = ref(false)

const sugerencias = computed(() => {
  const palabras = normalizar(texto.value).split(' ').filter(Boolean)
  if (!palabras.length || palabras.join('').length < 2) return []
  return props.usuarios
    .filter((u) => u.id !== props.excluirId)
    .filter((u) => {
      const n = normalizar(u.nombre)
      return palabras.every((p) => n.includes(p))
    })
    .slice(0, 8)
})

const sinResultados = computed(() => normalizar(texto.value).length >= 3 && !sugerencias.value.length)

function elegir(u) {
  emit('update:modelValue', u)
  texto.value = ''
  abierto.value = false
}
const cerrarLuego = () => setTimeout(() => (abierto.value = false), 150)
function quitar() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="buscador form-dark">
    <label class="form-label" :for="id">{{ etiqueta }}</label>

    <div v-if="modelValue" class="elegido">
      <Avatar :usuario="modelValue" size="sm" />
      <div class="min-w-0 flex-grow-1">
        <div class="fw-bold text-truncate">{{ modelValue.nombre }}</div>
        <div class="small text-soft text-truncate">{{ modelValue.departamento }}</div>
      </div>
      <button type="button" class="btn btn-sm btn-outline-light" :aria-label="'Cambiar ' + etiqueta" @click="quitar">Cambiar</button>
    </div>

    <div v-else class="position-relative">
      <input
        :id="id"
        v-model="texto"
        class="form-control form-control-lg"
        :placeholder="placeholder"
        autocomplete="off"
        @focus="abierto = true"
        @blur="cerrarLuego"
        @keydown.enter.prevent="sugerencias[0] && !inscritos.has(sugerencias[0].id) && elegir(sugerencias[0])"
      />
      <ul v-if="abierto && sugerencias.length" class="lista" role="listbox">
        <li v-for="u in sugerencias" :key="u.id">
          <button type="button" class="opcion" :disabled="inscritos.has(u.id)" @mousedown.prevent="elegir(u)">
            <Avatar :usuario="u" size="sm" />
            <span class="min-w-0 flex-grow-1 text-start">
              <span class="d-block fw-semibold text-truncate">{{ u.nombre }}</span>
              <span class="d-block small text-soft text-truncate">{{ u.departamento }}</span>
            </span>
            <span v-if="inscritos.has(u.id)" class="chip chip-amber">Ya inscrito</span>
          </button>
        </li>
      </ul>
      <div v-if="sinResultados" class="small text-warning mt-2">
        <i class="bi bi-exclamation-circle me-1"></i>No está en la lista de colaboradores Prolipa. Revisa cómo lo escribiste.
      </div>
    </div>
  </div>
</template>

<style scoped>
.elegido {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #0f1116;
  border: 2px solid #ffd700;
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
}
.lista {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  list-style: none;
  margin: 0;
  padding: 0.3rem;
  background: var(--superficie-2);
  border: 1px solid var(--borde-fuerte);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
  max-height: 340px;
  overflow-y: auto;
}
.opcion {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  background: none;
  border: 0;
  border-radius: 8px;
  padding: 0.45rem 0.5rem;
  color: #fff;
}
.opcion:hover:not(:disabled) {
  background: rgba(255, 215, 0, 0.1);
}
.opcion:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.min-w-0 {
  min-width: 0;
}
</style>
