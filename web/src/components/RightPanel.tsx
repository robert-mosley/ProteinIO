import React from 'react'
import ProteinTab from './tabs/ProteinTab'
import StructuresTab from './tabs/StructuresTab'
import MutationsTab from './tabs/MutationsTab'
import AIAssistantTab from './tabs/AIAssistantTab'

type Props = {
  proteinQuery: string | null
}

export default function RightPanel({ proteinQuery }: Props) {
  const [tab, setTab] = React.useState<'protein' | 'structures' | 'mutations' | 'ai'>('protein')

  return (
    <aside className="w-96 p-4 border-l dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('protein')} className={`px-3 py-1 rounded ${tab==='protein'?'bg-slate-200 dark:bg-slate-700':''}`}>Protein</button>
        <button onClick={() => setTab('structures')} className={`px-3 py-1 rounded ${tab==='structures'?'bg-slate-200 dark:bg-slate-700':''}`}>Structures</button>
        <button onClick={() => setTab('mutations')} className={`px-3 py-1 rounded ${tab==='mutations'?'bg-slate-200 dark:bg-slate-700':''}`}>Mutations</button>
        <button onClick={() => setTab('ai')} className={`px-3 py-1 rounded ${tab==='ai'?'bg-slate-200 dark:bg-slate-700':''}`}>AI Assistant</button>
      </div>
      <div>
        {tab === 'protein' && <ProteinTab query={proteinQuery} />}
        {tab === 'structures' && <StructuresTab query={proteinQuery} />}
        {tab === 'mutations' && <MutationsTab query={proteinQuery} />}
        {tab === 'ai' && <AIAssistantTab />}
      </div>
    </aside>
  )
}
