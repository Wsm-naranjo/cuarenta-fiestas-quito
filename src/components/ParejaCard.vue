<script setup>
import Avatar from './Avatar.vue'

defineProps({
  pareja: { type: Object, required: true },
  resaltar: { type: Boolean, default: false },
})
</script>

<template>
  <div class="pareja-card" :class="{ resaltar }">
    <div class="d-flex justify-content-between align-items-start mb-3 gap-2">
      <div class="min-w-0">
        <div class="numero">Pareja #{{ pareja.numero }}</div>
        <div class="nombre text-truncate" :class="{ 'sin-nombre': !pareja.nombre_pareja }">{{ pareja.nombre_pareja || 'Sin nombre de pareja' }}</div>
      </div>
      <span v-if="pareja.estado === 'pendiente'" class="chip chip-amber"><i class="bi bi-hourglass-split"></i>Pendiente</span>
      <span v-else class="chip chip-green"><i class="bi bi-check2-circle"></i>Inscrita</span>
    </div>

    <div v-for="j in [pareja.jugador1, pareja.jugador2]" :key="j.id" class="d-flex align-items-center gap-2 jugador">
      <Avatar :usuario="j" size="sm" />
      <div class="min-w-0">
        <div class="fw-semibold text-truncate">{{ j.nombre }}</div>
        <div class="small text-soft text-truncate">{{ j.departamento }}<span v-if="j.cargo"> · {{ j.cargo }}</span></div>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.pareja-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--superficie-2), var(--superficie));
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  padding: 1.1rem 1.2rem 1.1rem 1.35rem;
  height: 100%;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.pareja-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--quito-blue), var(--quito-red));
  transition: background 0.15s ease;
}
.pareja-card:hover {
  transform: translateY(-2px);
  border-color: var(--borde-fuerte);
}
.pareja-card:hover::before,
.pareja-card.resaltar::before {
  background: var(--quito-gold);
}
.pareja-card.resaltar {
  border-color: rgba(255, 215, 0, 0.6);
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.25);
}
.numero {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffd700;
  font-weight: 700;
}
.nombre {
  font-family: var(--fuente-titulos);
  font-weight: 700;
  font-size: 1.1rem;
}
.nombre.sin-nombre {
  color: var(--texto-tenue);
  font-weight: 600;
  font-size: 1rem;
}
.jugador + .jugador {
  margin-top: 0.6rem;
}
.min-w-0 {
  min-width: 0;
}
</style>
