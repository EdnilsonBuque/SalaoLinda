<template>
  <main class="salon-page">
    <h1 class="salon-page-title">Avaliações</h1>
    <p class="salon-muted mb-5">Ouve a experiência das clientes e acompanha a média por serviço.</p>

    <v-alert v-if="error" class="mb-4" type="error" variant="tonal">{{ error }}</v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular color="primary" indeterminate />
    </div>

    <template v-else>
      <h2 class="text-h5 mb-4">Média por serviço</h2>

      <v-row v-if="services.length > 0" class="mb-5">
        <v-col
          v-for="service in services"
          :key="service.id"
          cols="12"
          md="4"
          sm="6"
        >
          <v-card class="pa-4 salon-card h-100" rounded="lg">
            <h3 class="text-h6">{{ service.name }}</h3>

            <div class="d-flex align-center ga-2 mt-2">
              <v-rating color="warning" density="compact" :model-value="service.averageRating" readonly />
              <strong>{{ service.averageRating.toFixed(1) }}</strong>
            </div>

            <p class="salon-muted mt-1">{{ service.reviewCount }} avaliações</p>
          </v-card>
        </v-col>
      </v-row>

      <v-card v-else class="pa-5 mb-5 salon-card" rounded="lg">
        <p class="salon-muted">Ainda não há avaliações para apresentar.</p>
      </v-card>

      <h2 class="text-h5 mb-4">Comentários recentes</h2>

      <div v-if="reviews.length > 0" class="d-flex flex-column ga-3">
        <v-card v-for="review in reviews" :key="review.id" class="salon-card" rounded="lg">
          <v-card-item>
            <v-card-title>{{ review.serviceName }}</v-card-title>
            <v-card-subtitle>{{ review.clientName }}</v-card-subtitle>

            <template #append>
              <v-rating color="warning" density="compact" :model-value="review.rating" readonly />
            </template>
          </v-card-item>

          <v-card-text v-if="review.comment">{{ review.comment }}</v-card-text>
        </v-card>
      </div>

      <v-card v-else class="pa-5 salon-card" rounded="lg">
        <p class="salon-muted">Quando as clientes avaliarem um atendimento, os comentários aparecem aqui.</p>
      </v-card>
    </template>
  </main>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import api from '@/services/api'

  const services = ref([])
  const reviews = ref([])
  const loading = ref(true)
  const error = ref('')

  onMounted(async () => {
    try {
      const { data } = await api.get('/admin/reviews')
      services.value = data.services
      reviews.value = data.reviews
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Não foi possível carregar as avaliações.'
    } finally {
      loading.value = false
    }
  })
</script>
