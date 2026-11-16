<script setup>
import { ref, onMounted } from 'vue'
import { cargarJSON } from '../../firebase'

const reglas = ref([])
const cargando = ref(true)

onMounted(async () => {
  try {
    reglas.value = await cargarJSON('reglas')
  } catch {
    reglas.value = []
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div class="reglas">
    <header class="page-head">
      <h1>Reglas Prolipa</h1>
    </header>

    <div class="panel panel-gold">
      <div v-if="cargando" class="text-soft">Cargando…</div>
      <p v-else-if="!reglas.length" class="text-soft mb-0">Aún no hay reglas publicadas.</p>
      <ol v-else class="lista mb-0">
        <li v-for="(r, i) in reglas" :key="i">
          <div class="titulo">{{ r.titulo }}</div>
          <div class="texto">{{ r.contenido }}</div>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.reglas {
  max-width: 1100px;
}
.lista {
  padding-left: 1.4rem;
}
.lista li {
  padding: 0.6rem 0;
  border-bottom: 1px solid #262626;
}
.lista li:last-child {
  border-bottom: 0;
}
.lista li::marker {
  color: #ffd700;
  font-weight: 800;
}
.titulo {
  color: #ffd700;
  font-weight: 800;
}
.texto {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.05rem;
}
</style>
