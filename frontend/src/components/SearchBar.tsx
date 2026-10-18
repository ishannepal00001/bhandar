import { Search } from 'lucide-react'

function SearchBar() {
  return (
    <label className="flex w-full items-center gap-2 sm:max-w-xs border border-primary/30 px-3 py-2 text-primary/60 focus-within:border-primary dark:border-night-primary/30 dark:text-night-primary/60 dark:focus-within:border-night-primary">
      <Search size={16} className="shrink-0" />
      <input
        type="search"
        placeholder="Search"
        aria-label="Search"
        className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-primary/40 focus:outline-none dark:text-night-primary dark:placeholder:text-night-primary/40"
      />
    </label>
  )
}

export default SearchBar
