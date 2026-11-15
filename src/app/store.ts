import { create } from 'zustand';
import type { Id } from '../core/model/types';

export interface Toast {
  id: number;
  message: string;
  undoOpId?: Id;
  tone: 'info' | 'error';
}

interface UiState {
  /** Wird nach jeder Schreibaktion erhöht – Ansichten laden dann neu. */
  dataVersion: number;
  bump(): void;
  toast: Toast | null;
  showToast(message: string, undoOpId?: Id, tone?: Toast['tone']): void;
  hideToast(): void;
  sidebarOpen: boolean;
  setSidebarOpen(open: boolean): void;
  storageWarning: string | null;
  setStorageWarning(w: string | null): void;
}

let toastCounter = 0;

export const useUi = create<UiState>((set) => ({
  dataVersion: 0,
  bump: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  toast: null,
  showToast: (message, undoOpId, tone = 'info') =>
    set({ toast: { id: ++toastCounter, message, undoOpId, tone } }),
  hideToast: () => set({ toast: null }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  storageWarning: null,
  setStorageWarning: (w) => set({ storageWarning: w }),
}));
