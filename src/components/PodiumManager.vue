<template>
  <div class="podium-manager card bg-dark border-warning p-4 mb-4">
    <h4 class="text-warning mb-4">
      <i class="bi bi-trophy-fill me-2"></i>
      Definir Podio Final
    </h4>
    
    <div class="row g-3">
      <!-- Campeón -->
      <div class="col-md-4">
        <label class="form-label text-white">
          <i class="bi bi-trophy-fill text-warning me-1"></i>
          1° Campeón
        </label>
        <select v-model="campeon" class="form-select bg-dark text-white border-warning">
          <option :value="null">Seleccionar...</option>
          <option v-for="pareja in parejasDisponibles" :key="pareja.id" :value="pareja.id">
            {{ pareja.nombre }} - {{ pareja.nombres_completos }}
          </option>
        </select>
      </div>

      <!-- Vicecampeón -->
      <div class="col-md-4">
        <label class="form-label text-white">
          <i class="bi bi-award-fill text-secondary me-1"></i>
          2° Vicecampeón
        </label>
        <select v-model="vicecampeon" class="form-select bg-dark text-white border-secondary">
          <option :value="null">Seleccionar...</option>
          <option 
            v-for="pareja in parejasDisponibles" 
            :key="pareja.id" 
            :value="pareja.id"
            :disabled="pareja.id === campeon"
          >
            {{ pareja.nombre }} - {{ pareja.nombres_completos }}
          </option>
        </select>
      </div>

      <!-- Tercer Lugar -->
      <div class="col-md-4">
        <label class="form-label text-white">
          <i class="bi bi-award text-warning me-1"></i>
          3° Tercer Lugar
        </label>
        <select v-model="tercerLugar" class="form-select bg-dark text-white border-warning">
          <option :value="null">Seleccionar...</option>
          <option 
            v-for="pareja in parejasDisponibles" 
            :key="pareja.id" 
            :value="pareja.id"
            :disabled="pareja.id === campeon || pareja.id === vicecampeon"
          >
            {{ pareja.nombre }} - {{ pareja.nombres_completos }}
          </option>
        </select>
      </div>
    </div>

    <div class="mt-4">
      <button 
        @click="guardarPodio" 
        class="btn btn-warning btn-lg w-100"
        :disabled="!campeon || !vicecampeon || !tercerLugar"
      >
        <i class="bi bi-check-circle me-2"></i>
        Guardar Podio Final
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'

const props = defineProps({
  parejas: Array
})

const emit = defineEmits(['podio-guardado'])

const campeon = ref(null)
const vicecampeon = ref(null)
const tercerLugar = ref(null)

const parejasDisponibles = props.parejas

const guardarPodio = async () => {
  const result = await Swal.fire({
    title: '¿Confirmar Podio Final?',
    html: `
      <div class="text-start">
        <p><strong>🥇 Campeón:</strong> ${parejasDisponibles.find(p => p.id === campeon.value)?.nombre}</p>
        <p><strong>🥈 Vicecampeón:</strong> ${parejasDisponibles.find(p => p.id === vicecampeon.value)?.nombre}</p>
        <p><strong>🥉 Tercer Lugar:</strong> ${parejasDisponibles.find(p => p.id === tercerLugar.value)?.nombre}</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#FFD700',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (!result.isConfirmed) return

  try {
    await axios.post('/admin/podio/definir', {
      campeon_id: campeon.value,
      vicecampeon_id: vicecampeon.value,
      tercer_lugar_id: tercerLugar.value
    })

    Swal.fire({
      icon: 'success',
      title: '¡Podio Definido!',
      text: 'El podio final ha sido guardado correctamente',
      confirmButtonColor: '#FFD700',
      background: '#1a1a1a',
      color: '#fff'
    })

    emit('podio-guardado')
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo guardar el podio',
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}
</script>

<style scoped>
.podium-manager {
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
}

.form-select:focus {
  border-color: #FFD700;
  box-shadow: 0 0 0 0.25rem rgba(255, 215, 0, 0.25);
}
</style>
