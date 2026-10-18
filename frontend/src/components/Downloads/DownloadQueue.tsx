import { Gauge, Pause, X } from 'lucide-react'

type QueueItem = {
  id: string
  title: string
  quality: string
  progress: number
  speed: string
}

const muted = 'text-primary/60 dark:text-night-primary/60'
const iconButton =
  'p-1.5 text-primary/60 hover:text-primary dark:text-night-primary/60 dark:hover:text-night-primary'

function DownloadQueue({ items }: { items: QueueItem[] }) {
  return (
    <section className="border border-primary/15 dark:border-night-primary/15">
      <div className="flex items-center justify-between border-b border-primary/15 px-5 py-4 dark:border-night-primary/15">
        <h2 className="font-serif text-xl">Queue</h2>
        <span className={`text-xs ${muted}`}>{items.length} items</span>
      </div>
      <ul className="divide-y divide-primary/10 dark:divide-night-primary/10">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 tabular-nums">{item.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 bg-primary/10 dark:bg-night-primary/10">
                <div
                  className="h-full bg-accent dark:bg-night-accent"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className={`mt-1.5 flex items-center gap-3 text-xs ${muted}`}>
                <span>{item.quality}</span>
                <span className="flex items-center gap-1.5">
                  <Gauge size={12} />
                  {item.speed}
                </span>
              </p>
            </div>
            <div className="flex shrink-0">
              <button type="button" aria-label="Pause" title="Pause" className={iconButton}>
                <Pause size={16} />
              </button>
              <button type="button" aria-label="Cancel" title="Cancel" className={iconButton}>
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default DownloadQueue
