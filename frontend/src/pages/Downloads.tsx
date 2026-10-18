import { useState } from 'react'
import DownloadForm from '../components/Downloads/DownloadForm'
import DownloadQueue from '../components/Downloads/DownloadQueue'
import SearchBar from '../components/SearchBar'
import VideoCard from '../components/VideoCard'
import { queue, recent } from '../dummydata'

const filters = ['All', 'Done', 'Failed'] as const

const muted = 'text-primary/60 dark:text-night-primary/60'

function Downloads() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const videos = filter === 'All' ? recent : recent.filter((v) => v.status === filter)

  return (
    <div className="min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl">Downloads</h1>
            <p className={`mt-1 text-sm ${muted}`}>
              Paste a Facebook link to download it, and manage everything you’ve saved.
            </p>
          </div>
          <SearchBar />
        </div>

        <DownloadForm />

        <DownloadQueue items={queue} />

        <section>
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-xl">All Downloads</h2>
            <div className="flex border border-primary/15 dark:border-night-primary/15">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`px-4 py-1.5 text-sm ${
                    filter === f
                      ? 'bg-primary text-background dark:bg-night-primary dark:text-night-background'
                      : `${muted} hover:text-primary dark:hover:text-night-primary`
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Downloads
