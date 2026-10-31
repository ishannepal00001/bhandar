// api.baseUrl: The Worker's origin. Empty in dev, where Vite proxies /api to it; set it to the deployed Worker's URL
//   for production, since the frontend is on another site.
export const config = {
  api: {
    baseUrl: '',
  },
  auth: {
    codeLength: 6,
  },
} as const
