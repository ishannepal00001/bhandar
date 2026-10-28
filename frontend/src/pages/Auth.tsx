import { useState } from 'react'
import CodeForm from '../components/Auth/CodeForm'
import PasswordForm from '../components/Auth/PasswordForm'
import Stepper from '../components/Auth/Stepper'
import { config } from '../config'
import { muted } from '../styles'

const steps = ['Password', 'Code'] as const

function Auth() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

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
            <PasswordForm onSubmit={() => goTo(1)} />
          ) : (
            <CodeForm
              length={config.auth.codeLength}
              onSubmit={() => {}}
              onBack={() => goTo(0)}
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default Auth
