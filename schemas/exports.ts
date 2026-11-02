import { z } from 'zod'

// The limits come from the backend's wrangler.jsonc vars (EXPORT_MAX_CLIPS, EXPORT_MIN_CLIP_SECONDS, EXPORT_MAX_SECONDS),
// so the schema takes them as an argument. They mirror fetchr's own render checks, so a request that passes here isn't
// refused by fetchr. hold and fade are sent by the editor so the render fades exactly like its preview. The source is a
// download or an upload: exactly one of download_id and upload_id.
export type ExportLimits = {
  maxClips: number
  minClipSeconds: number
  maxSeconds: number
}

export function createExportRequestSchema({ maxClips, minClipSeconds, maxSeconds }: ExportLimits) {
  const clip = z
    .object({
      start: z.number().min(0, 'Clips start at 0 or later'),
      end: z.number(),
    })
    .refine((c) => c.end - c.start >= minClipSeconds, {
      error: `Each clip must be at least ${minClipSeconds}s long`,
      path: ['end'],
    })

  const caption = z.object({
    headline: z.string().trim().min(1, 'Enter a headline').max(200, 'Keep the headline under 200 characters'),
    details: z.string().trim().min(1, 'Enter the details').max(600, 'Keep the details under 600 characters'),
    hold: z.number().min(0).max(600),
    fade: z.number().min(0).max(60),
  })

  return z
    .object({
      download_id: z.string().min(1).optional(),
      upload_id: z.string().min(1).optional(),
      clips: z.array(clip).min(1, 'Add at least one clip').max(maxClips, `Use at most ${maxClips} clips`),
      caption: caption.nullable().default(null),
    })
    .refine((body) => (body.download_id === undefined) !== (body.upload_id === undefined), {
      error: 'Choose a download or an upload',
      path: ['download_id'],
    })
    .refine((body) => body.clips.reduce((sum, c) => sum + c.end - c.start, 0) <= maxSeconds, {
      error: `The clips can add up to at most ${maxSeconds}s`,
      path: ['clips'],
    })
}

export type ExportRequest = z.infer<ReturnType<typeof createExportRequestSchema>>
