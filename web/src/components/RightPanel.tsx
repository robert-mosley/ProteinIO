import React from 'react'
import { Microscope, Layers, Dna, Bot } from 'lucide-react'
import ProteinTab from './tabs/ProteinTab'
import StructuresTab from './tabs/StructuresTab'
import MutationsTab from './tabs/MutationsTab'
import AIAssistantTab from './tabs/AIAssistantTab'
import { useProtein } from '../hooks/useProtein'

type Tab = 'protein' | 'structures' | 'mutations' | 'ai'

type Props = {
  proteinQuery: string | null
  searchVersion: number
  selectedPdb?: string | null
  setSelectedPdb: (url: string | null) => void
  setGeneratedPdb: (pdb: string | null) => void
  setHighlight?: (highlight: { chain: string; residue: number } | null) => void
}

export default function RightPanel({
  proteinQuery,
  searchVersion,
  selectedPdb,
  setSelectedPdb,
  setGeneratedPdb,
  setHighlight,
}: Props) {
  const [tab, setTab] = React.useState<Tab>('protein')
  const { data } = useProtein(proteinQuery)
  const structureUrls = React.useMemo(
    () => data?.structures?.map((structure) => structure.download_url) ?? [],
    [data?.structures],
  )

  // Auto-load the first structure whenever results arrive for a new query
  React.useEffect(() => {
    if (data?.structures?.length) {
      setGeneratedPdb(null)
      setSelectedPdb(data.structures[0].download_url)
    } else if (data) {
      // Data loaded but no structures
      setSelectedPdb(null)
    }
  }, [data, proteinQuery, searchVersion, setGeneratedPdb, setSelectedPdb])

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'protein',    label: 'Protein',    icon: <Microscope className="w-3.5 h-3.5" /> },
    { id: 'structures', label: 'Structures', icon: <Layers className="w-3.5 h-3.5" />, count: data?.structures?.length },
    { id: 'mutations',  label: 'Mutations',  icon: <Dna className="w-3.5 h-3.5" />,     count: data?.mutations?.length },
    { id: 'ai',         label: 'AI',         icon: <Bot className="w-3.5 h-3.5" /> },
  ]

  return (
    <aside className="right-panel w-[420px] min-h-0 flex-shrink-0 flex flex-col border-l overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#2b3b4a] bg-[#0f171f] px-2 pt-2 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-t-lg text-xs font-medium transition-all duration-150 relative ${
              tab === t.id
                ? 'bg-[#17222d] text-white border border-b-0 border-[#3c5263]'
                : 'text-slate-400 hover:text-white hover:bg-[#17222d]/60'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                tab === t.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#1a3355] text-slate-500'
              }`}>
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-[#0d1b30]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="panel-content flex-1 min-h-0 overflow-y-auto p-4">
        <div className="fade-in">
          {tab === 'protein'    && <ProteinTab    query={proteinQuery} />}
          {tab === 'structures' && <StructuresTab query={proteinQuery} setSelectedPdb={setSelectedPdb} />}
          {tab === 'mutations'  && (
            <MutationsTab
              query={proteinQuery}
              selectedPdb={selectedPdb}
              structureUrls={structureUrls}
              setSelectedPdb={setSelectedPdb}
              setHighlight={setHighlight}
              setGeneratedPdb={setGeneratedPdb}
            />
          )}
          {tab === 'ai'         && <AIAssistantTab setGeneratedPdb={setGeneratedPdb} setHighlight={setHighlight} />}
        </div>
      </div>
    </aside>
  )
}
