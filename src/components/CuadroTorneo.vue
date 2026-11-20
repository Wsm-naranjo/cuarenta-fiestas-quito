<script setup>
import { BYE } from '../torneo/cuadro'
import { nombrePareja } from '../online/torneo'

const props = defineProps({
  torneo: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  ocultarPases: { type: Boolean, default: true },
})
const emit = defineEmits(['elegir'])

const nombre = (id) => (id ? nombrePareja(props.torneo, id) : 'Por definir')
const numero = (id) => props.torneo.parejas?.[id]?.numero

// En la primera ronda los pases libres no son partidos: se pueden esconder
const visibles = (ronda) => (props.ocultarPases && ronda.numero === 0 ? ronda.partidos.filter((p) => !p.pase) : ronda.partidos)
const pasesDirectos = (ronda) => (ronda.numero === 0 ? ronda.partidos.filter((p) => p.pase).map((p) => p.ganador) : [])

function marcador(p, lado) {
  const r = p.resultado
  if (!r) return ''
  if (r.wo) return r.g === p[lado] ? 'W.O.' : ''
  const v = lado === 'a' ? r.pa : r.pb
  return v ?? ''
}

function clase(p, lado) {
  const id = p[lado]
  return {
    ganador: p.ganador && p.ganador === id && id !== BYE,
    perdedor: p.ganador && p.ganador !== id && !p.pase,
    vacio: !id || id === BYE,
    tocable: props.editable && p.listo,
  }
}

function tocar(p) {
  if (props.editable && p.listo) emit('elegir', p)
}
</script>

<template>
  <div class="cuadro">
    <div v-for="ronda in torneo.rondas" :key="ronda.numero" class="ronda">
      <div class="ronda-titulo">{{ ronda.nombre }}</div>
      <div class="ronda-partidos">
        <div
          v-for="p in visibles(ronda)"
          :key="p.key"
          class="partido"
          :class="{ final: ronda.partidos.length === 1, tocable: editable && p.listo, pendiente: editable && p.listo && !p.ganador }"
          :role="editable && p.listo ? 'button' : undefined"
          :tabindex="editable && p.listo ? 0 : undefined"
          @click="tocar(p)"
          @keydown.enter="tocar(p)"
        >
          <div v-for="lado in ['a', 'b']" :key="lado" class="fila" :class="clase(p, lado)">
            <span v-if="numero(p[lado])" class="num">{{ numero(p[lado]) }}</span>
            <span class="nombre">{{ nombre(p[lado]) }}</span>
            <span class="pts">{{ marcador(p, lado) }}</span>
          </div>
          <div v-if="editable && p.listo" class="accion">{{ p.ganador ? 'Cambiar o deshacer' : 'Marcar ganador' }}</div>
        </div>
        <div v-if="ocultarPases && pasesDirectos(ronda).length" class="pases">
          <div class="pases-titulo"><i class="bi bi-skip-forward-fill"></i> Pasan directo a la siguiente ronda</div>
          <div v-for="id in pasesDirectos(ronda)" :key="id" class="pase">
            <span v-if="numero(id)" class="num">{{ numero(id) }}</span>{{ nombre(id) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cuadro {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  align-items: stretch;
}
.ronda {
  flex: 0 0 250px;
  display: flex;
  flex-direction: column;
}
.ronda-titulo {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: #ffd700;
  margin-bottom: 0.6rem;
  text-align: center;
}
.ronda-partidos {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 0.75rem;
  flex: 1;
}
.partido {
  background: #181818;
  border: 1px solid #2f2f2f;
  border-radius: 12px;
  overflow: hidden;
}
.partido.final {
  border-color: #ffd700;
  box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.3);
}
.partido.tocable {
  cursor: pointer;
}
.partido.tocable:hover,
.partido.tocable:focus-visible {
  border-color: #7fb2ff;
  outline: none;
}
.partido.pendiente {
  border-color: #3d6fc4;
}
.fila {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  font-size: 0.9rem;
}
.fila + .fila {
  border-top: 1px solid #262626;
}
.fila .nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fila .pts {
  font-weight: 800;
  min-width: 1.5rem;
  text-align: right;
}
.fila.ganador {
  background: rgba(255, 215, 0, 0.12);
  font-weight: 800;
  color: #ffd700;
}
.fila.perdedor {
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
}
.fila.vacio {
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
}
.num {
  font-size: 0.7rem;
  font-weight: 800;
  background: #2a2a2a;
  border-radius: 6px;
  padding: 0.05rem 0.35rem;
  color: rgba(255, 255, 255, 0.7);
}
.accion {
  font-size: 0.72rem;
  text-align: center;
  padding: 0.25rem;
  background: #1f2a3d;
  color: #a9c8ff;
}
.pases {
  border: 1px dashed #3a3a3a;
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  font-size: 0.85rem;
}
.pases-titulo {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 0.35rem;
}
.pase {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.15rem 0;
}
</style>
