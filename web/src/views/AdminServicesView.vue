<template>
  <main class="salon-page pa-4 pa-sm-6">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="salon-page-title">Serviços</h1>
        <p class="salon-muted">Gere o catálogo que as clientes veem na aplicação.</p>
      </div>

      <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" size="large" variant="flat" @click="openCreate">
        Novo serviço
      </v-btn>
    </div>

    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
      <template #prepend><v-icon icon="mdi-alert-circle-outline" /></template>
      {{ error }}
    </v-alert>

    <v-alert v-if="success" class="mb-4" type="success" variant="tonal">{{ success }}</v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular color="primary" indeterminate />
    </div>

    <v-row v-else-if="services.length > 0" class="ma-n1">
      <v-col
        v-for="service in services"
        :key="service.id"
        cols="12"
        md="4"
        sm="6"
      >
        <v-card class="salon-card h-100" elevation="2" rounded="xl">
          <v-img
            v-if="service.imagePath"
            :alt="service.name"
            cover
            height="140"
            :src="serviceImageUrl(service.imagePath)"
          />

          <div v-else class="service-image" style="height: 140px;">
            <v-icon :icon="serviceIcon(service.name)" size="38" />
          </div>

          <v-card-item class="pb-0">
            <v-card-title class="text-h6">{{ service.name }}</v-card-title>

            <v-card-subtitle>
              <v-chip
                :color="service.active ? 'success' : 'error'"
                size="x-small"
                variant="tonal"
              >
                {{ service.active ? 'Visível' : 'Inativo' }}
              </v-chip>
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pt-2">
            <div class="d-flex align-center ga-2 mb-1">
              <strong class="text-primary">{{ formatPrice(service.price) }}</strong>
              <span class="salon-muted">· {{ service.durationMinutes }} min</span>
            </div>
            <p v-if="service.description" class="salon-muted text-body-2">{{ service.description }}</p>
          </v-card-text>

          <v-card-actions class="px-4 pb-4 pt-0">
            <v-btn prepend-icon="mdi-pencil" rounded="lg" size="small" variant="tonal" @click="openEdit(service)">
              Editar
            </v-btn>
            <v-spacer />

            <v-btn
              v-if="service.active"
              aria-label="Desativar serviço"
              color="error"
              icon="mdi-eye-off"
              size="small"
              variant="tonal"
              @click="serviceToDeactivate = service"
            />

            <v-btn
              v-else
              aria-label="Ativar serviço"
              color="success"
              icon="mdi-eye"
              :loading="saving"
              size="small"
              variant="tonal"
              @click="toggleService(service)"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else class="pa-8 text-center salon-card" rounded="xl" elevation="2">
      <v-icon class="mb-3" color="primary" icon="mdi-content-cut" size="48" />
      <h2 class="text-h6 mb-2">Ainda não há serviços</h2>
      <p class="salon-muted mb-4">Adiciona o primeiro serviço para aparecer no catálogo.</p>
      <v-btn color="primary" rounded="lg" size="large" variant="flat" @click="openCreate">
        <v-icon start>mdi-plus</v-icon>
        Adicionar serviço
      </v-btn>
    </v-card>

    <v-dialog v-model="formOpen" max-width="520" persistent>
      <v-card rounded="xl">
        <v-card-title class="pa-5">
          <v-icon start color="primary">{{ editingId ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingId ? 'Editar serviço' : 'Novo serviço' }}
        </v-card-title>

        <v-card-text>
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">{{ formError }}</v-alert>

          <v-form @submit.prevent="saveService">
            <v-text-field
              v-model="form.name"
              label="Nome"
              maxlength="120"
              prepend-inner-icon="mdi-content-cut"
              variant="outlined"
              rounded="lg"
              required
            />

            <v-textarea v-model="form.description" auto-grow label="Descrição" rows="2" variant="outlined" rounded="lg" />

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model.number="form.price"
                  label="Preço (MZN)"
                  min="0.01"
                  prepend-inner-icon="mdi-currency-usd"
                  required
                  step="0.01"
                  type="number"
                  variant="outlined"
                  rounded="lg"
                />
              </v-col>

              <v-col cols="6">
                <v-text-field
                  v-model.number="form.durationMinutes"
                  label="Duração (min)"
                  max="720"
                  min="5"
                  prepend-inner-icon="mdi-clock"
                  required
                  step="5"
                  type="number"
                  variant="outlined"
                  rounded="lg"
                />
              </v-col>
            </v-row>

            <v-text-field
              v-model="form.imagePath"
              hint="Usa um endereço público de imagem."
              label="Fotografia (URL)"
              persistent-hint
              placeholder="https://..."
              prepend-inner-icon="mdi-image"
              variant="outlined"
              rounded="lg"
            />

            <v-file-input
              v-model="form.image"
              accept="image/jpeg,image/png,image/webp"
              clearable
              hint="JPG, PNG ou WebP · máximo 5 MB"
              label="Ou escolhe uma fotografia"
              persistent-hint
              prepend-icon="mdi-camera"
              show-size
              variant="outlined"
              rounded="lg"
            />

            <v-switch v-if="editingId" v-model="form.active" color="primary" label="Serviço visível no catálogo" />

            <div class="d-flex justify-end ga-2 mt-5">
              <v-btn :disabled="saving" rounded="lg" variant="text" @click="formOpen = false">Cancelar</v-btn>

              <v-btn color="primary" :loading="saving" rounded="lg" type="submit" variant="flat">
                <v-icon start>mdi-content-save</v-icon>
                Guardar
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="serviceToDeactivate" max-width="420">
      <v-card rounded="xl">
        <v-card-title class="pa-5">
          <v-icon start color="error">mdi-alert</v-icon>
          Desativar serviço?
        </v-card-title>

        <v-card-text>
          {{ serviceToDeactivate?.name }} deixa de aparecer no catálogo. As marcações anteriores ficam guardadas.
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn rounded="lg" variant="text" @click="serviceToDeactivate = null">Cancelar</v-btn>

          <v-btn color="error" :loading="saving" rounded="lg" variant="flat" @click="deactivate">
            Desativar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup>
  import { onMounted, reactive, ref } from 'vue'
  import api from '@/services/api'
  import { formatPrice, serviceIcon, serviceImageUrl } from '@/services/formatters'

  const services = ref([])
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')
  const success = ref('')
  const formError = ref('')
  const formOpen = ref(false)
  const editingId = ref(null)
  const serviceToDeactivate = ref(null)
  const form = reactive({
    name: '',
    description: '',
    price: null,
    durationMinutes: 30,
    imagePath: '',
    image: null,
    active: true,
  })

  async function loadServices () {
    const { data } = await api.get('/admin/services')
    services.value = data.services
  }

  function resetForm () {
    Object.assign(form, {
      name: '',
      description: '',
      price: null,
      durationMinutes: 30,
      imagePath: '',
      image: null,
      active: true,
    })
    editingId.value = null
    formError.value = ''
  }

  function openCreate () {
    resetForm()
    formOpen.value = true
  }

  function openEdit (service) {
    resetForm()
    editingId.value = service.id
    Object.assign(form, { ...service })
    formOpen.value = true
  }

  async function saveService () {
    formError.value = ''
    error.value = ''
    saving.value = true
    const { image, ...serviceFields } = form
    const payload = {
      ...serviceFields,
      price: Number(form.price),
      durationMinutes: Number(form.durationMinutes),
      description: form.description || null,
      imagePath: form.imagePath || null,
    }
    try {
      let serviceId = editingId.value
      if (serviceId) {
        await api.patch(`/admin/services/${serviceId}`, payload)
        success.value = 'Serviço atualizado.'
      } else {
        const { data } = await api.post('/admin/services', payload)
        serviceId = data.service.id
        success.value = 'Serviço criado.'
      }

      if (image) {
        const formData = new FormData()
        formData.append('image', image)
        try {
          await api.post(`/admin/services/${serviceId}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (requestError) {
          success.value = ''
          formError.value = requestError.response?.data?.message
            || 'O serviço foi guardado, mas não foi possível enviar a fotografia.'
          await loadServices()
          return
        }
      }

      formOpen.value = false
      await loadServices()
    } catch (requestError) {
      const data = requestError.response?.data
      formError.value = data?.message || 'Não foi possível guardar o serviço.'
      if (!data) error.value = formError.value
    } finally {
      saving.value = false
    }
  }

  async function deactivate () {
    if (!serviceToDeactivate.value) return
    saving.value = true
    error.value = ''
    try {
      await api.delete(`/admin/services/${serviceToDeactivate.value.id}`)
      serviceToDeactivate.value = null
      success.value = 'Serviço desativado; o histórico de marcações foi preservado.'
      await loadServices()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível desativar o serviço.'
    } finally {
      saving.value = false
    }
  }

  async function toggleService (service) {
    saving.value = true
    error.value = ''
    try {
      await api.patch(`/admin/services/${service.id}`, { active: true })
      await loadServices()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível ativar o serviço.'
    } finally {
      saving.value = false
    }
  }

  onMounted(async () => {
    try {
      await loadServices()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Sem ligação ao servidor. Tenta novamente.'
    } finally {
      loading.value = false
    }
  })
</script>
