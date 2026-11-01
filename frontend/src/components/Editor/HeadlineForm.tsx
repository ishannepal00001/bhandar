// HeadlineForm: Asks for the headline, then the details, one step at a time. Both values live here, so going back to
//   the headline keeps what was typed in the details. Each step's section is keyed on the step so it remounts and plays
//   its entry animation; Enter on the headline moves on, and only the details step submits.
import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { muted } from '../../styles'
import Stepper from '../Auth/Stepper'
import type { HeadlineFormValues } from './HeadlineForm.types'

const steps = ['Headline', 'Details'] as const

const field =
  'w-full border border-primary/30 bg-transparent px-3 py-2.5 text-sm placeholder:text-primary/40 focus:border-primary focus:outline-none dark:border-night-primary/30 dark:placeholder:text-night-primary/40 dark:focus:border-night-primary'

const primaryButton =
  'flex flex-1 items-center justify-center gap-2 bg-primary px-6 py-2.5 text-sm text-background hover:bg-primary/90 disabled:opacity-40 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90'

function HeadlineForm({
  onSubmit,
  pending = false,
}: {
  onSubmit: (values: HeadlineFormValues) => void
  pending?: boolean
}) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [headline, setHeadline] = useState('')
  const [details, setDetails] = useState('')

  const goTo = (next: number) => {
    setDirection(next > step ? 'next' : 'prev')
    setStep(next)
  }

  return (
    <div className="space-y-8">
      <Stepper steps={steps} current={step} />

      <section
        key={step}
        className={`motion-reduce:animate-none ${direction === 'next' ? 'animate-step-next' : 'animate-step-prev'}`}
      >
        {step === 0 ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (headline.trim()) goTo(1)
            }}
          >
            <label htmlFor="headline" className={`text-xs uppercase tracking-widest ${muted}`}>
              Headline
            </label>
            <input
              id="headline"
              required
              autoFocus
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Enter a headline"
              className={`mt-3 ${field}`}
            />
            <button type="submit" disabled={!headline.trim()} className={`w-full ${primaryButton}`}>
              Next
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (details.trim() && !pending) onSubmit({ headline: headline.trim(), details: details.trim() })
            }}
          >
            <label htmlFor="details" className={`text-xs uppercase tracking-widest ${muted}`}>
              Details
            </label>
            <textarea
              id="details"
              required
              autoFocus
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add the details"
              className={`mt-3 resize-none ${field}`}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => goTo(0)}
                className={`border border-primary/30 px-6 py-2.5 text-sm hover:border-primary hover:text-primary dark:border-night-primary/30 dark:hover:border-night-primary dark:hover:text-night-primary ${muted}`}
              >
                Back
              </button>
              <button type="submit" disabled={!details.trim() || pending} className={primaryButton}>
                <Check size={16} />
                {pending ? 'Saving…' : 'Done'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default HeadlineForm
