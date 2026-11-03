// HeaderActions: Create clip goes to the Editing page, where a video is picked and the clip editor asks for the
//   headline and details.
import { Link } from '@tanstack/react-router'
import { Download, Scissors } from 'lucide-react'
import { useDownloadModalStore } from '../stores/useDownloadModalStore'
import { outlineButton, primaryButton } from '../styles'

const button = 'flex items-center justify-center gap-2 px-4 py-2.5 text-sm'

function HeaderActions() {
  const openDownloadModal = useDownloadModalStore((state) => state.setOpen)

  return (
    <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
      <button
        type="button"
        onClick={() => openDownloadModal(true)}
        className={`${button} ${primaryButton}`}
      >
        <Download size={16} />
        Create download
      </button>
      <Link
        to="/editing"
        className={`${button} ${outlineButton}`}
      >
        <Scissors size={16} />
        Create clip
      </Link>
    </div>
  )
}

export default HeaderActions
