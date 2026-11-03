// Auth: The code step opens only once send-otp succeeds, and a login goes to the dashboard. A wrong password or code
//   (401) stays on the form, shown as a toast by the hook; the global 401 redirect skips /auth.
// linkedCode(): The login mail's button opens /auth#code=<code>. A code of the right length opens the code step with it
//   filled in, waiting for Log in; the fragment is then wiped from the address bar so the code isn't left in history.
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import CodeForm from '../components/Auth/CodeForm'
import PasswordForm from '../components/Auth/PasswordForm'
import Stepper from '../components/Auth/Stepper'
import Logo from '../components/Logo'
import { config } from '../config'
import { authFacade } from '../facades/auth'
import { kicker, muted } from '../styles'

const steps = ['Password', 'Code'] as const

function linkedCode(): string | null {
  const code = /^#code=(\d+)$/.exec(window.location.hash)?.[1]
  return code?.length === config.auth.codeLength ? code : null
}

function Auth() {
  const [initialCode] = useState(linkedCode)
  const [step, setStep] = useState(initialCode ? 1 : 0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const navigate = useNavigate()
  const sendOtp = authFacade.useSendOtp()
  const login = authFacade.useLogin()

  useEffect(() => {
    if (window.location.hash) history.replaceState(history.state, '', window.location.pathname)
  }, [])

  const goTo = (next: number) => {
    setDirection(next > step ? 'next' : 'prev')
    setStep(next)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-primary dark:bg-night-background dark:text-night-primary">
      <main className="w-full max-w-sm animate-fade-up space-y-8 border border-primary/15 border-t-accent p-6 [border-top-width:3px] motion-reduce:animate-none sm:p-8 dark:border-night-primary/15 dark:border-t-night-accent">
        <div>
          <Logo size={40} />
          <p className={`mt-6 ${kicker}`}>Private archive</p>
          <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">Bhandar</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            {step === 0
              ? 'Sign in with your password.'
              : initialCode
                ? 'Your code is filled in. Log in to finish.'
                : 'Check your email for a login code.'}
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
              onSubmit={(password) => sendOtp.mutate({ password }, { onSuccess: () => goTo(1) })}
            />
          ) : (
            <CodeForm
              length={config.auth.codeLength}
              initialCode={initialCode}
              pending={login.isPending}
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
