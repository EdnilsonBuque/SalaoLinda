<template>
  <v-app>
    <v-app-bar v-if="auth.isAuthenticated" color="primary" density="comfortable" flat>
      <v-app-bar-title>Salão Linda</v-app-bar-title>
      <v-spacer />
      <v-btn icon="mdi-home" variant="text" to="/" title="Início" />
      <v-btn v-if="auth.isAdmin" icon="mdi-account-key" variant="text" to="/admin/utilizadores" title="Gestão de clientes" />
      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-account-circle" variant="text" title="Conta" />
        </template>
        <v-list>
          <v-list-item :title="auth.user?.name" :subtitle="auth.user?.role === 'admin' ? 'Admin' : 'Cliente'" />
          <v-divider />
          <v-list-item title="Sair" prepend-icon="mdi-logout" @click="onLogout" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main class="bg-background">
      <router-view v-if="auth.ready || isGuestRoute" />
      <v-container v-else class="fill-height justify-center"><v-progress-circular indeterminate color="primary" /></v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const isGuestRoute = computed(() => route.meta?.guest)

async function onLogout() {
  await auth.logout()
  router.replace('/login')
}

function handleForcedLogout() {
  auth.setUser(null)
  router.replace('/login')
}

onMounted(() => window.addEventListener('auth:logout', handleForcedLogout))
onUnmounted(() => window.removeEventListener('auth:logout', handleForcedLogout))
</script>
