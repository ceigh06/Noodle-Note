import { create } from 'zustand'
import type { Category, Pillar } from '@/lib/noodle-api'

interface UIState {
  view: 'dashboard' | 'editor'
  miniMode: boolean
  sidebarCollapsed: boolean
  activeNoteId: string | null
  pillar: Pillar
  category: Category | null
  search: string
  aiEnabled: boolean
  workspacePath: string
  openNote: (id: string) => void
  closeNote: () => void
  toggleMini: () => void
  toggleSidebar: () => void
  setPillar: (p: Pillar) => void
  setCategory: (c: Category | null) => void
  setSearch: (s: string) => void
  setAi: (v: boolean) => void
  setWorkspacePath: (p: string) => void
}

export const useUI = create<UIState>((set) => ({
  view: 'dashboard',
  miniMode: false,
  sidebarCollapsed: false,
  activeNoteId: null,
  pillar: 'manual',
  category: null,
  search: '',
  aiEnabled: true,
  workspacePath: '',
  openNote: (id) => set({ activeNoteId: id, view: 'editor' }),
  closeNote: () => set({ view: 'dashboard', miniMode: false }),
  toggleMini: () =>
    set((s) => ({ miniMode: !s.miniMode, view: s.activeNoteId ? 'editor' : s.view })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPillar: (pillar) => set({ pillar, view: 'dashboard' }),
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
  setAi: (aiEnabled) => set({ aiEnabled }),
  setWorkspacePath: (workspacePath) => set({ workspacePath })
}))
