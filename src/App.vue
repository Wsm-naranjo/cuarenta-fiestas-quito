<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const enlaces = [
  { to: '/40-Prolipa', icon: 'bi-house-door', iconActivo: 'bi-house-door-fill', texto: 'Inicio', corto: 'Inicio', exacto: true },
  { to: '/40-Prolipa/parejas', icon: 'bi-people', iconActivo: 'bi-people-fill', texto: 'Parejas', corto: 'Parejas' },
  { to: '/40-Prolipa/torneo', icon: 'bi-trophy', iconActivo: 'bi-trophy-fill', texto: 'Torneo', corto: 'Torneo' },
  { to: '/40-Prolipa/reglas', icon: 'bi-book', iconActivo: 'bi-book-fill', texto: 'Reglas', corto: 'Reglas' },
  { to: '/40-Prolipa/practica', icon: 'bi-controller', iconActivo: 'bi-controller', texto: 'Practicar', corto: 'Jugar' },
]

const enJuego = computed(() => route.name === 'PublicSala')

const activo = (e) => (e.exacto ? route.path === e.to || route.path === e.to + '/' : route.path.startsWith(e.to))
</script>

<template>
  <div class="app" :class="{ 'en-juego': enJuego }">
    <header class="barra-superior">
      <div class="franja" aria-hidden="true"></div>
      <nav class="contenido-barra" aria-label="Principal">
        <router-link to="/40-Prolipa" class="marca" aria-label="Cuarenta Prolipa, inicio">
          <span class="marca-carta">40</span>
          <span class="marca-texto">
            <span class="marca-nombre">Cuarenta Prolipa</span>
            <span class="marca-sub">Fiestas de Quito</span>
          </span>
        </router-link>

        <ul class="enlaces">
          <li v-for="e in enlaces" :key="e.to">
            <router-link :to="e.to" class="enlace" :class="{ activo: activo(e) }" :aria-current="activo(e) ? 'page' : undefined">
              <i class="bi" :class="activo(e) ? e.iconActivo : e.icon"></i>
              <span>{{ e.texto }}</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </header>

    <main class="principal" :class="enJuego ? 'py-2' : 'py-4 py-lg-5'">
      <router-view />
    </main>

    <footer v-if="!enJuego" class="pie">
      <span class="marca-carta pequena">40</span>
      <div>
        <div class="fw-semibold">Cuarenta Prolipa · Fiestas de Quito {{ new Date().getFullYear() }}</div>
        <div class="text-quito-gold small fw-bold">¡Caída, limpia y a los 40!</div>
      </div>
    </footer>

    <!-- Barra de pestañas en el celular -->
    <nav v-if="!enJuego" class="barra-inferior" aria-label="Secciones">
      <router-link
        v-for="e in enlaces"
        :key="e.to"
        :to="e.to"
        class="pestana"
        :class="{ activo: activo(e) }"
        :aria-current="activo(e) ? 'page' : undefined"
      >
        <span class="pestana-icono"><i class="bi" :class="activo(e) ? e.iconActivo : e.icon"></i></span>
        <span class="pestana-texto">{{ e.corto }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ---------- Barra superior ---------- */
.barra-superior {
  position: sticky;
  top: 0;
  z-index: 1030;
  background: rgba(11, 12, 16, 0.82);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.franja {
  height: 3px;
  background: linear-gradient(90deg, var(--quito-blue) 0 45%, var(--quito-red) 45% 90%, var(--quito-gold) 90%);
}
.contenido-barra {
  max-width: 1240px;
  margin: 0 auto;
  height: 64px;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.marca {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #fff;
  text-decoration: none;
  flex-shrink: 0;
}
.marca-carta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 42px;
  border-radius: 6px;
  background: #fff;
  color: var(--quito-red);
  font-family: var(--fuente-titulos);
  font-weight: 900;
  font-size: 0.95rem;
  border: 2px solid var(--quito-gold);
  transform: rotate(-8deg);
  box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}
.marca-carta.pequena {
  width: 26px;
  height: 34px;
  font-size: 0.8rem;
}
.marca-texto {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.marca-nombre {
  font-family: var(--fuente-titulos);
  font-weight: 800;
  font-size: 1.1rem;
}
.marca-sub {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--quito-gold);
  letter-spacing: 0.02em;
}

.enlaces {
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.15rem;
}
.enlace {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 40px;
  padding: 0 0.85rem;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 500;
  font-size: 0.95rem;
  text-decoration: none;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.enlace i {
  font-size: 1rem;
}
.enlace:focus {
  outline: none;
}
.enlace:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(127, 178, 255, 0.7);
}
.enlace:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.enlace.activo {
  color: #fff;
  font-weight: 600;
  background: rgba(255, 215, 0, 0.1);
}
.enlace.activo i {
  color: var(--quito-gold);
}
.enlace.activo::after {
  content: '';
  position: absolute;
  left: 0.85rem;
  right: 0.85rem;
  bottom: -12px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--quito-gold);
}

/* ---------- Contenido ---------- */
.principal {
  flex: 1;
  width: 100%;
}

/* ---------- Pie ---------- */
.pie {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  padding: 1.5rem 1rem;
  margin-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--texto-suave);
  font-size: 0.85rem;
  text-align: left;
}

/* ---------- Barra inferior (celular) ---------- */
.barra-inferior {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1030;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom));
  background: rgba(14, 15, 20, 0.92);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.pestana {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.15rem 0;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 0.68rem;
  font-weight: 600;
  min-width: 0;
}
.pestana-icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  font-size: 1.15rem;
  transition: background-color 0.15s ease;
}
.pestana.activo {
  color: #fff;
}
.pestana.activo .pestana-icono {
  background: rgba(255, 215, 0, 0.16);
  color: var(--quito-gold);
}
.pestana-texto {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.app:not(.en-juego) {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}

@media (min-width: 992px) {
  .enlaces {
    display: flex;
  }
  .barra-inferior {
    display: none;
  }
  .app:not(.en-juego) {
    padding-bottom: 0;
  }
  .contenido-barra {
    padding: 0 1.5rem;
  }
}
@media (max-width: 991.98px) {
  .contenido-barra {
    height: 56px;
  }
}
</style>
