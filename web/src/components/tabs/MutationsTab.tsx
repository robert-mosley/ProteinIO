import React from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'

export default function MutationsTab({ query }: { query: string | null }) {
  const { data, isLoading } = useProtein(query)
  const [filter, setFilter] = React.useState('')
  const [selected, setSelected] = React.useState<string | null>(null)

  const items = (data?.mutations || []).filter((m) => m.title.toLowerCase().includes(filter.toLowerCase()))

  if (!query) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 mt-1" />
        <div className="text-sm text-slate-600 dark:text-slate-400">Search to view mutations</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse p-3 bg-slate-100 dark:bg-slate-800 rounded-lg h-16" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute left-3 top-2.5 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm placeholder-slate-500 dark:placeholder-slate-400 focus:border-indigo-500 dark:focus:border-indigo-600 transition outline-none"
          placeholder="Search mutations..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <div className="flex gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 mt-1" />
          <div className="text-sm text-slate-600 dark:text-slate-400">No mutations found</div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <button
              key={m.accession}
              onClick={() => setSelected(m.accession)}
              className={`w-full p-3 rounded-lg border text-left transition ${selected === m.accession ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
              <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{m.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.accession}</div>
              <div className="text-xs mt-2">
                <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">ClinVar</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
