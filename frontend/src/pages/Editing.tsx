// Editing: A video comes from an upload (played from an object URL, freed when it's replaced or the page unmounts) or
//   from a download (played from its signed B2 link, which needs no freeing).
import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import DownloadPicker from '../components/Editing/DownloadPicker'
import Modal from '../components/Modal'
import { Editor } from '../editor'
import { muted } from '../styles'

const button = 'flex items-center justify-center gap-2 px-4 py-2.5 text-sm'

function Editing() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [video, setVideo] = useState<{ src: string; upload: boolean } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const src = video?.src ?? null

  useEffect(() => {
    if (!video?.upload) return
    return () => URL.revokeObjectURL(video.src)
  }, [video])

  return (
    <div className="min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setVideo({ src: URL.createObjectURL(file), upload: true })
          e.target.value = ''
        }}
      />
      {src && <Editor src={src} onClose={() => setVideo(null)} />}
      {!src && (
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl">Editing</h1>
          <p className={`mt-3 max-w-md text-sm ${muted}`}>
            Trim and clip your videos. Start from something you’ve downloaded, or upload a video of your own.
          </p>
          <div className="mt-8 grid w-full max-w-sm gap-3 sm:w-auto sm:max-w-none sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={`${button} bg-primary text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90`}
            >
              <Download size={16} />
              Use downloads
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={`${button} border border-primary/30 hover:border-primary dark:border-night-primary/30 dark:hover:border-night-primary`}
            >
              <Upload size={16} />
              Upload videos
            </button>
          </div>
        </main>
      )}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a download">
        <DownloadPicker
          onPick={(url) => {
            setPickerOpen(false)
            setVideo({ src: url, upload: false })
          }}
        />
      </Modal>
    </div>
  )
}

export default Editing
