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
        <div class="nombre text-truncate">{{ pareja.nombre_pareja || 'Sin nombre de equipo' }}</div>
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
  background: linear-gradient(160deg, #1b1b1b, #141414);
  border: 1px solid #2c2c2c;
  border-left: 4px solid #003da5;
  border-radius: 14px;
  padding: 1rem 1.1rem;
  height: 100%;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.pareja-card:hover {
  transform: translateY(-2px);
  border-color: #444;
  border-left-color: #ffd700;
}
.pareja-card.resaltar {
  border-color: rgba(255, 215, 0, 0.6);
  border-left-color: #ffd700;
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
  font-weight: 800;
  font-size: 1.05rem;
}
.jugador + .jugador {
  margin-top: 0.6rem;
}
.min-w-0 {
  min-width: 0;
}
</style>
