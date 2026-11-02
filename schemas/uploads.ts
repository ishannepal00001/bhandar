import { z } from 'zod'

// maxBytes comes from the backend's wrangler.jsonc vars (UPLOAD_MAX_BYTES), so the schema takes it as an argument.
// content_type must be a video type, since the upload is only ever a source for fetchr to render clips from.
export function createUploadRequestSchema(maxBytes: number) {
  return z.object({
    name: z.string().trim().min(1, 'The file needs a name').max(255, 'The file name is too long'),
    content_type: z.string().regex(/^video\/[\w.+-]+$/, 'Only video files can be uploaded'),
    size: z
      .number()
      .int()
      .positive('The file is empty')
      .max(maxBytes, `Videos can be at most ${Math.floor(maxBytes / 1024 ** 2)} MB`),
  })
}

export type UploadRequest = z.infer<ReturnType<typeof createUploadRequestSchema>>
