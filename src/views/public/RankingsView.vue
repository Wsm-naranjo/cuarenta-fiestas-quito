<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

const bracket = ref([])
const loading = ref(true)
const searchQuery = ref('')
const autoRefreshInterval = ref(null)

const cargarBracket = async () => {
  try {
    const response = await axios.get('/public/bracket')
    bracket.value = response.data.bracket
    loading.value = false
  } catch (error) {
    console.error(error)
  }
}

// Filtrado inteligente para resaltar equipos
const isHighlighted = (pareja) => {
  if (!searchQuery.value || !pareja) return false
  const query = searchQuery.value.toLowerCase()
  return pareja.nombre.toLowerCase().includes(query) || 
         pareja.nombres_completos.toLowerCase().includes(query)
}

onMounted(() => {
  cargarBracket()
  // Auto-refrescar cada 30 segundos
  autoRefreshInterval.value = setInterval(cargarBracket, 30000)
})

onUnmounted(() => {
  if (autoRefreshInterval.value) clearInterval(autoRefreshInterval.value)
})
</script>

<template>
  <div>
    <!-- Buscador -->
    <div class="mb-8 max-w-md mx-auto relative">
      <input 
        v-model="searchQuery"
        type="text" 
        class="w-full bg-white/10 border border-white/20 rounded-full py-3 px-6 text-white placeholder-gray-400 focus:outline-none focus:border-quito-gold focus:ring-1 focus:ring-quito-gold transition-all"
        placeholder="🔍 Buscar jugador o pareja..."
      >
    </div>

    <!-- Bracket -->
    <div v-if="loading" class="text-center py-20">
      <div class="animate-spin text-6xl text-quito-gold mb-4">♠</div>
      <p class="text-white">Cargando torneo...</p>
    </div>

    <div v-else class="bracket-scroll overflow-x-auto pb-8">
      <div class="flex gap-16 min-w-max px-8 justify-center">
        <div v-for="ronda in bracket" :key="ronda.nombre_ronda" class="flex flex-col justify-around min-w-[280px]">
          <h3 class="text-center text-xl font-bold text-quito-gold mb-8 drop-shadow-md">
            {{ ronda.nombre_ronda }}
          </h3>
          
          <div v-for="partida in ronda.partidas" :key="partida.id" class="relative my-6">
            <div class="match-card bg-[#2d2d2d] border border-gray-600 rounded-xl overflow-hidden shadow-2xl transform transition-all hover:scale-105">
              <!-- Equipo 1 -->
              <div 
                class="p-4 border-b border-gray-700 transition-colors"
                :class="{
                  'bg-quito-blue/20': isHighlighted(partida.pareja1),
                  'bg-green-900/30': partida.ganador_id === partida.pareja1?.id,
                  'opacity-40': partida.completada && partida.ganador_id !== partida.pareja1?.id
                }"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-bold text-white text-lg">
                      {{ partida.pareja1?.nombre || 'TBD' }}
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ partida.pareja1?.nombres_completos || 'Esperando rival...' }}
                    </div>
                  </div>
                  <span v-if="partida.ganador_id === partida.pareja1?.id" class="text-2xl">👑</span>
                </div>
              </div>

              <!-- VS Divider -->
              <div class="bg-black/50 py-1 text-center text-xs text-gray-500 font-bold tracking-widest">
                VS
              </div>

              <!-- Equipo 2 -->
              <div 
                class="p-4 transition-colors"
                :class="{
                  'bg-quito-blue/20': isHighlighted(partida.pareja2),
                  'bg-green-900/30': partida.ganador_id === partida.pareja2?.id,
                  'opacity-40': partida.completada && partida.ganador_id !== partida.pareja2?.id
                }"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-bold text-white text-lg">
                      {{ partida.pareja2?.nombre || 'TBD' }}
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ partida.pareja2?.nombres_completos || 'Esperando rival...' }}
                    </div>
                  </div>
                  <span v-if="partida.ganador_id === partida.pareja2?.id" class="text-2xl">👑</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="bracket.length === 0" class="text-center py-20">
        <div class="text-6xl mb-4 animate-bounce">🃏</div>
        <h2 class="text-2xl font-bold text-white">El torneo aún no comienza</h2>
        <p class="text-gray-400 mt-2">Espera a que el administrador genere las llaves.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bracket-scroll::-webkit-scrollbar {
  height: 12px;
}

.bracket-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.bracket-scroll::-webkit-scrollbar-thumb {
  background: var(--quito-blue);
  border-radius: 10px;
}

.match-card {
  width: 300px;
}
</style>
