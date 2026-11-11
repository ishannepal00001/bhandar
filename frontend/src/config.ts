// api.baseUrl: Always empty: dev Vite proxies /api to the Worker, and in production functions/api/[[path]].ts does.
//   Keeping the API on this origin makes the auth cookie first-party, so browsers that block third-party cookies
//   (Brave, Safari, Firefox) still keep the session.
// cache.maxAgeMs: How long saved responses are restored after a reload; older ones are dropped and refetched.
// dashboard.marqueeAbove: Recent downloads scroll in a marquee only when there are more than this; fewer sit still in
//   a grid, since a marquee of one or two cards just repeats them.
// editor.caption: The caption shows from the start of the exported video, fully visible for holdSeconds of playback,
//   then fades out over fadeSeconds. The export sends the same values, so the preview matches the render.
// editor.minClipSeconds, maxClips, maxSeconds: The export's limits: the clip length, the number of clips, and their
//   total. They mirror the Worker's EXPORT_MIN_CLIP_SECONDS, EXPORT_MAX_CLIPS and EXPORT_MAX_SECONDS, which refuse
//   anything outside them, so the editor can say why before sending.
// uploads.maxBytes: The largest video that can be uploaded to export from; mirrors the Worker's UPLOAD_MAX_BYTES.
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
  uploads: {
    maxBytes: 2 * 1024 ** 3,
  },
  editor: {
    caption: {
      holdSeconds: 6,
      fadeSeconds: 1.5,
    },
    minClipSeconds: 0.5,
    maxClips: 20,
    maxSeconds: 600,
  },
} as const
