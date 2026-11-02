// ExportCard: One export: its thumbnail, the source's title, the caption's headline, how many clips and how long the
//   video is, and its status. A queued export is still rendering on fetchr, shown with a spinner and no actions; it
//   turns into a finished card when useExportEvents hears it finish. Save fetches a short-lived link and sends the
//   browser to it (B2 serves it as an attachment, so the page stays put); Delete removes the video and the export. The
//   hooks toast the outcome.
import { Ban, CircleAlert, CircleCheck, Download, LoaderCircle, Trash2 } from 'lucide-react'
import { formatDuration } from '../../editor/format'
import { exportsFacade } from '../../facades/exports'
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
  'bg-background p-1.5 disabled:opacity-40 text-primary/60 hover:text-primary dark:bg-night-background dark:text-night-primary/60 dark:hover:text-night-primary'

function ExportCard({ item }: { item: Export }) {
  const title = exportTitle(item)
  const badge = badges[item.status]
  const BadgeIcon = badge.icon
  const finished = item.status === 'queued' ? null : item
  const completed = finished?.status === 'completed'
  const exportFile = exportsFacade.useExportFile()
  const deleteExport = exportsFacade.useDeleteExport()
  const busy = exportFile.isPending || deleteExport.isPending
  const clipCount = `${item.clips.length} ${item.clips.length === 1 ? 'clip' : 'clips'}`

  return (
    <div className={panel}>
      <div className="relative">
        <Thumbnail src={finished?.thumbnail_url} className="aspect-video" />
        {finished && (
          <div className="absolute right-2 top-2 flex gap-1">
            {completed && (
              <button
                type="button"
                aria-label="Save video"
                title="Save video"
                disabled={busy}
                onClick={() => exportFile.mutate(finished.id, { onSuccess: ({ url }) => window.location.assign(url) })}
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
        <p className="truncate text-sm" title={title}>
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
          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 ${badge.className}`}>
            <BadgeIcon size={12} className={badge.iconClassName} />
            {badge.label}
          </span>
          <span className={`truncate tabular-nums ${muted}`}>
            {clipCount} · {formatDuration(exportSeconds(item))}
            {completed && ` · ${formatBytes(finished.filesize)}`} · {formatDate(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ExportCard
