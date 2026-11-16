<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import PodiumDisplay from '../../components/PodiumDisplay.vue'

const bracket = ref([])
const loading = ref(false)
const generating = ref(false)
const parejas = ref([])
const rankings = ref([])
const draggedCouple = ref(null)
const showAddCoupleModal = ref(false)

const parejasNoAsignadas = computed(() => {
  if (bracket.value.length === 0) return []
  
  const asignadas = new Set()
  bracket.value.forEach(ronda => {
    ronda.partidas.forEach(partida => {
      if (partida.pareja1) asignadas.add(partida.pareja1.id)
      if (partida.pareja2) asignadas.add(partida.pareja2.id)
    })
  })
  
  return parejas.value.filter(p => !asignadas.has(p.id) && !p.eliminada)
})

const parejasEliminadas = computed(() => {
  return parejas.value.filter(p => p.eliminada)
})

// Variables para las posiciones finales
const posicionFinal = ref({
  primero: '',
  segundo: '',
  tercero: '',
  cuarto: ''
})

const todasPosicionesCompletas = computed(() => {
  return posicionFinal.value.primero && 
         posicionFinal.value.segundo && 
         posicionFinal.value.tercero && 
         posicionFinal.value.cuarto
})

const obtenerNombreRonda = (ronda, partidas) => {
  // Siempre mostrar como "Ronda N"
  return `Ronda ${ronda}`
}

// Verificar si el torneo está finalizado (hay campeón)
const torneoFinalizado = computed(() => {
  return rankings.value.some(r => r.posicion === 1)
})

const cargarDatos = async () => {
  loading.value = true
  try {
    const [bracketRes, parejasRes, rankingsRes] = await Promise.all([
      axios.get('/public/bracket'),
      axios.get('/public/parejas'),
      axios.get('/public/rankings')
    ])
    bracket.value = bracketRes.data.bracket
    parejas.value = parejasRes.data.parejas
    rankings.value = rankingsRes.data.rankings
    
    // Mostrar alerta si se crearon semifinales
    if (bracketRes.data.fase === 'semifinales') {
      const haySemin = bracket.value.some(r => 
        r.partidas.some(p => p.tipo === 'semifinal')
      )
      if (haySemin) {
        Swal.fire({
          icon: 'info',
          title: '¡SEMIFINALES!',
          text: 'Se han clasificado las 4 mejores parejas',
          confirmButtonColor: '#FFD700',
          background: '#1a1a1a',
          color: '#fff',
          timer: 3000
        })
      }
    }
    
    // Mostrar alerta si se creó la final
    if (bracketRes.data.fase === 'final') {
      const hayFinal = bracket.value.some(r => 
        r.partidas.some(p => p.tipo === 'final')
      )
      if (hayFinal) {
        Swal.fire({
          icon: 'success',
          title: '¡FINAL Y TERCER LUGAR!',
          html: '<p>Las partidas finales han sido creadas</p>',
          confirmButtonColor: '#FFD700',
          background: '#1a1a1a',
          color: '#fff',
          timer: 3000
        })
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const puedeGenerarTorneo = computed(() => {
  return parejas.value.length >= 2
})

const generarTorneo = async () => {
  if (!puedeGenerarTorneo.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Parejas insuficientes',
      html: `
        <p>Necesitas al menos <strong>2 parejas</strong> para generar un torneo</p>
        <p class="mt-2">Actualmente tienes: <strong>${parejas.value.length}</strong> parejas</p>
      `,
      confirmButtonColor: '#003DA5',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  const result = await Swal.fire({
    title: '¿Generar nuevo torneo?',
    html: `
      <p>Se generará el torneo con <strong>${parejas.value.length}</strong> parejas</p>
      <p class="text-warning mt-2">⚠️ Se borrarán todos los resultados actuales o anteriores si es que existen</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, generar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#E4002B',
    cancelButtonColor: '#6c757d',
    background: '#1a1a1a',
    color: '#fff',
    width: '600px'
  })

  if (result.isConfirmed) {
    generating.value = true
    try {
      await axios.post('/admin/bracket/generar')
      await cargarDatos()
      Swal.fire({
        icon: 'success',
        title: '¡Torneo generado!',
        text: 'Las llaves han sido creadas correctamente',
        confirmButtonColor: '#FFD700',
        background: '#1a1a1a',
        color: '#fff'
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al generar el torneo',
        background: '#1a1a1a',
        color: '#fff'
      })
    } finally {
      generating.value = false
    }
  }
}

const registrarGanador = async (partida, ganadorId, nombreGanador) => {
  if (!partida.pareja1 || !partida.pareja2) {
    Swal.fire({
      icon: 'warning',
      title: 'Partida incompleta',
      text: 'Espera a que ambas parejas estén definidas',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  // Si ya es el ganador actual, preguntar si quiere limpiar
  if (partida.ganador_id === ganadorId) {
    const limpiar = await Swal.fire({
      title: '¿Limpiar ganador?',
      html: `
        <p>¿Deseas quitar el ganador de esta partida?</p>
        <p class="mt-2 text-info">Esto desbloqueará el drag & drop</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c757d',
      background: '#1a1a1a',
      color: '#fff'
    })
    
    if (!limpiar.isConfirmed) return

    try {
      await axios.post(`/admin/partidas/${partida.id}/limpiar-ganador`)
      await cargarDatos()
      Swal.fire({
        icon: 'success',
        title: 'Ganador limpiado',
        text: 'Ahora puedes usar drag & drop',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo limpiar el ganador',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
    return
  }

  if (partida.completada) {
    const cambiar = await Swal.fire({
      title: '¿Cambiar ganador?',
      html: `
        <p>Esta partida ya tiene un ganador registrado</p>
        <p class="mt-2">¿Deseas cambiar el resultado?</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E4002B',
      background: '#1a1a1a',
      color: '#fff'
    })
    
    if (!cambiar.isConfirmed) return
  }

  const result = await Swal.fire({
    title: partida.completada ? '¿Confirmar nuevo ganador?' : '¿Confirmar ganador?',
    html: `
      <div class="text-center">
        <p class="mb-3">Ganador de la partida:</p>
        <h4 class="text-warning">${nombreGanador}</h4>
        <p class="mt-3 text-warning">Esta acción avanzará al ganador a la siguiente ronda</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#FFD700',
    cancelButtonColor: '#6c757d',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (result.isConfirmed) {
    try {
      const response = await axios.post(`/admin/partidas/${partida.id}/resultado`, {
        ganador_id: ganadorId
      })
      
      await cargarDatos()
      
      // Verificar si el torneo finalizó
      if (response.data.torneo_finalizado) {
        // TORNEO FINALIZADO - Mostrar podio
        const rankings = await axios.get('/public/rankings')
        const podio = rankings.data.rankings.filter(r => r.posicion <= 4)
        
        let mensajePodio = '<div class="podio-final" style="text-align: center;">'
        mensajePodio += '<h3 style="color: #FFD700; margin-bottom: 20px;">🏆 PODIO FINAL 🏆</h3>'
        
        podio.forEach(p => {
          const color = p.posicion === 1 ? '#FFD700' : p.posicion === 2 ? '#C0C0C0' : p.posicion === 3 ? '#CD7F32' : '#fff'
          const icono = p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : p.posicion === 3 ? '🥉' : '4️⃣'
          mensajePodio += `<div style="margin: 15px 0; padding: 10px; background: #2a2a2a; border-radius: 8px;">`
          mensajePodio += `<h4 style="color: ${color}; margin: 5px 0;">${icono} ${p.posicion}° LUGAR</h4>`
          mensajePodio += `<p style="color: #fff; font-size: 18px; margin: 5px 0;">${p.nombre}</p>`
          mensajePodio += `<p style="color: #999; font-size: 14px;">${p.nombres_completos}</p>`
          mensajePodio += `</div>`
        })
        
        mensajePodio += '</div>'
        
        Swal.fire({
          icon: 'success',
          title: response.data.message || '¡TORNEO FINALIZADO!',
          html: mensajePodio,
          confirmButtonText: 'Ver Podio Completo',
          confirmButtonColor: '#FFD700',
          background: '#1a1a1a',
          color: '#fff',
          width: '600px'
        })
      } else {
        // Resultado normal
        let mensaje = partida.completada ? '¡Ganador actualizado!' : '¡Resultado registrado!'
        
        if (response.data.message) {
          mensaje = response.data.message
        }
        
        Swal.fire({
          icon: 'success',
          title: mensaje,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar el resultado',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

const avanzarPareja = async (partida, pareja) => {
  // Verificar si hay oponente
  const tieneOponente = partida.pareja1 && partida.pareja2
  
  const result = await Swal.fire({
    title: '¿Pasar a siguiente ronda?',
    html: `
      <p>¿Deseas avanzar a <strong>${pareja.nombre}</strong> a la siguiente ronda?</p>
      ${tieneOponente ? '<p class="text-success mt-2">✓ Esto declarará a esta pareja como ganadora</p>' : '<p class="text-info mt-2">ℹ️ Esta pareja avanzará sin rival</p>'}
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, avanzar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#28a745',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (!result.isConfirmed) return

  try {
    // Declarar como ganador (esto marca al perdedor automáticamente)
    await axios.post(`/admin/partidas/${partida.id}/resultado`, {
      ganador_id: pareja.id
    })
    await cargarDatos()
    
    const mensaje = tieneOponente ? '¡Ganador declarado y avanzado!' : '¡Pareja avanzada!'
    
    Swal.fire({
      icon: 'success',
      title: mensaje,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    })
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo avanzar la pareja',
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}

const regresarDeRonda = async (partida) => {
  const result = await Swal.fire({
    title: '¿Regresar de ronda?',
    html: `
      <p>¿Deseas limpiar el resultado de esta partida?</p>
      <p class="text-warning mt-2">⚠️ Esto también limpiará el avance a la siguiente ronda</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, regresar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ffc107',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (!result.isConfirmed) return

  try {
    await axios.post(`/admin/partidas/${partida.id}/limpiar-ganador`)
    await cargarDatos()
    Swal.fire({
      icon: 'success',
      title: 'Partida limpiada',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    })
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo limpiar la partida',
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}

// Drag and Drop
const onDragStart = (pareja, event) => {
  draggedCouple.value = pareja
  event.dataTransfer.effectAllowed = 'move'
}

const onDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

const onDrop = async (partida, posicion, event) => {
  event.preventDefault()
  
  if (!draggedCouple.value) return

  // Obtener la pareja que está actualmente en esa posición
  const parejaActual = posicion === 1 ? partida.pareja1 : partida.pareja2
  
  // Validación: No permitir que la misma pareja esté en ambas posiciones
  const parejaContraria = posicion === 1 ? partida.pareja2 : partida.pareja1
  if (parejaContraria && parejaContraria.id === draggedCouple.value.id) {
    Swal.fire({
      icon: 'error',
      title: 'Movimiento Inválido',
      html: `
        <p>No puedes asignar la misma pareja en ambas posiciones de la partida.</p>
        <p class="text-warning mt-2">Una pareja no puede jugar contra sí misma.</p>
      `,
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#E4002B'
    })
    draggedCouple.value = null
    return
  }
  
  // Si no hay pareja actual, es una asignación simple
  if (!parejaActual) {
    try {
      await axios.post(`/admin/partidas/${partida.id}/asignar-pareja`, {
        pareja_id: draggedCouple.value.id,
        posicion: posicion
      })
      
      await cargarDatos()
      
      Swal.fire({
        icon: 'success',
        title: '¡Pareja asignada!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo asignar la pareja',
        background: '#1a1a1a',
        color: '#fff'
      })
    } finally {
      draggedCouple.value = null
    }
    return
  }

  // Si hay pareja, es un intercambio
  // Buscar de dónde viene la pareja arrastrada EN LA MISMA RONDA
  let partidaOrigen = null
  let posicionOrigen = null
  let rondaOrigen = null

  // Primero obtener la ronda destino
  const rondaDestino = bracket.value.find(r => r.partidas.some(p => p.id === partida.id))?.numero_ronda

  // Buscar la pareja EN LA MISMA RONDA
  for (const ronda of bracket.value) {
    // Solo buscar en la ronda del destino
    if (ronda.numero_ronda !== rondaDestino) continue
    
    for (const p of ronda.partidas) {
      if (p.pareja1?.id === draggedCouple.value.id) {
        partidaOrigen = p
        posicionOrigen = 1
        rondaOrigen = ronda.numero_ronda
        break
      }
      if (p.pareja2?.id === draggedCouple.value.id) {
        partidaOrigen = p
        posicionOrigen = 2
        rondaOrigen = ronda.numero_ronda
        break
      }
    }
    if (partidaOrigen) break
  }

  if (!partidaOrigen) {
    draggedCouple.value = null
    return
  }

  // Validación: No permitir si LA PARTIDA ORIGEN tiene ganador
  if (partidaOrigen.ganador_id) {
    Swal.fire({
      icon: 'error',
      title: 'Partida Completada',
      html: `
        <p>La partida de origen ya tiene un ganador declarado.</p>
        <p class="text-info mt-2">💡 Para hacer cambios, usa la opción <strong>"Asignar Perdedores"</strong> desde el menú de opciones.</p>
      `,
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#E4002B'
    })
    draggedCouple.value = null
    return
  }

  // INTERCAMBIO COMPLETO (misma ronda)
  try {
    // PASO 1: Asignar pareja arrastrada al destino
    await axios.post(`/admin/partidas/${partida.id}/asignar-pareja`, {
      pareja_id: draggedCouple.value.id,
      posicion: posicion
    })

    // PASO 2: Asignar pareja destino al origen (intercambio)
    await axios.post(`/admin/partidas/${partidaOrigen.id}/asignar-pareja`, {
      pareja_id: parejaActual.id,
      posicion: posicionOrigen
    })
    
    await cargarDatos()
    
    Swal.fire({
      icon: 'success',
      title: '¡Parejas intercambiadas!',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    })
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'No se pudo intercambiar las parejas',
      background: '#1a1a1a',
      color: '#fff'
    })
  } finally {
    draggedCouple.value = null
  }
}

const reiniciarTorneo = async () => {
  const result = await Swal.fire({
    title: '¿Reiniciar Torneo?',
    html: `
      <p class="text-danger fw-bold">⚠️ PELIGRO: Se borrarán TODAS las partidas y resultados.</p>
      <p>El torneo volverá a su estado inicial.</p>
      <p class="mt-2">¿Estás seguro de continuar?</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, reiniciar todo',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (result.isConfirmed) {
    try {
      loading.value = true
      await axios.post('/admin/bracket/reiniciar')
      await cargarDatos()
      Swal.fire({
        icon: 'success',
        title: 'Torneo Reiniciado',
        text: 'Todos los datos han sido borrados.',
        confirmButtonColor: '#FFD700',
        background: '#1a1a1a',
        color: '#fff'
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo reiniciar el torneo',
        background: '#1a1a1a',
        color: '#fff'
      })
    } finally {
      loading.value = false
    }
  }
}

const abrirModalNuevaPartida = async () => {
  const parejasOptions = parejas.value.map(p => 
    `<option value="${p.id}">${p.nombre}</option>`
  ).join('')

  const { value: formValues } = await Swal.fire({
    title: 'Crear Nueva Partida',
    html: `
      <div class="text-start">
        <label class="form-label text-white">Ronda</label>
        <input id="swal-ronda" type="number" class="form-control mb-3" value="1" min="1">
        
        <label class="form-label text-white">Pareja 1 (Opcional)</label>
        <select id="swal-pareja1" class="form-select mb-3">
          <option value="">-- Pendiente --</option>
          ${parejasOptions}
        </select>

        <label class="form-label text-white">Pareja 2 (Opcional)</label>
        <select id="swal-pareja2" class="form-select">
          <option value="">-- Pendiente --</option>
          ${parejasOptions}
        </select>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Crear Partida',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#28a745',
    background: '#1a1a1a',
    color: '#fff',
    preConfirm: () => {
      return {
        ronda: document.getElementById('swal-ronda').value,
        pareja1_id: document.getElementById('swal-pareja1').value || null,
        pareja2_id: document.getElementById('swal-pareja2').value || null
      }
    }
  })

  if (formValues) {
    try {
      await axios.post('/admin/partidas/crear', formValues)
      await cargarDatos()
      Swal.fire({
        icon: 'success',
        title: 'Partida Creada',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo crear la partida',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

// Función para agregar partida manualmente a una ronda
const agregarPartida = async (numeroRonda) => {
  const parejasSinAsignar = parejasNoAsignadas.value
  
  const { value: formValues } = await Swal.fire({
    title: `Agregar Partida a Ronda ${numeroRonda}`,
    html: `
      <div class="text-start">
        <label class="form-label">Pareja 1 (opcional)</label>
        <select id="swal-pareja1-add" class="form-select mb-3">
          <option value="">-- Sin asignar --</option>
          ${parejas.value
            .filter(p => !p.eliminada)
            .map(p => `<option value="${p.id}">${p.nombre} - ${p.nombres_completos}</option>`)
            .join('')}
        </select>
        
        <label class="form-label">Pareja 2 (opcional)</label>
        <select id="swal-pareja2-add" class="form-select">
          <option value="">-- Sin asignar --</option>
          ${parejas.value
            .filter(p => !p.eliminada)
            .map(p => `<option value="${p.id}">${p.nombre} - ${p.nombres_completos}</option>`)
            .join('')}
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Agregar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#fff',
    confirmButtonColor: '#FFD700',
    preConfirm: () => {
      const pareja1 = document.getElementById('swal-pareja1-add').value
      const pareja2 = document.getElementById('swal-pareja2-add').value
      
      if (pareja1 && pareja2 && pareja1 === pareja2) {
        Swal.showValidationMessage('No puedes asignar la misma pareja en ambas posiciones')
        return false
      }
      
      return {
        numero_ronda: numeroRonda,
        pareja1_id: pareja1 || null,
        pareja2_id: pareja2 || null
      }
    }
  })

  if (formValues) {
    try {
      await axios.post('/admin/partidas/crear', formValues)
      await cargarDatos()
      Swal.fire({
        icon: 'success',
        title: '¡Partida agregada!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo agregar la partida',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

const abrirModalAsignacion = async (partida, posicion) => {
  // Encontrar la ronda de esta partida
  const rondaActual = bracket.value.find(r => 
    r.partidas.some(p => p.id === partida.id)
  )
  
  const parejaEnPosicionActual = posicion === 1 ? partida.pareja1_id : partida.pareja2_id
  
  const parejasDisponibles = parejas.value
    .filter(p => !p.eliminada) // Solo parejas activas (no han alcanzado max_derrotas)
    .filter(p => p.id !== parejaEnPosicionActual) // Excluir la pareja en esta posición
    .filter(p => {
      // NO permitir si ya está en la posición opuesta de ESTA MISMA partida
      if (posicion === 1 && partida.pareja2_id === p.id) return false
      if (posicion === 2 && partida.pareja1_id === p.id) return false
      return true
    })
    .map(p => {
      // Verificar si ya está en OTRA partida de esta ronda
      const partidaEnEstaRonda = rondaActual?.partidas.find(part => 
        part.id !== partida.id && 
        (part.pareja1_id === p.id || part.pareja2_id === p.id)
      )
      
      // Verificar si ya tiene ganador (perdió)
      const perdioEnEstaRonda = partidaEnEstaRonda?.ganador_id && 
                                partidaEnEstaRonda.ganador_id !== p.id
      
      // Verificar si está en otra ronda diferente
      const estaEnOtraRonda = bracket.value.some(ronda => 
        ronda.numero_ronda !== rondaActual?.numero_ronda &&
        ronda.partidas.some(part => 
          part.pareja1_id === p.id || part.pareja2_id === p.id
        )
      )
      
      return {
        value: p.id,
        text: `${p.nombre} - ${p.nombres_completos}`,
        derrotas: p.derrotas || 0,
        perdioEnEstaRonda: perdioEnEstaRonda,
        estaEnOtraRonda: estaEnOtraRonda,
        yaJugoEnRonda: !!partidaEnEstaRonda
      }
    })
    .sort((a, b) => {
      // Priorizar: 1) Perdedores de esta ronda, 2) Menos derrotas
      if (a.perdioEnEstaRonda && !b.perdioEnEstaRonda) return -1
      if (!a.perdioEnEstaRonda && b.perdioEnEstaRonda) return 1
      return a.derrotas - b.derrotas
    })

  if (parejasDisponibles.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No hay parejas disponibles',
      text: 'Todas las parejas activas han sido eliminadas',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  const { value: parejaId } = await Swal.fire({
    title: 'Asignar Pareja',
    html: `
      <p class="mb-3" style="color: #fff;">Selecciona la pareja para la posición ${posicion}</p>
      <select id="pareja-select" class="form-select form-select-lg" style="background: #2a2a2a; color: #fff; border: 1px solid #FFD700;">
        <option value="">-- Seleccionar Pareja --</option>
        ${parejasDisponibles.map(p => {
          let emoji = '✓'
          let extra = ''
          
          if (p.perdioEnEstaRonda) {
            emoji = '🔁'
            extra = ' PERDIÓ EN ESTA RONDA'
          } else if (p.yaJugoEnRonda) {
            emoji = '⚡'
            extra = ' GANÓ EN ESTA RONDA'
          } else if (p.derrotas > 0) {
            emoji = '⚠️'
            extra = ` (${p.derrotas} derrota${p.derrotas > 1 ? 's' : ''})`
          }
          
          if (p.estaEnOtraRonda) {
            extra += ' 🔄'
          }
          
          return `<option value="${p.value}">${emoji} ${p.text}${extra}</option>`
        }).join('')}
      </select>
      <p style="color: #999; font-size: 11px; margin-top: 10px; text-align: left;">
        <strong>Leyenda:</strong><br>
        🔁 = Perdió en esta ronda (REPECHAJE - puede jugar de nuevo)<br>
        ⚡ = Ganó en esta ronda (puede seguir jugando aquí)<br>
        ⚠️ = Tiene derrotas previas<br>
        🔄 = Jugó en otra ronda<br>
        ✓ = Sin derrotas
      </p>
    `,
    showCancelButton: true,
    confirmButtonText: 'Asignar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#FFD700',
    cancelButtonColor: '#6c757d',
    background: '#1a1a1a',
    color: '#fff',
    customClass: {
      popup: 'swal-custom-popup'
    },
    preConfirm: () => {
      const select = document.getElementById('pareja-select')
      if (!select.value) {
        Swal.showValidationMessage('Debes seleccionar una pareja')
        return false
      }
      return select.value
    }
  })

  if (parejaId) {
    try {
      await axios.post(`/admin/partidas/${partida.id}/asignar-pareja`, {
        pareja_id: parseInt(parejaId),
        posicion: posicion
      })
      
      await cargarDatos()
      
      Swal.fire({
        icon: 'success',
        title: '¡Pareja asignada!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo asignar la pareja',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

// Validar que no se repitan posiciones
const validarPosiciones = () => {
  const posiciones = [
    posicionFinal.value.primero,
    posicionFinal.value.segundo,
    posicionFinal.value.tercero,
    posicionFinal.value.cuarto
  ].filter(p => p) // Filtrar vacíos
  
  const unicos = new Set(posiciones)
  
  if (posiciones.length !== unicos.size) {
    Swal.fire({
      icon: 'warning',
      title: 'Posiciones duplicadas',
      text: 'No puedes asignar la misma pareja a múltiples posiciones',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}

// Guardar posiciones finales y finalizar torneo
const guardarPosicionesFinales = async () => {
  if (!todasPosicionesCompletas.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Posiciones incompletas',
      text: 'Debes seleccionar las 4 posiciones para finalizar el torneo',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  const result = await Swal.fire({
    title: '¿Finalizar torneo?',
    html: `
      <div class="text-start">
        <p class="mb-3">Se guardarán las siguientes posiciones:</p>
        <ul class="list-unstyled">
          <li class="mb-2">🥇 <strong>1° Lugar:</strong> ${parejas.value.find(p => p.id == posicionFinal.value.primero)?.nombre}</li>
          <li class="mb-2">🥈 <strong>2° Lugar:</strong> ${parejas.value.find(p => p.id == posicionFinal.value.segundo)?.nombre}</li>
          <li class="mb-2">🥉 <strong>3° Lugar:</strong> ${parejas.value.find(p => p.id == posicionFinal.value.tercero)?.nombre}</li>
          <li>4️⃣ <strong>4° Lugar:</strong> ${parejas.value.find(p => p.id == posicionFinal.value.cuarto)?.nombre}</li>
        </ul>
        <p class="text-warning mt-3">⚠️ Esta acción finalizará el torneo</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, finalizar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#FFD700',
    cancelButtonColor: '#6c757d',
    background: '#1a1a1a',
    color: '#fff',
    width: '600px'
  })

  if (result.isConfirmed) {
    try {
      await axios.post('/admin/torneo/finalizar-manual', {
        posiciones: {
          1: posicionFinal.value.primero,
          2: posicionFinal.value.segundo,
          3: posicionFinal.value.tercero,
          4: posicionFinal.value.cuarto
        }
      })
      
      await cargarDatos()
      
      Swal.fire({
        icon: 'success',
        title: '🏆 ¡Torneo Finalizado!',
        html: '<p>Las posiciones finales han sido guardadas correctamente</p>',
        confirmButtonColor: '#FFD700',
        background: '#1a1a1a',
        color: '#fff'
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo finalizar el torneo',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

onMounted(() => {
  cargarDatos()
})
</script>

<template>
  <div class="bracket-admin-container">
    <!-- Header con controles -->
    <div class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="header-title">
            <i class="bi bi-diagram-3-fill me-2"></i>
            Torneo 40 gestión admin
          </h2>
         
        </div>
        <div class="header-right">
          <span class="badge bg-info fs-6 px-3 py-2 me-2">
            <i class="bi bi-people-fill me-1"></i>
            {{ parejas.length }} Parejas
          </span>
          <button 
            v-if="bracket.length > 0"
            @click="reiniciarTorneo" 
            class="btn btn-outline-danger me-2"
            title="Reiniciar todo el torneo"
          >
            <i class="bi bi-trash-fill"></i>
          </button>
          <button 
            @click="generarTorneo" 
            class="btn btn-quito-gold btn-lg"
            :disabled="generating || !puedeGenerarTorneo"
          >
            <span v-if="generating" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-shuffle me-2"></i>
            {{ generating ? 'Generando...' : 'Generar Torneo' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Podium (solo cuando el torneo está finalizado) -->
    <div v-if="torneoFinalizado && rankings.length > 0" class="podium-section">
      <PodiumDisplay :rankings="rankings" />
    </div>

    <!-- Sección de Definición de Posiciones Finales -->
    <div v-if="bracket.length > 0 && !torneoFinalizado" class="final-positions-section">
      <div class="positions-card">
        <div class="positions-header">
          <h4>
            <i class="bi bi-trophy-fill me-2"></i>
            Definir Posiciones Finales
          </h4>
          <p class="text-white-50">
            Selecciona las 4 mejores parejas y define su posición final
          </p>
        </div>
        
        <div class="positions-grid">
          <div class="position-slot gold">
            <div class="position-number">🥇 1° Lugar</div>
            <select 
              v-model="posicionFinal.primero" 
              class="form-select position-select"
              @change="validarPosiciones"
            >
              <option value="">-- Seleccionar campeón --</option>
              <option 
                v-for="pareja in parejas.filter(p => !p.eliminada)" 
                :key="'p1-' + pareja.id"
                :value="pareja.id"
              >
                {{ pareja.nombre }} - {{ pareja.nombres_completos }}
              </option>
            </select>
          </div>
          
          <div class="position-slot silver">
            <div class="position-number">🥈 2° Lugar</div>
            <select 
              v-model="posicionFinal.segundo" 
              class="form-select position-select"
              @change="validarPosiciones"
            >
              <option value="">-- Seleccionar subcampeón --</option>
              <option 
                v-for="pareja in parejas.filter(p => !p.eliminada)" 
                :key="'p2-' + pareja.id"
                :value="pareja.id"
                :disabled="pareja.id === posicionFinal.primero"
              >
                {{ pareja.nombre }} - {{ pareja.nombres_completos }}
              </option>
            </select>
          </div>
          
          <div class="position-slot bronze">
            <div class="position-number">🥉 3° Lugar</div>
            <select 
              v-model="posicionFinal.tercero" 
              class="form-select position-select"
              @change="validarPosiciones"
            >
              <option value="">-- Seleccionar tercer lugar --</option>
              <option 
                v-for="pareja in parejas.filter(p => !p.eliminada)" 
                :key="'p3-' + pareja.id"
                :value="pareja.id"
                :disabled="pareja.id === posicionFinal.primero || pareja.id === posicionFinal.segundo"
              >
                {{ pareja.nombre }} - {{ pareja.nombres_completos }}
              </option>
            </select>
          </div>
          
          <div class="position-slot fourth">
            <div class="position-number">4️⃣ 4° Lugar</div>
            <select 
              v-model="posicionFinal.cuarto" 
              class="form-select position-select"
              @change="validarPosiciones"
            >
              <option value="">-- Seleccionar cuarto lugar --</option>
              <option 
                v-for="pareja in parejas.filter(p => !p.eliminada)" 
                :key="'p4-' + pareja.id"
                :value="pareja.id"
                :disabled="pareja.id === posicionFinal.primero || pareja.id === posicionFinal.segundo || pareja.id === posicionFinal.tercero"
              >
                {{ pareja.nombre }} - {{ pareja.nombres_completos }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="positions-actions">
          <button 
            @click="guardarPosicionesFinales"
            class="btn btn-quito-gold btn-lg"
            :disabled="!todasPosicionesCompletas"
          >
            <i class="bi bi-check-circle me-2"></i>
            Finalizar Torneo y Guardar Posiciones
          </button>
        </div>
      </div>
    </div>

    <!-- Zona de Parejas Disponibles -->
    <!-- <div v-if="bracket.length > 0" class="couples-zones">
      <div class="zone-card">
        <div class="zone-header">
          <h5>
            <i class="bi bi-people-fill me-2"></i>
            Parejas Disponibles
          </h5>
          <p class="header-subtitle">
            <i class="bi bi-hand-index me-1"></i>
            Haz click y arrastra parejas para asignar
          </p>
          <router-link to="/admin/dashboard/parejas" class="btn btn-sm btn-quito-gold">
            <i class="bi bi-plus-circle me-1"></i>
            Agregar Pareja
          </router-link>
        </div>
        <div class="couples-horizontal">
          Parejas Sin Asignar (Verde)
          <div 
            v-for="pareja in parejasNoAsignadas" 
            :key="'disponible-' + pareja.id"
            class="couple-chip available"
            draggable="true"
            @dragstart="onDragStart(pareja, $event)"
          >
            <span class="chip-badge available-badge">NUEVA</span>
            <div class="couple-chip-content">
              <strong>{{ pareja.nombre }}</strong>
              <small>{{ pareja.nombres_completos }}</small>
            </div>
            <i class="bi bi-grip-vertical"></i>
          </div>

          Parejas Eliminadas (Rojo)
          <div 
            v-for="pareja in parejasEliminadas" 
            :key="'eliminada-' + pareja.id"
            class="couple-chip eliminated"
            draggable="true"
            @dragstart="onDragStart(pareja, $event)"
            title="Pareja eliminada - Reasignar si es necesario"
          >
            <span class="chip-badge eliminated-badge">ELIMINADA</span>
            <div class="couple-chip-content">
              <strong>{{ pareja.nombre }}</strong>
              <small>{{ pareja.nombres_completos }}</small>
            </div>
            <i class="bi bi-grip-vertical"></i>
          </div>

          Mensaje si no hay parejas
          <div v-if="parejasNoAsignadas.length === 0 && parejasEliminadas.length === 0" class="empty-message">
            Todas las parejas están asignadas en el torneo
          </div>
        </div>
      </div>
    </div> -->

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-quito-gold" style="width: 3rem; height: 3rem;"></div>
      <p class="text-white mt-3">Cargando bracket...</p>
    </div>

    <!-- Bracket Piramidal -->
    <div v-else-if="bracket.length > 0" class="pyramid-bracket">
      <div class="bracket-pyramid-content">
        <div 
          v-for="(ronda, rondaIndex) in bracket" 
          :key="ronda.nombre_ronda" 
          class="pyramid-round"
          :class="`round-${rondaIndex + 1}`"
        >
          <!-- Título Ronda -->
          <div class="round-title">
            <span class="badge bg-quito-blue px-4 py-2">
              {{ obtenerNombreRonda(ronda.numero_ronda, ronda.partidas) }}
            </span>
          </div>

          <!-- Partidas -->
          <div class="matches-container">
            <div 
              v-for="(partida, partidaIndex) in ronda.partidas" 
              :key="partida.id" 
              class="pyramid-match"
            >
              <div class="match-card">
                <!-- Header -->
                <div class="match-header">
                  <small class="text-white-50">#{{ partida.orden }}</small>
                  <span v-if="partida.tipo === 'semifinal'" class="badge bg-warning text-dark badge-sm me-2">
                    SEMIFINAL
                  </span>
                  <span v-else-if="partida.tipo === 'final'" class="badge bg-danger badge-sm me-2">
                    <i class="bi bi-trophy-fill"></i> FINAL
                  </span>
                  <span v-else-if="partida.tipo === 'tercer_lugar'" class="badge bg-info badge-sm me-2">
                    3ER LUGAR
                  </span>
                  <span v-if="partida.completada" class="badge bg-success badge-sm">
                    <i class="bi bi-check"></i>
                  </span>
                  <span v-else class="badge bg-warning text-dark badge-sm">
                    <i class="bi bi-clock"></i>
                  </span>
                </div>

                <!-- Pareja 1 -->
                <div 
                  @click="partida.pareja1 ? registrarGanador(partida, partida.pareja1.id, partida.pareja1.nombre) : abrirModalAsignacion(partida, 1)"
                  @dragover="!partida.completada ? onDragOver($event) : null"
                  @drop="!partida.completada ? onDrop(partida, 1, $event) : null"
                  class="team-slot"
                  :class="{
                    'winner': partida.ganador_id === partida.pareja1?.id,
                    'loser': partida.completada && partida.ganador_id !== partida.pareja1?.id,
                    'empty': !partida.pareja1,
                    'clickable': true,
                    'locked': partida.completada
                  }"
                  :draggable="!!partida.pareja1 && !partida.completada"
                  @dragstart="partida.pareja1 && !partida.completada ? onDragStart(partida.pareja1, $event) : null"
                >
                  <div class="team-info">
                    <div class="team-name">
                      {{ partida.pareja1?.nombre || 'Sin asignar' }}
                      <span v-if="partida.ganador_id === partida.pareja1?.id">👑</span>
                    </div>
                    <small class="team-players">
                      {{ partida.pareja1?.nombres_completos || 'Click para asignar' }}
                    </small>
                  </div>
                  <i v-if="partida.pareja1 && !partida.completada" class="bi bi-grip-vertical drag-handle"></i>
                  <i v-else-if="!partida.pareja1" class="bi bi-plus-circle add-icon"></i>
                  <i v-else-if="partida.completada" class="bi bi-lock-fill lock-icon"></i>
                </div>

                <!-- VS -->
                <div class="vs-divider">VS</div>

                <!-- Pareja 2 -->
                <div 
                  @click="partida.pareja2 ? registrarGanador(partida, partida.pareja2.id, partida.pareja2.nombre) : abrirModalAsignacion(partida, 2)"
                  @dragover="!partida.completada ? onDragOver($event) : null"
                  @drop="!partida.completada ? onDrop(partida, 2, $event) : null"
                  class="team-slot"
                  :class="{
                    'winner': partida.ganador_id === partida.pareja2?.id,
                    'loser': partida.completada && partida.ganador_id !== partida.pareja2?.id,
                    'empty': !partida.pareja2,
                    'clickable': true,
                    'locked': partida.completada
                  }"
                  :draggable="!!partida.pareja2 && !partida.completada"
                  @dragstart="partida.pareja2 && !partida.completada ? onDragStart(partida.pareja2, $event) : null"
                >
                  <div class="team-info">
                    <div class="team-name">
                      {{ partida.pareja2?.nombre || 'Sin asignar' }}
                      <span v-if="partida.ganador_id === partida.pareja2?.id">👑</span>
                    </div>
                    <small class="team-players">
                      {{ partida.pareja2?.nombres_completos || 'Click para asignar' }}
                    </small>
                  </div>
                  <i v-if="partida.pareja2 && !partida.completada" class="bi bi-grip-vertical drag-handle"></i>
                  <i v-else-if="!partida.pareja2" class="bi bi-plus-circle add-icon"></i>
                  <i v-else-if="partida.completada" class="bi bi-lock-fill lock-icon"></i>
                </div>
              </div>

              <!-- Botones de Acción -->
              <div class="match-actions" v-if="partida.pareja1 || partida.pareja2">
                <button 
                  v-if="partida.pareja1 && !partida.completada"
                  @click="avanzarPareja(partida, partida.pareja1)"
                  class="btn btn-sm btn-success me-2"
                  title="Pasar a siguiente ronda"
                >
                  <i class="bi bi-arrow-right-circle me-1"></i>
                  Pasar P1
                </button>
                <button 
                  v-if="partida.pareja2 && !partida.completada"
                  @click="avanzarPareja(partida, partida.pareja2)"
                  class="btn btn-sm btn-success me-2"
                  title="Pasar a siguiente ronda"
                >
                  <i class="bi bi-arrow-right-circle me-1"></i>
                  Pasar P2
                </button>
                <button 
                  v-if="partida.completada"
                  @click="regresarDeRonda(partida)"
                  class="btn btn-sm btn-warning"
                  title="Regresar de ronda"
                >
                  <i class="bi bi-arrow-left-circle me-1"></i>
                  Regresar
                </button>
              </div>
            </div>
          </div>
          
          <!-- Botón Agregar Partida -->
          <div class="add-match-section">
            <button 
              @click="agregarPartida(ronda.numero_ronda)"
              class="btn btn-add-match"
              title="Agregar nueva partida a esta ronda"
            >
              <i class="bi bi-plus-circle me-2"></i>
              Agregar Partida
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-5">
      <div class="empty-state">
        <i class="bi bi-diagram-3 display-1 text-white-50 mb-4"></i>
        <h3 class="text-white mb-3">No hay torneo activo</h3>
        <p class="text-white-50 mb-4">
          {{ parejas.length === 0 ? 'Primero agrega parejas en la sección "Gestión de Parejas"' : 'Genera un nuevo torneo para comenzar' }}
        </p>
        <button 
          v-if="parejas.length > 0"
          @click="generarTorneo" 
          class="btn btn-quito-gold btn-lg"
          :disabled="!puedeGenerarTorneo"
        >
          <i class="bi bi-shuffle me-2"></i>
          Generar Torneo
        </button>
        <router-link v-else to="/admin/dashboard/parejas" class="btn btn-quito-blue btn-lg">
          <i class="bi bi-people-fill me-2"></i>
          Ir a Gestión de Parejas
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bracket-admin-container {
  min-height: 100vh;
  background: #0a0a0a;
  padding: 0;
  max-width: 100vw;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.admin-header {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-bottom: 3px solid #FFD700;
  padding: 20px 30px;
  position: fixed;
  top: 0;
  left: 280px;
  right: 0;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 100%;
}

.header-title {
  color: #FFD700;
  font-size: 1.2rem;
  font-weight: bold;
  margin: 0;
}

.header-subtitle {
  color: #999;
  margin: 5px 0 0 0;
  font-size: 0.9rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.podium-section {
  padding: 20px 30px;
  flex-shrink: 0;
  margin-top: 90px;
  background: #0a0a0a;
}

.couples-zones {
  padding: 20px 30px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex-shrink: 0;
  position: sticky;
  top: 90px;
  z-index: 80;
  background: #0a0a0a;
  border-bottom: 2px solid #333;
  margin-bottom: 10px;
}

.zone-card {
  background: #1a1a1a;
  border-radius: 10px;
  padding: 15px;
  border: 2px solid #444;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.zone-header h5 {
  color: #FFD700;
  margin: 0;
  font-size: 1rem;
}

.couples-horizontal {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 50px;
  align-items: center;
}

.couple-chip {
  background: #2d2d2d;
  border: 2px solid #666;
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move;
  transition: all 0.2s ease;
  position: relative;
  max-width: 200px;
}

.chip-badge {
  position: absolute;
  top: -6px;
  left: 6px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.55rem;
  font-weight: bold;
  letter-spacing: 0.3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.available-badge {
  background: #28a745;
  color: white;
}

.eliminated-badge {
  background: #E4002B;
  color: white;
}

.couple-chip.available {
  border-color: #28a745;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, #2d2d2d 100%);
  padding-top: 12px;
}

.couple-chip.available:hover {
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.25) 0%, #333 100%);
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(40, 167, 69, 0.4);
}

.couple-chip.eliminated {
  border-color: #E4002B;
  background: linear-gradient(135deg, rgba(228, 0, 43, 0.15) 0%, #2d2d2d 100%);
  opacity: 0.85;
  padding-top: 12px;
}

.couple-chip.eliminated:hover {
  background: linear-gradient(135deg, rgba(228, 0, 43, 0.25) 0%, #333 100%);
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(228, 0, 43, 0.4);
  opacity: 1;
}

.couple-chip-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.couple-chip-content strong {
  color: white;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.couple-chip-content small {
  color: #999;
  font-size: 0.65rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-message {
  color: #666;
  font-style: italic;
  padding: 10px;
}

.pyramid-bracket {
  padding: 30px 20px;
  overflow-x: auto;
  overflow-y: auto;
  max-width: 100%;
  flex: 1;
  position: relative;
}

.bracket-pyramid-content {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 40px;
  min-width: max-content;
  padding: 20px;
  width: max-content;
}

.pyramid-round {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 300px;
  flex-shrink: 0;
}

.round-title {
  margin-bottom: 25px;
  position: sticky;
  top: 0;
  z-index: 10;
  /* background: #0a0a0a; */
  padding: 10px 0;
}

.matches-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.pyramid-match {
  position: relative;
  max-height: 400px;
}

.match-card {
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
}

.match-card:hover {
  border-color: #FFD700;
  box-shadow: 0 6px 24px rgba(255, 215, 0, 0.3);
}

.match-content {
  padding: 0;
}

.match-actions {
  padding: 10px 15px;
  background: #2d2d2d;
  border-top: 1px solid #444;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.match-actions .btn {
  font-size: 0.85rem;
  padding: 5px 12px;
}

.match-header {
  background: #2d2d2d;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444;
}

.badge-sm {
  font-size: 0.7rem;
  padding: 3px 8px;
}

.team-slot {
  padding: 12px 15px;
  border-bottom: 1px solid #333;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 65px;
  cursor: pointer;
  position: relative;
}

.team-slot:last-child {
  border-bottom: none;
}

.team-slot.clickable:hover {
  background: rgba(255, 215, 0, 0.1);
  border-left: 4px solid #FFD700;
  padding-left: 11px;
}

.team-slot.winner {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.25) 0%, transparent 100%);
  border-left: 4px solid #FFD700;
  padding-left: 11px;
}

.team-slot.loser {
  opacity: 0.4;
}

.team-slot.empty {
  background: rgba(100, 100, 100, 0.1);
  border: 2px dashed #555;
}

.team-slot.empty:hover {
  background: rgba(255, 215, 0, 0.05);
  border-color: #FFD700;
}

.team-slot[draggable="true"] {
  cursor: move;
}

.team-slot.locked {
  cursor: pointer !important;
  opacity: 0.95;
}

.team-slot.locked:hover {
  background: rgba(255, 215, 0, 0.1);
  border-left: 4px solid #FFD700;
  padding-left: 11px;
}

.lock-icon {
  color: #999;
  font-size: 0.9rem;
}

.team-info {
  flex: 1;
  min-width: 0;
}

.team-name {
  font-size: 1rem;
  font-weight: bold;
  color: white;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-players {
  color: #999;
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drag-handle {
  color: #666;
  font-size: 1.2rem;
  margin-left: 10px;
}

.add-icon {
  color: #FFD700;
  font-size: 1.5rem;
  margin-left: 10px;
}

.vs-divider {
  background: #E4002B;
  color: white;
  text-align: center;
  padding: 6px;
  font-weight: bold;
  font-size: 0.85rem;
  letter-spacing: 2px;
}

.empty-state {
  background: #1a1a1a;
  border-radius: 16px;
  padding: 60px;
  max-width: 600px;
  margin: 0 auto;
  border: 2px solid #333;
}

/* Estilos para la sección de posiciones finales */
.final-positions-section {
  padding: 30px 20px;
  margin-top: 90px;
}

.positions-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 20px;
  padding: 30px;
  border: 3px solid #FFD700;
  box-shadow: 0 10px 40px rgba(255, 215, 0, 0.3);
  max-width: 1200px;
  margin: 0 auto;
}

.positions-header {
  text-align: center;
  margin-bottom: 30px;
  color: #FFD700;
}

.positions-header h4 {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.positions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.position-slot {
  background: #0a0a0a;
  border-radius: 12px;
  padding: 20px;
  border: 3px solid;
  transition: all 0.3s ease;
}

.position-slot:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(255, 215, 0, 0.2);
}

.position-slot.gold {
  border-color: #FFD700;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, #0a0a0a 100%);
}

.position-slot.silver {
  border-color: #C0C0C0;
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, #0a0a0a 100%);
}

.position-slot.bronze {
  border-color: #CD7F32;
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, #0a0a0a 100%);
}

.position-slot.fourth {
  border-color: #4A90E2;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, #0a0a0a 100%);
}

.position-number {
  font-size: 1.3rem;
  font-weight: bold;
  color: white;
  margin-bottom: 15px;
  text-align: center;
}

.position-select {
  background: #1a1a1a;
  color: white;
  border: 2px solid #444;
  padding: 10px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.position-select:focus {
  background: #2d2d2d;
  border-color: #FFD700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.position-select option {
  background: #1a1a1a;
  color: white;
}

.position-select option:disabled {
  color: #666;
}

.positions-actions {
  text-align: center;
  margin-top: 30px;
}

.btn-add-match {
  background: linear-gradient(135deg, #003DA5 0%, #0059D9 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-weight: bold;
  transition: all 0.3s ease;
  width: 100%;
  margin-top: 15px;
}

.btn-add-match:hover {
  background: linear-gradient(135deg, #0059D9 0%, #007BFF 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 61, 165, 0.4);
}

.add-match-section {
  padding: 0 20px;
  margin-top: 15px;
}

@media (max-width: 768px) {
  .admin-header {
    padding: 15px 20px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 15px;
  }
  
  .bracket-pyramid-content {
    gap: 40px;
  }
  
  .pyramid-round {
    min-width: 240px;
  }
  
  .couples-zones {
    padding: 15px;
  }
}
</style>
