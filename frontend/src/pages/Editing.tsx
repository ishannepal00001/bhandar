import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Editor } from '../editor'
import { muted } from '../styles'

const button = 'flex items-center justify-center gap-2 px-4 py-2.5 text-sm'

function Editing() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [src, setSrc] = useState<string | null>(null)

  // The chosen file is played from an object URL, which is freed when it's replaced or the page unmounts.
  useEffect(() => {
    if (!src) return
    return () => URL.revokeObjectURL(src)
  }, [src])

  return (
    <div className="min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setSrc(URL.createObjectURL(file))
          e.target.value = ''
        }}
      />
      {src && <Editor src={src} onClose={() => setSrc(null)} />}
      {!src && (
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl">Editing</h1>
          <p className={`mt-3 max-w-md text-sm ${muted}`}>
            Trim and clip your videos. Start from something you’ve downloaded, or upload a video of your own.
          </p>
          <div className="mt-8 grid w-full max-w-sm gap-3 sm:w-auto sm:max-w-none sm:grid-cols-2">
            <button
              type="button"
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
    </div>
  )
}

export default Editing
