import { Pause, X } from 'lucide-react'

type QueueItem = {
  id: string
  source_url: string
  status: string
  title: string | null
  filename: string | null
  content_type: string | null
  filesize: number | null
  error: string | null
  created_at: string
  updated_at: string
  next_code: string
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
              {/* The title is only known once the backend has fetched the video. */}
              <p className="truncate text-sm" title={item.title ?? item.source_url}>
                {item.title ?? item.source_url}
              </p>
              <p className={`mt-1 text-xs uppercase tracking-widest ${muted}`}>{item.status}</p>
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
