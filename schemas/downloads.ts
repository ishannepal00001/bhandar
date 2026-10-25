import { z } from 'zod'

// allowedHosts comes from the backend's wrangler.jsonc vars (DOWNLOAD_ALLOWED_HOSTS), so the schema takes it as an argument.
export function createDownloadRequestSchema(allowedHosts: readonly string[]) {
  return z.object({
    url: z
      .url({ protocol: /^https?$/, error: 'Enter a valid link' })
      .refine((url) => allowedHosts.includes(new URL(url).hostname), 'Only Facebook video links are supported'),
  })
}

export type DownloadRequest = z.infer<ReturnType<typeof createDownloadRequestSchema>>
