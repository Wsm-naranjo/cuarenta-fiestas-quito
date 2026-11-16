<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import PodiumDisplay from '../../components/PodiumDisplay.vue'

const bracket = ref([])
const rankings = ref([])
const loading = ref(true)
const autoRefreshInterval = ref(null)
const searchQuery = ref('')
const searchResult = ref(null)
const mostrarBusqueda = ref(false)
const parejaSeleccionada = ref(null)
const partidasPareja = ref([])

// Verificar si el torneo finalizó (hay campeón)
const torneoFinalizado = computed(() => {
  return rankings.value.some(r => r.posicion === 1)
})

// Filtrar partidas vacías para vista pública
const bracketFiltrado = computed(() => {
  return bracket.value.map(ronda => ({
    ...ronda,
    partidas: ronda.partidas.filter(partida => 
      partida.pareja1 !== null || partida.pareja2 !== null
    )
  })).filter(ronda => ronda.partidas.length > 0) // Eliminar rondas sin partidas
})

const cargarBracket = async () => {
  try {
    const [bracketRes, rankingsRes] = await Promise.all([
      axios.get('/public/bracket'),
      axios.get('/public/rankings')
    ])
    bracket.value = bracketRes.data.bracket
    rankings.value = rankingsRes.data.rankings
    loading.value = false
  } catch (error) {
    console.error('Error:', error)
    loading.value = false
  }
}

const buscarPartida = () => {
  mostrarBusqueda.value = true
}

const buscarMiPartida = async () => {
  if (!searchQuery.value.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Ingresa un nombre',
      text: 'Por favor escribe el nombre de un jugador o pareja',
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#FFD700'
    })
    return
  }

  try {
    const response = await axios.get(`/public/parejas/buscar?nombre=${encodeURIComponent(searchQuery.value)}`)
    
    if (response.data.parejas && response.data.parejas.length > 0) {
      parejaSeleccionada.value = response.data.parejas[0]
      await cargarPartidasPareja(parejaSeleccionada.value.id)
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No encontrado',
        text: 'No se encontró ninguna pareja con ese nombre',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#FFD700'
      })
      parejaSeleccionada.value = null
      partidasPareja.value = []
    }
  } catch (error) {
    console.error('Error buscando pareja:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Hubo un error al buscar',
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}

const cargarPartidasPareja = async (parejaId) => {
  try {
    // Buscar todas las partidas de esta pareja en el bracket
    const partidas = []
    
    bracket.value.forEach(ronda => {
      ronda.partidas.forEach(partida => {
        if (partida.pareja1?.id === parejaId || partida.pareja2?.id === parejaId) {
          const esPareja1 = partida.pareja1?.id === parejaId
          const esPareja2 = partida.pareja2?.id === parejaId
          const contrincante = esPareja1 ? partida.pareja2 : partida.pareja1
          
          partidas.push({
            ronda: ronda.numero_ronda,
            orden: partida.orden,
            contrincante: contrincante,
            resultado: partida.completada 
              ? (partida.ganador_id === parejaId ? 'GANÓ' : 'PERDIÓ')
              : 'PENDIENTE',
            completada: partida.completada,
            esGanador: partida.ganador_id === parejaId
          })
        }
      })
    })
    
    partidasPareja.value = partidas.sort((a, b) => a.ronda - b.ronda)
  } catch (error) {
    console.error('Error cargando partidas:', error)
  }
}

const cerrarBusqueda = () => {
  mostrarBusqueda.value = false
  searchQuery.value = ''
  parejaSeleccionada.value = null
  partidasPareja.value = []
}

onMounted(() => {
  cargarBracket()
  autoRefreshInterval.value = setInterval(cargarBracket, 30000)
})

onUnmounted(() => {
  if (autoRefreshInterval.value) clearInterval(autoRefreshInterval.value)
})

const obtenerNombreRonda = (ronda, partidas) => {
  // Siempre mostrar como "Ronda N" en la vista pública
  return `Ronda ${ronda}`
}
</script>

<template>
  <div class="public-bracket-container">
    <!-- Header -->
    <div class="public-header">
      <h1 class="tournament-title">
        Torneo Prolipa 2025 🏆
      </h1>
      <div class="header-actions" v-if="bracket.length > 0">
        <button @click="buscarPartida" class="btn btn-quito-gold btn-lg">
          <i class="bi bi-search me-2"></i>Buscar mi Partida
        </button>
      </div>
    </div>

    <!-- Modal de Búsqueda -->
    <div v-if="mostrarBusqueda" class="modal-overlay" @click.self="cerrarBusqueda">
      <div class="modal-search-card">
        <button @click="cerrarBusqueda" class="btn-close-modal">
          <i class="bi bi-x-circle-fill"></i>
        </button>
        
        <h3 class="modal-title">
          <i class="bi bi-search me-2"></i>
          Buscar Mi Partida
        </h3>
        
        <div class="search-input-group">
          <input 
            v-model="searchQuery"
            @keyup.enter="buscarMiPartida"
            type="text" 
            class="form-control search-input"
            placeholder="Escribe tu nombre o el de tu pareja..."
            autofocus
          >
          <button @click="buscarMiPartida" class="btn btn-search">
            <i class="bi bi-search"></i>
          </button>
        </div>
        
        <!-- Resultados -->
        <div v-if="parejaSeleccionada" class="search-results">
          <div class="result-header">
            <h4>{{ parejaSeleccionada.nombre }}</h4>
            <p class="text-white-50">{{ parejaSeleccionada.nombres_completos }}</p>
            <span 
              v-if="parejaSeleccionada.eliminada" 
              class="badge bg-danger mt-2"
            >
              Eliminados del torneo
            </span>
            <span 
              v-else-if="parejaSeleccionada.posicion_final" 
              class="badge bg-success mt-2"
            >
              {{ parejaSeleccionada.posicion_final === 1 ? '🥇 Campeones' : 
                 parejaSeleccionada.posicion_final === 2 ? '🥈 Subcampeones' :
                 parejaSeleccionada.posicion_final === 3 ? '🥉 Tercer Lugar' : '4️⃣ Cuarto Lugar' }}
            </span>
          </div>
          
          <div v-if="partidasPareja.length > 0" class="partidas-list">
            <h5 class="mb-3">
              <i class="bi bi-list-ul me-2"></i>
              Historial de Partidas
            </h5>
            
            <div 
              v-for="(partida, index) in partidasPareja" 
              :key="index"
              class="partida-item"
              :class="{
                'ganada': partida.esGanador,
                'perdida': partida.completada && !partida.esGanador,
                'pendiente': !partida.completada
              }"
            >
              <div class="partida-info">
                <div class="partida-ronda">
                  Ronda {{ partida.ronda }} - Partida #{{ partida.orden }}
                </div>
                <div class="partida-vs">
                  <strong>VS</strong> 
                  {{ partida.contrincante?.nombre || 'Pendiente de asignar' }}
                </div>
                <div v-if="partida.contrincante" class="partida-jugadores">
                  {{ partida.contrincante.nombres_completos }}
                </div>
              </div>
              <div class="partida-resultado">
                <span 
                  v-if="partida.completada"
                  class="badge"
                  :class="{
                    'bg-success': partida.esGanador,
                    'bg-danger': !partida.esGanador
                  }"
                >
                  {{ partida.resultado }}
                </span>
                <span v-else class="badge bg-warning text-dark">
                  <i class="bi bi-clock me-1"></i>
                  PENDIENTE
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="no-partidas">
            <i class="bi bi-info-circle me-2"></i>
            Esta pareja aún no tiene partidas asignadas
          </div>
        </div>
        
        <div v-else-if="searchQuery" class="search-hint">
          <i class="bi bi-lightbulb me-2"></i>
          Presiona Enter o haz clic en buscar
        </div>
      </div>
    </div>

    <!-- Podium (Si el torneo finalizó, solo mostrar esto) -->
    <PodiumDisplay v-if="rankings.length > 0 && torneoFinalizado" :rankings="rankings" />

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-quito-gold" style="width: 4rem; height: 4rem;"></div>
      <p class="text-white mt-3 fs-5">Cargando torneo...</p>
    </div>

    <!-- Mensaje cuando torneo finalizado (NO mostrar bracket) -->
    <div v-else-if="torneoFinalizado" class="text-center py-5">
      <div class="alert alert-success" style="background: #1a1a1a; border: 2px solid #FFD700; color: #fff; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #FFD700;">🏆 TORNEO FINALIZADO 🏆</h3>
        <p class="mt-3">¡El torneo ha concluido exitosamente!</p>
        <p>Consulta el podio arriba para ver los ganadores</p>
      </div>
    </div>

    <!-- Bracket Piramidal (solo si NO ha finalizado) -->
    <div v-else-if="bracketFiltrado.length > 0" class="pyramid-bracket-public">
      <div class="bracket-pyramid-content">
        <div 
          v-for="(ronda, rondaIndex) in bracketFiltrado" 
          :key="ronda.numero_ronda" 
          class="pyramid-round"
          :class="`round-${rondaIndex + 1}`"
        >
          <!-- Título Ronda -->
          <div class="round-title">
            <span class="badge bg-quito-blue px-4 py-3 fs-5">
              {{ obtenerNombreRonda(ronda.numero_ronda, ronda.partidas) }}
            </span>
          </div>

          <!-- Partidas -->
          <div class="matches-container">
            <div 
              v-for="partida in ronda.partidas" 
              :key="partida.id" 
              class="pyramid-match"
            >
              <div class="match-card">
                <!-- Header -->
                <div class="match-header">
                  <small class="text-white-50">Partida #{{ partida.orden }}</small>
                  <span v-if="partida.completada" class="badge bg-success">
                    <i class="bi bi-check-circle"></i> Finalizada
                  </span>
                  <span v-else class="badge bg-warning text-dark">
                    <i class="bi bi-clock"></i> Pendiente
                  </span>
                </div>

                <!-- Pareja 1 -->
                <div 
                  class="team-slot"
                  :class="{
                    'winner': partida.ganador_id === partida.pareja1?.id,
                    'loser': partida.completada && partida.ganador_id !== partida.pareja1?.id
                  }"
                >
                  <div class="team-info">
                    <div class="team-name">
                      {{ partida.pareja1?.nombre || 'Por definir' }}
                      <span v-if="partida.ganador_id === partida.pareja1?.id" class="winner-crown">👑</span>
                    </div>
                    <small class="team-players">
                      {{ partida.pareja1?.nombres_completos || 'Esperando...' }}
                    </small>
                  </div>
                  <span v-if="partida.pareja1" class="card-suit">♠</span>
                </div>

                <!-- VS -->
                <div class="vs-divider">VS</div>

                <!-- Pareja 2 -->
                <div 
                  class="team-slot"
                  :class="{
                    'winner': partida.ganador_id === partida.pareja2?.id,
                    'loser': partida.completada && partida.ganador_id !== partida.pareja2?.id
                  }"
                >
                  <div class="team-info">
                    <div class="team-name">
                      {{ partida.pareja2?.nombre || 'Por definir' }}
                      <span v-if="partida.ganador_id === partida.pareja2?.id" class="winner-crown">👑</span>
                    </div>
                    <small class="team-players">
                      {{ partida.pareja2?.nombres_completos || 'Esperando...' }}
                    </small>
                  </div>
                  <span v-if="partida.pareja2" class="card-suit">♥</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-5">
      <div class="empty-state">
        <div class="display-1 mb-4">🃏</div>
        <h2 class="text-white mb-3">El torneo aún no comienza</h2>
        <p class="text-white-50 mb-4">Espera a que el administrador genere las llaves</p>
        <div class="card-suits">
          <span class="animate-float">♠</span>
          <span class="animate-float" style="animation-delay: 0.5s;">♥</span>
          <span class="animate-float" style="animation-delay: 1s;">♦</span>
          <span class="animate-float" style="animation-delay: 1.5s;">♣</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.public-bracket-container {
  min-height: 100vh;
  background: #0a0a0a;
  padding: 0;
}

.public-header {
  background: linear-gradient(135deg, #003DA5 0%, #E4002B 100%);
  padding: 40px 20px;
  text-align: center;
  border-bottom: 5px solid #FFD700;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.tournament-title {
  color: white;
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
}

.trophy-icon {
  font-size: 3.5rem;
  display: inline-block;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.header-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.pyramid-bracket-public {
  padding: 50px 20px;
  overflow-x: auto;
  min-height: calc(100vh - 300px);
}

.bracket-pyramid-content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 40px;
  min-width: max-content;
  padding: 20px;
}

.pyramid-round {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 320px;
}

.round-title {
  margin-bottom: 35px;
  position: sticky;
  top: 20px;
  z-index: 10;
}

.matches-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.pyramid-match {
  position: relative;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.match-card {
  background: #1a1a1a;
  border: 3px solid #333;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.match-card:hover {
  border-color: #FFD700;
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
}

.match-header {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #444;
}

.team-slot {
  padding: 18px 20px;
  border-bottom: 2px solid #333;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 75px;
}

.team-slot:last-child {
  border-bottom: none;
}

.team-slot.winner {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.2) 0%, transparent 100%);
  border-left: 5px solid #FFD700;
}

.team-slot.loser {
  opacity: 0.4;
}

.team-info {
  flex: 1;
  min-width: 0;
}

.team-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  line-height: 1.4;
}

.winner-crown {
  margin-left: 8px;
  font-size: 1.4rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.team-players {
  color: #999;
  display: block;
  margin-top: 5px;
  font-size: 0.9rem;
}

.card-suit {
  font-size: 2.5rem;
  opacity: 0.15;
  margin-left: 15px;
}

.vs-divider {
  background: linear-gradient(135deg, #E4002B 0%, #C4001B 100%);
  color: white;
  text-align: center;
  padding: 10px;
  font-weight: bold;
  font-size: 1rem;
  letter-spacing: 3px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.empty-state {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 20px;
  padding: 80px;
  max-width: 700px;
  margin: 50px auto;
  border: 3px solid #FFD700;
  box-shadow: 0 10px 40px rgba(255, 215, 0, 0.2);
}

/* Modal de Búsqueda */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-search-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 3px solid #FFD700;
  border-radius: 20px;
  padding: 40px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(255, 215, 0, 0.4);
  animation: slideDown 0.4s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn-close-modal {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: #FFD700;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
  line-height: 1;
}

.btn-close-modal:hover {
  color: #fff;
  transform: rotate(90deg);
}

.modal-title {
  color: #FFD700;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 30px;
  text-align: center;
}

.search-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

.search-input {
  flex: 1;
  background: #0a0a0a;
  border: 2px solid #444;
  color: white;
  padding: 15px 20px;
  font-size: 1.1rem;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #FFD700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  background: #1a1a1a;
}

.search-input::placeholder {
  color: #666;
}

.btn-search {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: none;
  color: #000;
  padding: 15px 30px;
  font-size: 1.2rem;
  border-radius: 10px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-search:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(255, 215, 0, 0.5);
}

.search-results {
  margin-top: 30px;
}

.result-header {
  background: #0a0a0a;
  padding: 25px;
  border-radius: 15px;
  border: 2px solid #FFD700;
  margin-bottom: 25px;
  text-align: center;
}

.result-header h4 {
  color: #FFD700;
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.partidas-list h5 {
  color: #FFD700;
  font-weight: bold;
  border-bottom: 2px solid #444;
  padding-bottom: 10px;
}

.partida-item {
  background: #0a0a0a;
  border: 2px solid #444;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.partida-item:hover {
  transform: translateX(5px);
  border-color: #FFD700;
}

.partida-item.ganada {
  border-left: 5px solid #28a745;
  background: linear-gradient(90deg, rgba(40, 167, 69, 0.1) 0%, #0a0a0a 100%);
}

.partida-item.perdida {
  border-left: 5px solid #dc3545;
  background: linear-gradient(90deg, rgba(220, 53, 69, 0.1) 0%, #0a0a0a 100%);
}

.partida-item.pendiente {
  border-left: 5px solid #ffc107;
  background: linear-gradient(90deg, rgba(255, 193, 7, 0.1) 0%, #0a0a0a 100%);
}

.partida-info {
  flex: 1;
}

.partida-ronda {
  color: #FFD700;
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.partida-vs {
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.partida-vs strong {
  color: #E4002B;
}

.partida-jugadores {
  color: #999;
  font-size: 0.9rem;
}

.partida-resultado {
  margin-left: 20px;
}

.partida-resultado .badge {
  font-size: 1rem;
  padding: 10px 20px;
}

.no-partidas {
  background: #0a0a0a;
  border: 2px dashed #444;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 1.1rem;
}

.search-hint {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 20px;
}

.card-suits {
  display: flex;
  justify-content: center;
  gap: 30px;
  font-size: 3rem;
  margin-top: 30px;
}

.animate-float {
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@media (max-width: 1200px) {
  .bracket-pyramid-content {
    gap: 70px;
  }
}

@media (max-width: 768px) {
  .tournament-title {
    font-size: 2rem;
  }
  
  .trophy-icon {
    font-size: 2.5rem;
  }
  
  .pyramid-round {
    min-width: 280px;
  }
  
  .bracket-pyramid-content {
    gap: 50px;
  }
  
  .connector {
    width: 50px;
  }
  
  .empty-state {
    padding: 40px 20px;
  }
}
</style>
