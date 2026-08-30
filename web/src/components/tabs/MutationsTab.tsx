import React from 'react'
import { Search, Dna, AlertCircle, ExternalLink, FlaskConical, CheckCircle2 } from 'lucide-react'
import { useProtein } from '../../hooks/useProtein'
import { Mutation } from '../../types'
import MutationWorkspace from '../MutationWorkspace'

function sigStyle(sig: string | null | undefined): { label: string; color: string } {
  if (!sig) return { label: 'Unknown', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' }
  const s = sig.toLowerCase()
  if (s === 'pathogenic') return { label: 'Pathogenic', color: 'text-red-400 bg-red-400/10 border-red-400/20' }
  if (s.includes('likely pathogenic')) return { label: 'Likely Pathogenic', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' }
  if (s === 'benign') return { label: 'Benign', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
  if (s.includes('likely benign')) return { label: 'Likely Benign', color: 'text-green-400 bg-green-400/10 border-green-400/20' }
  if (s.includes('uncertain') || s.includes('vus')) return { label: 'VUS', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }
  if (s.includes('conflicting')) return { label: 'Conflicting', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
  return { label: sig, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
}

function clinvarUrl(accession: string): string {
  if (/^VCV\d+/.test(accession)) {
    const id = accession.replace(/^VCV0*/, '')
    return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}/`
  }
  return `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(accession)}`
}

interface CardProps {
  m: Mutation
  selected: boolean
  onClick: () => void
  onDoubleClick: () => void
}

function MutationCard({ m, selected, onClick, onDoubleClick }: CardProps) {
  const sig = sigStyle(m.clinical_significance)

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      title="Select mutation to inspect"
      className={`
        surface-card rounded-xl border overflow-hidden cursor-pointer select-none
        transition-all duration-150 fade-in group
        ${selected
          ? 'border-cyan-200/80 bg-[#1b3540] ring-2 ring-cyan-300/30 shadow-[0_0_18px_rgba(84,214,208,0.16)]'
          : 'border-[#2b3b4a] hover:border-[#3c5263] hover:shadow-md hover:shadow-black/30'}
      `}
    >
      {selected && <div className="h-0.5 bg-cyan-300" />}
      {/* Card body */}
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          {/* Icon */}
          <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
            selected ? 'bg-cyan-400/10 border-cyan-300/40' : 'bg-[#121a23] border-[#2b3b4a]'
          }`}>
            <Dna className={`w-3.5 h-3.5 transition-colors ${selected ? 'text-cyan-400' : 'text-cyan-500/60'}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Significance badge */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${sig.color}`}>
                {sig.label}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                <FlaskConical className="w-3 h-3" />
                {m.source}
              </span>
              {selected && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-cyan-200/40 bg-cyan-300/10 text-[10px] font-semibold text-cyan-100">
                  <CheckCircle2 className="w-3 h-3" />
                  Selected
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
              {m.title || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center gap-2 px-3.5 py-2 border-t border-[#2b3b4a] bg-[#0b1117]/45">
        <code className="text-[10px] font-mono text-slate-400 flex-1 truncate" title={m.accession}>
          {m.accession || '—'}
        </code>

        <div className="flex items-center gap-2">
          {/* Selection hint */}
          <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors hidden group-hover:inline">
            click to inspect
          </span>

          {m.accession && (
            <a
              href={clinvarUrl(m.accession)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors font-medium"
            >
              ClinVar <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

type MutationsTabProps = {
  query: string | null
  selectedPdb?: string | null
  structureUrls?: string[]
  setSelectedPdb?: (url: string | null) => void
  setHighlight?: (highlight: { chain: string; residue: number } | null) => void
  setGeneratedPdb?: (pdb: string | null) => void
}

export default function MutationsTab({
  query,
  selectedPdb,
  structureUrls,
  setSelectedPdb,
  setHighlight,
  setGeneratedPdb,
}: MutationsTabProps) {
  const { data, isLoading } = useProtein(query)
  const [filter, setFilter] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [workspace, setWorkspace] = React.useState<Mutation | null>(null)

  const all: Mutation[] = data?.mutations ?? []

  console.log("MutationsTab data", data);

  const items = filter
    ? all.filter((m) =>
        m.title.toLowerCase().includes(filter.toLowerCase()) ||
        m.accession.toLowerCase().includes(filter.toLowerCase()) ||
        (m.source ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.clinical_significance ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.chain ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.position ?? '').toString().toLowerCase().includes(filter.toLowerCase())
      )
    : all

  // Reset selection when query changes
  React.useEffect(() => {
    setSelectedId(null)
    setWorkspace(null)
    setFilter('')
  }, [query])

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-full border border-dashed border-[#1a3355] flex items-center justify-center">
          <Dna className="w-6 h-6 text-slate-500" />
        </div>
         <div className="text-sm text-slate-400">Search for a protein to view its mutations</div>
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
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-300">
            <span className="text-cyan-400 font-bold font-mono">{all.length}</span>
            {' '}mutation{all.length !== 1 ? 's' : ''}
            {all.length > 0 && (
              <span className="text-slate-600 ml-1">· select a card to inspect</span>
            )}
          </div>
          {filter && items.length !== all.length && (
            <div className="text-[10px] text-slate-400">{items.length} matching</div>
          )}
        </div>

        {workspace && (
          <div className="flex items-center gap-2.5 rounded-xl border border-cyan-200/50 bg-cyan-300/10 px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-cyan-200" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-cyan-100">
                Selected mutation
              </div>
              <code className="block truncate text-xs font-mono text-white mt-0.5">
                {workspace.protein_change || workspace.title || workspace.accession || 'Mutation record'}
              </code>
            </div>
          </div>
        )}

        {/* Filter */}
        {all.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#17222d] border border-[#2b3b4a] text-xs text-white placeholder-slate-400 focus:border-cyan-300/60 focus:outline-none transition font-mono"
              placeholder="Filter by title, accession, source, significance…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        )}

        {/* Empty states */}
        {all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertCircle className="w-5 h-5 text-slate-700" />
            <div className="text-xs text-slate-500">No mutations returned by the backend.</div>
            <div className="text-[10px] text-slate-700 max-w-xs leading-relaxed">
              The server may be returning an empty array. Check the backend bug report below.
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="w-5 h-5 text-slate-700" />
             <div className="text-xs text-slate-400">No mutations match your filter</div>
            <button onClick={() => setFilter('')} className="text-[10px] text-cyan-600 hover:text-cyan-400 transition">
              Clear filter
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((m, i) => {
              const id = m.accession || String(i)
              return (
                <MutationCard
                  key={id}
                  m={m}
                  selected={selectedId === id}
                   onClick={() => {
                     setSelectedId(id)
                     setWorkspace(m)
                   }}
                   onDoubleClick={() => setWorkspace(m)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Workspace drawer — rendered outside the scroll container via portal-like fixed positioning */}
      <MutationWorkspace
        mutation={workspace}
        query={query}
        selectedPdb={selectedPdb}
        structureUrls={structureUrls}
        setSelectedPdb={setSelectedPdb}
        setHighlight={setHighlight}
        setGeneratedPdb={setGeneratedPdb}
        onClose={() => setWorkspace(null)}
      />
    </>
  )
}
