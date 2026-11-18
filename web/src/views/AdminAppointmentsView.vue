<template>
  <main class="salon-page">
    <h1 class="salon-page-title">Agenda do salão</h1>
    <p class="salon-muted mb-5">Confirma os pedidos e acompanha o dia de trabalho.</p>

    <v-row class="mb-2">
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="date"
          label="Dia"
          prepend-inner-icon="mdi-calendar"
          type="date"
          @update:model-value="loadAppointments"
        />
      </v-col>

      <v-col cols="12" sm="6">
        <v-select
          v-model="status"
          item-title="label"
          item-value="value"
          :items="statusOptions"
          label="Estado"
          @update:model-value="loadAppointments"
        />
      </v-col>
    </v-row>

    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">{{ error }}</v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular color="primary" indeterminate />
    </div>

    <div v-else-if="appointments.length > 0" class="d-flex flex-column ga-4">
      <v-card v-for="appointment in appointments" :key="appointment.id" class="salon-card" rounded="lg">
        <v-card-item>
          <template #prepend>
            <v-avatar color="secondary" rounded="lg"><v-icon color="primary" icon="mdi-calendar-clock" /></v-avatar>
          </template>

          <v-card-title>{{ appointment.serviceName }}</v-card-title>

          <v-card-subtitle>
            {{ appointment.startsAt.slice(11, 16) }}–{{ appointment.endsAt.slice(11, 16) }}
            · {{ appointment.clientName }} · {{ appointment.clientPhone }}
          </v-card-subtitle>

          <template #append>
            <v-chip :color="appointmentStatus(appointment.status).color" variant="tonal">
              <v-icon :icon="appointmentStatus(appointment.status).icon" start />
              {{ appointmentStatus(appointment.status).label }}
            </v-chip>
          </template>
        </v-card-item>

        <v-card-text>
          <div class="d-flex flex-wrap ga-4">
            <span>{{ appointment.durationMinutes }} min</span>
            <strong>{{ formatPrice(appointment.price) }}</strong>
          </div>

          <p v-if="appointment.rejectionReason" class="mt-2 text-error">
            Motivo: {{ appointment.rejectionReason }}
          </p>
        </v-card-text>

        <v-card-actions v-if="appointment.status === 'pendente' || canComplete(appointment)" class="px-4 pb-4">
          <v-spacer />

          <template v-if="appointment.status === 'pendente'">
            <v-btn
              color="error"
              :loading="savingId === appointment.id"
              variant="text"
              @click="openReject(appointment)"
            >
              Rejeitar
            </v-btn>

            <v-btn
              color="primary"
              :loading="savingId === appointment.id"
              prepend-icon="mdi-check"
              variant="flat"
              @click="changeStatus(appointment, 'confirmada')"
            >
              Confirmar
            </v-btn>
          </template>

          <v-btn
            v-else
            color="primary"
            :loading="savingId === appointment.id"
            prepend-icon="mdi-check-all"
            variant="flat"
            @click="changeStatus(appointment, 'concluida')"
          >
            Marcar concluída
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <v-card v-else class="pa-8 text-center salon-card" rounded="lg">
      <v-icon class="mb-3" color="primary" icon="mdi-calendar-check-outline" size="40" />
      <h2 class="text-h6 mb-2">Sem marcações para este filtro</h2>
      <p class="salon-muted">Quando houver pedidos, vão aparecer aqui.</p>
    </v-card>

    <v-dialog v-model="rejectDialog" max-width="440">
      <v-card rounded="lg">
        <v-card-title class="pa-5">Rejeitar marcação?</v-card-title>

        <v-card-text>
          <p class="mb-4">{{ selectedAppointment?.clientName }} · {{ selectedAppointment?.serviceName }}</p>

          <v-textarea
            v-model="rejectionReason"
            auto-grow
            label="Motivo (opcional)"
            maxlength="255"
            rows="2"
          />
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Voltar</v-btn>

          <v-btn color="error" :loading="savingId === selectedAppointment?.id" variant="flat" @click="reject">
            Rejeitar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import api from '@/services/api'
  import { appointmentStatus, formatPrice, salonDateTime, salonToday } from '@/services/formatters'

  const statusOptions = [
    { label: 'Todos os estados', value: '' },
    { label: 'Pendente', value: 'pendente' },
    { label: 'Confirmada', value: 'confirmada' },
    { label: 'Rejeitada', value: 'rejeitada' },
    { label: 'Cancelada', value: 'cancelada' },
    { label: 'Concluída', value: 'concluida' },
  ]

  const date = ref(salonToday())
  const status = ref('')
  const appointments = ref([])
  const loading = ref(true)
  const savingId = ref(null)
  const error = ref('')
  const rejectDialog = ref(false)
  const rejectionReason = ref('')
  const selectedAppointment = ref(null)

  async function loadAppointments () {
    loading.value = true
    error.value = ''
    try {
      const params = { date: date.value }
      if (status.value) params.status = status.value
      const { data } = await api.get('/admin/appointments', { params })
      appointments.value = data.appointments
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível carregar a agenda.'
    } finally {
      loading.value = false
    }
  }

  function canComplete (appointment) {
    return appointment.status === 'confirmada' && appointment.endsAt <= salonDateTime()
  }

  async function changeStatus (appointment, nextStatus, reason) {
    savingId.value = appointment.id
    error.value = ''
    try {
      await api.patch(`/admin/appointments/${appointment.id}/status`, {
        status: nextStatus,
        rejectionReason: reason,
      })
      rejectDialog.value = false
      await loadAppointments()
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível atualizar a marcação.'
    } finally {
      savingId.value = null
    }
  }

  function openReject (appointment) {
    selectedAppointment.value = appointment
    rejectionReason.value = ''
    rejectDialog.value = true
  }

  async function reject () {
    if (selectedAppointment.value) {
      await changeStatus(selectedAppointment.value, 'rejeitada', rejectionReason.value || undefined)
    }
  }

  onMounted(loadAppointments)
</script>
