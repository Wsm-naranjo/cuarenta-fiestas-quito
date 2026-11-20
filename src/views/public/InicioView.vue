<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usuarios, escucharParejas } from '../../online/inscripciones'
import { escucharTorneo, nombrePareja } from '../../online/torneo'

const totalUsuarios = ref(null)
const parejas = ref(null)
const torneo = ref(undefined) // undefined = cargando, null = sin torneo
const offs = []

onMounted(async () => {
  usuarios().then((l) => (totalUsuarios.value = l.length)).catch(() => {})
  offs.push(escucharParejas((l) => (parejas.value = l.length)))
  offs.push(escucharTorneo((t) => (torneo.value = t)))
})
onUnmounted(() => offs.forEach((f) => f?.()))

/** En qué etapa está el torneo: cambia el mensaje principal y el botón */
const etapa = computed(() => {
  const t = torneo.value
  if (t === undefined) return 'cargando'
  if (!t) return 'abiertas'
  if (!t.sorteado) return 'cerradas'
  return t.campeon ? 'terminado' : 'en_curso'
})
const ETAPAS = {
  cargando: { chip: 'Cargando…', clase: '', icono: 'bi-hourglass', cta: null },
  abiertas: { chip: 'Inscripciones abiertas', clase: 'chip-gold', vivo: true, cta: { to: '/40-Prolipa/parejas', icono: 'bi-pencil-square', texto: 'Inscribir mi pareja' } },
  cerradas: { chip: 'Inscripciones cerradas · pronto el sorteo', clase: 'chip-amber', icono: 'bi-lock-fill', cta: { to: '/40-Prolipa/parejas', icono: 'bi-people-fill', texto: 'Ver las parejas' } },
  en_curso: { chip: 'Torneo en marcha', clase: 'chip-gold', vivo: true, cta: { to: '/40-Prolipa/torneo', icono: 'bi-trophy-fill', texto: 'Ver el cuadro' } },
  terminado: { chip: 'Torneo terminado', clase: 'chip-gold', icono: 'bi-trophy-fill', cta: { to: '/40-Prolipa/torneo', icono: 'bi-trophy-fill', texto: 'Ver el cuadro final' } },
}
const info = computed(() => ETAPAS[etapa.value])

const estado = computed(() => ({
  parejas: parejas.value,
  jugadores: parejas.value === null ? null : parejas.value * 2,
  colaboradores: totalUsuarios.value,
  libres: parejas.value === null || totalUsuarios.value === null ? null : totalUsuarios.value - parejas.value * 2,
}))

const pasos = [
  { n: 1, titulo: 'Busca tu nombre', texto: 'Escribe tu nombre y apellido: aparecerás en la lista de colaboradores Prolipa.' },
  { n: 2, titulo: 'Elige a tu pareja', texto: 'Busca a tu compañero. Solo aparecen disponibles quienes aún no tienen pareja.' },
  { n: 3, titulo: '¡Listo!', texto: 'Tu pareja queda inscrita y aparece en la lista de parejas al instante.' },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero mb-4">
      <div class="row align-items-center g-4">
        <div class="col-lg-7">
          <span class="chip mb-3" :class="info.clase">
            <span v-if="info.vivo" class="punto-vivo"></span><i v-else class="bi" :class="info.icono"></i>{{ info.chip }}
          </span>
          <h1 class="hero-title">Torneo de <span class="text-quito-gold">40</span> Prolipa</h1>
          <p class="hero-text">
            El juego de cartas más quiteño llega a la oficina. Arma tu pareja con un compañero de Prolipa,
            repasa las reglas y practica contra la máquina antes del gran día.
          </p>
          <div v-if="etapa === 'terminado'" class="campeones mt-3">
            <i class="bi bi-trophy-fill"></i>
            <div class="min-w-0">
              <div class="small text-uppercase fw-bold text-soft">Campeones</div>
              <div class="nombre text-truncate">{{ nombrePareja(torneo, torneo.campeon) }}</div>
            </div>
          </div>

          <div class="acciones mt-4">
            <router-link v-if="info.cta" :to="info.cta.to" class="btn btn-quito-gold btn-lg">
              <i class="bi me-2" :class="info.cta.icono"></i>{{ info.cta.texto }}
            </router-link>
            <router-link to="/40-Prolipa/practica" class="btn btn-outline-light btn-lg">
              <i class="bi bi-controller me-2"></i>Practicar
            </router-link>
          </div>
        </div>
        <div class="col-lg-5 d-none d-lg-block">
          <div class="abanico" aria-hidden="true">
            <div class="naipe n1"><span>A</span><b>♥</b></div>
            <div class="naipe n2 negro"><span>7</span><b>♠</b></div>
            <div class="naipe n3"><span>J</span><b>♦</b></div>
            <div class="naipe n4 negro"><span>K</span><b>♣</b></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contadores -->
    <section class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="panel stat">
          <div class="valor"><span v-if="estado.parejas === null" class="esqueleto"></span><template v-else>{{ estado.parejas }}</template></div>
          <div class="etiqueta">Parejas inscritas</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="panel stat">
          <div class="valor"><span v-if="estado.libres === null" class="esqueleto"></span><template v-else>{{ estado.libres }}</template></div>
          <div class="etiqueta">Sin pareja todavía</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="panel stat">
          <div class="valor"><span v-if="estado.jugadores === null" class="esqueleto"></span><template v-else>{{ estado.jugadores }}</template></div>
          <div class="etiqueta">Jugadores inscritos</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="panel stat">
          <div class="valor"><span v-if="estado.colaboradores === null" class="esqueleto"></span><template v-else>{{ estado.colaboradores }}</template></div>
          <div class="etiqueta">Colaboradores Prolipa</div>
        </div>
      </div>
    </section>

    <!-- Pasos -->
    <section v-if="etapa === 'abiertas'" class="panel mb-4">
      <h2 class="h5 mb-3"><i class="bi bi-signpost-split text-quito-gold me-2"></i>¿Cómo me inscribo?</h2>
      <div class="row g-3">
        <div v-for="p in pasos" :key="p.n" class="col-md-4">
          <div class="d-flex gap-3">
            <div class="paso-n">{{ p.n }}</div>
            <div>
              <div class="fw-bold">{{ p.titulo }}</div>
              <div class="small text-soft">{{ p.texto }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Accesos -->
    <section class="row g-3">
      <div class="col-md-4">
        <router-link to="/40-Prolipa/parejas" class="acceso panel panel-link h-100 d-block">
          <i class="bi bi-people-fill"></i>
          <div class="titulo-acceso">Parejas formadas <i class="bi bi-arrow-right flecha"></i></div>
          <div class="small text-soft">Mira quién ya está inscrito y con quién juega.</div>
        </router-link>
      </div>
      <div class="col-md-4">
        <router-link to="/40-Prolipa/reglas" class="acceso panel panel-link h-100 d-block">
          <i class="bi bi-book-fill"></i>
          <div class="titulo-acceso">Reglas Prolipa <i class="bi bi-arrow-right flecha"></i></div>
          <div class="small text-soft">Las reglas oficiales del torneo Prolipa.</div>
        </router-link>
      </div>
      <div class="col-md-4">
        <router-link to="/40-Prolipa/practica" class="acceso panel panel-link h-100 d-block">
          <i class="bi bi-controller"></i>
          <div class="titulo-acceso">Simulador de práctica <i class="bi bi-arrow-right flecha"></i></div>
          <div class="small text-soft">Juega contra la máquina o crea una sala para jugar con tus compañeros.</div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding: 0.5rem 0;
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
@media (max-width: 575.98px) {
  .acciones .btn {
    flex: 1 1 0;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    font-size: 0.98rem;
  }
}
.campeones {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  max-width: 100%;
  padding: 0.75rem 1.1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 215, 0, 0.45);
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.16), rgba(255, 215, 0, 0.03));
}
.campeones > i {
  font-size: 2rem;
  color: var(--quito-gold);
}
.campeones .nombre {
  font-family: var(--fuente-titulos);
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--quito-gold);
}
.min-w-0 {
  min-width: 0;
}
.titulo-acceso {
  font-family: var(--fuente-titulos);
  font-weight: 700;
  font-size: 1.1rem;
  margin-top: 0.6rem;
}
.flecha {
  font-size: 0.9rem;
  color: var(--texto-tenue);
  transition: transform 0.15s ease, color 0.15s ease;
}
.acceso:hover .flecha {
  transform: translateX(3px);
  color: var(--quito-gold);
}
.hero-title {
  font-weight: 900;
  font-size: clamp(2.2rem, 6vw, 3.6rem);
  line-height: 1.05;
}
.hero-text {
  color: rgba(255, 255, 255, 0.72);
  font-size: 1.1rem;
  max-width: 56ch;
  margin-top: 1rem;
}
.abanico {
  position: relative;
  height: 260px;
}
.naipe {
  position: absolute;
  left: 50%;
  bottom: 10px;
  width: 120px;
  height: 170px;
  margin-left: -60px;
  border-radius: 12px;
  background: #fff;
  color: #d0021b;
  border: 2px solid #ddd;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  transform-origin: 50% 120%;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.naipe span {
  font-weight: 900;
  font-size: 1.6rem;
  line-height: 1;
}
.naipe b {
  align-self: center;
  font-size: 3.4rem;
  line-height: 1;
  margin-bottom: 30px;
}
.naipe.negro {
  color: #111;
}
.n1 { transform: rotate(-24deg); }
.n2 { transform: rotate(-8deg); }
.n3 { transform: rotate(8deg); }
.n4 { transform: rotate(24deg); border-color: #ffd700; }
.stat .valor {
  font-family: var(--fuente-titulos);
  font-size: 2rem;
  font-weight: 900;
  color: #ffd700;
  line-height: 1.1;
}
.stat .etiqueta {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}
.paso-n {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #003da5;
  border: 2px solid #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}
.acceso i {
  font-size: 1.6rem;
  color: #ffd700;
}
</style>
