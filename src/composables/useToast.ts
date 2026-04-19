import { useToast as usePrimeToast } from 'primevue/usetoast'

export function useToast() {
  const toast = usePrimeToast()

  function showSuccess(message: string) {
    toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 })
  }

  function showError(message: string) {
    toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 })
  }

  function showInfo(message: string) {
    toast.add({ severity: 'info', summary: 'Info', detail: message, life: 3000 })
  }

  return { showSuccess, showError, showInfo }
}
