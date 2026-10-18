import { CircleAlert, CircleCheck } from 'lucide-react'

export type Video = {
  id: string
  title: string
  quality: string
  size: string
  status: string
  date: string
  thumbnail: string
}

const muted = 'text-primary/60 dark:text-night-primary/60'

function VideoCard({ video, className = '' }: { video: Video; className?: string }) {
  return (
    <div className={`border border-primary/15 dark:border-night-primary/15 ${className}`}>
      <div className="relative aspect-video bg-primary/10 dark:bg-night-primary/10">
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-2 top-2 bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background dark:bg-night-background dark:text-night-primary">
          {video.quality}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm" title={video.title}>
          {video.title}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span
            className={
              video.status === 'Done'
                ? 'inline-flex items-center gap-1 border border-primary/40 px-2 py-0.5 dark:border-night-primary/40'
                : 'inline-flex items-center gap-1 border border-accent px-2 py-0.5 text-accent dark:border-night-accent dark:text-night-accent'
            }
          >
            {video.status === 'Done' ? <CircleCheck size={12} /> : <CircleAlert size={12} />}
            {video.status}
          </span>
          <span className={`tabular-nums ${muted}`}>
            {video.size} · {video.date}
          </span>
        </div>
      </div>
    </div>
  )
}

export default VideoCard
