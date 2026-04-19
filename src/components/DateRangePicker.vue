<script lang="ts">
export { isDateBlocked } from '@/utils/dateRangeUtils'
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DatePicker } from 'v-calendar'
import { useI18n } from 'vue-i18n'
import { supabase, IS_MOCK_MODE } from '@/lib/supabase'
import { formatDate } from '@/utils/date'
import { isDateBlocked } from '@/utils/dateRangeUtils'
import type { BlockedDate } from '@/types'
import 'v-calendar/style.css'

// ── Props & Emits ────────────────────────────────────────────
const props = defineProps<{
  propertyId: string
  modelValue: { checkIn: Date | null; checkOut: Date | null }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { checkIn: Date | null; checkOut: Date | null }): void
}>()

// ── i18n ────────────────────────────────────────────────────
const { locale } = useI18n()

// ── State ────────────────────────────────────────────────────
const blockedDates = ref<BlockedDate[]>([])
const errorMessage = ref<string | null>(null)
const loading = ref(false)

// ── Disabled dates for v-calendar ───────────────────────────
const disabledDates = computed(() =>
  blockedDates.value.map((b) => ({
    start: new Date(b.start_date),
    end: new Date(b.end_date)
  }))
)

// ── v-calendar range binding ─────────────────────────────────
const range = computed({
  get() {
    return {
      start: props.modelValue.checkIn,
      end: props.modelValue.checkOut
    }
  },
  set(val: { start: Date | null; end: Date | null }) {
    const checkIn = val?.start ?? null
    const checkOut = val?.end ?? null

    errorMessage.value = null

    // Validate: blocked date selected
    if (checkIn && isDateBlocked(checkIn, blockedDates.value)) {
      errorMessage.value = locale.value === 'ja'
        ? '選択した日付は予約済みです。別の日付を選んでください。'
        : locale.value === 'en'
          ? 'The selected date is unavailable. Please choose another date.'
          : '所選日期已被佔用，請選擇其他日期。'
      return
    }
    if (checkOut && isDateBlocked(checkOut, blockedDates.value)) {
      errorMessage.value = locale.value === 'ja'
        ? '選択した日付は予約済みです。別の日付を選んでください。'
        : locale.value === 'en'
          ? 'The selected date is unavailable. Please choose another date.'
          : '所選日期已被佔用，請選擇其他日期。'
      return
    }

    // Validate: checkOut must be > checkIn
    if (checkIn && checkOut && checkOut <= checkIn) {
      errorMessage.value = locale.value === 'ja'
        ? 'チェックアウト日はチェックイン日より後の日付を選んでください。'
        : locale.value === 'en'
          ? 'Check-out date must be after check-in date.'
          : '退房日期必須晚於入住日期，請重新選擇。'
      return
    }

    emit('update:modelValue', { checkIn, checkOut })
  }
})

// ── Formatted display values ─────────────────────────────────
const formattedCheckIn = computed(() =>
  props.modelValue.checkIn ? formatDate(props.modelValue.checkIn, locale.value) : '—'
)
const formattedCheckOut = computed(() =>
  props.modelValue.checkOut ? formatDate(props.modelValue.checkOut, locale.value) : '—'
)

// ── Fetch blocked dates on mount ─────────────────────────────
onMounted(async () => {
  if (IS_MOCK_MODE) {
    // Mock 模式：不查 blocked_dates，日曆正常顯示所有日期可選
    loading.value = false
    return
  }

  loading.value = true
  try {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .eq('property_id', props.propertyId)

    if (error) throw error
    blockedDates.value = (data as BlockedDate[]) ?? []
  } catch (err) {
    console.error('Failed to fetch blocked dates:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="date-range-picker">
    <!-- Loading indicator -->
    <div v-if="loading" class="text-sm text-gray-500 mb-2">
      {{ locale === 'ja' ? '読み込み中...' : locale === 'en' ? 'Loading...' : '載入中...' }}
    </div>

    <!-- v-calendar DatePicker -->
    <DatePicker
      v-model.range="range"
      :disabled-dates="disabledDates"
      is-range
      :columns="2"
      color="blue"
      class="rounded-lg shadow"
    />

    <!-- Locale-aware date display -->
    <div class="mt-3 flex gap-6 text-sm text-gray-700">
      <div>
        <span class="font-medium">
          {{ locale === 'ja' ? 'チェックイン：' : locale === 'en' ? 'Check-in: ' : '入住日期：' }}
        </span>
        <span>{{ formattedCheckIn }}</span>
      </div>
      <div>
        <span class="font-medium">
          {{ locale === 'ja' ? 'チェックアウト：' : locale === 'en' ? 'Check-out: ' : '退房日期：' }}
        </span>
        <span>{{ formattedCheckOut }}</span>
      </div>
    </div>

    <!-- Error message -->
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>
