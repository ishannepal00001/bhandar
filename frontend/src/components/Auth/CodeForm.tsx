import { LogIn } from 'lucide-react'
import { useRef, useState } from 'react'
import { muted } from '../../styles'

function CodeForm({
  length,
  onSubmit,
  onBack,
}: {
  length: number
  onSubmit: (code: string) => void
  onBack: () => void
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''))
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const complete = digits.every(Boolean)

  // Writes digits starting at `from`, so typing and pasting share one path.
  const fill = (from: number, value: string) => {
    const chars = value.replace(/\D/g, '').slice(0, length - from).split('')
    if (!chars.length) return
    const next = [...digits]
    chars.forEach((c, i) => (next[from + i] = c))
    setDigits(next)
    inputs.current[Math.min(from + chars.length, length - 1)]?.focus()
  }

  const clear = (i: number) => {
    const next = [...digits]
    next[i] = ''
    setDigits(next)
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (complete) onSubmit(digits.join(''))
      }}
    >
      <p className={`text-xs uppercase tracking-widest ${muted}`}>Login code</p>
      <div
        className="mt-3 flex gap-3"
        onPaste={(e) => {
          e.preventDefault()
          fill(0, e.clipboardData.getData('text'))
        }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            value={d}
            autoFocus={i === 0}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => (e.target.value ? fill(i, e.target.value.slice(-1)) : clear(i))}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !d && i > 0) {
                clear(i - 1)
                inputs.current[i - 1]?.focus()
              } else if (e.key === 'ArrowLeft') inputs.current[i - 1]?.focus()
              else if (e.key === 'ArrowRight') inputs.current[i + 1]?.focus()
            }}
            className="h-14 w-full min-w-0 border border-primary/30 bg-transparent text-center font-serif text-2xl tabular-nums focus:border-primary focus:outline-none dark:border-night-primary/30 dark:focus:border-night-primary"
          />
        ))}
      </div>
      <p className={`text-sm ${muted}`}>Enter the {length}-digit code sent to your email.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`border border-primary/30 px-6 py-2.5 text-sm hover:border-primary hover:text-primary dark:border-night-primary/30 dark:hover:border-night-primary dark:hover:text-night-primary ${muted}`}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!complete}
          className="flex flex-1 items-center justify-center gap-2 bg-primary px-6 py-2.5 text-sm text-background hover:bg-primary/90 disabled:opacity-40 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90"
        >
          <LogIn size={16} />
          Log in
        </button>
      </div>
    </form>
  )
}

export default CodeForm
