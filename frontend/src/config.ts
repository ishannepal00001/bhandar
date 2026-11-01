// api.baseUrl: The Worker's origin. Empty in dev, where Vite proxies /api to it; set it to the deployed Worker's URL
//   for production, since the frontend is on another site.
// cache.maxAgeMs: How long saved responses are restored after a reload; older ones are dropped and refetched.
// dashboard.marqueeAbove: Recent downloads scroll in a marquee only when there are more than this; fewer sit still in
//   a grid, since a marquee of one or two cards just repeats them.
// editor.caption: The caption shows from the start of the exported video, fully visible for holdSeconds of playback,
//   then fades out over fadeSeconds. The export sends the same values, so the preview matches the render.
// editor.minClipSeconds: Shorter clips are refused; fetchr won't render them.
export const config = {
  api: {
    baseUrl: '',
  },
  cache: {
    storageKey: 'bhandar-cache',
    maxAgeMs: 24 * 60 * 60 * 1000,
  },
  auth: {
    codeLength: 6,
  },
  dashboard: {
    marqueeAbove: 3,
  },
  editor: {
    caption: {
      holdSeconds: 6,
      fadeSeconds: 1.5,
    },
    minClipSeconds: 0.5,
  },
} as const
