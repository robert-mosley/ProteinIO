import React from 'react'
import { Search, Settings } from 'lucide-react'

type Props = { onSearch: (q: string) => void }

export default function TopNav({ onSearch }: Props) {
  const [q, setQ] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSearch = React.useCallback(async () => {
    const query = q.trim()
    if (!query) return
    setIsLoading(true)
    try {
      onSearch(query)
    } finally {
      setIsLoading(false)
    }
  }, [q, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch()
    }
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      {/* Logo and tagline */}
      <div className="flex items-center gap-3 min-w-fit">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
          <span className="text-white font-bold">P</span>
        </div>
        <div>
          <div className="font-semibold text-base text-slate-900 dark:text-slate-100">ProteinIO</div>
          <div className="text-xs text-slate-500 hidden sm:block">Research Workspace</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-1 mx-8 max-w-2xl">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 focus-within:border-indigo-400 dark:focus-within:border-indigo-600 transition">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by accession, name, or gene..."
            className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
          />
          <button
            onClick={handleSearch}
            disabled={!q.trim() || isLoading}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <button
          title="Settings"
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
