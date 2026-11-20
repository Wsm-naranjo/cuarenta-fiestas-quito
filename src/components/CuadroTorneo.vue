<script setup>
import { computed } from 'vue'
import { BYE } from '../torneo/cuadro'
import { nombrePareja } from '../online/torneo'

const props = defineProps({
  torneo: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  ocultarPases: { type: Boolean, default: true },
  /** Modo organizar: en la 1.ª ronda se toca cada lugar para mover o cambiar parejas */
  organizar: { type: Boolean, default: false },
})
const emit = defineEmits(['elegir', 'lugar'])

const nombre = (id) => (id ? nombrePareja(props.torneo, id) : 'Por definir')
const numero = (id) => props.torneo.parejas?.[id]?.numero
const ultima = computed(() => props.torneo.rondas.length - 1)

// En la primera ronda los pases libres no son partidos: se pueden esconder
const visibles = (ronda) => (props.ocultarPases && ronda.numero === 0 ? ronda.partidos.filter((p) => !p.pase) : ronda.partidos)
const pasesDirectos = (ronda) => (ronda.numero === 0 ? ronda.partidos.filter((p) => p.pase && p.ganador !== BYE).map((p) => p.ganador) : [])

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
    lugar: props.organizar && p.ronda === 0,
  }
}

const sePuedeElegir = (p) => !props.organizar && props.editable && p.listo

function tocar(p) {
  if (sePuedeElegir(p)) emit('elegir', p)
}
function tocarLugar(p, lado) {
  if (props.organizar && p.ronda === 0) emit('lugar', { indice: p.indice, lado, id: p[lado] })
}
</script>

<template>
  <div class="cuadro" :class="{ organizando: organizar }">
    <div v-for="ronda in torneo.rondas" :key="ronda.numero" class="ronda" :class="{ 'es-final': ronda.numero === ultima }">
      <div class="ronda-titulo">
        <i v-if="ronda.numero === ultima" class="bi bi-trophy-fill"></i>{{ ronda.nombre }}
      </div>
      <div class="ronda-partidos">
        <div
          v-for="p in visibles(ronda)"
          :key="p.key"
          class="partido"
          :class="{
            final: ronda.numero === ultima,
            tocable: sePuedeElegir(p),
            pendiente: sePuedeElegir(p) && !p.ganador,
            apagado: organizar && p.ronda > 0,
          }"
          :role="sePuedeElegir(p) ? 'button' : undefined"
          :tabindex="sePuedeElegir(p) ? 0 : undefined"
          @click="tocar(p)"
          @keydown.enter="tocar(p)"
        >
          <div
            v-for="lado in ['a', 'b']"
            :key="lado"
            class="fila"
            :class="clase(p, lado)"
            :role="organizar && p.ronda === 0 ? 'button' : undefined"
            :tabindex="organizar && p.ronda === 0 ? 0 : undefined"
            @click="tocarLugar(p, lado)"
            @keydown.enter="tocarLugar(p, lado)"
          >
            <span v-if="numero(p[lado])" class="num">{{ numero(p[lado]) }}</span>
            <span class="nombre" :title="nombre(p[lado])">{{ p[lado] === BYE ? 'Pase libre' : nombre(p[lado]) }}</span>
            <i v-if="p.ganador && p.ganador === p[lado] && !p.pase" class="bi bi-check-circle-fill marca-ganador"></i>
            <span class="pts">{{ marcador(p, lado) }}</span>
            <i v-if="organizar && p.ronda === 0" class="bi bi-arrow-left-right mover"></i>
          </div>
          <div v-if="sePuedeElegir(p)" class="accion">
            <i class="bi" :class="p.ganador ? 'bi-pencil' : 'bi-hand-index'"></i>{{ p.ganador ? 'Cambiar o deshacer' : 'Marcar ganador' }}
          </div>
        </div>

        <div v-if="ocultarPases && pasesDirectos(ronda).length" class="pases">
          <div class="pases-titulo"><i class="bi bi-skip-forward-fill"></i> Pasan directo a la siguiente ronda</div>
          <div v-for="id in pasesDirectos(ronda)" :key="id" class="pase">
            <span v-if="numero(id)" class="num">{{ numero(id) }}</span><span class="nombre">{{ nombre(id) }}</span>
          </div>
        </div>

        <!-- Tercer lugar, debajo de la final -->
        <template v-if="ronda.numero === ultima && torneo.tercerLugar">
          <div class="ronda-titulo tercer-titulo"><i class="bi bi-award-fill"></i>Tercer lugar</div>
          <div
            class="partido tercer"
            :class="{ tocable: sePuedeElegir(torneo.tercerLugar), pendiente: sePuedeElegir(torneo.tercerLugar) && !torneo.tercerLugar.ganador, apagado: organizar }"
            :role="sePuedeElegir(torneo.tercerLugar) ? 'button' : undefined"
            :tabindex="sePuedeElegir(torneo.tercerLugar) ? 0 : undefined"
            @click="tocar(torneo.tercerLugar)"
            @keydown.enter="tocar(torneo.tercerLugar)"
          >
            <div v-for="lado in ['a', 'b']" :key="lado" class="fila" :class="clase(torneo.tercerLugar, lado)">
              <span v-if="numero(torneo.tercerLugar[lado])" class="num">{{ numero(torneo.tercerLugar[lado]) }}</span>
              <span class="nombre">{{ torneo.tercerLugar[lado] === BYE ? '—' : nombre(torneo.tercerLugar[lado]) }}</span>
              <i
                v-if="torneo.tercerLugar.ganador && torneo.tercerLugar.ganador === torneo.tercerLugar[lado] && !torneo.tercerLugar.pase"
                class="bi bi-check-circle-fill marca-ganador"
              ></i>
              <span class="pts">{{ marcador(torneo.tercerLugar, lado) }}</span>
            </div>
            <div v-if="sePuedeElegir(torneo.tercerLugar)" class="accion">
              <i class="bi" :class="torneo.tercerLugar.ganador ? 'bi-pencil' : 'bi-hand-index'"></i>{{ torneo.tercerLugar.ganador ? 'Cambiar o deshacer' : 'Marcar ganador' }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cuadro {
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  align-items: stretch;
  scroll-snap-type: x proximity;
}
.ronda {
  flex: 1 0 250px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  scroll-snap-align: start;
}
.ronda-titulo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--texto-suave);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--borde);
}
.es-final > .ronda-titulo {
  color: var(--quito-gold);
}
.tercer-titulo {
  margin: 1.25rem 0 0.6rem;
  color: #d9a35b;
}
.ronda-partidos {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}
.partido {
  min-width: 0;
  background: #101218;
  border: 1px solid var(--borde);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.partido.final {
  border-color: rgba(255, 215, 0, 0.7);
  box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.08), 0 10px 30px rgba(255, 215, 0, 0.06);
}
.partido.tercer {
  border-color: rgba(217, 163, 91, 0.6);
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
.partido.apagado {
  opacity: 0.4;
}
.fila {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
}
.fila + .fila {
  border-top: 1px solid var(--borde);
}
.fila .nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fila .pts {
  font-family: var(--fuente-titulos);
  font-weight: 800;
  min-width: 1.5rem;
  text-align: right;
}
.fila.ganador {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.16), rgba(255, 215, 0, 0.04));
  font-weight: 700;
  color: var(--quito-gold);
}
.fila.perdedor {
  color: var(--texto-tenue);
}
.fila.perdedor .nombre {
  text-decoration: line-through;
  text-decoration-color: rgba(255, 255, 255, 0.3);
}
.fila.vacio {
  color: var(--texto-tenue);
  font-style: italic;
}
.fila.lugar {
  cursor: pointer;
}
.fila.lugar:hover,
.fila.lugar:focus-visible {
  background: #1f2a3d;
  outline: none;
}
.marca-ganador {
  font-size: 0.85rem;
}
.mover {
  font-size: 0.8rem;
  color: #7fb2ff;
}
.num {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 800;
  min-width: 1.4rem;
  text-align: center;
  background: #262a35;
  border-radius: 6px;
  padding: 0.1rem 0.3rem;
  color: rgba(255, 255, 255, 0.75);
  font-style: normal;
}
.accion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem;
  background: #172238;
  color: #a9c8ff;
}
.pases {
  border: 1px dashed var(--borde-fuerte);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  font-size: 0.85rem;
  min-width: 0;
}
.pases-titulo {
  font-size: 0.75rem;
  color: var(--texto-suave);
  margin-bottom: 0.4rem;
}
.pase {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  padding: 0.2rem 0;
  min-width: 0;
}
.pase .nombre {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 575.98px) {
  .ronda {
    flex-basis: 80%;
    max-width: none;
  }
}
</style>
