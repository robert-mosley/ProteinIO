import React from 'react'
import { Download, ExternalLink, AlertCircle, Layers } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'
import { proteinService } from '../../services/ProteinService'

const METHOD_STYLES: Record<string, string> = {
  'X-RAY DIFFRACTION':      'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  'ELECTRON MICROSCOPY':    'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
  'SOLUTION NMR':           'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  'NEUTRON DIFFRACTION':    'bg-purple-500/10 border-purple-500/30 text-purple-300',
}

function methodStyle(method: string): string {
  return METHOD_STYLES[method.toUpperCase()] || 'bg-slate-500/10 border-slate-500/30 text-slate-400'
}

export default function StructuresTab({ query }: { query: string | null }) {
  const { data, isLoading } = useProtein(query)
  const structures = data?.structures || []

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-full border border-dashed border-[#1a3355] flex items-center justify-center">
          <Layers className="w-6 h-6 text-slate-700" />
        </div>
        <div className="text-sm text-slate-600">Search to view PDB structures</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1a3355] bg-[#0d1829] p-4 space-y-2">
            <div className="shimmer h-3 rounded w-24" />
            <div className="shimmer h-3 rounded w-full" />
            <div className="shimmer h-3 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (structures.length === 0) {
    return (
      <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-300">No PDB structures found for this protein</div>
      </div>
    )
  }

  return (
    <div className="space-y-3 fade-in">
      <div className="text-xs text-slate-300">
        <span className="text-cyan-400 font-bold font-mono">{structures.length}</span> structure{structures.length !== 1 ? 's' : ''} from RCSB PDB
      </div>

      {structures.map((s) => (
        <div key={s.id} className="rounded-xl border border-[#1a3355] bg-[#0d1829] overflow-hidden hover:border-[#2a4a6e] transition-colors">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono font-bold text-cyan-400">{s.id}</code>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${methodStyle(s.method)}`}>
                {s.method}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">{s.title}</p>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <a
              href={`https://www.rcsb.org/structure/${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View in RCSB
            </a>
            <a
              href={s.download_url}
              download
              className="flex-1 px-3 py-2 rounded-lg bg-[#0a1628] hover:bg-[#0d1b30] border border-[#1a3355] hover:border-[#2a4a6e] text-white hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDB
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
