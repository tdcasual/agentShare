// Toast notification system
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
  removeAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).slice(2) }]
  })),
  remove: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),
  removeAll: () => set({ toasts: [] })
}))

// Helper functions
export function toast(type: ToastType, title: string, message?: string, duration = 5000) {
  useToastStore.getState().add({ type, title, message, duration })
}

export function toastSuccess(title: string, message?: string) {
  toast('success', title, message)
}

export function toastError(title: string, message?: string) {
  toast('error', title, message)
}

export function toastInfo(title: string, message?: string) {
  toast('info', title, message)
}

export function toastWarning(title: string, message?: string) {
  toast('warning', title, message)
}
