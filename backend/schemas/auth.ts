import { z } from 'zod'
import { config } from '../config'

const { minLength } = config.password
const { length: otpLength } = config.otp

// A lowercase letter, an uppercase letter, a digit and a symbol, at least minLength long.
export const passwordRegex = new RegExp(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{${minLength},}$`)

export const sendOtpRequestSchema = z.object({
  password: z
    .string({ error: 'Password is required' })
    .regex(
      passwordRegex,
      `Password must be at least ${minLength} characters with an uppercase letter, a lowercase letter, a number and a symbol`,
    ),
})

export type SendOtpRequest = z.infer<typeof sendOtpRequestSchema>

export const loginRequestSchema = z.object({
  code: z
    .string({ error: 'Code is required' })
    .trim()
    .regex(new RegExp(`^\\d{${otpLength}}$`), `Code must be ${otpLength} digits`),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
