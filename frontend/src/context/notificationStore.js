/**
 * context/notificationStore.js
 * Global notification state using Zustand
 */
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    
    set((state) => ({ toasts: [...state.toasts, toast] }));
    
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Helper functions
export const showSuccess = (message, duration) =>
  useNotificationStore.getState().addToast(message, 'success', duration);

export const showError = (message, duration) =>
  useNotificationStore.getState().addToast(message, 'error', duration);

export const showWarning = (message, duration) =>
  useNotificationStore.getState().addToast(message, 'warning', duration);

export const showInfo = (message, duration) =>
  useNotificationStore.getState().addToast(message, 'info', duration);
