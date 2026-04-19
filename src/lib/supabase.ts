import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Mock mode: 當沒有設定 Supabase key 時，使用假資料模式
export const IS_MOCK_MODE =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl === 'https://placeholder.supabase.co' ||
  supabaseUrl.includes('placeholder')

// 即使是 mock 模式也建立 client（用假 URL），避免 import 錯誤
// 實際呼叫會被 store 層攔截，不會真的打出去
export const supabase = createClient(
  IS_MOCK_MODE ? 'https://mock.supabase.co' : supabaseUrl,
  IS_MOCK_MODE ? 'mock-anon-key' : supabaseAnonKey
)
