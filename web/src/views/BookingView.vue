<template>
  <main class="salon-page pa-4 pa-sm-6">
    <v-btn class="mb-4" prepend-icon="mdi-arrow-left" to="/servicos" variant="text">
      Serviços
    </v-btn>

    <h1 class="salon-page-title">Escolher horário</h1>

    <p v-if="service" class="salon-muted mb-4">
      <v-chip color="primary" variant="tonal" size="small" class="mr-2">{{ service.name }}</v-chip>
      <v-chip variant="tonal" size="small" class="mr-2">{{ service.durationMinutes }} min</v-chip>
      <v-chip color="secondary" variant="tonal" size="small">{{ formatPrice(service.price) }}</v-chip>
    </p>

    <v-img
      v-if="service?.imagePath"
      :alt="service.name"
      class="mb-4"
      cover
      height="140"
      max-width="480"
      rounded="xl"
      :src="serviceImageUrl(service.imagePath)"
    />

    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
      <template #prepend><v-icon icon="mdi-alert-circle-outline" /></template>
      {{ error }}
    </v-alert>

    <v-alert v-if="success" class="mb-4" type="success" variant="tonal">
      <template #prepend><v-icon icon="mdi-check-circle-outline" /></template>
      Pedido enviado — aguarda confirmação.
      <div class="mt-3">
        <v-btn color="primary" to="/marcacoes" variant="flat">Ver as minhas marcações</v-btn>
      </div>
    </v-alert>

    <v-row v-if="!success">
      <v-col cols="12" md="5">
        <v-card class="pa-4 pa-sm-5 salon-card" rounded="xl" elevation="2">
          <h2 class="text-h6 mb-3">
            <v-icon start color="primary">mdi-calendar</v-icon>
            1. Escolhe o dia
          </h2>

          <v-text-field
            v-model="selectedDate"
            :disabled="loadingService || submitting"
            label="Data"
            :min="today"
            prepend-inner-icon="mdi-calendar"
            type="date"
            @update:model-value="loadSlots"
          />

          <p class="text-body-2 salon-muted">
            Segunda a sábado, das 09:00 às 18:00. Horários a cada 30 minutos.
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card class="pa-4 pa-sm-5 salon-card" rounded="xl" elevation="2">
          <h2 class="text-h6 mb-1">
            <v-icon start color="primary">mdi-clock-outline</v-icon>
            2. Escolhe a hora
          </h2>
          <p class="text-body-2 salon-muted mb-4">A duração do serviço já está considerada.</p>

          <div v-if="loadingSlots" class="d-flex justify-center py-8">
            <v-progress-circular color="primary" indeterminate />
          </div>

          <div v-else-if="slots.length > 0" class="d-flex flex-wrap ga-2">
            <v-btn
              v-for="slot in slots"
              :key="slot.start"
              :aria-pressed="selectedSlot === slot.start"
              :color="selectedSlot === slot.start ? 'primary' : undefined"
              min-height="48"
              min-width="80"
              rounded="lg"
              :variant="selectedSlot === slot.start ? 'flat' : 'outlined'"
              @click="selectedSlot = slot.start"
            >
              {{ slot.start }}
            </v-btn>
          </div>

          <v-alert v-else type="info" variant="tonal">
            Não há horários disponíveis para este dia. Escolhe outra data.
          </v-alert>

          <v-btn
            block
            class="mt-5"
            color="primary"
            :disabled="!selectedSlot || submitting || loadingService"
            :loading="submitting"
            size="x-large"
            variant="flat"
            rounded="lg"
            @click="submitBooking"
          >
            <v-icon start>mdi-check-circle</v-icon>
            Enviar pedido
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </main>
</template>

<script setup>
  import { onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import api from '@/services/api'
  import { formatPrice, salonToday, serviceImageUrl } from '@/services/formatters'

  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()

  // Se não estiver autenticado, redirecionar para login
  if (!auth.isAuthenticated) {
    router.push('/login')
  }
  const service = ref(null)
  const selectedDate = ref(salonToday())
  const today = salonToday()
  const slots = ref([])
  const selectedSlot = ref('')
  const loadingService = ref(true)
  const loadingSlots = ref(false)
  const submitting = ref(false)
  const error = ref('')
  const success = ref(false)

  async function loadSlots () {
    selectedSlot.value = ''
    slots.value = []
    error.value = ''
    if (!service.value || !selectedDate.value) return
    loadingSlots.value = true
    try {
      const { data } = await api.get(`/services/${service.value.id}/availability`, {
        params: { date: selectedDate.value },
      })
      slots.value = data.slots
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível carregar os horários.'
    } finally {
      loadingSlots.value = false
    }
  }

  async function submitBooking () {
    error.value = ''
    submitting.value = true
    try {
      await api.post('/appointments', {
        serviceId: service.value.id,
        date: selectedDate.value,
        startTime: selectedSlot.value,
      })
      success.value = true
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Sem ligação ao servidor. Tenta novamente.'
      if (requestError.response?.status === 409) await loadSlots()
    } finally {
      submitting.value = false
    }
  }

  watch(selectedDate, loadSlots)

  onMounted(async () => {
    try {
      const { data } = await api.get(`/services/${route.params.serviceId}`)
      service.value = data.service
      await loadSlots()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível carregar o serviço.'
    } finally {
      loadingService.value = false
    }
  })
</script>
