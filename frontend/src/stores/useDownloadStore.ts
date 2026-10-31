// Download state the server doesn't own: the link being typed and the Downloads page's status filter
// persist: Both survive a reload, so a half-typed link isn't lost. reset() clears the link once it's queued.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FinalStatus } from '../types/downloads'

type DownloadState = {
  url: string
  filter: FinalStatus | null
  setUrl: (url: string) => void
  setFilter: (filter: FinalStatus | null) => void
  reset: () => void
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set) => ({
      url: '',
      filter: null,
      setUrl: (url) => set({ url }),
      setFilter: (filter) => set({ filter }),
      reset: () => set({ url: '' }),
    }),
    {
      name: 'download',
      partialize: (state) => ({ url: state.url, filter: state.filter }),
    },
  ),
)
