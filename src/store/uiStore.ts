//src/store/uiStore.ts
import { create } from 'zustand'

interface UIState {
  drawerOpen: boolean
  drawerContent: { type: 'algorithm' | 'concept'; id: string } | null
  activeMethodInfo: string | null
  sidebarCollapsed: boolean
  showCompletion: boolean

  openDrawer: (type: 'algorithm' | 'concept', id: string) => void
  closeDrawer: () => void
  setActiveMethodInfo: (id: string | null) => void
  setSidebarCollapsed: (v: boolean) => void
  setShowCompletion: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  drawerContent: null,
  activeMethodInfo: null,
  sidebarCollapsed: false,
  showCompletion: false,

  openDrawer: (type, id) => set({ drawerOpen: true, drawerContent: { type, id } }),
  closeDrawer: () => set({ drawerOpen: false }),
  setActiveMethodInfo: (id) => set({ activeMethodInfo: id }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setShowCompletion: (v) => set({ showCompletion: v }),
}))