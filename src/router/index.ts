import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Front-end routes
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/properties',
      name: 'properties',
      component: () => import('@/views/PropertiesView.vue')
    },
    {
      path: '/properties/:id',
      name: 'property-detail',
      component: () => import('@/views/PropertyDetailView.vue')
    },
    {
      path: '/booking',
      name: 'booking',
      component: () => import('@/views/BookingView.vue')
    },
    {
      path: '/booking/confirmation',
      name: 'booking-confirmation',
      component: () => import('@/views/BookingConfirmationView.vue')
    },
    {
      path: '/my-booking',
      name: 'my-booking',
      component: () => import('@/views/MyBookingView.vue')
    },
    // Admin routes
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/AdminLoginView.vue')
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardView.vue')
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: () => import('@/views/admin/AdminBookingsView.vue')
        },
        {
          path: 'properties',
          name: 'admin-properties',
          component: () => import('@/views/admin/AdminPropertiesView.vue')
        },
        {
          path: 'ical',
          name: 'admin-ical',
          component: () => import('@/views/admin/AdminIcalView.vue')
        },
        {
          path: 'costs',
          name: 'admin-costs',
          component: () => import('@/views/admin/AdminCostsView.vue')
        },
        {
          path: 'chatbot',
          name: 'admin-chatbot',
          component: () => import('@/views/admin/AdminChatbotView.vue')
        }
      ]
    }
  ]
})

// Route guard: redirect unauthenticated users away from admin pages
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    await authStore.checkSession()
    if (!authStore.isAdmin) {
      return { name: 'admin-login' }
    }
  }
})

export default router
