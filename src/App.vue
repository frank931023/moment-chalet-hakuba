<template>
  <template v-if="!isAdminRoute">
    <Navbar />
    <RouterView />
    <Footer />
    <ChatbotWidget />
  </template>
  <template v-else>
    <RouterView />
  </template>
  <Toast />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ChatbotWidget from '@/components/ChatbotWidget.vue'

const route = useRoute()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
</script>
