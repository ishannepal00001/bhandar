// DownloadForm: The link lives in the download store, so a half-typed one survives a reload. Once the job is queued
//   the link is cleared and the download modal closes (a no-op when the form is on the Downloads page).
import { Download, Link2 } from 'lucide-react'
import { downloadsFacade } from '../../facades/downloads'
import { useDownloadModalStore } from '../../stores/useDownloadModalStore'
import { label, primaryButton } from '../../styles'

const field =
  'border border-primary/30 bg-transparent text-sm transition-colors focus-within:border-primary dark:border-night-primary/30 dark:focus-within:border-night-primary'

function DownloadForm() {
  const url = downloadsFacade.useDownloadStore((state) => state.url)
  const startDownload = downloadsFacade.useStartDownload()
  const setModalOpen = useDownloadModalStore((state) => state.setOpen)

  return (
    <section className="border border-primary/15 border-l-accent p-5 [border-left-width:3px] dark:border-night-primary/15 dark:border-l-night-accent">
      <label htmlFor="video-url" className={label}>
        Facebook video URL
      </label>
      <form
        className="mt-3 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          startDownload.mutate(
            { url: url.trim() },
            {
              onSuccess: () => {
                downloadsFacade.reset()
                setModalOpen(false)
              },
            },
          )
        }}
      >
        <div className={`flex min-w-0 flex-1 items-center gap-2 px-3 ${field}`}>
          <Link2 size={16} className="shrink-0 text-primary/60 dark:text-night-primary/60" />
          <input
            id="video-url"
            type="url"
            required
            value={url}
            onChange={(e) => downloadsFacade.setUrl(e.target.value)}
            placeholder="https://www.facebook.com/watch?v=…"
            className="min-w-0 flex-1 bg-transparent py-3 placeholder:text-primary/40 focus:outline-none focus-visible:outline-none dark:placeholder:text-night-primary/40"
          />
        </div>
        <button
          type="submit"
          disabled={startDownload.isPending}
          className={`flex items-center justify-center gap-2 px-6 py-3 text-sm ${primaryButton}`}
        >
          <Download size={16} />
          {startDownload.isPending ? 'Queuing…' : 'Download'}
        </button>
      </form>
    </section>
  )
}

export default DownloadForm
