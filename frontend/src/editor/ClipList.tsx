// ClipList: What the export will render: the caption, then the clips in output order with their source times and
//   lengths, and the joined video's total length. Clips move up or down one place at a time and can be removed; the
//   caption opens the stepper again to edit it.
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { clipsFacade } from '../facades/clips'
import { muted, panel } from '../styles'
import { formatDuration } from './format'
import { totalSeconds } from './timeline'

const iconButton = 'p-1.5 hover:text-primary disabled:opacity-30 disabled:pointer-events-none dark:hover:text-night-primary'

const removeButton = 'p-1.5 hover:text-accent dark:hover:text-night-accent'

const label = `text-xs uppercase tracking-widest ${muted}`

function ClipList({ onEditCaption }: { onEditCaption: () => void }) {
  const clips = clipsFacade.useClipStore((state) => state.clips)
  const caption = clipsFacade.useClipStore((state) => state.caption)

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
    </div>
  )
}

export default ClipList
