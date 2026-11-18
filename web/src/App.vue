<template>
  <v-app>
    <v-app-bar v-if="!isHomeRoute" class="salon-app-bar" density="comfortable" flat>
      <v-app-bar-title class="font-weight-bold">Salão Linda</v-app-bar-title>
      <div v-if="auth.isAuthenticated" class="appbar-links">
        <v-btn v-if="!auth.isAdmin" to="/servicos" variant="text">Serviços</v-btn>
        <v-btn v-if="!auth.isAdmin" to="/marcacoes" variant="text">Marcações</v-btn>
        <template v-else>
          <v-btn to="/admin/servicos" variant="text">Serviços</v-btn>
          <v-btn to="/admin/marcacoes" variant="text">Agenda</v-btn>
          <v-btn to="/admin/avaliacoes" variant="text">Avaliações</v-btn>
          <v-btn to="/admin/utilizadores" variant="text">Clientes</v-btn>
        </template>
      </div>
      <v-spacer />

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-account-circle" variant="text" />
        </template>
        <v-list>
          <v-list-item
            v-if="auth.user"
            :title="auth.user.name"
            :subtitle="auth.user.role === 'admin' ? 'Admin' : 'Cliente'"
            prepend-icon="mdi-account"
          />
          <v-divider v-if="auth.user" />
          <v-list-item v-if="!auth.user" title="Entrar" prepend-icon="mdi-login" to="/login" />
          <v-list-item v-if="!auth.user" title="Criar conta" prepend-icon="mdi-account-plus" to="/registo" />
          <v-list-item v-if="auth.user" title="Sair" prepend-icon="mdi-logout" @click="onLogout" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="bg-background" :class="{ 'main-with-bottom-nav': showBottomNav }">
      <router-view v-if="auth.ready || isGuestRoute" />
      <v-container v-else class="fill-height justify-center">
        <v-progress-circular indeterminate color="primary" />
      </v-container>
    </v-main>

    <!-- Bottom Navigation (Mobile/APK) -->
    <v-bottom-navigation
      v-if="showBottomNav"
      class="mobile-bottom-nav"
      color="primary"
      grow
    >
      <!-- Cliente: Home, Serviços, Marcações -->
      <template v-if="!auth.isAdmin">
        <v-btn value="home" to="/">
          <v-icon>mdi-home</v-icon>
          <span>Início</span>
        </v-btn>
        <v-btn value="services" to="/servicos">
          <v-icon>mdi-content-cut</v-icon>
          <span>Serviços</span>
        </v-btn>
        <v-btn value="appointments" to="/marcacoes">
          <v-icon>mdi-calendar</v-icon>
          <span>Marcações</span>
        </v-btn>
      </template>

      <!-- Admin: Home, Serviços, Agenda, Mais -->
      <template v-else>
        <v-btn value="home" to="/">
          <v-icon>mdi-home</v-icon>
          <span>Início</span>
        </v-btn>
        <v-btn value="services" to="/admin/servicos">
          <v-icon>mdi-content-cut</v-icon>
          <span>Serviços</span>
        </v-btn>
        <v-btn value="agenda" to="/admin/marcacoes">
          <v-icon>mdi-calendar-clock</v-icon>
          <span>Agenda</span>
        </v-btn>
        <v-btn value="more" @click="moreMenu = true">
          <v-icon>mdi-dots-horizontal</v-icon>
          <span>Mais</span>
        </v-btn>
      </template>
    </v-bottom-navigation>

    <!-- Admin "Mais" Menu (Bottom Sheet) -->
    <v-bottom-sheet v-model="moreMenu" v-if="auth.isAdmin">
      <v-list>
        <v-list-item title="Avaliações" prepend-icon="mdi-star" to="/admin/avaliacoes" @click="moreMenu = false" />
        <v-list-item title="Clientes" prepend-icon="mdi-account-key" to="/admin/utilizadores" @click="moreMenu = false" />
        <v-divider />
        <v-list-item title="Sair" prepend-icon="mdi-logout" @click="onLogout" />
      </v-list>
    </v-bottom-sheet>
  </v-app>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const display = useDisplay()
const moreMenu = ref(false)

const isGuestRoute = computed(() => route.meta?.guest)
const isHomeRoute = computed(() => route.path === '/')

// Mostrar bottom nav apenas em rotas principais (não em modais/booking)
const hasBottomNav = computed(() => {
  const mainRoutes = ['/', '/servicos', '/marcacoes', '/admin/servicos', '/admin/marcacoes', '/admin/avaliacoes', '/admin/utilizadores']
  return mainRoutes.includes(route.path)
})
const showBottomNav = computed(() => auth.isAuthenticated && hasBottomNav.value && !display.mdAndUp.value)

async function onLogout() {
  moreMenu.value = false
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