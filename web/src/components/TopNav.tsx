import React from 'react'
import { Search, Dna, Loader2, Command } from 'lucide-react'

type Props = {
  onSearch: (q: string) => void
  currentQuery: string | null
}

export default function TopNav({ onSearch, currentQuery }: Props) {
  const [q, setQ] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

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
    if (e.key === 'Enter' && !isLoading) handleSearch()
    if (e.key === 'Escape') inputRef.current?.blur()
  }

  // Global keyboard shortcut: Cmd/Ctrl+K to focus search
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // Keep the visible search field in sync when a recent search is selected.
  React.useEffect(() => {
    if (currentQuery) setQ(currentQuery)
  }, [currentQuery])

  return (
    <nav className="top-nav flex items-center gap-4 px-5 py-3 border-b sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5 min-w-fit">
        <div className="brand-mark w-8 h-8 rounded-lg flex items-center justify-center">
          <Dna className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm text-white tracking-wide">ProteinIO</div>
          <div className="text-[10px] text-cyan-500/70 font-mono tracking-widest uppercase hidden sm:block">Research Workspace</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="search-shell flex items-center gap-2 border rounded-xl px-3.5 py-2 transition-all duration-150">
          {isLoading
            ? <Loader2 className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-spin" />
            : <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by gene, accession, or protein name…"
            className="w-full bg-transparent outline-none text-sm text-white placeholder-slate-600 min-w-0"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="text-slate-600 hover:text-slate-400 transition text-xs px-1"
            >✕</button>
          )}
          <div className="flex items-center gap-1 flex-shrink-0 hidden sm:flex">
            <kbd className="px-1.5 py-0.5 rounded bg-[#0a1628] border border-[#1a3355] text-[10px] text-slate-500 font-mono">⌘K</kbd>
          </div>
          <button
            onClick={handleSearch}
            disabled={!q.trim() || isLoading}
            className="accent-control px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 flex-shrink-0"
          >
            Search
          </button>
        </div>
      </div>

      {/* Status badge */}
      {currentQuery && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg quiet-control border text-xs font-mono max-w-[180px]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
          <span className="truncate">{currentQuery}</span>
        </div>
      )}
    </nav>
  )
}
