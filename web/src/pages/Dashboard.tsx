import React from 'react'
import TopNav from '../components/TopNav'
import LeftSidebar from '../components/LeftSidebar'
import CenterViewer from '../components/CenterViewer'
import RightPanel from '../components/RightPanel'
import { setCurrentPdb } from '../services/api'
import { sessionId } from '../services/SessionService'

const MAX_HISTORY = 10

export default function Dashboard() {
  const [query, setQuery] = React.useState<string | null>(null)
  const [searchVersion, setSearchVersion] = React.useState(0)
  const [history, setHistory] = React.useState<string[]>([])
  const [selectedPdb, setSelectedPdb] = React.useState<string | null>(null)
  const [generatedPdb, setGeneratedPdb] = React.useState<string | null>(null)
  const [highlight, setHighlight] = React.useState<{ chain: string; residue: number } | null>(null)

  function handleSearch(q: string) {
    const val = q.trim() || null
    const isSameQuery = val?.toLowerCase() === query?.toLowerCase()

    setQuery(val)
    setSearchVersion((version) => version + 1)
    setGeneratedPdb(null)
    setHighlight(null)

    // Keep the current structure when the user submits the same protein again.
    // React Query returns the cached result for the same key, so clearing the
    // viewer here would otherwise leave it empty until another state changes.
    if (!isSameQuery) {
      setSelectedPdb(null)
    }

    if (val) {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.toLowerCase() !== val.toLowerCase())
        return [val, ...filtered].slice(0, MAX_HISTORY)
      })
    }
  }

  React.useEffect(() => {
    if (selectedPdb) {
      setCurrentPdb(selectedPdb, sessionId)
    }
  }, [selectedPdb])

  React.useEffect(() => {
    const activePdb = generatedPdb ?? selectedPdb
    if (!activePdb) return

    setCurrentPdb(activePdb, sessionId).catch((err) => {
      console.error('Failed to update current PDB on backend', err)
    })
  }, [selectedPdb, generatedPdb])

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <TopNav onSearch={handleSearch} currentQuery={query} />
      <div className="workspace-shell flex flex-1 overflow-hidden">
        <LeftSidebar history={history} onSelectHistory={handleSearch} />
        <CenterViewer query={query} selectedPdb={selectedPdb} generatedPdb={generatedPdb} highlight={highlight} />
        <RightPanel
          proteinQuery={query}
          searchVersion={searchVersion}
          setSelectedPdb={setSelectedPdb}
          setGeneratedPdb={setGeneratedPdb}
          setHighlight={setHighlight}
        />
      </div>
    </div>
  )
}
