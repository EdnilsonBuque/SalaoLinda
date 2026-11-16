<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-4" elevation="2" rounded="lg">
          <v-card-title class="text-h5 font-weight-bold text-center">Entrar</v-card-title>
          <v-card-subtitle class="text-center mb-2">Salão Linda</v-card-subtitle>
          <v-card-text>
            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
            <v-form @submit.prevent="onSubmit">
              <v-text-field v-model="phone" label="Contacto (telefone)" prepend-inner-icon="mdi-phone" :error-messages="fieldErrors.phone" required />
              <v-text-field v-model="password" label="Palavra-passe" type="password" prepend-inner-icon="mdi-lock" :error-messages="fieldErrors.password" required />
              <v-btn :loading="loading" type="submit" color="primary" block size="large" class="mt-2">Entrar</v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions class="justify-center">
            <span>Não tem conta?</span>
            <v-btn variant="text" color="primary" to="/registo">Criar conta</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const phone = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})

async function onSubmit() {
  error.value = ''
  fieldErrors.value = {}
  loading.value = true
  try {
    await auth.login({ phone: phone.value, password: password.value })
    router.replace(route.query.redirect || '/')
  } catch (e) {
    const data = e.response?.data
    error.value = data?.message || 'Não foi possível entrar'
    fieldErrors.value = data?.fieldErrors || {}
  } finally {
    loading.value = false
  }
}
</script>
