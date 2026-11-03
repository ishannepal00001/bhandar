// PageHeader: Every page's title block: the accent kicker, the serif title, an optional line under it, and the page's
//   actions on the right (under the title on small screens). The rule below separates it from the content.
import type { ReactNode } from 'react'
import { kicker, muted } from '../styles'

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-primary/15 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-night-primary/15">
      <div className="min-w-0">
        <p className={kicker}>{eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-medium leading-none tracking-tight sm:text-5xl">{title}</h1>
        {description && <p className={`mt-3 max-w-xl text-sm ${muted}`}>{description}</p>}
      </div>
      {actions}
    </header>
  )
}

export default PageHeader
