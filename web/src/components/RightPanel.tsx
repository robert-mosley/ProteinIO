import React from 'react'
import { Microscope, Layers, Dna, Bot } from 'lucide-react'
import ProteinTab from './tabs/ProteinTab'
import StructuresTab from './tabs/StructuresTab'
import MutationsTab from './tabs/MutationsTab'
import AIAssistantTab from './tabs/AIAssistantTab'
import { useProtein } from '../hooks/useProtein'

type Tab = 'protein' | 'structures' | 'mutations' | 'ai'

type Props = { proteinQuery: string | null }

export default function RightPanel({ proteinQuery }: Props) {
  const [tab, setTab] = React.useState<Tab>('protein')
  const { data } = useProtein(proteinQuery)

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'protein',    label: 'Protein',    icon: <Microscope className="w-3.5 h-3.5" /> },
    { id: 'structures', label: 'Structures', icon: <Layers className="w-3.5 h-3.5" />, count: data?.structures?.length },
    { id: 'mutations',  label: 'Mutations',  icon: <Dna className="w-3.5 h-3.5" />,     count: data?.mutations?.length },
    { id: 'ai',         label: 'AI',         icon: <Bot className="w-3.5 h-3.5" /> },
  ]

  return (
    <aside className="w-[420px] flex-shrink-0 flex flex-col border-l border-[#0f2040] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#0f2040] bg-[#080e1a] px-2 pt-2 gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-t-lg text-xs font-medium transition-all duration-150 relative ${
              tab === t.id
                ? 'bg-[#0d1b30] text-white border border-b-0 border-[#1a3355]'
                : 'text-slate-600 hover:text-slate-400'
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
      <div className="flex-1 overflow-y-auto bg-[#0a1220] p-4">
        <div className="fade-in">
          {tab === 'protein'    && <ProteinTab    query={proteinQuery} />}
          {tab === 'structures' && <StructuresTab query={proteinQuery} />}
          {tab === 'mutations'  && <MutationsTab  query={proteinQuery} />}
          {tab === 'ai'         && <AIAssistantTab />}
        </div>
      </div>
    </aside>
  )
}
