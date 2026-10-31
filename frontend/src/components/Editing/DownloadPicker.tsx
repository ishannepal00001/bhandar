// DownloadPicker: Lists the completed downloads (failed and cancelled ones have no file). Picking one fetches its
//   short-lived B2 link and hands it to onPick; the row shows "Opening…" meanwhile.
import { Link } from '@tanstack/react-router'
import { downloadsFacade } from '../../facades/downloads'
import { muted } from '../../styles'
import type { FinishedJob, Job } from '../../types/downloads'
import { formatBytes, formatDate } from '../../utils/format'
import { jobTitle } from '../../utils/jobs'
import Thumbnail from '../Thumbnail'

const isCompleted = (job: Job): job is FinishedJob => job.status === 'completed'

function DownloadPicker({ onPick }: { onPick: (src: string) => void }) {
  const { data: jobs = [], isPending } = downloadsFacade.useDownloads()
  const downloadFile = downloadsFacade.useDownloadFile()
  const videos = jobs.filter(isCompleted)
  const openingId = downloadFile.isPending ? downloadFile.variables : null

  if (isPending) return <p className={`text-sm ${muted}`}>Loading your downloads…</p>

  if (videos.length === 0) {
    return (
      <p className={`text-sm ${muted}`}>
        No downloaded videos yet.{' '}
        <Link to="/downloads" className="underline underline-offset-4">
          Download one first
        </Link>
        .
      </p>
    )
  }

  return (
    <ul className="max-h-[60vh] divide-y divide-primary/10 overflow-y-auto border border-primary/15 dark:divide-night-primary/10 dark:border-night-primary/15">
      {videos.map((job) => (
        <li key={job.id}>
          <button
            type="button"
            disabled={openingId !== null}
            onClick={() => downloadFile.mutate(job.id, { onSuccess: ({ url }) => onPick(url) })}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 disabled:opacity-40 dark:hover:bg-night-primary/5"
          >
            <Thumbnail src={job.thumbnail_url} iconSize={18} className="aspect-video w-20 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm" title={jobTitle(job)}>
                {jobTitle(job)}
              </span>
              <span className={`mt-0.5 block text-xs tabular-nums ${muted}`}>
                {openingId === job.id ? 'Opening…' : `${formatBytes(job.filesize)} · ${formatDate(job.created_at)}`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default DownloadPicker
