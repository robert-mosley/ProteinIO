import React from 'react'
import { Search, ExternalLink, Dna, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'
import { Mutation } from '../../types'

// Extract gene symbol from ClinVar title e.g. "NM_000179.3(MSH6):c.3484C>T" → "MSH6"
function extractGene(title: string): string | null {
  const m = title.match(/\(([A-Z][A-Z0-9]{1,9})\):/)
  return m ? m[1] : null
}

// Extract HGVS protein consequence e.g. "(p.Arg1162Ter)" → "p.Arg1162Ter"
function extractProteinChange(title: string): string | null {
  const m = title.match(/\(p\.[^)]+\)/)
  return m ? m[0].slice(1, -1) : null
}

// Extract nucleotide change e.g. "c.3484C>T"
function extractNucChange(title: string): string | null {
  const m = title.match(/c\.\d+[^()\s,]+/)
  return m ? m[0] : null
}

// Guess likely clinical significance from keywords in the title
function guessSig(title: string): { label: string; color: string } {
  const lower = title.toLowerCase()
  if (lower.includes('pathogenic') && !lower.includes('likely')) return { label: 'Pathogenic', color: 'text-red-400 bg-red-400/10 border-red-400/20' }
  if (lower.includes('likely pathogenic'))  return { label: 'Likely Pathogenic', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' }
  if (lower.includes('benign') && !lower.includes('likely'))     return { label: 'Benign', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
  if (lower.includes('likely benign'))      return { label: 'Likely Benign', color: 'text-green-400 bg-green-400/10 border-green-400/20' }
  if (lower.includes('uncertain') || lower.includes('vus'))      return { label: 'VUS', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }
  if (lower.includes('conflicting'))        return { label: 'Conflicting', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
  return { label: 'Unknown', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' }
}

function clinvarUrl(accession: string): string {
  // VCV accessions → ClinVar variation page
  if (/^VCV\d+/.test(accession)) {
    const id = accession.replace(/^VCV0*/, '')
    return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}/`
  }
  return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(accession)}`
}

function MutationCard({ m }: { m: Mutation }) {
  const [expanded, setExpanded] = React.useState(false)
  const gene = extractGene(m.title)
  const proteinChange = extractProteinChange(m.title)
  const nucChange = extractNucChange(m.title)
  const sig = guessSig(m.title)

  return (
    <div className="rounded-xl border border-[#1a3355] bg-[#0d1829] overflow-hidden hover:border-[#2a4a6e] transition-colors fade-in">
      {/* Card header */}
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#0a1628] border border-[#1a3355] flex items-center justify-center flex-shrink-0">
            <Dna className="w-3.5 h-3.5 text-cyan-500/60" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Gene + significance */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {gene && (
                <span className="text-xs font-bold font-mono text-cyan-400">{gene}</span>
              )}
              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${sig.color}`}>
                {sig.label}
              </span>
            </div>

            {/* Variant changes */}
            {(proteinChange || nucChange) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {proteinChange && (
                  <code className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-mono">
                    {proteinChange}
                  </code>
                )}
                {nucChange && (
                  <code className="px-2 py-0.5 rounded bg-slate-800 border border-[#1a3355] text-slate-400 text-[11px] font-mono">
                    {nucChange}
                  </code>
                )}
              </div>
            )}

            {/* Full title (collapsible) */}
            <p className={`text-xs text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {m.title}
            </p>
            {m.title.length > 80 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-0.5 transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" />less</> : <><ChevronDown className="w-3 h-3" />more</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center gap-2 px-3.5 py-2 border-t border-[#0f2040] bg-[#080e1a]/40">
        <span className="text-[10px] font-mono text-slate-300 flex-1 truncate" title={m.accession}>
          {m.accession || '—'}
        </span>
        <a
          href={clinvarUrl(m.accession)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors font-medium"
        >
          ClinVar
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

export default function MutationsTab({ query }: { query: string | null }) {
  const { data, isLoading } = useProtein(query)
  const [filter, setFilter] = React.useState('')

  const all = data?.mutations || []
  const items = filter
    ? all.filter((m) =>
        m.title.toLowerCase().includes(filter.toLowerCase()) ||
        m.accession.toLowerCase().includes(filter.toLowerCase())
      )
    : all

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-full border border-dashed border-[#1a3355] flex items-center justify-center">
          <Dna className="w-6 h-6 text-slate-500" />
        </div>
        <div className="text-sm text-slate-300">Search for a protein to view its mutations</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1a3355] bg-[#0d1829] p-4 space-y-2">
            <div className="shimmer h-3 rounded w-20" />
            <div className="shimmer h-3 rounded w-full" />
            <div className="shimmer h-3 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-300">
          <span className="text-cyan-400 font-bold font-mono">{all.length}</span>
          {' '}mutation{all.length !== 1 ? 's' : ''} from ClinVar
        </div>
        {filter && items.length !== all.length && (
          <div className="text-[10px] text-slate-300">{items.length} matching</div>
        )}
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0d1b30] border border-[#1a3355] text-xs text-white placeholder-slate-700 focus:border-cyan-500/40 focus:outline-none transition font-mono"
          placeholder="Filter by name, accession, gene…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertCircle className="w-5 h-5 text-slate-700" />
          <div className="text-xs text-slate-600">No mutations match your filter</div>
          <button onClick={() => setFilter('')} className="text-[10px] text-cyan-600 hover:text-cyan-400 transition">
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m, i) => (
            <MutationCard key={m.accession || i} m={m} />
          ))}
        </div>
      )}
    </div>
  )
}
