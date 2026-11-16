<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** { rango, simbolo, rojo } o un texto como "7♥" */
  carta: { type: [Object, String], default: null },
  oculta: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // xs | sm | md | lg
  jugable: { type: Boolean, default: false },
  resaltada: { type: Boolean, default: false },
  atenuada: { type: Boolean, default: false },
})

const c = computed(() => {
  if (!props.carta) return null
  if (typeof props.carta === 'string') {
    const simbolo = props.carta.slice(-1)
    return { rango: props.carta.slice(0, -1), simbolo, rojo: simbolo === '♥' || simbolo === '♦' }
  }
  return props.carta
})

const figura = computed(() => c.value && ['J', 'Q', 'K'].includes(c.value.rango))
const etiqueta = computed(() => {
  if (props.oculta || !c.value) return 'Carta boca abajo'
  const nombres = { A: 'As', J: 'Jota', Q: 'Reina', K: 'Rey' }
  const palos = { '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles', '♠': 'picas' }
  return `${nombres[c.value.rango] || c.value.rango} de ${palos[c.value.simbolo]}`
})
</script>

<template>
  <div
    class="naipe"
    :class="[`naipe-${size}`, { oculta, rojo: c?.rojo, jugable, resaltada, atenuada, figura }]"
    role="img"
    :aria-label="etiqueta"
  >
    <template v-if="!oculta && c">
      <div class="esquina sup"><span class="r">{{ c.rango }}</span><span class="s">{{ c.simbolo }}</span></div>
      <div class="centro">
        <span v-if="figura" class="fig">{{ c.rango }}</span>
        <span class="palo">{{ c.simbolo }}</span>
      </div>
      <div class="esquina inf"><span class="r">{{ c.rango }}</span><span class="s">{{ c.simbolo }}</span></div>
    </template>
    <div v-else class="dorso"><span>40</span></div>
  </div>
</template>

<style scoped>
.naipe {
  --w: 70px;
  position: relative;
  width: var(--w);
  height: calc(var(--w) * 1.42);
  border-radius: calc(var(--w) * 0.1);
  background: #fdfdfb;
  color: #1a1a1a;
  border: 1px solid #cfcfcf;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
  user-select: none;
  flex-shrink: 0;
  font-family: Georgia, 'Times New Roman', serif;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
}
.naipe-xs { --w: 34px; }
.naipe-sm { --w: 50px; }
.naipe-md { --w: 70px; }
.naipe-lg { --w: 92px; }
.naipe.rojo { color: #d0021b; }
.esquina {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 0.95;
  font-weight: 700;
}
.esquina .r { font-size: calc(var(--w) * 0.22); }
.esquina .s { font-size: calc(var(--w) * 0.18); }
.esquina.sup { top: calc(var(--w) * 0.05); left: calc(var(--w) * 0.07); }
.esquina.inf { bottom: calc(var(--w) * 0.05); right: calc(var(--w) * 0.07); transform: rotate(180deg); }
.naipe-xs .esquina.inf, .naipe-xs .centro { display: none; }
.naipe-xs .esquina .r { font-size: 13px; }
.naipe-xs .esquina .s { font-size: 11px; }
.centro {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.centro .palo { font-size: calc(var(--w) * 0.5); line-height: 1; }
.figura .centro {
  inset: 22% 18%;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: repeating-linear-gradient(45deg, rgba(255, 215, 0, 0.18) 0 4px, transparent 4px 8px);
  flex-direction: column;
}
.figura .centro .fig { font-size: calc(var(--w) * 0.34); font-weight: 900; line-height: 1; }
.figura .centro .palo { font-size: calc(var(--w) * 0.26); }

.oculta {
  background: #003da5;
  border: 2px solid #fff;
}
.dorso {
  position: absolute;
  inset: 4px;
  border-radius: calc(var(--w) * 0.07);
  background: repeating-linear-gradient(45deg, #e4002b 0 5px, #b80022 5px 10px);
  border: 1px solid #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dorso span {
  background: #ffd700;
  color: #003da5;
  font-weight: 900;
  font-size: calc(var(--w) * 0.2);
  padding: 1px 4px;
  border-radius: 4px;
  font-family: system-ui, sans-serif;
}
.naipe-xs .dorso span { display: none; }

.jugable { cursor: pointer; }
.jugable:hover, .jugable:focus-visible {
  transform: translateY(-10px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.55), 0 0 0 3px #ffd700;
}
.resaltada { box-shadow: 0 0 0 3px #ffd700, 0 6px 16px rgba(255, 215, 0, 0.35); }
.atenuada { opacity: 0.45; }
</style>
