// ClipCaption: A news-style caption on the playing video, above the control bar: the headline in Montserrat ExtraBold
//   (Noto Sans Devanagari for Nepali, picked per character) with each wrapped line in its own gold bar, then the
//   details in bold cream underneath with no bar. Both sit on a dark blurred panel so they stay legible over any
//   picture. It stays on screen when the controls hide, ignores the
//   pointer so clicks still reach the player, and keeps the text exactly as typed, line breaks included. Colours are
//   fixed rather than following dark mode, since they sit on video, not on the app.
//   The editor frames the skin to the video's aspect ratio, so this layer covers the picture exactly; it's an
//   inline-size container and its sizes are in cqw, so a portrait reel and a landscape clip both get a caption scaled
//   to the picture, not to the screen.
// headline: An inline span with box-decoration-clone, so the background breaks into one bar per line, each as wide
//   as its own line, and the line height leaves a thin gap between the stacked bars, wide enough that Devanagari's
//   below-letter vowel signs don't touch the next line's bar.
import type { HeadlineFormValues } from '../components/Editor/HeadlineForm.types'

function ClipCaption({ caption }: { caption: HeadlineFormValues | null }) {
  if (!caption) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 [container-type:inline-size]">
      <div className="absolute inset-x-[4cqw] bottom-[max(4rem,12cqw)] flex justify-center">
        <div className="max-w-full bg-black/60 px-[4cqw] py-[3cqw] text-center font-caption backdrop-blur-md">
          <h2 className="break-words text-[clamp(1.1rem,6.5cqw,2.75rem)] font-extrabold leading-[1.6]">
            <span className="box-decoration-clone bg-accent px-[1.6cqw] py-[0.5cqw] text-primary">
              {caption.headline}
            </span>
          </h2>
          <p className="mt-[2.5cqw] whitespace-pre-line break-words text-[clamp(0.8rem,3.6cqw,1.5rem)] font-bold leading-snug text-background">
            {caption.details}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ClipCaption
