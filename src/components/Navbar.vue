<template>
  <nav class="bg-white shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex-shrink-0 font-bold text-lg text-gray-800 hover:text-gray-600 transition-colors">
          Moment Chalet Hakuba
        </RouterLink>

        <!-- Desktop nav links -->
        <div class="hidden md:flex items-center space-x-6">
          <RouterLink
            to="/"
            class="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            active-class="text-gray-900 font-semibold"
            exact-active-class="text-gray-900 font-semibold"
          >
            {{ t('nav.home') }}
          </RouterLink>
          <RouterLink
            to="/properties"
            class="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            active-class="text-gray-900 font-semibold"
          >
            {{ t('nav.properties') }}
          </RouterLink>
          <RouterLink
            to="/my-booking"
            class="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            active-class="text-gray-900 font-semibold"
          >
            {{ t('nav.myBooking') }}
          </RouterLink>

          <!-- Language switcher -->
          <div class="relative" ref="langDropdownRef">
            <button
              @click="toggleLangDropdown"
              class="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors font-medium border border-gray-300 rounded px-3 py-1 text-sm"
              aria-haspopup="listbox"
              :aria-expanded="langDropdownOpen"
            >
              {{ currentLocaleLabel }}
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': langDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul
              v-if="langDropdownOpen"
              role="listbox"
              class="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-10"
            >
              <li
                v-for="option in localeOptions"
                :key="option.value"
                role="option"
                :aria-selected="locale === option.value"
                @click="selectLocale(option.value)"
                class="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                :class="{ 'font-semibold text-gray-900': locale === option.value, 'text-gray-600': locale !== option.value }"
              >
                {{ option.label }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Mobile: language switcher + hamburger -->
        <div class="flex md:hidden items-center gap-2">
          <!-- Mobile language switcher -->
          <div class="relative" ref="mobileLangDropdownRef">
            <button
              @click="toggleMobileLangDropdown"
              class="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors font-medium border border-gray-300 rounded px-2 py-1 text-xs"
              aria-haspopup="listbox"
              :aria-expanded="mobileLangDropdownOpen"
            >
              {{ currentLocaleLabel }}
              <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': mobileLangDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul
              v-if="mobileLangDropdownOpen"
              role="listbox"
              class="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-10"
            >
              <li
                v-for="option in localeOptions"
                :key="option.value"
                role="option"
                :aria-selected="locale === option.value"
                @click="selectLocale(option.value, true)"
                class="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 transition-colors"
                :class="{ 'font-semibold text-gray-900': locale === option.value, 'text-gray-600': locale !== option.value }"
              >
                {{ option.label }}
              </li>
            </ul>
          </div>

          <!-- Hamburger button -->
          <button
            @click="toggleMobileMenu"
            class="p-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            :aria-expanded="mobileMenuOpen"
            aria-label="Toggle navigation menu"
          >
            <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-200 bg-white">
      <div class="px-4 py-3 space-y-1">
        <RouterLink
          to="/"
          class="block px-3 py-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors font-medium"
          active-class="text-gray-900 bg-gray-50 font-semibold"
          exact-active-class="text-gray-900 bg-gray-50 font-semibold"
          @click="mobileMenuOpen = false"
        >
          {{ t('nav.home') }}
        </RouterLink>
        <RouterLink
          to="/properties"
          class="block px-3 py-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors font-medium"
          active-class="text-gray-900 bg-gray-50 font-semibold"
          @click="mobileMenuOpen = false"
        >
          {{ t('nav.properties') }}
        </RouterLink>
        <RouterLink
          to="/my-booking"
          class="block px-3 py-2 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors font-medium"
          active-class="text-gray-900 bg-gray-50 font-semibold"
          @click="mobileMenuOpen = false"
        >
          {{ t('nav.myBooking') }}
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale, type Locale } from '@/i18n'

const { t, locale } = useI18n()

const mobileMenuOpen = ref(false)
const langDropdownOpen = ref(false)
const mobileLangDropdownOpen = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)
const mobileLangDropdownRef = ref<HTMLElement | null>(null)

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
]

const currentLocaleLabel = computed(() => {
  return localeOptions.find(o => o.value === locale.value)?.label ?? locale.value
})

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function toggleLangDropdown() {
  langDropdownOpen.value = !langDropdownOpen.value
}

function toggleMobileLangDropdown() {
  mobileLangDropdownOpen.value = !mobileLangDropdownOpen.value
}

function selectLocale(value: Locale, isMobile = false) {
  setLocale(value)
  langDropdownOpen.value = false
  mobileLangDropdownOpen.value = false
  if (isMobile) mobileMenuOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (langDropdownRef.value && !langDropdownRef.value.contains(event.target as Node)) {
    langDropdownOpen.value = false
  }
  if (mobileLangDropdownRef.value && !mobileLangDropdownRef.value.contains(event.target as Node)) {
    mobileLangDropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
