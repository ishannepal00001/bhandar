// ClipToolbar: One button walks through the clips: Create clip (asks for the headline and details first) → Start clip
//   → End clip → back to Start clip for the next one. The step comes from the clip store rather than local state: a
//   pending start means End clip, no caption and no clips yet means Create clip, anything else means Start clip.
//   Around it: Close, Clips (the list of what the export will render, with the Export button) and the clip being
//   marked can be cancelled.
// Layout: Everything sits in one group at the top left, capped short of the top-right corner. On a narrow (portrait)
//   video the skin moves its cast, picture-in-picture and fullscreen buttons up there, and they would cover anything
//   placed in that corner.
// error: Set when End clip is refused, either before the start or shorter than config.editor.minClipSeconds; cleared
//   by the next successful step.
// Rendered inside the skin's container, so usePlayer reads the playback position and the controls' visibility. The
//   modals are portalled to the body: the skin is a CSS container, which would box a fixed modal into the video's
//   frame, so native fullscreen is left before one opens. A portal keeps React context, so the modals still read the
//   player and the clip store.
import { usePlayer } from '@videojs/react/video'
import { ArrowLeftToLine, ArrowRightToLine, ListVideo, Scissors, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import HeadlineForm from '../components/Editor/HeadlineForm'
import Modal from '../components/Modal'
import { config } from '../config'
import { clipsFacade } from '../facades/clips'
import { muted } from '../styles'
import ClipList from './ClipList'
import { formatDuration } from './format'
import { totalSeconds } from './timeline'

const iconButton =
  'shrink-0 p-1.5 text-primary/70 hover:text-primary dark:text-night-primary/70 dark:hover:text-night-primary'

const surface =
  'pointer-events-auto border border-primary/15 bg-background text-primary dark:border-night-primary/15 dark:bg-night-background dark:text-night-primary'

type Step = 'create' | 'start' | 'end'

const steps = {
  create: { label: 'Create clip', icon: Scissors },
  start: { label: 'Start clip', icon: ArrowLeftToLine },
  end: { label: 'End clip', icon: ArrowRightToLine },
}

type Dialog = 'caption' | 'clips' | null

const leaveFullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen()
}

function ClipToolbar({ onClose }: { onClose: () => void }) {
  const currentTime = usePlayer((s) => s.currentTime) ?? 0
  const controlsVisible = usePlayer((s) => s.controlsVisible) ?? true
  const clips = clipsFacade.useClipStore((state) => state.clips)
  const caption = clipsFacade.useClipStore((state) => state.caption)
  const pendingStart = clipsFacade.useClipStore((state) => state.pendingStart)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)

  const step: Step = pendingStart !== null ? 'end' : !caption && clips.length === 0 ? 'create' : 'start'

  const open = (next: Dialog) => {
    leaveFullscreen()
    setDialog(next)
  }

  const advance = () => {
    if (step === 'create') {
      open('caption')
    } else if (step === 'start') {
      clipsFacade.startClip(currentTime)
      setError(null)
    } else if (clipsFacade.endClip(currentTime)) {
      setError(null)
    } else {
      setError(
        pendingStart !== null && currentTime <= pendingStart
          ? 'End must come after start'
          : `Clips must be at least ${config.editor.minClipSeconds}s`,
      )
    }
  }

  const { label, icon: Icon } = steps[step]
  const status =
    error ??
    (pendingStart !== null
      ? `From ${formatDuration(pendingStart)}`
      : clips.length > 0 && `${clips.length} · ${formatDuration(totalSeconds(clips))}`)

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex p-2 transition-opacity duration-200 sm:p-4 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 [&:not(:focus-within)_*]:pointer-events-none'
        }`}
      >
        <div className={`flex min-w-0 max-w-[calc(100%-9rem)] items-center gap-1.5 p-1.5 ${surface}`}>
          <button type="button" onClick={onClose} aria-label="Close video" title="Close video" className={iconButton}>
            <X size={17} />
          </button>
          <button
            type="button"
            onClick={advance}
            className="ml-1 flex shrink-0 items-center justify-center gap-2 bg-primary px-4 py-1.5 text-sm text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90"
          >
            <Icon size={15} />
            {label}
          </button>
          <button
            type="button"
            onClick={() => open('clips')}
            aria-label="Clips and export"
            title="Clips and export"
            className={`flex items-center gap-1 tabular-nums ${iconButton}`}
          >
            <ListVideo size={17} />
            {clips.length > 0 && <span className="text-sm">{clips.length}</span>}
          </button>
          {status && (
            <p
              className={`truncate pl-1 text-xs tabular-nums ${error ? 'text-accent dark:text-night-accent' : muted}`}
            >
              {status}
            </p>
          )}
          {pendingStart !== null && (
            <button
              type="button"
              onClick={() => {
                clipsFacade.cancelClip()
                setError(null)
              }}
              className={`shrink-0 pl-1 pr-1.5 text-xs underline underline-offset-4 hover:text-primary dark:hover:text-night-primary ${muted}`}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {createPortal(
        <>
          <Modal
            open={dialog === 'caption'}
            onClose={() => setDialog(null)}
            title={caption ? 'Edit caption' : 'Create clip'}
          >
            <HeadlineForm
              initial={caption}
              onSubmit={(values) => {
                clipsFacade.setCaption(values)
                setDialog(null)
              }}
            />
          </Modal>
          <Modal open={dialog === 'clips'} onClose={() => setDialog(null)} title="Clips and export">
            <ClipList onEditCaption={() => setDialog('caption')} onExported={() => setDialog(null)} />
          </Modal>
        </>,
        document.body,
      )}
    </>
  )
}

export default ClipToolbar
