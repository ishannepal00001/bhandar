// ExportList: Every export, rendering ones first (the order GET /exports returns), as cards. The header's badge counts
//   the ones still rendering.
import { Clapperboard } from 'lucide-react'
import { exportsFacade } from '../../facades/exports'
import { muted } from '../../styles'
import { isQueuedExport } from '../../utils/exports'
import ExportCard from './ExportCard'

function ExportList() {
  const { data: items = [] } = exportsFacade.useExports()
  const rendering = items.filter(isQueuedExport).length

  return (
    <section>
      <div className="flex items-center justify-between gap-3 pb-4">
        <h2 className="font-serif text-xl">Exports</h2>
        {rendering > 0 && (
          <span className="border border-accent px-2 py-0.5 text-xs tabular-nums text-accent dark:border-night-accent dark:text-night-accent">
            {rendering} rendering
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div className={`flex flex-col items-center gap-2 border border-primary/15 px-5 py-10 dark:border-night-primary/15 ${muted}`}>
          <Clapperboard size={32} strokeWidth={1.5} />
          <p className="text-xs uppercase tracking-widest">No exports yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ExportCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ExportList
