// auth: helpers
import { randomInt } from 'node:crypto'
import nodemailer from 'nodemailer'
import { config } from '../../../config'

export class AuthUtilsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthUtilsError'
  }
}

export function generateOtp(): string {
  const { length } = config.otp
  return randomInt(0, 10 ** length).toString().padStart(length, '0')
}

export async function sendOtpMail(to: string, code: string): Promise<void> {
  const { host, port, user, pass, from, otpSubject } = config.mail
  if (!host || !user || !pass || !from) throw new AuthUtilsError('Mail is not configured')

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  try {
    await transport.sendMail({
      from,
      to,
      subject: otpSubject,
      text: `Your login code is ${code}. It expires in ${config.otp.ttlMinutes} minutes.`,
    })
  } catch (err) {
    throw new AuthUtilsError('Failed to send OTP mail', { cause: err })
  }
}
