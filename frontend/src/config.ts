// api.baseUrl: The Worker's origin. Empty in dev, where Vite proxies /api to it; set it to the deployed Worker's URL
//   for production, since the frontend is on another site.
// cache.maxAgeMs: How long saved responses are restored after a reload; older ones are dropped and refetched.
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
} as const
