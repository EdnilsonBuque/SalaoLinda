<template>
  <main class="salon-page pa-4 pa-sm-6">
    <header class="mb-5">
      <p class="auth-kicker mb-1">SALÃO LINDA</p>
      <h1 class="salon-page-title">Serviços do salão</h1>
      <p class="salon-muted">Cabelo, manicure e pedicure, com atenção a cada detalhe.</p>
    </header>

    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
      <template #prepend><v-icon icon="mdi-alert-circle-outline" /></template>
      {{ error }}
    </v-alert>

    <v-row v-if="loading">
      <v-col
        v-for="item in 3"
        :key="item"
        cols="12"
        md="4"
        sm="6"
      >
        <v-skeleton-loader type="image, article, actions" />
      </v-col>
    </v-row>

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
              <v-icon class="mr-1" icon="mdi-clock-outline" size="small" />
              {{ service.durationMinutes }} min
            </v-card-subtitle>
          </v-card-item>

          <v-card-text v-if="service.description" class="pt-2 salon-muted text-body-2">
            {{ service.description }}
          </v-card-text>

          <v-card-actions class="px-4 pb-4 pt-2">
            <strong class="text-h6 mr-auto">{{ formatPrice(service.price) }}</strong>

            <v-btn
              color="primary"
              :to="`/marcar/${service.id}`"
              size="large"
              variant="flat"
              rounded="lg"
            >
              <v-icon start>mdi-calendar-plus</v-icon>
              Marcar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else class="pa-8 text-center salon-card" rounded="xl" elevation="2">
      <v-icon class="mb-3" color="primary" icon="mdi-content-cut" size="48" />
      <h2 class="text-h6 mb-2">Ainda não há serviços disponíveis</h2>
      <p class="salon-muted">Volta mais tarde para conhecer os nossos serviços.</p>
    </v-card>
  </main>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import api from '@/services/api'
  import { formatPrice, serviceIcon, serviceImageUrl } from '@/services/formatters'

  const services = ref([])
  const loading = ref(true)
  const error = ref('')

  onMounted(async () => {
    try {
      const { data } = await api.get('/services')
      services.value = data.services
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Sem ligação ao servidor. Tenta novamente.'
    } finally {
      loading.value = false
    }
  })
</script>
