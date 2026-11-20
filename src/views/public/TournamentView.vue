<template>
  <div class="public-layout">
    <div class="contenedor" :class="{ ancho: $route.name === 'PublicSala' }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="$route.fullPath" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 60vh;
}
.contenedor {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 1rem;
}
.contenedor.ancho {
  max-width: none;
}
@media (min-width: 992px) {
  .contenedor {
    padding: 0 1.5rem;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-from {
  transform: translateY(6px);
}
</style>
