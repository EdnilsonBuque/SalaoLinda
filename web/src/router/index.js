import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import HomeView from '@/views/HomeView.vue'
import AdminResetPasswordView from '@/views/AdminResetPasswordView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
    { path: '/registo', name: 'register', component: RegisterView, meta: { guest: true } },
    { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/admin/utilizadores', name: 'admin-users', component: AdminResetPasswordView, meta: { requiresAuth: true, admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

let hydrated = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!hydrated) {
    await auth.hydrate()
    hydrated = true
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.guest && auth.isAuthenticated) return { name: 'home' }
  if (to.meta.admin && !auth.isAdmin) return { name: 'home' }
  return true
})

export default router
