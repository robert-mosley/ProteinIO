import React from 'react'
import { Download, ExternalLink, AlertCircle } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'
import { proteinService } from '../../services/ProteinService'

export default function StructuresTab({ query }: { query: string | null }) {
  const { data, isLoading } = useProtein(query)
  const structures = data?.structures || []

  if (!query) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 mt-1" />
        <div className="text-sm text-slate-600 dark:text-slate-400">Search to view structures</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse p-3 bg-slate-100 dark:bg-slate-800 rounded-lg h-24" />
        ))}
      </div>
    )
  }

  if (structures.length === 0) {
    return (
      <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">No structures available</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {structures.map((s) => (
        <div key={s.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-start justify-between mb-2">
            <code className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">{s.id}</code>
            <span className={`px-2 py-1 rounded text-xs font-medium ${proteinService.getMethodColor(s.method)}`}>
              {s.method}
            </span>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2">{s.title}</div>
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition">
              <ExternalLink className="w-4 h-4" />
              Open
            </button>
            <a
              href={s.download_url}
              download
              className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
