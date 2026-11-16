<script setup>
import { computed } from 'vue'

const props = defineProps({
  usuario: { type: Object, required: true },
  size: { type: String, default: '' }, // '', 'sm', 'lg'
})

const COLORES = ['#003DA5', '#E4002B', '#B8860B', '#1F7A4D', '#6F42C1', '#C2410C', '#0E7490', '#9D174D']

const color = computed(() => {
  const s = String(props.usuario?.departamento || props.usuario?.nombre || '')
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COLORES[h % COLORES.length]
})
</script>

<template>
  <span class="avatar" :class="size ? 'avatar-' + size : ''" :style="{ background: color }" :title="usuario?.nombre">
    {{ usuario?.iniciales || '?' }}
  </span>
</template>
