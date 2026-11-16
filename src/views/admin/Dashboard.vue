<script setup>
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const logout = async () => {
  try {
    await axios.post('/admin/logout')
  } catch (e) {
    /* la sesión ya no era válida */
  }
  localStorage.removeItem('admin_token')
  router.push('/admin')
}
</script>

<template>
  <div class="min-vh-100" style="background-color: #0f0f0f;">
    <div class="d-flex">
      <!-- Sidebar -->
      <div class="d-flex flex-column flex-shrink-0 p-3 text-white position-fixed start-0 top-0 bottom-0" style="width: 280px; background-color: #1a1a1a; z-index: 1100; border-right: 2px solid #003DA5; overflow-y: auto;">
        <div class="text-center mb-4 pb-3 border-bottom border-quito-gold">
          <div class="display-4 mb-2">🎴</div>
          <h5 class="fw-bold">Panel Admin</h5>
          <span class="badge bg-quito-gold text-dark">Torneo de 40</span>
        </div>

        <ul class="nav nav-pills flex-column mb-auto">
          <li class="nav-item mb-2">
            <router-link to="/admin/dashboard" class="nav-link text-white" :class="{ 'active bg-quito-blue': route.path === '/admin/dashboard' }">
              <i class="bi bi-house-fill me-2"></i> Inicio
            </router-link>
          </li>
          <li class="nav-item mb-2">
            <router-link to="/admin/dashboard/inscripciones" class="nav-link text-white" :class="{ 'active bg-quito-blue': route.path === '/admin/dashboard/inscripciones' }">
              <i class="bi bi-pencil-square me-2"></i> Inscripciones
            </router-link>
          </li>
          <li class="nav-item mb-2">
            <router-link to="/admin/dashboard/parejas" class="nav-link text-white" :class="{ 'active bg-quito-blue': route.path === '/admin/dashboard/parejas' }">
              <i class="bi bi-people-fill me-2"></i> Gestión de Parejas
            </router-link>
          </li>
          <li class="nav-item mb-2">
            <router-link to="/admin/dashboard/bracket" class="nav-link text-white" :class="{ 'active bg-quito-blue': route.path === '/admin/dashboard/bracket' }">
              <i class="bi bi-trophy-fill me-2"></i> Gestión del Torneo
            </router-link>
          </li>
          <li class="nav-item mb-2">
            <router-link to="/admin/dashboard/reglas" class="nav-link text-white" :class="{ 'active bg-quito-blue': route.path === '/admin/dashboard/reglas' }">
              <i class="bi bi-file-text-fill me-2"></i> Reglas
            </router-link>
          </li>
        </ul>

        <hr style="border-color: #333;">

        <div class="d-grid gap-2">
          <a href="/40-Prolipa" target="_blank" class="btn btn-outline-light btn-sm">
            <i class="bi bi-eye-fill me-2"></i> Ver Sitio Público
          </a>
          <button @click="logout" class="btn btn-danger btn-sm">
            <i class="bi bi-box-arrow-right me-2"></i> Cerrar Sesión
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-grow-1 p-4" style="margin-left: 280px;">
        <div class="container-fluid">
          <div class="mb-4">
            <h5 class="text-white fw-bold">
              {{ route.name === 'AdminInscripciones' ? '📝 Inscripciones de Parejas' :
                 route.name === 'AdminParejas' ? '👥 Gestión de Parejas' : 
                 route.name === 'AdminBracket' ? '🏆 Gestión del Torneo' :
                 route.name === 'AdminReglas' ? '📜 Reglas del Juego' : '🏠 Panel de Control' }}
            </h5>
            <hr class="border-quito-blue">
          </div>
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>
