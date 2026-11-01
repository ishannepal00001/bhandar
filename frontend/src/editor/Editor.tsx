import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video'
// Raw text so it skips Tailwind v3's PostCSS pass, which rejects the skin's native @layer rules.
import skinCss from '@videojs/react/video/skin.css?raw'
import { useState } from 'react'
import type { HeadlineFormValues } from '../components/Editor/HeadlineForm.types'
import ClipCaption from './ClipCaption'
import ClipToolbar from './ClipToolbar'

// Public skin settings (accent, border, radius, font), then the skin's internal surface, text and radius variables,
// which aren't a documented API; @videojs/react is pinned to an exact version in package.json so they can't drift.
const skinTheme = [
  '[--media-accent-color:theme(colors.accent)] [--media-accent-text-color:theme(colors.primary)]',
  '[--media-border-color:transparent] [--media-border-radius:0] [--media-font-family:inherit]',
  '[--media-popover:theme(colors.background)] [--media-popover-foreground:theme(colors.primary)]',
  '[--media-controls-foreground:theme(colors.primary)] [--media-muted-foreground:theme(colors.primary/60%)]',
  '[--media-surface-border:theme(colors.primary/15%)] [--media-shadow-surface-inset:none] [--media-shadow-surface:none]',
  '[--media-backdrop-filter-surface:none] [--media-controls-gradient:none]',
  '[--media-control-radius:0] [--media-controls-radius:0] [--media-menu-item-radius:0]',
  '[--media-popup-radius:0] [--media-dialog-radius:0]',
  'dark:[--media-accent-color:theme(colors.night.accent)] dark:[--media-accent-text-color:theme(colors.night.background)]',
  'dark:[--media-popover:theme(colors.night.background)] dark:[--media-popover-foreground:theme(colors.night.primary)]',
  'dark:[--media-controls-foreground:theme(colors.night.primary)] dark:[--media-muted-foreground:theme(colors.night.primary/60%)]',
  'dark:[--media-surface-border:theme(colors.night.primary/15%)]',
].join(' ')

// Covers the viewport over the app, and frames the player to the video's own aspect ratio inside it: the overlay is a
// size container, and the skin takes whichever of its width or height runs out first, so the controls, toolbar and
// caption sit on the picture rather than on black bars. Until the metadata loads, the skin fills the overlay. The
// toolbar is a child of the skin, so it sits inside the player's container: it overlays the video, stays on screen in
// native fullscreen, and shares the controls' show/hide timing.
function Editor({ src, onClose }: { src: string; onClose: () => void }) {
  const [caption, setCaption] = useState<HeadlineFormValues | null>(null)
  const [ratio, setRatio] = useState<number | null>(null)

  const frame = ratio
    ? { width: `min(100cqw, ${100 * ratio}cqh)`, height: `min(100cqh, ${100 / ratio}cqw)` }
    : { width: '100%', height: '100%' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-2 [container-type:size] sm:p-6">
      <style href="videojs-video-skin" precedence="default">
        {skinCss}
      </style>
      <VideoPlayer>
        <VideoSkin style={frame} className={skinTheme}>
          <Video
            src={src}
            playsInline
            onLoadedMetadata={(e) => {
              const { videoWidth, videoHeight } = e.currentTarget
              setRatio(videoWidth && videoHeight ? videoWidth / videoHeight : null)
            }}
          />
          <ClipCaption caption={caption} />
          <ClipToolbar onClose={onClose} onCaption={setCaption} />
        </VideoSkin>
      </VideoPlayer>
    </div>
  )
}

export default Editor
