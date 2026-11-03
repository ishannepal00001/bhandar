// Filters: Each one shows how many finished downloads it holds, so an empty filter is visible before it's clicked.
import DownloadForm from '../components/Downloads/DownloadForm'
import DownloadQueue from '../components/Downloads/DownloadQueue'
import HeaderActions from '../components/HeaderActions'
import PageHeader from '../components/PageHeader'
import VideoCard from '../components/VideoCard'
import { downloadsFacade } from '../facades/downloads'
import { muted } from '../styles'
import type { FinalStatus } from '../types/downloads'
import { isFinished, isQueued, statusLabels } from '../utils/jobs'

const filters: { label: string; status: FinalStatus | null }[] = [
  { label: 'All', status: null },
  { label: statusLabels.completed, status: 'completed' },
  { label: statusLabels.failed, status: 'failed' },
  { label: statusLabels.cancelled, status: 'cancelled' },
]

function Downloads() {
  const { data: jobs = [] } = downloadsFacade.useDownloads()
  const filter = downloadsFacade.useDownloadStore((state) => state.filter)
  const queued = jobs.filter(isQueued)
  const finished = jobs.filter(isFinished)
  const matching = (status: FinalStatus | null) =>
    status === null ? finished : finished.filter((job) => job.status === status)
  const videos = matching(filter)

  return (
    <main className="mx-auto max-w-7xl animate-fade-up space-y-8 px-4 py-6 motion-reduce:animate-none sm:space-y-10 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Archive"
        title="Downloads"
        description="Paste a Facebook video link to save it. Finished videos stay here until you delete them."
        actions={<HeaderActions />}
      />

      <DownloadForm />

      <DownloadQueue items={queued} />

      <section>
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-2xl">All downloads</h2>
          <div className="flex border border-primary/15 dark:border-night-primary/15">
            {filters.map(({ label, status }) => (
              <button
                key={label}
                type="button"
                onClick={() => downloadsFacade.setFilter(status)}
                aria-pressed={filter === status}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-1.5 text-sm transition-colors sm:flex-none ${
                  filter === status
                    ? 'bg-primary text-background dark:bg-night-primary dark:text-night-background'
                    : `${muted} hover:text-primary dark:hover:text-night-primary`
                }`}
              >
                {label}
                <span className="font-mono text-[11px] tabular-nums opacity-60">{matching(status).length}</span>
              </button>
            ))}
          </div>
        </div>
        {videos.length === 0 ? (
          <p className={`border border-dashed border-primary/20 px-5 py-10 text-center text-sm dark:border-night-primary/20 ${muted}`}>
            Nothing here yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((job) => (
              <VideoCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Downloads
