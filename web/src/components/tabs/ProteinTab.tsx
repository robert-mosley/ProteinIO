import React from 'react'
import { AlertCircle, Copy } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'
import { proteinService } from '../../services/ProteinService'

export default function ProteinTab({ query }: { query: string | null }) {
  const { data, isLoading, error } = useProtein(query)
  const [copied, setCopied] = React.useState(false)

  if (!query) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 mt-1" />
        <div className="text-sm text-slate-600 dark:text-slate-400">Search for a protein to view details</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
            <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex gap-3 p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-rose-800 dark:text-rose-300">{error.message || 'Failed to load protein'}</div>
      </div>
    )
  }

  if (!data) return null
  const p = data.protein

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase letter-spacing font-semibold text-slate-500 dark:text-slate-400 mb-2">Protein Name</div>
        <div className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-relaxed">{p.name}</div>
      </div>
      <div>
        <div className="text-xs uppercase letter-spacing font-semibold text-slate-500 dark:text-slate-400 mb-2">Accession</div>
        <div className="flex items-center gap-2">
          <code className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-mono text-slate-700 dark:text-slate-300">{p.accession}</code>
          <button onClick={() => copyToClipboard(p.accession)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Copy"><Copy className="w-4 h-4 text-slate-500" /></button>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase letter-spacing font-semibold text-slate-500 dark:text-slate-400 mb-2">Sequence Length</div>
        <div className="text-sm text-slate-900 dark:text-slate-100">{p.length.toLocaleString()} amino acids</div>
      </div>
      <div>
        <div className="text-xs uppercase letter-spacing font-semibold text-slate-500 dark:text-slate-400 mb-2">Sequence</div>
        <div className="relative">
          <pre className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 overflow-auto max-h-60 leading-5">
            {proteinService.formatSequence(p.sequence)}
          </pre>
          <button onClick={() => copyToClipboard(p.sequence)} className="absolute top-2 right-2 p-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Copy"><Copy className="w-4 h-4 text-slate-600" /></button>
        </div>
      </div>
    </div>
  )
}
