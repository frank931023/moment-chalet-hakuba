<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Time-range selector ─────────────────────────────────────────────
type RangeKey = '2w' | '1m' | '1q' | '6m' | '1y'
interface RangeOption { key: RangeKey; label: string; days: number; granularity: 'day' | 'week' | 'month' }

const RANGES: RangeOption[] = [
  { key: '2w', label: '近 2 週', days: 14, granularity: 'day' },
  { key: '1m', label: '近 1 個月', days: 30, granularity: 'day' },
  { key: '1q', label: '近 1 季', days: 90, granularity: 'week' },
  { key: '6m', label: '近 6 個月', days: 180, granularity: 'week' },
  { key: '1y', label: '近 1 年', days: 365, granularity: 'month' },
]

const activeRange = ref<RangeKey>('1m')
const currentRange = computed(() => RANGES.find(r => r.key === activeRange.value)!)

// ── Heatmap range (independent from main range) ────────────────────
type HeatmapKey = '7d' | '4w' | '12w'
interface HeatmapOption { key: HeatmapKey; label: string; buckets: number; bucketLabel: string }
const HEATMAP_RANGES: HeatmapOption[] = [
  { key: '7d', label: '近 7 天', buckets: 7, bucketLabel: '天' },
  { key: '4w', label: '近 4 週', buckets: 4, bucketLabel: '週' },
  { key: '12w', label: '近 12 週', buckets: 12, bucketLabel: '週' },
]
const heatmapRange = ref<HeatmapKey>('4w')
const currentHeatmap = computed(() => HEATMAP_RANGES.find(r => r.key === heatmapRange.value)!)

// ── Property sort ──────────────────────────────────────────────────
type SortKey = 'revenue-desc' | 'revenue-asc' | 'name-asc' | 'bookings-desc'
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'revenue-desc', label: '收入 ↓' },
  { key: 'revenue-asc', label: '收入 ↑' },
  { key: 'bookings-desc', label: '訂單數 ↓' },
  { key: 'name-asc', label: '名稱 A-Z' },
]
const sortKey = ref<SortKey>('revenue-desc')

// ── Deterministic pseudo-random ────────────────────────────────────
function noise(i: number, seed = 1): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// ── Time-series ─────────────────────────────────────────────────────
interface Point { label: string; income: number; expense: number; guests: number }

const timeSeries = computed<Point[]>(() => {
  const { days, granularity } = currentRange.value
  const buckets = granularity === 'day' ? days : granularity === 'week' ? Math.ceil(days / 7) : Math.ceil(days / 30)

  const baseIncome = granularity === 'day' ? 35000 : granularity === 'week' ? 240000 : 1_050_000
  const baseExpense = baseIncome * 0.18
  const baseGuests = granularity === 'day' ? 8 : granularity === 'week' ? 55 : 230

  const today = new Date()
  return Array.from({ length: buckets }, (_, idx) => {
    const i = buckets - idx - 1
    const seasonal = Math.sin((idx / buckets) * Math.PI * 2) * 0.25 + 1
    const incomeJitter = (noise(idx, 3) - 0.5) * 0.4
    const expenseJitter = (noise(idx, 7) - 0.5) * 0.35
    const guestJitter = (noise(idx, 9) - 0.5) * 0.5
    const income = Math.round(baseIncome * seasonal * (1 + incomeJitter))
    const expense = Math.round(baseExpense * (1 + expenseJitter))
    const guests = Math.max(1, Math.round(baseGuests * seasonal * (1 + guestJitter)))

    const d = new Date(today)
    let label = ''
    if (granularity === 'day') {
      d.setDate(d.getDate() - i)
      label = `${d.getMonth() + 1}/${d.getDate()}`
    } else if (granularity === 'week') {
      d.setDate(d.getDate() - i * 7)
      label = `${d.getMonth() + 1}/${d.getDate()}`
    } else {
      d.setMonth(d.getMonth() - i)
      label = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    return { label, income, expense, guests }
  })
})

// ── KPIs ────────────────────────────────────────────────────────────
const totalIncome = computed(() => timeSeries.value.reduce((s, p) => s + p.income, 0))
const totalExpense = computed(() => timeSeries.value.reduce((s, p) => s + p.expense, 0))
const netIncome = computed(() => totalIncome.value - totalExpense.value)

function deltaPct(seed: number): number {
  return Math.round(((noise(activeRange.value.charCodeAt(0), seed) - 0.4) * 30) * 10) / 10
}
const incomeDelta = computed(() => deltaPct(11))
const expenseDelta = computed(() => deltaPct(22))
const netDelta = computed(() => deltaPct(33))

// ── Guest counts (today / this week / this month) ──────────────────
const guestCounts = computed(() => {
  const seed = Math.floor(Date.now() / 1000 / 86400) // stable per day
  const today = 4 + Math.round(noise(seed, 1) * 8)
  const week = today * (5 + Math.round(noise(seed, 2) * 4))
  const month = week * (3 + Math.round(noise(seed, 3) * 3))
  return { today, week, month }
})

// ── Country distribution ───────────────────────────────────────────
const countries = computed(() => {
  const seed = activeRange.value.charCodeAt(0)
  const data = [
    { label: '日本', flag: '🇯🇵', value: 30 + Math.round(noise(seed, 1) * 15), color: '#3b82f6' },
    { label: '台灣', flag: '🇹🇼', value: 20 + Math.round(noise(seed, 2) * 12), color: '#06b6d4' },
    { label: '澳洲', flag: '🇦🇺', value: 12 + Math.round(noise(seed, 3) * 8), color: '#8b5cf6' },
    { label: '香港', flag: '🇭🇰', value: 8 + Math.round(noise(seed, 4) * 6), color: '#f59e0b' },
    { label: '美國', flag: '🇺🇸', value: 5 + Math.round(noise(seed, 5) * 5), color: '#ef4444' },
  ]
  const sum = data.reduce((s, x) => s + x.value, 0)
  const others = Math.max(0, 100 - sum)
  data.push({ label: '其他', flag: '🌍', value: others, color: '#94a3b8' })
  return data
})

// ── ADR & LOS ──────────────────────────────────────────────────────
const adrLos = computed(() => {
  const seed = activeRange.value.charCodeAt(0)
  const adr = Math.round(11000 + noise(seed, 11) * 4500)
  const adrDelta = Math.round((noise(seed, 12) - 0.4) * 25 * 10) / 10
  const los = Math.round((2.3 + noise(seed, 13) * 1.8) * 10) / 10
  const losDelta = Math.round((noise(seed, 14) - 0.4) * 20 * 10) / 10

  // Mini time-series for sparkline
  const adrSeries = Array.from({ length: 14 }, (_, i) => Math.round(adr * (0.85 + noise(i, 21) * 0.3)))
  const losSeries = Array.from({ length: 14 }, (_, i) => +(los * (0.7 + noise(i, 22) * 0.6)).toFixed(1))
  return { adr, adrDelta, los, losDelta, adrSeries, losSeries }
})

// ── Booking status pie ─────────────────────────────────────────────
const statusBreakdown = computed(() => {
  const seed = activeRange.value.charCodeAt(0)
  const confirmed = 60 + Math.round(noise(seed, 1) * 15)
  const pending = 10 + Math.round(noise(seed, 2) * 12)
  const cancelled = 5 + Math.round(noise(seed, 3) * 6)
  const refunded = Math.max(0, 100 - confirmed - pending - cancelled)
  return [
    { label: '已確認', value: confirmed, color: '#10b981' },
    { label: '待付款', value: pending, color: '#f59e0b' },
    { label: '已取消', value: cancelled, color: '#94a3b8' },
    { label: '已退款', value: refunded, color: '#f43f5e' },
  ]
})

// ── Property revenue (with sort) ───────────────────────────────────
const PROPERTY_NAMES = ['Chalet A', 'Chalet B', 'Chalet C', 'Chalet D', 'Chalet E', 'Chalet F', 'Chalet G', 'Chalet H', 'Chalet I']
const propertyStats = computed(() => {
  const seedBase = activeRange.value.charCodeAt(0)
  return PROPERTY_NAMES.map((name, i) => ({
    name,
    revenue: Math.round((180000 + noise(i + seedBase, 5) * 220000) * (currentRange.value.days / 30)),
    bookings: Math.round(8 + noise(i + seedBase, 6) * 22 * (currentRange.value.days / 30)),
  }))
})

const sortedPropertyRevenue = computed(() => {
  const arr = [...propertyStats.value]
  switch (sortKey.value) {
    case 'revenue-desc': arr.sort((a, b) => b.revenue - a.revenue); break
    case 'revenue-asc':  arr.sort((a, b) => a.revenue - b.revenue); break
    case 'name-asc':     arr.sort((a, b) => a.name.localeCompare(b.name)); break
    case 'bookings-desc':arr.sort((a, b) => b.bookings - a.bookings); break
  }
  return arr
})

// ── Occupancy heatmap ──────────────────────────────────────────────
const occupancyMatrix = computed(() => {
  const seed = activeRange.value.charCodeAt(0) + heatmapRange.value.charCodeAt(0)
  const buckets = currentHeatmap.value.buckets
  return PROPERTY_NAMES.map((name, p) => ({
    name,
    cells: Array.from({ length: buckets }, (_, w) => Math.round(noise(p * 11 + w * 3, seed) * 100)),
  }))
})

// ── Formatters ──────────────────────────────────────────────────────
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 })
function fmtY(n: number) { return yen.format(n) }
function fmtPct(n: number) { return `${n > 0 ? '+' : ''}${n.toFixed(1)}%` }

// ── SVG helpers ─────────────────────────────────────────────────────
function donutArc(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0
  const x1 = cx + rOuter * Math.cos(start), y1 = cy + rOuter * Math.sin(start)
  const x2 = cx + rOuter * Math.cos(end), y2 = cy + rOuter * Math.sin(end)
  const x3 = cx + rInner * Math.cos(end), y3 = cy + rInner * Math.sin(end)
  const x4 = cx + rInner * Math.cos(start), y4 = cy + rInner * Math.sin(start)
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`
}

function buildPieSegments(items: { label: string; value: number; color: string }[], cx = 60, cy = 60, ro = 55, ri = 32) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1
  let angle = -Math.PI / 2
  return items.map(seg => {
    const sweep = (seg.value / total) * Math.PI * 2
    const path = donutArc(cx, cy, ro, ri, angle, angle + sweep)
    const result = { ...seg, path }
    angle += sweep
    return result
  })
}

const statusPieSegments = computed(() => buildPieSegments(statusBreakdown.value))
const countryPieSegments = computed(() => buildPieSegments(
  countries.value.map(c => ({ label: c.label, value: c.value, color: c.color }))
))

// Line chart geometry
const lineChartViewBox = { w: 600, h: 200, pad: 28 }
const lineChart = computed(() => {
  const { w, h, pad } = lineChartViewBox
  const data = timeSeries.value
  if (data.length === 0) return { incomePath: '', expensePath: '', incomeArea: '', maxY: 0, ticks: [], xLabels: [] }
  const maxY = Math.max(...data.map(d => Math.max(d.income, d.expense))) * 1.15
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1)
  const yScale = (v: number) => h - pad - (v / maxY) * (h - pad * 2)
  const xPos = (i: number) => pad + i * stepX

  const incomePts = data.map((d, i) => `${xPos(i).toFixed(1)},${yScale(d.income).toFixed(1)}`)
  const expensePts = data.map((d, i) => `${xPos(i).toFixed(1)},${yScale(d.expense).toFixed(1)}`)

  const incomePath = 'M ' + incomePts.join(' L ')
  const expensePath = 'M ' + expensePts.join(' L ')
  const incomeArea = incomePath + ` L ${xPos(data.length - 1).toFixed(1)},${h - pad} L ${pad},${h - pad} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ y: pad + t * (h - pad * 2), label: Math.round(maxY * (1 - t) / 1000) + 'k' }))

  const xLabelCount = Math.min(8, data.length)
  const xLabels = Array.from({ length: xLabelCount }, (_, k) => {
    const dataIdx = Math.round((k / (xLabelCount - 1 || 1)) * (data.length - 1))
    return { x: xPos(dataIdx), label: data[dataIdx].label }
  })

  return { incomePath, expensePath, incomeArea, maxY, ticks, xLabels }
})

const barChart = computed(() => {
  const data = sortedPropertyRevenue.value
  const max = Math.max(...data.map(d => d.revenue))
  return data.map(d => ({ ...d, pct: (d.revenue / max) * 100 }))
})

function occColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 60) return 'bg-emerald-400'
  if (pct >= 40) return 'bg-emerald-300'
  if (pct >= 20) return 'bg-emerald-200'
  return 'bg-emerald-100'
}

// Sparkline points string
function sparkPoints(arr: number[], w = 200, h = 40): string {
  if (arr.length === 0) return ''
  const max = Math.max(...arr)
  const min = Math.min(...arr)
  const span = Math.max(1, max - min)
  return arr.map((v, i) => {
    const x = (i / Math.max(1, arr.length - 1)) * w
    const y = h - ((v - min) / span) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header: title + range selector -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="text-2xl font-bold text-gray-900">儀表板</h1>
      <div class="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm p-1" role="tablist">
        <button
          v-for="r in RANGES"
          :key="r.key"
          type="button"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          :class="activeRange === r.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'"
          @click="activeRange = r.key"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <!-- Bento grid -->
    <div class="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-min">

      <!-- ── Row 1: KPI cards ────────────────────────────────────── -->
      <div class="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-500">總收入</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ fmtY(totalIncome) }}</p>
          </div>
          <span
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="incomeDelta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path :d="incomeDelta >= 0 ? 'M5 12l5-5 5 5H5z' : 'M5 8l5 5 5-5H5z'" />
            </svg>
            {{ fmtPct(incomeDelta) }}
          </span>
        </div>
        <svg class="w-full h-10 mt-3" viewBox="0 0 200 40" preserveAspectRatio="none">
          <polyline :points="sparkPoints(timeSeries.map(p => p.income))"
            fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <div class="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-500">總支出</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ fmtY(totalExpense) }}</p>
          </div>
          <span
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="expenseDelta <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path :d="expenseDelta >= 0 ? 'M5 12l5-5 5 5H5z' : 'M5 8l5 5 5-5H5z'" />
            </svg>
            {{ fmtPct(expenseDelta) }}
          </span>
        </div>
        <svg class="w-full h-10 mt-3" viewBox="0 0 200 40" preserveAspectRatio="none">
          <polyline :points="sparkPoints(timeSeries.map(p => p.expense))"
            fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <div class="md:col-span-2 rounded-2xl border border-gray-900 bg-gray-900 text-white shadow-sm p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-400">淨所得</p>
            <p class="text-2xl font-bold mt-1">{{ fmtY(netIncome) }}</p>
          </div>
          <span
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="netDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path :d="netDelta >= 0 ? 'M5 12l5-5 5 5H5z' : 'M5 8l5 5 5-5H5z'" />
            </svg>
            {{ fmtPct(netDelta) }}
          </span>
        </div>
        <svg class="w-full h-10 mt-3" viewBox="0 0 200 40" preserveAspectRatio="none">
          <polyline :points="sparkPoints(timeSeries.map(p => p.income - p.expense))"
            fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <!-- ── Row 2: Line chart + Status pie ─────────────────────── -->
      <div class="md:col-span-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-semibold text-gray-700">收入 vs 支出趨勢</p>
          <div class="flex items-center gap-3 text-xs">
            <span class="inline-flex items-center gap-1.5">
              <span class="inline-block w-3 h-0.5 bg-emerald-500 rounded"></span>
              <span class="text-gray-600">收入</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="inline-block w-3 h-0.5 bg-rose-500 rounded"></span>
              <span class="text-gray-600">支出</span>
            </span>
          </div>
        </div>
        <svg :viewBox="`0 0 ${lineChartViewBox.w} ${lineChartViewBox.h + 18}`" class="w-full h-56">
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g>
            <line v-for="(t, i) in lineChart.ticks" :key="i"
              :x1="lineChartViewBox.pad" :x2="lineChartViewBox.w - lineChartViewBox.pad"
              :y1="t.y" :y2="t.y" stroke="#e5e7eb" stroke-dasharray="3 3" />
            <text v-for="(t, i) in lineChart.ticks" :key="`l-${i}`"
              :x="lineChartViewBox.pad - 6" :y="t.y + 3"
              text-anchor="end" class="fill-gray-400" style="font-size: 9px;">{{ t.label }}</text>
          </g>
          <g>
            <text v-for="(l, i) in lineChart.xLabels" :key="`x-${i}`"
              :x="l.x" :y="lineChartViewBox.h + 10"
              text-anchor="middle" class="fill-gray-400" style="font-size: 9px;">{{ l.label }}</text>
          </g>
          <path :d="lineChart.incomeArea" fill="url(#incomeGrad)" />
          <path :d="lineChart.incomePath" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path :d="lineChart.expensePath" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <div class="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">訂單狀態分布</p>
        <div class="flex items-center gap-4">
          <svg viewBox="0 0 120 120" class="w-28 h-28 flex-shrink-0">
            <path v-for="seg in statusPieSegments" :key="seg.label" :d="seg.path" :fill="seg.color" />
            <text x="60" y="58" text-anchor="middle" class="fill-gray-900 font-bold" style="font-size: 14px;">
              {{ statusBreakdown.reduce((s, x) => s + x.value, 0) }}
            </text>
            <text x="60" y="72" text-anchor="middle" class="fill-gray-400" style="font-size: 8px;">訂單總數</text>
          </svg>
          <ul class="flex-1 space-y-1.5 text-xs">
            <li v-for="seg in statusBreakdown" :key="seg.label" class="flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-block w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: seg.color }"></span>
                <span class="text-gray-600">{{ seg.label }}</span>
              </span>
              <span class="font-semibold text-gray-800">{{ seg.value }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- ── Row 3: Guest counts + Country + ADR/LOS ────────────── -->
      <!-- Guest counts -->
      <div class="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-4">入住人數</p>
        <div class="space-y-3">
          <div class="flex items-end justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <p class="text-[11px] text-gray-500">今天</p>
              <p class="text-3xl font-bold text-gray-900 leading-none mt-1">{{ guestCounts.today }}</p>
            </div>
            <span class="text-xs text-gray-400 mb-1">人</span>
          </div>
          <div class="flex items-end justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <p class="text-[11px] text-gray-500">本週</p>
              <p class="text-2xl font-bold text-gray-800 leading-none mt-1">{{ guestCounts.week }}</p>
            </div>
            <span class="text-xs text-gray-400 mb-1">人</span>
          </div>
          <div class="flex items-end justify-between gap-2">
            <div>
              <p class="text-[11px] text-gray-500">本月</p>
              <p class="text-2xl font-bold text-gray-800 leading-none mt-1">{{ guestCounts.month }}</p>
            </div>
            <span class="text-xs text-gray-400 mb-1">人</span>
          </div>
        </div>
      </div>

      <!-- Country distribution -->
      <div class="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <p class="text-sm font-semibold text-gray-700 mb-3">旅客來源國家</p>
        <div class="flex items-center gap-3">
          <svg viewBox="0 0 120 120" class="w-24 h-24 flex-shrink-0">
            <path v-for="seg in countryPieSegments" :key="seg.label" :d="seg.path" :fill="seg.color" />
          </svg>
          <ul class="flex-1 space-y-1 text-xs">
            <li v-for="c in countries" :key="c.label" class="flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-block w-2 h-2 rounded-sm" :style="{ backgroundColor: c.color }"></span>
                <span>{{ c.flag }}</span>
                <span class="text-gray-600">{{ c.label }}</span>
              </span>
              <span class="font-semibold text-gray-800">{{ c.value }}%</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- ADR & LOS -->
      <div class="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="space-y-4">
          <div>
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[11px] text-gray-500">平均房價 (ADR)</p>
                <p class="text-2xl font-bold text-gray-900 leading-none mt-1">{{ fmtY(adrLos.adr) }}</p>
                <p class="text-[10px] text-gray-400 mt-1">每晚 / 房</p>
              </div>
              <span
                class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                :class="adrLos.adrDelta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
              >
                {{ fmtPct(adrLos.adrDelta) }}
              </span>
            </div>
            <svg class="w-full h-8 mt-2" viewBox="0 0 200 40" preserveAspectRatio="none">
              <polyline :points="sparkPoints(adrLos.adrSeries)"
                fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="pt-3 border-t border-gray-100">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[11px] text-gray-500">平均入住天數 (LOS)</p>
                <p class="text-2xl font-bold text-gray-900 leading-none mt-1">{{ adrLos.los }} <span class="text-base font-medium text-gray-500">晚</span></p>
              </div>
              <span
                class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                :class="adrLos.losDelta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
              >
                {{ fmtPct(adrLos.losDelta) }}
              </span>
            </div>
            <svg class="w-full h-8 mt-2" viewBox="0 0 200 40" preserveAspectRatio="none">
              <polyline :points="sparkPoints(adrLos.losSeries)"
                fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <!-- ── Row 4: Property revenue + Heatmap ──────────────────── -->
      <div class="md:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <p class="text-sm font-semibold text-gray-700">各民宿收入</p>
          <div class="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.key"
              type="button"
              class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors"
              :class="sortKey === opt.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'"
              @click="sortKey = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="space-y-2">
          <div v-for="item in barChart" :key="item.name" class="flex items-center gap-3">
            <span class="w-20 text-xs text-gray-600 flex-shrink-0">{{ item.name }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
              <div
                class="h-5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                :style="{ width: item.pct + '%' }"
              ></div>
            </div>
            <span class="w-24 text-right text-xs font-medium text-gray-800 flex-shrink-0">
              {{ fmtY(item.revenue) }}
            </span>
            <span class="w-14 text-right text-[11px] text-gray-400 flex-shrink-0">
              {{ item.bookings }} 筆
            </span>
          </div>
        </div>
      </div>

      <div class="md:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div class="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <p class="text-sm font-semibold text-gray-700">入住率熱力圖</p>
          <div class="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              v-for="opt in HEATMAP_RANGES"
              :key="opt.key"
              type="button"
              class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors"
              :class="heatmapRange === opt.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'"
              @click="heatmapRange = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <div v-for="row in occupancyMatrix" :key="row.name" class="flex items-center gap-2">
            <span class="w-16 text-xs text-gray-600 flex-shrink-0">{{ row.name }}</span>
            <div class="flex gap-1 flex-1">
              <div
                v-for="(cell, i) in row.cells"
                :key="i"
                class="flex-1 h-5 rounded-sm transition-colors"
                :class="occColor(cell)"
                :title="`${cell}%`"
              ></div>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between mt-3 pl-[72px]">
          <span class="text-[10px] text-gray-400">{{ currentHeatmap.buckets }} {{ currentHeatmap.bucketLabel }}前</span>
          <div class="flex items-center gap-1 text-[10px] text-gray-400">
            <span>低</span>
            <span class="inline-block w-3 h-3 rounded-sm bg-emerald-100"></span>
            <span class="inline-block w-3 h-3 rounded-sm bg-emerald-200"></span>
            <span class="inline-block w-3 h-3 rounded-sm bg-emerald-300"></span>
            <span class="inline-block w-3 h-3 rounded-sm bg-emerald-400"></span>
            <span class="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span>
            <span>高</span>
          </div>
          <span class="text-[10px] text-gray-400">現在</span>
        </div>
      </div>

    </div>
  </div>
</template>
