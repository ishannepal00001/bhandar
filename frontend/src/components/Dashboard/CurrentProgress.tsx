import { Gauge, Pause, Timer, X } from 'lucide-react'

type CurrentDownload = {
  title: string
  quality: string
  thumbnail: string
  progress: number
  downloaded: string
  total: string
  speed: string
  eta: string
}

const muted = 'text-primary/60 dark:text-night-primary/60'
const iconButton =
  'border border-primary/30 p-2 text-primary/60 hover:border-primary hover:text-primary dark:border-night-primary/30 dark:text-night-primary/60 dark:hover:border-night-primary dark:hover:text-night-primary'

function CurrentProgress({ download }: { download: CurrentDownload }) {
  return (
    <section className="border border-primary/15 dark:border-night-primary/15">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="relative aspect-video w-full shrink-0 bg-primary/10 sm:w-36 lg:w-48 dark:bg-night-primary/10">
          <img
            src={download.thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute left-2 top-2 bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background dark:bg-night-background dark:text-night-primary">
            {download.quality}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-accent dark:text-night-accent">
                Downloading now
              </p>
              <p className="mt-1 line-clamp-2 font-serif text-lg lg:text-xl" title={download.title}>
                {download.title}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" aria-label="Pause" title="Pause" className={iconButton}>
                <Pause size={16} />
              </button>
              <button type="button" aria-label="Cancel" title="Cancel" className={iconButton}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={download.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${download.title} progress`}
            className="mt-4 h-2 bg-primary/10 dark:bg-night-primary/10"
          >
            <div
              className="h-full bg-accent transition-[width] dark:bg-night-accent"
              style={{ width: `${download.progress}%` }}
            />
          </div>

          <div className={`mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs ${muted}`}>
            <span className="tabular-nums">
              <span className="font-semibold text-primary dark:text-night-primary">
                {download.progress}%
              </span>{' '}
              · {download.downloaded} of {download.total}
            </span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Gauge size={12} />
                {download.speed}
              </span>
              <span className="flex items-center gap-1.5">
                <Timer size={12} />
                {download.eta}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CurrentProgress
