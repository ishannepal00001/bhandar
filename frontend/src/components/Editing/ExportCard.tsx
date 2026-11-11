// ExportCard: One export: its thumbnail, the source's title, the caption's headline, how many clips and how long the
//   video is, and its status. A queued export is still rendering on fetchr, shown with a spinner and no actions; it
//   turns into a finished card when useExportEvents hears it finish. Save goes straight to this origin's
//   /exports/:id/download, which streams the B2 file with an attachment header (a direct B2 link fails on iOS Safari).
//   Delete removes the video and the export. The hooks toast the outcome.
// Actions: On devices that can hover they appear when the card is hovered or focused; on touch screens they always show.
import { Ban, CircleAlert, CircleCheck, Download, LoaderCircle, Trash2 } from 'lucide-react'
import { formatDuration } from '../../editor/format'
import { exportsFacade } from '../../facades/exports'
import { apiUrl } from '../../hooks/request'
import { muted, panel } from '../../styles'
import type { Export } from '../../types/exports'
import { exportSeconds, exportTitle } from '../../utils/exports'
import { formatBytes, formatDate } from '../../utils/format'
import { statusLabels } from '../../utils/jobs'
import Thumbnail from '../Thumbnail'

const badges = {
  queued: {
    label: 'Rendering',
    icon: LoaderCircle,
    className: 'border-accent text-accent dark:border-night-accent dark:text-night-accent',
    iconClassName: 'animate-spin motion-reduce:animate-none',
  },
  completed: {
    label: statusLabels.completed,
    icon: CircleCheck,
    className: 'border-primary/40 dark:border-night-primary/40',
    iconClassName: '',
  },
  failed: {
    label: statusLabels.failed,
    icon: CircleAlert,
    className: 'border-accent text-accent dark:border-night-accent dark:text-night-accent',
    iconClassName: '',
  },
  cancelled: {
    label: statusLabels.cancelled,
    icon: Ban,
    className: `border-primary/30 dark:border-night-primary/30 ${muted}`,
    iconClassName: '',
  },
}

const actionButton =
  'bg-background p-2 disabled:opacity-40 text-primary/70 hover:bg-primary hover:text-background dark:bg-night-background dark:text-night-primary/70 dark:hover:bg-night-primary dark:hover:text-night-background'

const actionBar =
  'absolute right-2 top-2 flex gap-px transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100'

function ExportCard({ item }: { item: Export }) {
  const title = exportTitle(item)
  const badge = badges[item.status]
  const BadgeIcon = badge.icon
  const finished = item.status === 'queued' ? null : item
  const completed = finished?.status === 'completed'
  const deleteExport = exportsFacade.useDeleteExport()
  const busy = deleteExport.isPending
  const clipCount = `${item.clips.length} ${item.clips.length === 1 ? 'clip' : 'clips'}`

  return (
    <div className={`group transition-colors hover:border-primary/40 dark:hover:border-night-primary/40 ${panel}`}>
      <div className="relative">
        <Thumbnail src={finished?.thumbnail_url} className="aspect-video" />
        {finished && (
          <div className={actionBar}>
            {completed && (
              <button
                type="button"
                aria-label="Save video"
                title="Save video"
                disabled={busy}
                onClick={() => window.location.assign(apiUrl(`/exports/${encodeURIComponent(finished.id)}/download`))}
                className={actionButton}
              >
                <Download size={16} />
              </button>
            )}
            <button
              type="button"
              aria-label="Delete"
              title="Delete"
              disabled={busy}
              onClick={() => deleteExport.mutate(finished.id)}
              className={actionButton}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium" title={title}>
          {title}
        </p>
        {item.caption && (
          <p className={`mt-1 truncate text-xs ${muted}`} title={item.caption.headline}>
            {item.caption.headline}
          </p>
        )}
        {finished?.error && (
          <p className="mt-1 truncate text-xs text-accent dark:text-night-accent" title={finished.error}>
            {finished.error}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badge.className}`}>
            <BadgeIcon size={12} className={badge.iconClassName} />
            {badge.label}
          </span>
          <span className={`truncate font-mono text-[11px] tabular-nums ${muted}`}>
            {clipCount} · {formatDuration(exportSeconds(item))}
            {completed && ` · ${formatBytes(finished.filesize)}`} · {formatDate(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ExportCard
