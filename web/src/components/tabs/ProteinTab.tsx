import React from 'react'
import { AlertCircle, Copy, Check } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'
import { proteinService } from '../../services/ProteinService'

export default function ProteinTab({ query }: { query: string | null }) {
  const { data, isLoading, error } = useProtein(query)
  const [copied, setCopied] = React.useState<string | null>(null)

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-full border border-dashed border-[#1a3355] flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-slate-700" />
        </div>
        <div className="text-sm text-slate-400">Search for a protein to view details</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="shimmer h-2.5 rounded w-16" />
            <div className="shimmer h-4 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-300">{error.message || 'Failed to load protein'}</div>
      </div>
    )
  }

  if (!data) return null
  const p = data.protein

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Name */}
      <div className="surface-card rounded-xl border p-4">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">Protein Name</div>
        <div className="font-medium text-slate-200 text-sm leading-relaxed">{p.name}</div>
      </div>

      {/* Accession */}
      <div className="surface-card rounded-xl border p-4">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">Accession</div>
        <div className="flex items-center gap-2">
           <code className="flex-1 px-3 py-2 bg-[#0b1117] border border-[#2b3b4a] rounded-lg text-sm font-mono text-cyan-200">
            {p.accession}
          </code>
          <button
            onClick={() => copyToClipboard(p.accession, 'accession')}
             className="quiet-control p-2 rounded-lg border transition"
            title="Copy accession"
          >
            {copied === 'accession' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sequence length */}
      <div className="surface-card rounded-xl border p-4">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">Sequence Length</div>
        <div className="text-2xl font-bold font-mono text-cyan-400">{p.length.toLocaleString()}</div>
        <div className="text-xs text-slate-300 mt-0.5">amino acids</div>
      </div>

      {/* Sequence */}
      <div className="surface-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Sequence</div>
          <button
            onClick={() => copyToClipboard(p.sequence, 'sequence')}
             className="quiet-control flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition text-xs"
          >
            {copied === 'sequence' ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
         <pre className="p-3 bg-[#0b1117] border border-[#2b3b4a] rounded-lg text-[11px] font-mono text-slate-100 overflow-auto max-h-52 leading-6 tracking-wider">
          {proteinService.formatSequence(p.sequence)}
        </pre>
      </div>
    </div>
  )
}

