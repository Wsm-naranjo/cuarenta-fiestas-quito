<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Swal from 'sweetalert2'

const password = ref('')
const router = useRouter()
const loading = ref(false)

const login = async () => {
  if (!password.value) {
    Swal.fire('Error', 'Ingresa la contraseña', 'warning')
    return
  }

  loading.value = true
  
  try {
    const response = await axios.post('/admin/login', {
      password: password.value
    })

    if (response.data.success) {
      localStorage.setItem('admin_token', response.data.token)
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
      router.push('/admin/dashboard')
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.data.message || 'Contraseña incorrecta'
      })
    }
  } catch (error) {
    console.error('Error completo:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error de conexión',
      html: `
        <p>No se pudo conectar con el servidor.</p>
        <p class="small mt-2">Error: ${error.message}</p>
        <p class="small">Verifica que Laragon esté corriendo</p>
      `
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(135deg, #003DA5 0%, #E4002B 100%);">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-5">
          <div class="card shadow-lg border-0" style="background-color: #1a1a1a;">
            <div class="card-body p-5">
              <div class="text-center mb-4">
                <div class="display-1 mb-3 animate-float">🎴</div>
                <h2 class="text-white fw-bold">Panel Admin</h2>
                <p class="text-quito-gold fw-bold">Torneo de 40 - Fiestas de Quito</p>
              </div>

              <form @submit.prevent="login">
                <div class="mb-4">
                  <label class="form-label text-white">Contraseña de Acceso</label>
                  <div class="input-group input-group-lg">
                    <span class="input-group-text bg-quito-blue text-white border-0">
                      <i class="bi bi-lock-fill"></i>
                    </span>
                    <input 
                      type="password" 
                      v-model="password"
                      class="form-control border-0 input-white"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  class="btn btn-quito-gold btn-lg w-100 fw-bold"
                  :disabled="loading"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ loading ? 'Verificando...' : 'Iniciar Sesión' }}
                </button>
              </form>

              <hr class="my-4" style="border-color: #333;">

              <div class="text-center">
                <small class="text-white-50">¿Problemas para ingresar?</small><br>
                <small class="text-white-50">Verifica que Laragon esté corriendo</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.input-white::placeholder {
  color: white !important;
  opacity: 1; /* porque a veces los navegadores lo bajan a 0.5-0.7 */
}

.input-white {
  background-color: #2d2d2d;
  color: white;
  border-color: #444;
}
</style>
