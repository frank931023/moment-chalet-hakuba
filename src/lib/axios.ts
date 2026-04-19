import axios from 'axios'
import { supabase } from '@/lib/supabase'
import router from '@/router'

const instance = axios.create({
  baseURL: import.meta.env.VITE_SUPABASE_URL as string
})

// Request interceptor: attach Supabase Auth token
instance.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error
      import('@/composables/useToast').then(({ useToast }) => {
        const toast = useToast()
        toast.showError('Network error. Please check your connection.')
      })
    } else if (error.response.status === 401) {
      router.push('/admin/login')
    }
    return Promise.reject(error)
  }
)

export default instance
