<template>
  <v-container class="py-6">
    <v-card rounded="lg" class="pa-4 mb-4">
      <v-card-title class="text-h6">Bem-vinda/o, {{ auth.user?.name }}</v-card-title>
      <v-card-text>
        <p><strong>Contacto:</strong> {{ auth.user?.phone }}</p>
        <p><strong>Perfil:</strong> {{ auth.user?.role === 'admin' ? 'Admin (Dona)' : 'Cliente' }}</p>
      </v-card-text>
    </v-card>

    <v-alert v-if="auth.isAdmin" type="info" variant="tonal" class="mb-4">
      Área de gestão disponível. Use o menu para aceder à redefinição de palavra-passe de clientes.
    </v-alert>

    <v-card rounded="lg" class="pa-4">
      <v-card-title class="text-subtitle-1">Próximos passos</v-card-title>
      <v-card-text>
        <p>Fundação concluída: autenticação e sessão ativas. Os módulos de serviços, marcações, dashboard e avaliações serão adicionados nas próximas fases.</p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>
