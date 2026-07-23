import React from 'react'
import TopNav from '../components/TopNav'
import LeftSidebar from '../components/LeftSidebar'
import CenterViewer from '../components/CenterViewer'
import RightPanel from '../components/RightPanel'

const MAX_HISTORY = 10

export default function Dashboard() {
  const [query, setQuery] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<string[]>([])

  function handleSearch(q: string) {
    const val = q.trim() || null
    setQuery(val)
    if (val) {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.toLowerCase() !== val.toLowerCase())
        return [val, ...filtered].slice(0, MAX_HISTORY)
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080e1a]">
      <TopNav onSearch={handleSearch} currentQuery={query} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar history={history} onSelectHistory={handleSearch} />
        <CenterViewer query={query} />
        <RightPanel proteinQuery={query} />
      </div>
    </div>
  )
}
