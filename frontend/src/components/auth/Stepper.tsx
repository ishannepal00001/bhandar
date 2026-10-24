import { Check } from 'lucide-react'

const muted = 'text-primary/60 dark:text-night-primary/60'

function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-3 last:flex-none">
            <span className="flex items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center border text-xs tabular-nums transition-colors duration-300 ${
                  done || active
                    ? 'border-primary bg-primary text-background dark:border-night-primary dark:bg-night-primary dark:text-night-background'
                    : `border-primary/30 dark:border-night-primary/30 ${muted}`
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={`text-xs uppercase tracking-widest transition-colors duration-300 ${
                  active ? 'text-primary dark:text-night-primary' : muted
                }`}
              >
                {label}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 transition-colors duration-300 ${
                  done ? 'bg-accent dark:bg-night-accent' : 'bg-primary/15 dark:bg-night-primary/15'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default Stepper
