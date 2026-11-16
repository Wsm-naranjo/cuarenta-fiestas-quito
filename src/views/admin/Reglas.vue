<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import draggable from 'vuedraggable'

const reglas = ref([])
const loading = ref(false)

const cargarReglas = async () => {
  loading.value = true
  try {
    const response = await axios.get('/public/reglas')
    reglas.value = response.data.reglas
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const agregarRegla = () => {
  reglas.value.push({
    titulo: `Regla ${reglas.value.length + 1}`,
    contenido: '',
    orden: reglas.value.length + 1
  })
}

const eliminarRegla = async (index, regla) => {
  const result = await Swal.fire({
    title: '¿Eliminar regla?',
    text: "Esta acción no se puede deshacer",
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
    reglas.value.splice(index, 1)
    Swal.fire({
      icon: 'success',
      title: 'Eliminada',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    })
  }
}

const guardarCambios = async () => {
  const vacias = reglas.value.filter(r => !r.titulo.trim() || !r.contenido.trim())
  if (vacias.length > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos vacíos',
      text: 'Todas las reglas deben tener título y contenido',
      background: '#1a1a1a',
      color: '#fff'
    })
    return
  }

  loading.value = true
  try {
    reglas.value.forEach((r, i) => r.orden = i + 1)
    await axios.post('/admin/reglas', { reglas: reglas.value })
    
    Swal.fire({
      icon: 'success',
      title: '¡Guardado!',
      text: 'Las reglas se han actualizado correctamente',
      confirmButtonColor: '#FFD700',
      background: '#1a1a1a',
      color: '#fff'
    })
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron guardar los cambios',
      background: '#1a1a1a',
      color: '#fff'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargarReglas()
})
</script>

<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h3 class="text-white fw-bold mb-0">Reglas del Torneo</h3>
        <small class="text-white-50">Arrastra para ordenar</small>
      </div>
      <button @click="agregarRegla" class="btn btn-success shadow-sm btn-sm px-4">
        <i class="bi bi-plus-circle me-2"></i>Nueva Regla
      </button>
    </div>

    <div v-if="loading && reglas.length === 0" class="text-center py-5">
      <div class="spinner-border text-quito-gold" role="status"></div>
    </div>

    <draggable
      v-model="reglas"
      item-key="orden"
      handle=".drag-handle"
      tag="div"
      class="d-flex flex-column gap-3"
      ghost-class="ghost-card"
    >
      <template #item="{ element, index }">
        <div class="card bg-dark border-0 shadow-sm rounded-3 overflow-hidden regla-card">
          <div class="card-body p-3">
            <div class="d-flex align-items-start gap-3">
              
              <div class="d-flex flex-column align-items-center gap-2 pt-1">
                <div class="drag-handle text-white-50" style="cursor: grab;">
                  <i class="bi bi-grip-vertical fs-4"></i>
                </div>
                <div class="badge rounded-pill bg-quito-blue text-white border border-secondary" 
                     style="font-size: 0.9rem; min-width: 25px;">
                  {{ index + 1 }}
                </div>
              </div>

              <div class="flex-grow-1">
                <input
                  v-model="element.titulo"
                  type="text"
                  class="form-control bg-transparent text-white fw-bold border-0 p-0 mb-2 shadow-none focus-highlight"
                  placeholder="Título de la regla..."
                  style="font-size: 1.1rem;"
                />
                <textarea
                  v-model="element.contenido"
                  rows="2"
                  class="form-control bg-secondary bg-opacity-10 text-white-50 border-0 rounded-2 py-2 px-3"
                  placeholder="Descripción breve de la regla..."
                  style="font-size: 0.9rem; resize: none;"
                ></textarea>
              </div>

              <button
                @click="eliminarRegla(index, element)"
                class="btn btn-icon btn-outline-danger border-0 btn-sm rounded-circle p-2 mt-1"
                title="Eliminar"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
    </draggable>

    <div v-if="reglas.length === 0 && !loading" class="text-center py-5 text-white-50">
      <p class="mb-3">No hay reglas definidas</p>
      <button @click="agregarRegla" class="btn btn-outline-success btn-sm">
        <i class="bi bi-plus-lg me-1"></i>Agregar
      </button>
    </div>

    <div v-if="reglas.length > 0" class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
      <button
        @click="guardarCambios"
        class="btn btn-quito-gold px-5 fw-bold shadow-sm"
        :disabled="loading"
      >
        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
        {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Colores personalizados */
.bg-quito-blue {
  background-color: #003366; /* Ajusta a tu azul corporativo */
}

/* Efectos de la tarjeta */
.regla-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #333 !important;
}

.regla-card:hover {
  border-color: #555 !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
}

/* Drag Handle */
.drag-handle:hover {
  color: #FFD700 !important;
}

/* Input del título personalizado */
.focus-highlight:focus {
  box-shadow: none !important;
  border-bottom: 1px solid #FFD700 !important;
  border-radius: 0 !important;
}
.focus-highlight::placeholder {
  color: #6c757d;
  font-weight: normal;
}

/* Textarea personalizado */
textarea.form-control:focus {
  background-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
  color: #fff !important;
}

/* Botón eliminar sutil */
.btn-icon:hover {
  background-color: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

/* Estilo fantasma al arrastrar */
.ghost-card {
  opacity: 0.5;
  background: #2c2c2c;
  border: 1px dashed #FFD700 !important;
}

.btn-quito-gold {
  background: #FFD700;
  border: none;
  color: #000;
}
.btn-quito-gold:hover {
  background: #e6c200;
}
</style>