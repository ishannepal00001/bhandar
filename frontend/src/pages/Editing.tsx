// Editing: A video comes from an upload (played from an object URL, freed when it's replaced or the page unmounts) or
//   from a download (played from its signed B2 link, which needs no freeing). Opening one sets it as the clip store's
//   source, which clears any earlier clips and caption; closing the editor clears them too. Below the two ways in, the
//   exports: rendering ones and finished ones to save or delete.
import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import DownloadPicker from '../components/Editing/DownloadPicker'
import ExportList from '../components/Editing/ExportList'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { Editor } from '../editor'
import { clipsFacade } from '../facades/clips'
import { outlineButton, primaryButton } from '../styles'
import { jobTitle } from '../utils/jobs'

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
    <>
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            clipsFacade.setSource({ kind: 'upload', name: file.name, file, uploadId: null })
            setVideo({ src: URL.createObjectURL(file), upload: true })
          }
          e.target.value = ''
        }}
      />
      {src && (
        <Editor
          src={src}
          onClose={() => {
            clipsFacade.reset()
            setVideo(null)
          }}
        />
      )}
      {!src && (
        <main className="mx-auto max-w-7xl animate-fade-up space-y-8 px-4 py-6 motion-reduce:animate-none sm:space-y-10 sm:px-6 sm:py-10">
          <PageHeader
            eyebrow="Studio"
            title="Editing"
            description="Trim and clip your videos. Start from something you’ve downloaded, or upload a video of your own."
            actions={
              <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                <button type="button" onClick={() => setPickerOpen(true)} className={`${button} ${primaryButton}`}>
                  <Download size={16} />
                  Use downloads
                </button>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className={`${button} ${outlineButton}`}
                >
                  <Upload size={16} />
                  Upload videos
                </button>
              </div>
            }
          />
          <ExportList />
        </main>
      )}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a download">
        <DownloadPicker
          onPick={(url, job) => {
            setPickerOpen(false)
            clipsFacade.setSource({ kind: 'download', downloadId: job.id, title: jobTitle(job) })
            setVideo({ src: url, upload: false })
          }}
        />
      </Modal>
    </>
  )
}

export default Editing
