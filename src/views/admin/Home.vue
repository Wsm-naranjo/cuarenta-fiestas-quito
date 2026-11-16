<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const stats = ref({
  parejas: 0,
  partidas: 0,
  completadas: 0
})

const loading = ref(true)

onMounted(async () => {
  try {
    const [parejasRes, bracketRes] = await Promise.all([
      axios.get('/public/parejas'),
      axios.get('/public/bracket')
    ])
    
    stats.value.parejas = parejasRes.data.parejas.length
    
    let totalPartidas = 0
    let completadas = 0
    
    bracketRes.data.bracket.forEach(ronda => {
      totalPartidas += ronda.partidas.length
      completadas += ronda.partidas.filter(p => p.completada).length
    })
    
    stats.value.partidas = totalPartidas
    stats.value.completadas = completadas
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <!-- Stats Cards -->
    <div class="row g-4 mb-5">
      <div class="col-md-4">
        <div class="card card-dark h-100 border-quito-blue animate__animated animate__fadeInUp">
          <div class="card-body d-flex align-items-center">
            <div class="bg-quito-blue rounded-circle p-4 me-3" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
              <i class="bi bi-people-fill text-white" style="font-size: 2rem;"></i>
            </div>
            <div>
              <h6 class="text-white-50 mb-1">Parejas Inscritas</h6>
              <h2 class="text-white fw-bold mb-0">{{ stats.parejas }}</h2>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card card-dark h-100 border-quito-red animate__animated animate__fadeInUp" style="animation-delay: 0.1s;">
          <div class="card-body d-flex align-items-center">
            <div class="bg-quito-red rounded-circle p-4 me-3" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
              <i class="bi bi-trophy-fill text-white" style="font-size: 2rem;"></i>
            </div>
            <div>
              <h6 class="text-white-50 mb-1">Partidas Totales</h6>
              <h2 class="text-white fw-bold mb-0">{{ stats.partidas }}</h2>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card card-dark h-100 border-quito-gold animate__animated animate__fadeInUp" style="animation-delay: 0.2s;">
          <div class="card-body d-flex align-items-center">
            <div class="bg-quito-gold rounded-circle p-4 me-3" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
              <i class="bi bi-graph-up text-dark" style="font-size: 2rem;"></i>
            </div>
            <div>
              <h6 class="text-white-50 mb-1">Avance del Torneo</h6>
              <h2 class="text-quito-gold fw-bold mb-0">
                {{ stats.partidas ? Math.round((stats.completadas / stats.partidas) * 100) : 0 }}%
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card card-dark">
      <div class="card-header bg-quito-blue text-white">
        <h4 class="mb-0"><i class="bi bi-lightning-fill me-2"></i>Acciones Rápidas</h4>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <router-link to="/admin/dashboard/parejas" class="text-decoration-none">
              <div class="card card-dark border-2 border-secondary h-100 hover-card">
                <div class="card-body">
                  <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-people-fill text-quito-blue fs-1 me-3"></i>
                    <h5 class="text-white mb-0">Gestionar Parejas</h5>
                  </div>
                  <p class="text-white-50 mb-0">Agregar, importar o reordenar participantes del torneo</p>
                </div>
              </div>
            </router-link>
          </div>

          <div class="col-md-6">
            <router-link to="/admin/dashboard/bracket" class="text-decoration-none">
              <div class="card card-dark border-2 border-secondary h-100 hover-card">
                <div class="card-body">
                  <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-diagram-3-fill text-quito-gold fs-1 me-3"></i>
                    <h5 class="text-white mb-0">Gestión del torneo</h5>
                  </div>
                  <p class="text-white-50 mb-0">Registrar resultados y ver el avance del torneo</p>
                </div>
              </div>
            </router-link>
          </div>

          <div class="col-md-6">
            <router-link to="/admin/dashboard/reglas" class="text-decoration-none">
              <div class="card card-dark border-2 border-secondary h-100 hover-card">
                <div class="card-body">
                  <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-file-text-fill text-quito-red fs-1 me-3"></i>
                    <h5 class="text-white mb-0">Reglas del Juego</h5>
                  </div>
                  <p class="text-white-50 mb-0">Definir y editar las reglas del torneo</p>
                </div>
              </div>
            </router-link>
          </div>

          <div class="col-md-6">
            <a href="/40-Prolipa" target="_blank" class="text-decoration-none">
              <div class="card card-dark border-2 border-secondary h-100 hover-card">
                <div class="card-body">
                  <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-eye-fill text-success fs-1 me-3"></i>
                    <h5 class="text-white mb-0">Vista Pública</h5>
                  </div>
                  <p class="text-white-50 mb-0">Ver cómo se muestra el torneo al público</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hover-card {
  transition: all 0.3s ease;
}

.hover-card:hover {
  border-color: #FFD700 !important;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(255, 215, 0, 0.2);
}
</style>
