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
      <span class="eyebrow"><i class="bi bi-book-fill"></i>Reglamento oficial</span>
      <h1>Reglas Prolipa</h1>
      <p>Así se juega el 40 en el torneo. Si hay dudas en la mesa, manda lo que dice aquí.</p>
    </header>

    <div v-if="cargando" class="panel">
      <div v-for="n in 4" :key="n" class="regla">
        <span class="esqueleto num-esq"></span>
        <div class="flex-grow-1"><span class="esqueleto w-50 d-block mb-2"></span><span class="esqueleto w-100 d-block"></span></div>
      </div>
    </div>
    <div v-else-if="!reglas.length" class="panel vacio-estado">
      <div class="icono"><i class="bi bi-book"></i></div>
      <h2>Aún no hay reglas publicadas</h2>
    </div>
    <div v-else class="panel">
      <div v-for="(r, i) in reglas" :key="i" class="regla">
        <span class="num">{{ i + 1 }}</span>
        <div class="min-w-0">
          <h2 v-if="r.titulo && !/^regla\s*\d+$/i.test(r.titulo.trim())" class="titulo">{{ r.titulo }}</h2>
          <p class="texto">{{ r.contenido }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reglas {
  max-width: 900px;
}
.regla {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--borde);
}
.regla:first-child {
  padding-top: 0;
}
.regla:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.num,
.num-esq {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
}
.num {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fuente-titulos);
  font-weight: 800;
  color: #111;
  background: var(--quito-gold);
}
.min-w-0 {
  min-width: 0;
}
.titulo {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0.25rem 0 0.3rem;
}
.texto::first-letter {
  text-transform: uppercase;
}
.texto {
  padding-top: 0.3rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
}
</style>
