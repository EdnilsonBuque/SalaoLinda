<template>
  <main class="salon-page pa-4 pa-sm-6">
    <h1 class="salon-page-title">As minhas marcações</h1>
    <p class="salon-muted mb-4">Acompanha os teus pedidos e o estado de cada atendimento.</p>

    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
      <template #prepend><v-icon icon="mdi-alert-circle-outline" /></template>
      {{ error }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular color="primary" indeterminate />
    </div>

    <div v-else-if="appointments.length > 0" class="d-flex flex-column ga-3">
      <v-card
        v-for="appointment in appointments"
        :key="appointment.id"
        class="salon-card"
        elevation="2"
        rounded="xl"
      >
        <v-card-item class="py-3">
          <template #prepend>
            <v-avatar color="primary" rounded="lg">
              <v-icon color="white" :icon="serviceIcon(appointment.serviceName)" />
            </v-avatar>
          </template>

          <v-card-title class="text-subtitle-1 font-weight-bold">{{ appointment.serviceName }}</v-card-title>
          <v-card-subtitle class="text-body-2">
            <v-icon start size="small">mdi-calendar</v-icon>
            {{ formatDateTime(appointment.startsAt) }}
          </v-card-subtitle>

          <template #append>
            <v-chip
              :color="appointmentStatus(appointment.status).color"
              size="small"
              variant="tonal"
            >
              <v-icon :icon="appointmentStatus(appointment.status).icon" start size="small" />
              {{ appointmentStatus(appointment.status).label }}
            </v-chip>
          </template>
        </v-card-item>

        <v-card-text class="pt-0">
          <div class="d-flex align-center flex-wrap ga-3">
            <v-chip size="small" variant="outlined">
              <v-icon start size="small">mdi-clock-outline</v-icon>
              {{ appointment.durationMinutes }} min
            </v-chip>
            <strong class="text-primary">{{ formatPrice(appointment.price) }}</strong>
          </div>

          <v-alert
            v-if="appointment.rejectionReason"
            class="mt-3 mb-0"
            density="compact"
            type="error"
            variant="tonal"
          >
            <span class="text-body-2">Motivo: {{ appointment.rejectionReason }}</span>
          </v-alert>
        </v-card-text>

        <v-card-actions v-if="appointment.canCancel" class="px-4 pb-4 pt-0">
          <v-spacer />

          <v-btn
            color="error"
            :loading="cancellingId === appointment.id"
            prepend-icon="mdi-cancel"
            rounded="lg"
            variant="tonal"
            @click="cancelAppointment(appointment)"
          >
            Cancelar
          </v-btn>
        </v-card-actions>

        <v-card-actions v-else-if="appointment.status === 'concluida' && !appointment.hasReview" class="px-4 pb-4 pt-0">
          <v-spacer />

          <v-btn color="primary" prepend-icon="mdi-star" rounded="lg" variant="flat" @click="openReview(appointment)">
            Avaliar atendimento
          </v-btn>
        </v-card-actions>

        <v-card-text v-else-if="appointment.hasReview" class="pt-0">
          <div class="d-flex align-center ga-2">
            <v-rating color="warning" density="compact" :model-value="appointment.reviewRating" readonly />
            <span class="text-caption text-medium-emphasis">A tua avaliação</span>
          </div>

          <p v-if="appointment.reviewComment" class="mt-2 salon-muted text-body-2">{{ appointment.reviewComment }}</p>
        </v-card-text>
      </v-card>
    </div>

    <v-card v-else class="pa-8 text-center salon-card" rounded="xl" elevation="2">
      <v-icon class="mb-3" color="primary" icon="mdi-calendar-blank-outline" size="48" />
      <h2 class="text-h6 mb-2">Ainda não tens marcações</h2>
      <p class="salon-muted mb-4">Explora os serviços e escolhe o teu horário.</p>
      <v-btn color="primary" rounded="lg" to="/servicos" size="large" variant="flat">
        <v-icon start>mdi-content-cut</v-icon>
        Ver serviços
      </v-btn>
    </v-card>

    <v-dialog v-model="reviewDialog" max-width="460" persistent>
      <v-card rounded="xl">
        <v-card-title class="pa-5">
          <v-icon start color="warning">mdi-star</v-icon>
          Avaliar atendimento
        </v-card-title>

        <v-card-text>
          <p class="mb-3 salon-muted">{{ selectedAppointment?.serviceName }}</p>
          <div class="d-flex justify-center mb-4">
            <v-rating v-model="rating" color="warning" length="5" size="40" />
          </div>

          <v-textarea
            v-model="comment"
            auto-grow
            label="Comentário (opcional)"
            maxlength="1000"
            rows="3"
            variant="outlined"
          />

          <v-alert v-if="reviewError" type="error" variant="tonal">{{ reviewError }}</v-alert>
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn :disabled="savingReview" rounded="lg" variant="text" @click="reviewDialog = false">Cancelar</v-btn>

          <v-btn
            color="primary"
            :disabled="rating < 1"
            :loading="savingReview"
            rounded="lg"
            variant="flat"
            @click="submitReview"
          >
            <v-icon start>mdi-send</v-icon>
            Enviar avaliação
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import api from '@/services/api'
  import { appointmentStatus, formatDateTime, formatPrice, serviceIcon } from '@/services/formatters'

  const appointments = ref([])
  const loading = ref(true)
  const cancellingId = ref(null)
  const error = ref('')
  const reviewDialog = ref(false)
  const selectedAppointment = ref(null)
  const rating = ref(0)
  const comment = ref('')
  const reviewError = ref('')
  const savingReview = ref(false)

  async function loadAppointments () {
    error.value = ''
    const { data } = await api.get('/appointments')
    appointments.value = data.appointments
  }

  async function cancelAppointment (appointment) {
    error.value = ''
    cancellingId.value = appointment.id
    try {
      await api.post(`/appointments/${appointment.id}/cancel`)
      await loadAppointments()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível cancelar a marcação.'
    } finally {
      cancellingId.value = null
    }
  }

  function openReview (appointment) {
    selectedAppointment.value = appointment
    rating.value = 0
    comment.value = ''
    reviewError.value = ''
    reviewDialog.value = true
  }

  async function submitReview () {
    if (!selectedAppointment.value || rating.value < 1) return
    savingReview.value = true
    reviewError.value = ''
    try {
      await api.post(`/appointments/${selectedAppointment.value.id}/review`, {
        rating: rating.value,
        comment: comment.value,
      })
      reviewDialog.value = false
      await loadAppointments()
    } catch (requestError) {
      reviewError.value = requestError.response?.data?.message || 'Não foi possível enviar a avaliação.'
    } finally {
      savingReview.value = false
    }
  }

  onMounted(async () => {
    try {
      await loadAppointments()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Sem ligação ao servidor. Tenta novamente.'
    } finally {
      loading.value = false
    }
  })
</script>
