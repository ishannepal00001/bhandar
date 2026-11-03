// Thumbnail: The video's thumbnail, or the film icon when there is none or it fails to load (e.g. its signed link
//   expired before the refetch brought a fresh one). A new link retries the image. Inside a `group` (a card), the image
//   eases in a little when the card is hovered.
import { Film } from 'lucide-react'
import { useState } from 'react'
import { muted } from '../styles'

function Thumbnail({ src, iconSize = 32, className = '' }: { src?: string | null; iconSize?: number; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-primary/10 dark:bg-night-primary/10 ${className}`}>
      {src && failed !== src ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(src)} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none" />
      ) : (
        <Film size={iconSize} strokeWidth={1.5} className={muted} />
      )}
    </div>
  )
}

export default Thumbnail
