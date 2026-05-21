<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top header -->
    <header class="bg-gray-900 text-white flex items-center justify-between px-4 py-3 z-20">
      <div class="flex items-center gap-3">
        <!-- Mobile hamburger -->
        <button
          class="md:hidden p-1 rounded hover:bg-gray-700"
          aria-label="Toggle sidebar"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="font-bold text-lg tracking-wide">Moment Chalet Admin</span>
      </div>

      <button
        class="text-sm px-3 py-1.5 rounded border border-gray-500 hover:bg-gray-700 transition-colors"
        @click="handleLogout"
      >
        {{ $t('admin.logout') }}
      </button>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar overlay (mobile) -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/40 z-10 md:hidden"
        @click="sidebarOpen = false"
      />

      <!-- Sidebar -->
      <aside
        :class="[
          'fixed md:static top-0 left-0 h-full w-56 bg-gray-800 text-white z-20 flex flex-col pt-14 md:pt-0 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            active-class="bg-gray-700 font-semibold"
            exact-active-class="bg-gray-700 font-semibold"
            @click="sidebarOpen = false"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto bg-gray-100 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navLinks = [
  { to: '/admin', label: t('admin.dashboard') },
  { to: '/admin/bookings', label: t('admin.bookings') },
  { to: '/admin/properties', label: t('admin.properties') },
  { to: '/admin/ical', label: t('admin.ical') },
  { to: '/admin/chatbot', label: t('admin.chatbot') },
]

async function handleLogout() {
  await authStore.logout()
  router.push('/admin/login')
}
</script>
