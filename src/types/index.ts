// ============================================================
// Core domain types for Moment Chalet Hakuba booking system
// ============================================================

export interface Property {
  id: string
  name: string
  description: string
  location: string
  lat: number
  lng: number
  images: string[]
  ical_url: string | null
  has_breakfast_option: boolean
  is_active: boolean
  created_at: string
}

export interface RoomType {
  id: string
  property_id: string
  name: string
  capacity: number
  price_per_night: number
  breakfast_price: number
  amenities: string[]
  images: string[]
  is_active: boolean
  created_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded'
export type BookingStep = 1 | 2 | 3

export interface Booking {
  id: string
  room_type_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  check_in: string   // ISO date string YYYY-MM-DD
  check_out: string  // ISO date string YYYY-MM-DD
  include_breakfast: boolean
  total_amount: number
  status: BookingStatus
  paypal_order_id: string | null
  paypal_capture_id: string | null
  special_requests: string | null
  created_at: string
}

export interface BlockedDate {
  id: string
  property_id: string
  start_date: string
  end_date: string
  source: 'ical' | 'manual'
  synced_at: string
}

export interface BookingFormData {
  room_type_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  check_in: string
  check_out: string
  include_breakfast: boolean
  total_amount: number
  special_requests?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatLog {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  tokens_used: number
  created_at: string
}

export interface LlmUsageSnapshot {
  id: string
  provider: string
  model: string
  tokens_input: number
  tokens_output: number
  cost_usd: number
  created_at: string
}

export interface AzureCostSnapshot {
  id: string
  snapshot_date: string
  service_name: string
  resource_name: string | null
  cost_usd: number
  cost_twd: number
  period: 'daily' | 'weekly' | 'monthly'
  created_at: string
}

export interface AzureAlert {
  id: string
  triggered_at: string
  threshold_usd: number
  actual_cost_usd: number
  message: string | null
  created_at: string
}

export interface PropertyFilters {
  location: string
  checkIn: Date | null
  checkOut: Date | null
  guests: number
  priceRange: [number, number]
}
