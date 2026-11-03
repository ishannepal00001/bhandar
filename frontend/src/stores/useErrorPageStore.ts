// Whether RouteError is on screen, so Layout can hide the sidebar and header behind a full-page error.
import { create } from 'zustand'

type ErrorPageState = {
  shown: boolean
  setShown: (shown: boolean) => void
}

export const useErrorPageStore = create<ErrorPageState>()((set) => ({
  shown: false,
  setShown: (shown) => set({ shown }),
}))
