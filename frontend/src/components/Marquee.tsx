import type { FinishedJob } from '../types/downloads'
import VideoCard from './VideoCard'

function Marquee({ items }: { items: FinishedJob[] }) {
  return (
    <div className="group relative overflow-hidden">
      <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-1 bg-accent dark:bg-night-accent" />
      <span aria-hidden className="absolute inset-y-0 right-0 z-10 w-1 bg-accent dark:bg-night-accent" />
      <ul className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...items, ...items].map((job, i) => (
          <li key={`${job.id}-${i}`} aria-hidden={i >= items.length} className="w-64 shrink-0 sm:w-80">
            <VideoCard job={job} actions={false} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Marquee
