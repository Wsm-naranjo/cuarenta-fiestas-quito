<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showMenu = ref(false)

watch(() => route.fullPath, () => (showMenu.value = false))

const enlaces = [
  { to: '/40-Prolipa', icon: 'bi-house-door', texto: 'Inicio', exacto: true },
  { to: '/40-Prolipa/inscripcion', icon: 'bi-pencil-square', texto: 'Inscripción' },
  { to: '/40-Prolipa/parejas', icon: 'bi-people', texto: 'Parejas' },
  { to: '/40-Prolipa/reglas', icon: 'bi-book', texto: 'Reglas' },
  { to: '/40-Prolipa/practica', icon: 'bi-controller', texto: 'Practicar' },
]

const enJuego = computed(() => route.name === 'PublicSala')

const activo = (e) => (e.exacto ? route.path === e.to || route.path === e.to + '/' : route.path.startsWith(e.to))
</script>

<template>
  <div class="min-vh-100 d-flex flex-column app-bg">
    <!-- Navbar pública -->
    <nav class="navbar navbar-expand-lg navbar-dark sticky-top nav-quito">
      <div class="container-fluid px-3 px-lg-4">
        <router-link to="/40-Prolipa" class="navbar-brand d-flex align-items-center gap-2">
          <span class="brand-card">40</span>
          <div class="lh-1">
            <div class="fw-bold">Cuarenta Prolipa</div>
            <small class="text-quito-gold fw-semibold brand-sub">Fiestas de Quito</small>
          </div>
        </router-link>

        <button class="navbar-toggler" type="button" aria-label="Abrir menú" @click="showMenu = !showMenu">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" :class="{ show: showMenu }">
          <ul class="navbar-nav ms-auto gap-1 py-2 py-lg-0">
            <li v-for="e in enlaces" :key="e.to" class="nav-item">
              <router-link :to="e.to" class="nav-link nav-pill" :class="{ activo: activo(e) }">
                <i class="bi me-1" :class="e.icon"></i>{{ e.texto }}
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="flex-grow-1" :class="enJuego ? 'py-2' : 'py-4'">
      <router-view />
    </main>

    <footer v-if="!enJuego" class="text-center py-4 mt-4 footer-quito">
      <p class="text-white-50 mb-1 small">Cuarenta Prolipa · Fiestas de Quito {{ new Date().getFullYear() }}</p>
      <p class="text-quito-gold small fw-bold mb-0">¡Caída, limpia y a los 40!</p>
    </footer>
  </div>
</template>

<style scoped>
.app-bg {
  background-color: #0f0f0f;
}
.nav-quito {
  background: linear-gradient(90deg, #003da5, #8a0b2e 70%, #e4002b);
  border-bottom: 3px solid #ffd700;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}
.brand-card {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 50px;
  border-radius: 6px;
  background: #fff;
  color: #e4002b;
  font-weight: 900;
  font-size: 1.05rem;
  border: 2px solid #ffd700;
  transform: rotate(-8deg);
  box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.35);
}
.brand-sub {
  font-size: 0.75rem;
}
.nav-pill {
  border-radius: 999px;
  padding: 0.4rem 0.9rem !important;
  color: rgba(255, 255, 255, 0.85) !important;
  font-weight: 500;
}
.nav-pill:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff !important;
}
.nav-pill.activo {
  background: #ffd700;
  color: #111 !important;
  font-weight: 700;
}
.footer-quito {
  background-color: #151515;
  border-top: 2px solid #003da5;
}
</style>
