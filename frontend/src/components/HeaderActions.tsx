// HeaderActions: Create clip goes to the Editing page, where a video is picked and the clip editor asks for the
//   headline and details.
import { Link } from '@tanstack/react-router'
import { Download, Scissors } from 'lucide-react'
import { useDownloadModalStore } from '../stores/useDownloadModalStore'

const button = 'flex items-center justify-center gap-2 px-4 py-2.5 text-sm'

function HeaderActions() {
  const openDownloadModal = useDownloadModalStore((state) => state.setOpen)

  return (
    <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
      <button
        type="button"
        onClick={() => openDownloadModal(true)}
        className={`${button} bg-primary text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90`}
      >
        <Download size={16} />
        Create download
      </button>
      <Link
        to="/editing"
        className={`${button} border border-primary/30 hover:border-primary dark:border-night-primary/30 dark:hover:border-night-primary`}
      >
        <Scissors size={16} />
        Create clip
      </Link>
    </div>
  )
}

export default HeaderActions
