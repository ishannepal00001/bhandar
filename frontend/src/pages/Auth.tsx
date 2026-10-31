// errorMessage(): A 400 names the bad field in issues; show that message over the generic "Invalid request".
// Auth: The code step opens only once send-otp succeeds, and a login goes to the dashboard. A wrong password or code
//   (401) stays on the form; the global 401 redirect skips /auth.
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import CodeForm from '../components/Auth/CodeForm'
import PasswordForm from '../components/Auth/PasswordForm'
import Stepper from '../components/Auth/Stepper'
import { config } from '../config'
import { authFacade } from '../facades/auth'
import { ApiError } from '../hooks/request.error'
import { muted } from '../styles'

const steps = ['Password', 'Code'] as const

function errorMessage(error: Error | null): string | null {
  if (!error) return null
  const issue = error instanceof ApiError ? Object.values(error.issues ?? {})[0]?.[0] : undefined
  return issue ?? error.message
}

function Auth() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const navigate = useNavigate()
  const sendOtp = authFacade.useSendOtp()
  const login = authFacade.useLogin()

  const goTo = (next: number) => {
    setDirection(next > step ? 'next' : 'prev')
    setStep(next)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-primary dark:bg-night-background dark:text-night-primary">
      <main className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="font-serif text-3xl">Bhandar</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            {step === 0 ? 'Sign in with your password.' : 'Check your email for a login code.'}
          </p>
        </div>

        <Stepper steps={steps} current={step} />

        {/* Keyed on step so each form remounts and plays its entry animation. */}
        <section
          key={step}
          className={`motion-reduce:animate-none ${
            direction === 'next' ? 'animate-step-next' : 'animate-step-prev'
          }`}
        >
          {step === 0 ? (
            <PasswordForm
              pending={sendOtp.isPending}
              error={errorMessage(sendOtp.error)}
              onSubmit={(password) => sendOtp.mutate({ password }, { onSuccess: () => goTo(1) })}
            />
          ) : (
            <CodeForm
              length={config.auth.codeLength}
              pending={login.isPending}
              error={errorMessage(login.error)}
              onSubmit={(code) =>
                login.mutate({ code }, { onSuccess: () => void navigate({ to: '/', replace: true }) })
              }
              onBack={() => {
                login.reset()
                goTo(0)
              }}
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default Auth
