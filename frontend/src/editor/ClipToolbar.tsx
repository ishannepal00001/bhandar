import { usePlayer } from '@videojs/react/video'
import { ArrowLeftToLine, ArrowRightToLine, Scissors, X } from 'lucide-react'
import { useState } from 'react'
import { muted } from '../styles'
import { formatDuration } from './format'

const surface =
  'pointer-events-auto border border-primary/15 bg-background text-primary dark:border-night-primary/15 dark:bg-night-background dark:text-night-primary'

// One button walks through a clip: Create clip → Start clip → End clip → back to Start clip for the next one.
type Step = 'create' | 'start' | 'end'

const steps = {
  create: { label: 'Create clip', icon: Scissors },
  start: { label: 'Start clip', icon: ArrowLeftToLine },
  end: { label: 'End clip', icon: ArrowRightToLine },
}

type Clip = { start: number; end: number }

// Rendered inside the skin's container, so usePlayer reads the playback position and the controls' visibility.
function ClipToolbar({ onClose }: { onClose: () => void }) {
  const currentTime = usePlayer((s) => s.currentTime) ?? 0
  const controlsVisible = usePlayer((s) => s.controlsVisible) ?? true
  const [step, setStep] = useState<Step>('create')
  const [start, setStart] = useState<number | null>(null)
  const [lastClip, setLastClip] = useState<Clip | null>(null)
  const [error, setError] = useState(false)

  const advance = () => {
    if (step === 'create') {
      setStep('start')
    } else if (step === 'start') {
      setStart(currentTime)
      setError(false)
      setStep('end')
    } else if (start !== null && currentTime > start) {
      setLastClip({ start, end: currentTime })
      setStart(null)
      setError(false)
      setStep('start')
    } else {
      setError(true)
    }
  }

  const { label, icon: Icon } = steps[step]
  const status = error
    ? 'End must come after start'
    : step === 'end' && start !== null
      ? `From ${formatDuration(start)}`
      : lastClip && `${formatDuration(lastClip.start)} → ${formatDuration(lastClip.end)}`

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 transition-opacity duration-200 sm:p-4 ${
        controlsVisible ? 'opacity-100' : 'opacity-0 [&:not(:focus-within)_*]:pointer-events-none'
      }`}
    >
      <div className={`flex min-w-0 items-center gap-3 p-1.5 ${surface}`}>
        <button
          type="button"
          onClick={advance}
          className="flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-sm text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90"
        >
          <Icon size={15} />
          {label}
        </button>
        {status && (
          <p
            className={`truncate pr-1.5 text-xs tabular-nums ${
              error ? 'text-accent dark:text-night-accent' : muted
            }`}
          >
            {status}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        title="Close video"
        className={`p-2 text-primary/70 hover:text-primary dark:text-night-primary/70 dark:hover:text-night-primary ${surface}`}
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default ClipToolbar
