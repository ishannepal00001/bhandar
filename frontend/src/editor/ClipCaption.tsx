// ClipCaption: Shows the headline over the details on the playing video, above the control bar. It stays on screen
//   when the controls hide, ignores the pointer so clicks still reach the player, and keeps the details' line breaks.
import type { HeadlineFormValues } from '../components/Editor/HeadlineForm.types'

function ClipCaption({ caption }: { caption: HeadlineFormValues | null }) {
  if (!caption) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-4 sm:bottom-20">
      <div className="max-w-2xl bg-background/85 px-5 py-3 text-center text-primary dark:bg-night-background/85 dark:text-night-primary">
        <h2 className="font-serif text-xl leading-tight sm:text-3xl">{caption.headline}</h2>
        <p className="mt-1.5 whitespace-pre-line text-xs text-primary/70 sm:text-sm dark:text-night-primary/70">
          {caption.details}
        </p>
      </div>
    </div>
  )
}

export default ClipCaption
