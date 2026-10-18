import { z } from 'zod'

export const loginRequestSchema = z.object({
  code: z.string({ error: 'Code is required' }).trim().min(1, 'Code is required'),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
