// ClipCaption: A news-style caption on the playing video: the headline in Montserrat ExtraBold (Noto Sans Devanagari
//   for Nepali, picked per character) with each wrapped line in its own gold bar, then the details in bold cream
//   underneath with no bar. Both sit on a dark panel that spans the video's full width, and both cast a soft shadow,
//   so they stay legible over any picture. It stays on screen when the controls hide, ignores the pointer so clicks
//   still reach the player, and keeps the text exactly as typed, line breaks included. Colours are fixed rather than
//   following dark mode, since they sit on video, not on the app.
//   The panel sits flush on the bottom edge, and while the controls show it slides up just clear of the control bar,
//   then drops back down when they hide; usePlayer works here because the caption renders inside the skin.
//   The editor frames the skin to the video's aspect ratio, so this layer covers the picture exactly; it's an
//   inline-size container and its sizes are in cqw, so a portrait reel and a landscape clip both get a caption scaled
//   to the picture, not to the screen.
// holdSeconds, fadeSeconds: The caption runs on playback time, not the clock: it holds for holdSeconds of video after
//   it's set, then fades out over fadeSeconds. Pausing freezes it and seeking back before the fade brings it back.
// opacity: Linear over the fade window. currentTime only ticks a few times a second, so a short opacity transition
//   smooths the steps between ticks.
// CaptionPanel: Keyed on the text, so a new caption remounts it and takes the playback position at that moment as its
//   start.
// headline: An inline span with box-decoration-clone, so the background breaks into one bar per line, each as wide
//   as its own line, and the line height leaves a thin gap between the stacked bars, wide enough that Devanagari's
//   below-letter vowel signs don't touch the next line's bar.
import { usePlayer } from '@videojs/react/video'
import { useState } from 'react'
import type { HeadlineFormValues } from '../components/Editor/HeadlineForm.types'

const holdSeconds = 6
const fadeSeconds = 1.5

const opacity = (elapsed: number) => Math.min(1, Math.max(0, 1 - (elapsed - holdSeconds) / fadeSeconds))

function CaptionPanel({ caption }: { caption: HeadlineFormValues }) {
  const currentTime = usePlayer((s) => s.currentTime) ?? 0
  const controlsVisible = usePlayer((s) => s.controlsVisible) ?? true
  const [from] = useState(currentTime)

  return (
    <div
      style={{ opacity: opacity(currentTime - from) }}
      className={`absolute inset-x-0 bottom-0 bg-black/60 px-[4cqw] py-[3cqw] text-center font-caption transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
        controlsVisible ? '-translate-y-16' : 'translate-y-0'
      }`}
    >
      <h2 className="break-words text-[clamp(1.1rem,6.5cqw,2.75rem)] font-extrabold leading-[1.6]">
        <span className="box-decoration-clone bg-accent px-[1.6cqw] py-[0.5cqw] text-primary shadow-[0_0.6cqw_1.6cqw_rgb(0_0_0/0.55)]">
          {caption.headline}
        </span>
      </h2>
      <p className="mt-[2.5cqw] whitespace-pre-line break-words text-[clamp(0.8rem,3.6cqw,1.5rem)] font-bold leading-snug text-background [text-shadow:0_0.3cqw_1cqw_rgb(0_0_0/0.8)]">
        {caption.details}
      </p>
    </div>
  )
}

function ClipCaption({ caption }: { caption: HeadlineFormValues | null }) {
  if (!caption) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 [container-type:inline-size]">
      <CaptionPanel key={`${caption.headline}\n${caption.details}`} caption={caption} />
    </div>
  )
}

export default ClipCaption
