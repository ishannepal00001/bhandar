// DownloadQueue: Visual first. The header's badge counts the jobs, each row's spinner says it's downloading, and the
//   empty state is an icon with two words. The spinner stops for reduced motion.
import { Clock, Inbox, LoaderCircle, X } from 'lucide-react'
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
        <span
          aria-label={`${items.length} queued`}
          className={`min-w-7 border px-2 py-0.5 text-center text-xs tabular-nums ${
            items.length > 0
              ? 'border-accent text-accent dark:border-night-accent dark:text-night-accent'
              : `border-primary/15 dark:border-night-primary/15 ${muted}`
          }`}
        >
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className={`flex flex-col items-center gap-2 px-5 py-8 ${muted}`}>
          <Inbox size={32} strokeWidth={1.5} />
          <p className="text-xs uppercase tracking-widest">Nothing queued</p>
        </div>
      ) : (
        <ul className="divide-y divide-primary/10 dark:divide-night-primary/10">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/15 dark:border-night-primary/15">
                <LoaderCircle
                  size={18}
                  aria-label="Downloading"
                  className="animate-spin text-accent motion-reduce:animate-none dark:text-night-accent"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" title={item.source_url}>
                  {jobTitle(item)}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-xs tabular-nums ${muted}`}>
                  <Clock size={12} />
                  {formatDateTime(item.created_at)}
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
