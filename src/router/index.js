import { createRouter, createWebHashHistory } from 'vue-router'

// Hash (#/...) para que funcione en GitHub Pages al recargar o abrir un enlace directo
const routes = [
  {
    path: '/40-Prolipa',
    component: () => import('../views/public/TournamentView.vue'),
    children: [
      { path: '', name: 'PublicInicio', component: () => import('../views/public/InicioView.vue') },
      { path: 'inscripcion', name: 'PublicInscripcion', component: () => import('../views/public/InscripcionView.vue') },
      { path: 'parejas', name: 'PublicParejas', component: () => import('../views/public/ParejasView.vue') },
      { path: 'reglas', name: 'PublicReglas', component: () => import('../views/public/ReglasView.vue') },
      { path: 'practica', name: 'PublicPractica', component: () => import('../views/public/PracticaView.vue') },
      { path: 'practica/:codigo', name: 'PublicSala', component: () => import('../views/public/SalaView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/40-Prolipa' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
