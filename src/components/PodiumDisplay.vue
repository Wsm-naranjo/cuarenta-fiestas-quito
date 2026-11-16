<script setup>
import { computed } from 'vue'

const props = defineProps({
  rankings: {
    type: Array,
    default: () => []
  }
})

const primero = computed(() => props.rankings.find(r => r.posicion === 1))
const segundo = computed(() => props.rankings.find(r => r.posicion === 2))
const terceros = computed(() => props.rankings.filter(r => r.posicion === 3))
</script>

<template>
  <div class="podium-container">
    <h3 class="podium-title">
      <i class="bi bi-trophy-fill me-2"></i>
      Posiciones Finales
    </h3>
    
    <div class="podium-wrapper">
      <!-- Segundo Lugar -->
      <div class="podium-position second-place">
        <div class="medal-icon">🥈</div>
        <div class="position-card">
          <div class="position-number">2°</div>
          <div class="position-content">
            <div v-if="segundo" class="winner-info">
              <div class="team-name">{{ segundo.nombre }}</div>
              <small class="team-players">{{ segundo.nombres_completos }}</small>
            </div>
            <div v-else class="pending-info">
              <i class="bi bi-hourglass-split"></i>
              <span>Por definirse</span>
            </div>
          </div>
        </div>
        <div class="podium-base second-base">2°</div>
      </div>

      <!-- Primer Lugar -->
      <div class="podium-position first-place">
        <div class="crown-icon">👑</div>
        <div class="medal-icon">🥇</div>
        <div class="position-card champion">
          <div class="position-number">1°</div>
          <div class="position-content">
            <div v-if="primero" class="winner-info">
              <div class="team-name">{{ primero.nombre }}</div>
              <small class="team-players">{{ primero.nombres_completos }}</small>
            </div>
            <div v-else class="pending-info">
              <i class="bi bi-hourglass-split"></i>
              <span>Por definirse</span>
            </div>
          </div>
        </div>
        <div class="podium-base first-base">1°</div>
      </div>

      <!-- Tercer Lugar -->
      <div class="podium-position third-place">
        <div class="medal-icon">🥉</div>
        <div class="position-card">
          <div class="position-number">3°</div>
          <div class="position-content">
            <div v-if="terceros.length > 0" class="winner-info">
              <div v-for="tercero in terceros" :key="tercero.nombre" class="team-name-small">
                {{ tercero.nombre }}
                <small class="d-block team-players-small">{{ tercero.nombres_completos }}</small>
              </div>
            </div>
            <div v-else class="pending-info">
              <i class="bi bi-hourglass-split"></i>
              <span>Por definirse</span>
            </div>
          </div>
        </div>
        <div class="podium-base third-base">3°</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.podium-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  border: 2px solid #FFD700;
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.2);
}

.podium-title {
  text-align: center;
  color: #FFD700;
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 30px;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.podium-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.podium-position {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  animation: podiumRise 0.8s ease-out;
}

@keyframes podiumRise {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.first-place {
  animation-delay: 0.2s;
  z-index: 3;
}

.second-place {
  animation-delay: 0.1s;
  z-index: 2;
}

.third-place {
  animation-delay: 0s;
  z-index: 1;
}

.crown-icon {
  font-size: 3rem;
  margin-bottom: -10px;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.medal-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.position-card {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  border: 2px solid #444;
  border-radius: 12px;
  padding: 20px;
  min-width: 200px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.position-card.champion {
  border-color: #FFD700;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, #1a1a1a 100%);
  box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);
}

.position-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(255, 215, 0, 0.4);
}

.position-number {
  font-size: 1.5rem;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 10px;
}

.position-content {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.winner-info {
  width: 100%;
}

.team-name {
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  margin-bottom: 5px;
}

.team-name-small {
  font-size: 0.95rem;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.team-players {
  color: #999;
  font-size: 0.85rem;
  display: block;
}

.team-players-small {
  color: #999;
  font-size: 0.75rem;
}

.pending-info {
  color: #666;
  font-style: italic;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pending-info i {
  font-size: 1.5rem;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.podium-base {
  width: 100%;
  text-align: center;
  font-weight: bold;
  color: white;
  padding: 15px 0;
  margin-top: 15px;
  border-radius: 8px 8px 0 0;
  font-size: 1.2rem;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
}

.first-base {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #FFD700;
}

.second-base {
  background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #C0C0C0;
}

.third-base {
  background: linear-gradient(135deg, #CD7F32 0%, #B87333 100%);
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #CD7F32;
}

@media (max-width: 768px) {
  .podium-wrapper {
    gap: 10px;
  }
  
  .position-card {
    min-width: 150px;
    padding: 15px;
  }
  
  .medal-icon {
    font-size: 2rem;
  }
  
  .crown-icon {
    font-size: 2.5rem;
  }
  
  .team-name {
    font-size: 0.95rem;
  }
  
  .team-players {
    font-size: 0.75rem;
  }
}
</style>
