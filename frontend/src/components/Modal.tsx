import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-primary/40 dark:bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-2xl border border-primary/15 bg-background text-primary dark:border-night-primary/15 dark:bg-night-background dark:text-night-primary"
      >
        <div className="flex items-center justify-between border-b border-primary/15 px-5 py-4 dark:border-night-primary/15">
          <h2 id="modal-title" className="font-serif text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-primary/60 hover:text-primary dark:text-night-primary/60 dark:hover:text-night-primary"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default Modal
