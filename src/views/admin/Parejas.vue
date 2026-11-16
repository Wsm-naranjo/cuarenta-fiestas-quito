<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import draggable from 'vuedraggable'

const parejas = ref([])
const loading = ref(false)
const busqueda = ref('')

const nuevaPareja = ref({
  jugador1: '',
  jugador2: ''
})

// Filtrar parejas por búsqueda
const parejasFiltradas = computed(() => {
  if (!busqueda.value.trim()) {
    return parejas.value
  }
  
  const query = busqueda.value.toLowerCase().trim()
  return parejas.value.filter(pareja => {
    const nombrePareja = pareja.nombre?.toLowerCase() || ''
    const nombresCompletos = pareja.nombres_completos?.toLowerCase() || ''
    const jugador1 = pareja.jugador1?.nombre?.toLowerCase() || ''
    const jugador2 = pareja.jugador2?.nombre?.toLowerCase() || ''
    
    return nombrePareja.includes(query) || 
           nombresCompletos.includes(query) ||
           jugador1.includes(query) ||
           jugador2.includes(query)
  })
})

// Lista de todos los jugadores existentes para validar duplicados
const jugadoresExistentes = computed(() => {
  const jugadores = []
  parejas.value.forEach(pareja => {
    if (pareja.jugador1?.nombre) jugadores.push(pareja.jugador1.nombre.toLowerCase().trim())
    if (pareja.jugador2?.nombre) jugadores.push(pareja.jugador2.nombre.toLowerCase().trim())
  })
  return jugadores
})

const cargarParejas = async () => {
  loading.value = true
  try {
    const response = await axios.get('/public/parejas')
    parejas.value = response.data.parejas
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const validarDuplicado = (jugador1, jugador2) => {
  const j1 = jugador1.toLowerCase().trim()
  const j2 = jugador2.toLowerCase().trim()
  
  if (jugadoresExistentes.value.includes(j1)) {
    return { duplicado: true, jugador: jugador1 }
  }
  if (jugadoresExistentes.value.includes(j2)) {
    return { duplicado: true, jugador: jugador2 }
  }
  return { duplicado: false }
}

const crearPareja = async () => {
  if (!nuevaPareja.value.jugador1.trim() || !nuevaPareja.value.jugador2.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos vacíos',
      text: 'Debes ingresar ambos nombres',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  // Validar que no sean el mismo jugador
  if (nuevaPareja.value.jugador1.trim().toLowerCase() === nuevaPareja.value.jugador2.trim().toLowerCase()) {
    Swal.fire({
      icon: 'error',
      title: 'Jugadores Iguales',
      html: `
        <p>Los dos jugadores no pueden ser la misma persona.</p>
        <p class="mt-2 text-warning">Cada pareja debe tener 2 jugadores diferentes.</p>
      `,
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#E4002B'
    })
    return
  }

  // Validar duplicados
  const validacion = validarDuplicado(nuevaPareja.value.jugador1, nuevaPareja.value.jugador2)
  if (validacion.duplicado) {
    Swal.fire({
      icon: 'error',
      title: 'Jugador Duplicado',
      html: `
        <p>El jugador <strong>${validacion.jugador}</strong> ya está registrado en otra pareja.</p>
        <p class="mt-2 text-warning">No se pueden duplicar participantes.</p>
      `,
      background: '#1a1a1a',
      color: '#fff',
      confirmButtonColor: '#E4002B'
    })
    return
  }

  try {
    const response = await axios.post('/admin/parejas', nuevaPareja.value)
    if (response.data.success) {
      // Mostrar mensaje con info de ronda si fue agregada al bracket
      if (response.data.agregada_a_ronda) {
        Swal.fire({
          icon: 'success',
          title: '✅ Pareja Agregada',
          html: `
            <p>${response.data.message}</p>
            <p class="text-success mt-2"><i class="bi bi-trophy me-2"></i>La pareja fue agregada automáticamente a <strong>Ronda ${response.data.ronda}</strong></p>
          `,
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#28a745',
          timer: 3000
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: '¡Pareja agregada!',
          text: response.data.message,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        })
      }
      
      nuevaPareja.value = { jugador1: '', jugador2: '' }
      cargarParejas()
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'No se pudo crear la pareja',
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}

const archivoExcel = ref(null)
const handleFileUpload = (event) => {
  archivoExcel.value = event.target.files[0]
}

const importarExcel = async () => {
  if (!archivoExcel.value) return

  const formData = new FormData()
  formData.append('archivo', archivoExcel.value)

  try {
    const response = await axios.post('/admin/parejas/importar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    if (response.data.success) {
      const creadas = response.data.creadas || 0
      const duplicadas = response.data.duplicadas || []
      const errores = response.data.errores || []
      
      let html = `<p class="mb-3"><strong>${creadas}</strong> parejas importadas exitosamente</p>`
      
      // Mostrar duplicados
      if (duplicadas.length > 0) {
        html += `
          <div class="alert alert-warning text-start mt-3">
            <strong>⚠️ Parejas Duplicadas (${duplicadas.length}):</strong>
            <ul class="mb-0 mt-2">
              ${duplicadas.map(d => `<li>${d}</li>`).join('')}
            </ul>
            <small class="d-block mt-2">Estas parejas ya existen y no se crearon de nuevo.</small>
          </div>
        `
      }
      
      // Mostrar errores
      if (errores.length > 0) {
        html += `
          <div class="alert alert-danger text-start mt-3">
            <strong>❌ Parejas con Errores (${errores.length}):</strong>
            <ul class="mb-0 mt-2">
              ${errores.map(e => `<li>${e}</li>`).join('')}
            </ul>
            <small class="d-block mt-2">Estas parejas no se pudieron crear.</small>
          </div>
        `
      }
      
      Swal.fire({
        icon: creadas > 0 ? 'success' : 'warning',
        title: 'Importación Completada',
        html: html,
        confirmButtonColor: '#FFD700',
        background: '#1a1a1a',
        color: '#fff',
        width: '600px'
      })
      
      cargarParejas()
      archivoExcel.value = null
      document.getElementById('fileInput').value = ''
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Error al importar el archivo',
      background: '#1a1a1a',
      color: '#fff'
    })
  }
}

const onDragEnd = async () => {
  parejas.value.forEach((pareja, index) => {
    pareja.posicion = index + 1
  })

  const orden = parejas.value.map((p, index) => ({
    id: p.id,
    posicion: index + 1
  }))

  try {
    await axios.put('/admin/parejas/reordenar', { orden })
  } catch (error) {
    console.error('Error al guardar orden', error)
  }
}

const eliminarPareja = async (id, nombre) => {
  const result = await Swal.fire({
    title: '¿Eliminar pareja?',
    text: `Se eliminará: ${nombre}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#E4002B',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (result.isConfirmed) {
    try {
      await axios.delete(`/admin/parejas/${id}`)
      cargarParejas()
      Swal.fire({
        icon: 'success',
        title: 'Eliminada',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

const eliminarTodas = async () => {
  if (parejas.value.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'No hay parejas',
      text: 'No hay parejas para eliminar',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  const result = await Swal.fire({
    title: '⚠️ ¿Eliminar TODAS las parejas?',
    html: `
      <p>Se eliminarán <strong>${parejas.value.length}</strong> parejas.</p>
      <p class="text-danger mt-3">Esta acción NO se puede deshacer.</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#E4002B',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar todas',
    cancelButtonText: 'Cancelar',
    background: '#1a1a1a',
    color: '#fff'
  })

  if (result.isConfirmed) {
    try {
      // Eliminar una por una
      const promesas = parejas.value.map(p => axios.delete(`/admin/parejas/${p.id}`))
      await Promise.all(promesas)
      
      cargarParejas()
      Swal.fire({
        icon: 'success',
        title: '¡Todas eliminadas!',
        text: 'Se eliminaron todas las parejas correctamente',
        confirmButtonColor: '#FFD700',
        background: '#1a1a1a',
        color: '#fff'
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron eliminar todas las parejas',
        background: '#1a1a1a',
        color: '#fff'
      })
    }
  }
}

onMounted(() => {
  cargarParejas()
})
</script>

<template>
  <div class="row g-4">
    <!-- Columna Izquierda: Formularios -->
    <div class="col-lg-4">
      <!-- Agregar Manual -->
      <div class="card card-dark border-quito-blue mb-4">
        <div class="card-header bg-quito-blue text-white">
          <h5 class="mb-0"><i class="bi bi-person-plus-fill me-2"></i>Agregar Pareja</h5>
        </div>
        <div class="card-body">
          <form @submit.prevent="crearPareja">
            <div class="mb-3">
              <label class="form-label text-white fw-bold">Jugador 1</label>
              <input 
                v-model="nuevaPareja.jugador1" 
                type="text" 
                class="form-control form-control-lg input-dark"
                placeholder="Nombre completo"
              />
            </div>
            <div class="mb-3">
              <label class="form-label text-white fw-bold">Jugador 2</label>
              <input 
                v-model="nuevaPareja.jugador2" 
                type="text" 
                class="form-control form-control-lg input-dark"
                placeholder="Nombre completo"
              />
            </div>
            <button type="submit" class="btn btn-quito-blue w-100 btn-lg">
              <i class="bi bi-plus-circle me-2"></i>Agregar Pareja
            </button>
          </form>
          
          <div class="alert alert-info mt-3 mb-0">
            <small>
              <i class="bi bi-info-circle me-1"></i>
              <strong>Nota:</strong> No se permiten jugadores duplicados
            </small>
          </div>
        </div>
      </div>

      <!-- Importar Excel -->
      <div class="card card-dark border-success">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0"><i class="bi bi-file-earmark-excel-fill me-2"></i>Importar Excel</h5>
        </div>
        <div class="card-body">
          <div class="border border-2 border-dashed border-secondary rounded p-4 text-center mb-3" style="cursor: pointer;">
            <input 
              type="file" 
              id="fileInput"
              @change="handleFileUpload" 
              accept=".xlsx,.xls,.csv"
              class="d-none"
            />
            <label for="fileInput" style="cursor: pointer; width: 100%;">
              <i class="bi bi-cloud-upload display-4 text-white-50 d-block mb-2"></i>
              <p class="text-white mb-1">Click para subir archivo</p>
              <small class="text-white-50">Formato: Columna A (Jugador 1) | Columna B (Jugador 2)</small>
            </label>
          </div>
          
          <div v-if="archivoExcel" class="alert alert-info mb-3">
            <i class="bi bi-file-earmark-check me-2"></i>
            <strong>{{ archivoExcel.name }}</strong>
          </div>

          <button 
            v-if="archivoExcel" 
            @click="importarExcel" 
            class="btn btn-success w-100 btn-lg"
          >
            <i class="bi bi-upload me-2"></i>Importar Archivo
          </button>
          
          <div class="alert alert-warning mt-3 mb-0">
            <small>
              <i class="bi bi-exclamation-triangle me-1"></i>
              Se validarán duplicados automáticamente
            </small>
          </div>
        </div>
      </div>
    </div>

    <!-- Columna Derecha: Lista de Parejas -->
    <div class="col-lg-8">
      <div class="card card-dark">
        <div class="card-header bg-quito-gold text-dark">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 class="mb-0">
              <i class="bi bi-people-fill me-2"></i>
              Parejas Inscritas ({{ parejasFiltradas.length }}{{ busqueda ? ` de ${parejas.length}` : '' }})
            </h5>
            <div class="d-flex gap-2 align-items-center flex-wrap">                           
              <span class="badge bg-dark">
                <i class="bi bi-arrows-move me-1"></i>
                Arrastra para reordenar
              </span>
              <button 
                v-if="parejas.length > 0"
                @click="eliminarTodas"
                class="btn btn-danger btn-sm"
              >
                <i class="bi bi-trash-fill me-1"></i>
                Eliminar Todas
              </button>
            </div>
          </div>
        </div>
        <!-- Buscador -->
        <div v-if="parejas.length > 0" class="input-group m-2 " style="width: auto;">
          <span class="input-group-text bg-dark border-secondary">
            <i class="bi bi-search text-white"></i>
          </span>
          <input 
            v-model="busqueda"
            type="text"
            class="form-control bg-dark text-white border-secondary"
            placeholder="Buscar jugador..."
            style="border-left: none;"
          />
          <button 
            v-if="busqueda"
            @click="busqueda = ''"
            class="btn btn-outline-secondary"
            type="button"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="card-body">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-quito-gold"></div>
          </div>

          <!-- Mensaje de búsqueda sin resultados -->
          <div v-else-if="busqueda && parejasFiltradas.length === 0" class="text-center py-5">
            <i class="bi bi-search display-1 text-white-50 mb-3"></i>
            <h4 class="text-white mb-3">No se encontraron resultados</h4>
            <p class="text-white-50">No hay parejas que coincidan con "{{ busqueda }}"</p>
            <button @click="busqueda = ''" class="btn btn-quito-gold mt-2">
              <i class="bi bi-x-circle me-2"></i>Limpiar búsqueda
            </button>
          </div>

          <draggable 
            v-else-if="parejasFiltradas.length > 0"
            v-model="parejas" 
            item-key="id"
            @end="onDragEnd"
            class="list-group"
          >
            <template #item="{ element, index }">
              <div 
                v-if="parejasFiltradas.includes(element)"
                class="list-group-item bg-dark border-secondary mb-2 hover-item" 
                style="cursor: move;"
              >
                <div class="d-flex align-items-center gap-3">
                  <div class="bg-quito-blue rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; min-width: 50px;">
                    <span class="text-white fw-bold fs-5">{{ index + 1 }}</span>
                  </div>
                  
                  <div class="flex-grow-1">
                    <h5 class="text-white mb-1 fw-bold">{{ element.nombre }}</h5>
                    <p class="text-white-50 mb-0">
                      <i class="bi bi-person-fill me-1"></i>
                      {{ element.nombres_completos }}
                    </p>
                  </div>
                  
                  <button 
                    @click="eliminarPareja(element.id, element.nombre)"
                    class="btn btn-outline-danger"
                  >
                    <i class="bi bi-trash-fill"></i>
                  </button>
                </div>
              </div>
            </template>
          </draggable>

          <div v-else class="text-center py-5">
            <i class="bi bi-people display-1 text-white-50 mb-3"></i>
            <h4 class="text-white mb-3">No hay parejas inscritas</h4>
            <p class="text-white-50">Agrega parejas manualmente o importa desde Excel</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hover-item {
  transition: all 0.3s ease;
}

.hover-item:hover {
  border-color: #FFD700 !important;
  transform: translateX(4px);
}

.input-dark::placeholder {
  color: white !important;
  opacity: 1; /* porque a veces los navegadores lo bajan a 0.5-0.7 */
}

.input-dark {
  background-color: #2d2d2d;
  color: white;
  border-color: #444;
}
</style>
