import { Inbox, Pause, X } from 'lucide-react'

type CurrentDownload = {
  title: string
  quality: string
  thumbnail: string
}

const muted = 'text-primary/60 dark:text-night-primary/60'
const iconButton =
  'border border-primary/30 p-2 text-primary/60 hover:border-primary hover:text-primary dark:border-night-primary/30 dark:text-night-primary/60 dark:hover:border-night-primary dark:hover:text-night-primary'

function CurrentProgress({ download }: { download: CurrentDownload | null }) {
  if (!download) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 border border-dashed border-primary/30 px-5 py-10 text-center dark:border-night-primary/30">
        <Inbox size={32} strokeWidth={1.5} className={muted} />
        <div>
          <p className="font-serif text-lg">Nothing downloading</p>
          <p className={`mt-1 text-sm ${muted}`}>
            Videos you start downloading will show up here.
          </p>
        </div>
      </section>
    )
  }

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
        </div>
      </div>
    </section>
  )
}

export default CurrentProgress
