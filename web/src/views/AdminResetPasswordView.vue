<template>
  <v-container class="salon-page">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card rounded="lg" class="pa-4">
          <v-card-title class="text-h6">Redefinir palavra-passe de cliente</v-card-title>
          <v-card-subtitle>Acesso reservado à administração (servidor valida permissões)</v-card-subtitle>
          <v-card-text>
            <v-alert v-if="success" type="success" variant="tonal" class="mb-4">{{ success }}</v-alert>
            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
            <v-form @submit.prevent="onSubmit">
              <v-select
                v-model="selectedUserId"
                :items="clientUsers"
                item-title="label"
                item-value="id"
                label="Cliente"
                :loading="loadingUsers"
                :error-messages="fieldErrors.userId"
                hint="Selecione o cliente a atualizar"
                persistent-hint
                class="mb-3"
              />
              <v-text-field v-model="newPassword" label="Nova palavra-passe" type="password" :error-messages="fieldErrors.newPassword" required />
              <v-btn :loading="loading" type="submit" color="primary" block>Redefinir palavra-passe</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const users = ref([])
const selectedUserId = ref(null)
const newPassword = ref('')
const loading = ref(false)
const loadingUsers = ref(false)
const error = ref('')
const success = ref('')
const fieldErrors = ref({})

const clientUsers = computed(() =>
  users.value.filter(u => u.role === 'client').map(u => ({ ...u, label: `${u.name} (${u.phone}) #${u.id}` }))
)

async function loadUsers() {
  loadingUsers.value = true
  try {
    const { data } = await api.get('/admin/users')
    users.value = data.users || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Erro ao carregar utilizadores'
  } finally {
    loadingUsers.value = false
  }
}

async function onSubmit() {
  error.value = ''; success.value = ''; fieldErrors.value = {}
  if (!selectedUserId.value) { fieldErrors.value = { userId: 'Selecione um cliente' }; return }
  loading.value = true
  try {
    const { data } = await api.post(`/admin/users/${selectedUserId.value}/reset-password`, { newPassword: newPassword.value })
    success.value = data.message || 'Palavra-passe redefinida com sucesso'
    newPassword.value = ''
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || 'Não foi possível redefinir a palavra-passe'
    fieldErrors.value = data?.fieldErrors || {}
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>
