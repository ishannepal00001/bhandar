import { X } from 'lucide-react'
import { muted, panel } from '../../styles'
import type { QueuedJob } from '../../types/downloads'
import { formatDateTime } from '../../utils/format'
import { jobTitle } from '../../utils/jobs'

const iconButton =
  'p-1.5 text-primary/60 hover:text-primary dark:text-night-primary/60 dark:hover:text-night-primary'

function DownloadQueue({ items }: { items: QueuedJob[] }) {
  return (
    <section className={panel}>
      <div className="flex items-center justify-between border-b border-primary/15 px-5 py-4 dark:border-night-primary/15">
        <h2 className="font-serif text-xl">Queue</h2>
        <span className={`text-xs ${muted}`}>{items.length} queued</span>
      </div>
      {items.length === 0 ? (
        <p className={`px-5 py-6 text-sm ${muted}`}>
          Nothing queued. Paste a Facebook link to start a download.
        </p>
      ) : (
        <ul className="divide-y divide-primary/10 dark:divide-night-primary/10">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" title={item.source_url}>
                  {jobTitle(item)}
                </p>
                <p className={`mt-1 text-xs uppercase tracking-widest ${muted}`}>
                  Queued · {formatDateTime(item.created_at)}
                </p>
              </div>
              <button type="button" aria-label="Cancel" title="Cancel" className={`shrink-0 ${iconButton}`}>
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default DownloadQueue
