// VideoCard: Save fetches a short-lived link and sends the browser to it; B2 serves it as an attachment, so it downloads
//   without leaving the page (a new tab would be blocked as a popup, since it opens after an await). Delete removes the
//   file and the job, and the lists refetch. The hooks toast the outcome.
import { Ban, CircleAlert, CircleCheck, Download, Trash2 } from 'lucide-react'
import { downloadsFacade } from '../facades/downloads'
import { muted, panel } from '../styles'
import type { FinishedJob } from '../types/downloads'
import Thumbnail from './Thumbnail'
import { formatBytes, formatDate } from '../utils/format'
import { jobTitle, statusLabels } from '../utils/jobs'

const badges = {
  completed: {
    icon: CircleCheck,
    className: 'border-primary/40 dark:border-night-primary/40',
  },
  failed: {
    icon: CircleAlert,
    className: 'border-accent text-accent dark:border-night-accent dark:text-night-accent',
  },
  cancelled: {
    icon: Ban,
    className: `border-primary/30 dark:border-night-primary/30 ${muted}`,
  },
}

const actionButton =
  'bg-background p-1.5 disabled:opacity-40 text-primary/60 hover:text-primary dark:bg-night-background dark:text-night-primary/60 dark:hover:text-night-primary'

function VideoCard({
  job,
  actions = true,
  className = '',
}: {
  job: FinishedJob
  actions?: boolean
  className?: string
}) {
  const title = jobTitle(job)
  const badge = badges[job.status]
  const BadgeIcon = badge.icon
  const completed = job.status === 'completed'
  const downloadFile = downloadsFacade.useDownloadFile()
  const deleteDownload = downloadsFacade.useDeleteDownload()
  const busy = downloadFile.isPending || deleteDownload.isPending

  return (
    <div className={`${panel} ${className}`}>
      <div className="relative">
        <Thumbnail src={job.thumbnail_url} className="aspect-video" />
        {actions && (
          <div className="absolute right-2 top-2 flex gap-1">
            {completed && (
              <button
                type="button"
                aria-label="Save video"
                title="Save video"
                disabled={busy}
                onClick={() =>
                  downloadFile.mutate(job.id, { onSuccess: ({ url }) => window.location.assign(url) })
                }
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
              onClick={() => deleteDownload.mutate(job.id)}
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
        {job.error && (
          <p className={`mt-1 truncate text-xs ${muted}`} title={job.error}>
            {job.error}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 ${badge.className}`}>
            <BadgeIcon size={12} />
            {statusLabels[job.status]}
          </span>
          <span className={`tabular-nums ${muted}`}>
            {completed && `${formatBytes(job.filesize)} · `}
            {formatDate(job.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default VideoCard
