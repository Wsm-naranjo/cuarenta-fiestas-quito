<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const busqueda = ref('')
const parejaEncontrada = ref(null)
const partidas = ref([])
const loading = ref(false)
const error = ref('')

const buscarPareja = async () => {
  if (!busqueda.value.trim()) {
    error.value = 'Ingresa un nombre para buscar'
    return
  }

  loading.value = true
  error.value = ''
  parejaEncontrada.value = null
  partidas.value = []

  try {
    const response = await axios.post('/public/buscar-partidas', {
      nombre: busqueda.value.trim()
    })

    if (response.data.encontrado) {
      parejaEncontrada.value = response.data.mi_pareja
      partidas.value = response.data.partidas
    } else {
      error.value = response.data.mensaje || 'No se encontró ninguna pareja con ese nombre'
    }
  } catch (err) {
    console.error(err)
    error.value = 'Error al buscar la pareja'
  } finally {
    loading.value = false
  }
}

// Filtrar partidas por estado
const partidasPendientes = computed(() => {
  return partidas.value.filter(p => p.resultado === 'pendiente')
})

const partidasGanadas = computed(() => {
  return partidas.value.filter(p => p.resultado === 'ganado')
})

const partidasPerdidas = computed(() => {
  return partidas.value.filter(p => p.resultado === 'perdido')
})

const handleKeyPress = (event) => {
  if (event.key === 'Enter') {
    buscarPareja()
  }
}
</script>

<template>
  <div class="buscar-partida-container">
    <!-- Header -->
    <div class="header-section">
      <h1 class="title">
        <i class="bi bi-search"></i>
        Buscar mi Partida
      </h1>
      <p class="subtitle">Consulta tus partidas pendientes, ganadas y perdidas</p>
    </div>

    <!-- Buscador -->
    <div class="search-section">
      <div class="search-box">
        <i class="bi bi-person-search search-icon"></i>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Escribe tu nombre o el de tu compañero..."
          class="search-input"
          @keypress="handleKeyPress"
        />
        <button @click="buscarPareja" class="search-button" :disabled="loading">
          <i v-if="!loading" class="bi bi-search"></i>
          <span v-else class="spinner-border spinner-border-sm"></span>
          {{ loading ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>

      <div v-if="error" class="alert alert-warning mt-3">
        <i class="bi bi-exclamation-triangle me-2"></i>
        {{ error }}
      </div>
    </div>

    <!-- Resultado de búsqueda -->
    <div v-if="parejaEncontrada" class="result-section">
      <!-- Card de la pareja -->
      <div class="pareja-card">
        <div class="pareja-info">
          <h3 class="pareja-nombre">{{ parejaEncontrada.nombre }}</h3>
          <p class="pareja-jugadores">
            <i class="bi bi-people-fill me-2"></i>
            {{ parejaEncontrada.nombres_completos }}
          </p>
        </div>
        <div class="pareja-stats">
          <div class="stat-item">
            <span class="stat-value">{{ partidasGanadas.length }}</span>
            <span class="stat-label">Ganadas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ partidasPerdidas.length }}</span>
            <span class="stat-label">Perdidas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ partidasPendientes.length }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
        </div>
        <div v-if="parejaEncontrada.eliminada" class="eliminada-badge">
          <i class="bi bi-x-circle me-1"></i>
          ELIMINADA
        </div>
        <div v-if="parejaEncontrada.posicion_final" class="posicion-badge">
          <i class="bi bi-trophy-fill me-1"></i>
          {{ parejaEncontrada.posicion_final === 1 ? '🥇 CAMPEÓN' : 
             parejaEncontrada.posicion_final === 2 ? '🥈 VICECAMPEÓN' : 
             parejaEncontrada.posicion_final === 3 ? '🥉 TERCER LUGAR' : 
             `${parejaEncontrada.posicion_final}° LUGAR` }}
        </div>
      </div>

      <!-- Tabs de partidas -->
      <div class="tabs-container">
        <ul class="nav nav-tabs" id="partidasTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link active" 
              id="pendientes-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#pendientes" 
              type="button"
            >
              <i class="bi bi-clock-history me-2"></i>
              Pendientes
              <span class="badge bg-warning ms-2">{{ partidasPendientes.length }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link" 
              id="ganadas-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#ganadas" 
              type="button"
            >
              <i class="bi bi-trophy-fill me-2"></i>
              Ganadas
              <span class="badge bg-success ms-2">{{ partidasGanadas.length }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link" 
              id="perdidas-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#perdidas" 
              type="button"
            >
              <i class="bi bi-x-circle-fill me-2"></i>
              Perdidas
              <span class="badge bg-danger ms-2">{{ partidasPerdidas.length }}</span>
            </button>
          </li>
        </ul>

        <div class="tab-content" id="partidasTabContent">
          <!-- Pendientes -->
          <div class="tab-pane fade show active" id="pendientes" role="tabpanel">
            <div v-if="partidasPendientes.length === 0" class="empty-state">
              <i class="bi bi-inbox"></i>
              <p>No hay partidas pendientes</p>
            </div>
            <div v-else class="partidas-list">
              <div 
                v-for="partida in partidasPendientes" 
                :key="partida.id" 
                class="partida-item pendiente"
              >
                <div class="partida-header">
                  <span class="ronda-badge">{{ partida.nombre_ronda }}</span>
                  <span class="estado-badge en-curso">
                    <i class="bi bi-circle-fill pulse-icon"></i>
                    EN CURSO
                  </span>
                </div>
                <div class="partida-content">
                  <div class="vs-container">
                    <span class="pareja-actual">{{ parejaEncontrada.nombre }}</span>
                    <span class="vs-text">VS</span>
                    <span class="pareja-rival">
                      {{ partida.rival ? partida.rival.nombre : 'Por definir' }}
                    </span>
                  </div>
                  <div v-if="partida.rival" class="rival-jugadores">
                    <i class="bi bi-people me-1"></i>
                    {{ partida.rival.nombres_completos }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ganadas -->
          <div class="tab-pane fade" id="ganadas" role="tabpanel">
            <div v-if="partidasGanadas.length === 0" class="empty-state">
              <i class="bi bi-emoji-smile"></i>
              <p>Aún no has ganado ninguna partida</p>
            </div>
            <div v-else class="partidas-list">
              <div 
                v-for="partida in partidasGanadas" 
                :key="partida.id" 
                class="partida-item ganada"
              >
                <div class="partida-header">
                  <span class="ronda-badge">{{ partida.nombre_ronda }}</span>
                  <span class="estado-badge ganada">
                    <i class="bi bi-check-circle-fill"></i>
                    GANASTE
                  </span>
                </div>
                <div class="partida-content">
                  <div class="vs-container">
                    <span class="pareja-actual ganador">{{ parejaEncontrada.nombre }}</span>
                    <span class="vs-text">VS</span>
                    <span class="pareja-rival perdedor">{{ partida.rival.nombre }}</span>
                  </div>
                  <div class="rival-jugadores">
                    <i class="bi bi-people me-1"></i>
                    {{ partida.rival.nombres_completos }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Perdidas -->
          <div class="tab-pane fade" id="perdidas" role="tabpanel">
            <div v-if="partidasPerdidas.length === 0" class="empty-state">
              <i class="bi bi-emoji-smile"></i>
              <p>¡Invicto! No has perdido ninguna partida</p>
            </div>
            <div v-else class="partidas-list">
              <div 
                v-for="partida in partidasPerdidas" 
                :key="partida.id" 
                class="partida-item perdida"
              >
                <div class="partida-header">
                  <span class="ronda-badge">{{ partida.nombre_ronda }}</span>
                  <span class="estado-badge perdida">
                    <i class="bi bi-x-circle-fill"></i>
                    PERDISTE
                  </span>
                </div>
                <div class="partida-content">
                  <div class="vs-container">
                    <span class="pareja-actual perdedor">{{ parejaEncontrada.nombre }}</span>
                    <span class="vs-text">VS</span>
                    <span class="pareja-rival ganador">{{ partida.rival.nombre }}</span>
                  </div>
                  <div class="rival-jugadores">
                    <i class="bi bi-people me-1"></i>
                    {{ partida.rival.nombres_completos }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.buscar-partida-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
}

.header-section {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.search-section {
  max-width: 600px;
  margin: 0 auto 2rem;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 50px;
  padding: 0.5rem 1rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.search-icon {
  font-size: 1.5rem;
  color: #667eea;
  margin-right: 0.75rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1.1rem;
  padding: 0.5rem;
}

.search-button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 0.75rem 2rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}

.search-button:hover:not(:disabled) {
  transform: scale(1.05);
}

.search-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.result-section {
  max-width: 900px;
  margin: 0 auto;
}

.pareja-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  position: relative;
}

.pareja-info {
  margin-bottom: 1.5rem;
}

.pareja-nombre {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.pareja-jugadores {
  font-size: 1.2rem;
  color: #666;
  margin: 0;
}

.pareja-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 15px;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.eliminada-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #dc3545;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
}

.posicion-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.tabs-container {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.nav-tabs {
  border-bottom: 2px solid #e0e0e0;
  padding: 0.5rem 1rem 0;
}

.nav-tabs .nav-link {
  border: none;
  color: #666;
  font-weight: 600;
  padding: 1rem 1.5rem;
  border-radius: 10px 10px 0 0;
}

.nav-tabs .nav-link.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.tab-content {
  padding: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.partidas-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.partida-item {
  border-radius: 15px;
  padding: 1.5rem;
  transition: transform 0.2s;
}

.partida-item:hover {
  transform: translateX(5px);
}

.partida-item.pendiente {
  background: linear-gradient(135deg, #fff3cd, #fff8e1);
  border-left: 5px solid #ffc107;
}

.partida-item.ganada {
  background: linear-gradient(135deg, #d4edda, #e8f5e9);
  border-left: 5px solid #28a745;
}

.partida-item.perdida {
  background: linear-gradient(135deg, #f8d7da, #ffebee);
  border-left: 5px solid #dc3545;
}

.partida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.ronda-badge {
  background: rgba(0,0,0,0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
}

.estado-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  color: white;
}

.estado-badge.en-curso {
  background: #ffc107;
}

.estado-badge.ganada {
  background: #28a745;
}

.estado-badge.perdida {
  background: #dc3545;
}

.pulse-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.vs-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.pareja-actual, .pareja-rival {
  font-weight: bold;
  font-size: 1.1rem;
}

.pareja-actual.ganador {
  color: #28a745;
}

.pareja-actual.perdedor {
  color: #666;
  text-decoration: line-through;
}

.pareja-rival.ganador {
  color: #28a745;
}

.pareja-rival.perdedor {
  color: #666;
  text-decoration: line-through;
}

.vs-text {
  color: #667eea;
  font-weight: bold;
  font-size: 0.9rem;
}

.rival-jugadores {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.fecha-partida {
  color: #999;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .pareja-stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .vs-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
