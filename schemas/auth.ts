import { z } from 'zod'

// The lengths come from the backend's wrangler.jsonc vars (PASSWORD_MIN_LENGTH, OTP_LENGTH), so the schemas take them as arguments.

// A lowercase letter, an uppercase letter, a digit and a symbol, at least minLength long.
export function passwordRegex(minLength: number): RegExp {
  return new RegExp(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{${minLength},}$`)
}

export function createSendOtpRequestSchema(minLength: number) {
  return z.object({
    password: z
      .string({ error: 'Password is required' })
      .regex(
        passwordRegex(minLength),
        `Password must be at least ${minLength} characters with an uppercase letter, a lowercase letter, a number and a symbol`,
      ),
  })
}

export type SendOtpRequest = z.infer<ReturnType<typeof createSendOtpRequestSchema>>

export function createLoginRequestSchema(otpLength: number) {
  return z.object({
    code: z
      .string({ error: 'Code is required' })
      .trim()
      .regex(new RegExp(`^\\d{${otpLength}}$`), `Code must be ${otpLength} digits`),
  })
}

export type LoginRequest = z.infer<ReturnType<typeof createLoginRequestSchema>>
