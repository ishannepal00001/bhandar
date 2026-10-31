// Dashboard state the server doesn't own
// lastSeenAt: When the dashboard was last viewed, to mark downloads that finished since then as new. Persisted.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DashboardState = {
  lastSeenAt: string | null
  markSeen: () => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      lastSeenAt: null,
      markSeen: () => set({ lastSeenAt: new Date().toISOString() }),
    }),
    {
      name: 'dashboard',
      partialize: (state) => ({ lastSeenAt: state.lastSeenAt }),
    },
  ),
)
