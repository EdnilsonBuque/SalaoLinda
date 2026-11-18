<template>
  <v-container class="auth-page d-flex align-center" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="10" md="5" lg="4">
        <v-card class="salon-auth-card pa-5 pa-sm-7">
          <div class="text-center mb-4">
            <span class="auth-brand-mark"><v-icon icon="mdi-content-cut" size="22" /></span>
            <p class="auth-kicker mb-2">Salão Linda</p>
            <v-card-title class="justify-center pa-0 text-h4 font-weight-medium">Bem-vinda de volta</v-card-title>
            <v-card-subtitle class="mt-2">Entre para gerir as suas marcações.</v-card-subtitle>
          </div>

          <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

          <v-form @submit.prevent="onSubmit">
            <v-text-field
              v-model="phone"
              label="Contacto (telefone)"
              prepend-inner-icon="mdi-phone"
              :error-messages="fieldErrors.phone"
              variant="outlined"
              required
            />
            <v-text-field
              v-model="password"
              label="Palavra-passe"
              type="password"
              prepend-inner-icon="mdi-lock"
              :error-messages="fieldErrors.password"
              variant="outlined"
              required
            />
            <v-btn
              :loading="loading"
              type="submit"
              color="primary"
              block
              size="x-large"
              class="mt-2"
            >
              <v-icon start>mdi-login</v-icon>
              Entrar
            </v-btn>
          </v-form>
        </v-card>

        <div class="text-center mt-4">
          <span class="text-body-2 salon-muted">Ainda não tem conta?</span>
          <v-btn variant="text" color="primary" to="/registo" class="ml-1">Criar conta</v-btn>
        </div>
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
