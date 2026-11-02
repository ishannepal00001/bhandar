// ClipList: What the export will render: the caption, then the clips in output order with their source times and
//   lengths, and the joined video's total length. Clips move up or down one place at a time and can be removed; the
//   caption opens the stepper again to edit it.
// blocker(): Why Export is unavailable, checked against the same limits the Worker enforces (config.editor) so the
//   reason shows before anything is sent. Only a download can be exported: an upload exists only in this browser.
// Export: Sends the source download's id, the clips in order and the caption with config.editor.caption's hold and
//   fade, then calls onExported (the toolbar closes the popup). The clips stay, so they can be tweaked and exported
//   again; the export shows on the Editing page, rendering until its event arrives.
import { ArrowDown, ArrowUp, Clapperboard, Pencil, Trash2 } from 'lucide-react'
import { config } from '../config'
import { clipsFacade } from '../facades/clips'
import { exportsFacade } from '../facades/exports'
import type { ClipSource } from '../types/clips'
import { muted, panel } from '../styles'
import { formatDuration } from './format'
import { totalSeconds } from './timeline'

const iconButton = 'p-1.5 hover:text-primary disabled:opacity-30 disabled:pointer-events-none dark:hover:text-night-primary'

const removeButton = 'p-1.5 hover:text-accent dark:hover:text-night-accent'

const label = `text-xs uppercase tracking-widest ${muted}`

function blocker(source: ClipSource | null, clipCount: number, seconds: number, marking: boolean): string | null {
  const { maxClips, maxSeconds } = config.editor
  if (source?.kind !== 'download') return 'Only downloaded videos can be exported for now.'
  if (clipCount === 0) return 'Mark at least one clip to export.'
  if (marking) return 'Finish or cancel the clip you’re marking first.'
  if (clipCount > maxClips) return `Use at most ${maxClips} clips.`
  if (seconds > maxSeconds) return `Keep the clips under ${formatDuration(maxSeconds)} in total.`
  return null
}

function ClipList({ onEditCaption, onExported }: { onEditCaption: () => void; onExported: () => void }) {
  const clips = clipsFacade.useClipStore((state) => state.clips)
  const caption = clipsFacade.useClipStore((state) => state.caption)
  const source = clipsFacade.useClipStore((state) => state.source)
  const marking = clipsFacade.useClipStore((state) => state.pendingStart !== null)
  const startExport = exportsFacade.useStartExport()
  const reason = blocker(source, clips.length, totalSeconds(clips), marking)

  const exportClips = () => {
    if (reason || source?.kind !== 'download') return
    const { holdSeconds, fadeSeconds } = config.editor.caption
    startExport.mutate(
      {
        download_id: source.downloadId,
        clips: clips.map(({ start, end }) => ({ start, end })),
        caption: caption && { ...caption, hold: holdSeconds, fade: fadeSeconds },
      },
      { onSuccess: onExported },
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between gap-3">
          <p className={label}>Caption</p>
          <button
            type="button"
            onClick={onEditCaption}
            className={`flex items-center gap-1.5 text-xs hover:text-primary dark:hover:text-night-primary ${muted}`}
          >
            <Pencil size={13} />
            {caption ? 'Edit' : 'Add'}
          </button>
        </div>
        {caption ? (
          <div className={`mt-3 p-3 ${panel}`}>
            <p className="break-words font-serif text-lg leading-snug">{caption.headline}</p>
            <p className={`mt-1 whitespace-pre-line break-words text-sm ${muted}`}>{caption.details}</p>
          </div>
        ) : (
          <p className={`mt-3 text-sm ${muted}`}>No caption. The video will render without one.</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <p className={label}>Clips</p>
          {clips.length > 0 && (
            <p className={`text-xs tabular-nums ${muted}`}>
              {clips.length} {clips.length === 1 ? 'clip' : 'clips'} · {formatDuration(totalSeconds(clips))}
            </p>
          )}
        </div>
        {clips.length === 0 ? (
          <p className={`mt-3 text-sm ${muted}`}>No clips yet. Mark one with Start clip and End clip.</p>
        ) : (
          <ol
            className={`mt-3 max-h-[45vh] divide-y divide-primary/10 overflow-y-auto dark:divide-night-primary/10 ${panel}`}
          >
            {clips.map((clip, i) => (
              <li key={clip.id} className="flex items-center gap-3 py-2 pl-3 pr-1.5">
                <span className={`w-5 shrink-0 text-xs tabular-nums ${muted}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm tabular-nums">
                  {formatDuration(clip.start)} → {formatDuration(clip.end)}
                </span>
                <span className={`shrink-0 text-xs tabular-nums ${muted}`}>
                  {formatDuration(clip.end - clip.start)}
                </span>
                <span className={`flex shrink-0 items-center ${muted}`}>
                  <button
                    type="button"
                    onClick={() => clipsFacade.moveClip(clip.id, -1)}
                    disabled={i === 0}
                    aria-label={`Move clip ${i + 1} earlier`}
                    className={iconButton}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => clipsFacade.moveClip(clip.id, 1)}
                    disabled={i === clips.length - 1}
                    aria-label={`Move clip ${i + 1} later`}
                    className={iconButton}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => clipsFacade.removeClip(clip.id)}
                    aria-label={`Remove clip ${i + 1}`}
                    className={removeButton}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="border-t border-primary/15 pt-5 dark:border-night-primary/15">
        <button
          type="button"
          onClick={exportClips}
          disabled={reason !== null || startExport.isPending}
          className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-2.5 text-sm text-background hover:bg-primary/90 disabled:opacity-40 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90"
        >
          <Clapperboard size={16} />
          {startExport.isPending ? 'Exporting…' : 'Export video'}
        </button>
        <p className={`mt-2 text-center text-xs ${muted}`}>
          {reason ?? 'The clips are joined in this order into one video, with the caption at the start.'}
        </p>
      </section>
    </div>
  )
}

export default ClipList
