import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (isCollapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: localStorage.getItem('rekxare_sidebar_collapsed') === 'true',
  toggleCollapsed: () => set((state) => {
    const next = !state.isCollapsed;
    localStorage.setItem('rekxare_sidebar_collapsed', String(next));
    return { isCollapsed: next };
  }),
  setCollapsed: (isCollapsed) => {
    localStorage.setItem('rekxare_sidebar_collapsed', String(isCollapsed));
    set({ isCollapsed });
  }
}));
