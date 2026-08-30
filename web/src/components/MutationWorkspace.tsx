import React from 'react'
import { X, Dna, FlaskConical, BrainCircuit, ExternalLink, Crosshair, AlertCircle, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Mutation, MutationAnalysis } from '../types'
import { chatService } from '../services/ChatService'
import { MutationInfoService } from '../services/MutationService'
import { analyzeMutation } from '../services/api'
import { sessionId } from '../services/SessionService'

const mutationInfoService = new MutationInfoService()

type Highlight = { chain: string; residue: number }
interface Props {
  mutation: Mutation | null
  onClose: () => void
  query: string | null
  selectedPdb?: string | null
  structureUrls?: string[]
  setSelectedPdb?: (url: string | null) => void
  setHighlight?: (highlight: Highlight | null) => void
  setGeneratedPdb?: (pdb: string | null) => void
}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 leading-relaxed">{children}</div>
    </div>
  )
}

export default function MutationWorkspace({
  mutation,
  query,
  selectedPdb,
  structureUrls = [],
  setSelectedPdb,
  onClose,
  setHighlight,
  setGeneratedPdb,
}: Props) {
  const visible = mutation !== null

  const [summary, setSummary] = React.useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [analysis, setAnalysis] = React.useState<MutationAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [modelLoading, setModelLoading] = React.useState(false)
  const [modelError, setModelError] = React.useState<string | null>(null)

  const sequence = mutation?.sequence || 'Unknown sequence'

  console.log("mutation ", mutation);

  const hasPosition =
    !!mutation?.chain && typeof mutation?.position === 'number' && Number.isFinite(mutation.position)

  const handleClose = React.useCallback(() => {
    setHighlight?.(null)
    onClose()
  }, [onClose, setHighlight])

  const handleLoadMutant = React.useCallback(async () => {
    if (!mutation) return
    setModelLoading(true)
    setModelError(null)
    try {
      const info = await mutationInfoService.MutationInfo(
        mutation.sequence,
        mutation.protein_change,
      )
      if (!info?.pdb_string) {
        throw new Error('The mutant structure service did not return a structure.')
      }
      setGeneratedPdb?.(info.pdb_string)
    } catch (err: unknown) {
      setModelError(err instanceof Error ? err.message : 'Unable to load the mutant structure')
    } finally {
      setModelLoading(false)
    }
  }, [mutation, setGeneratedPdb])

  // Close on Escape
  React.useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, handleClose])

  // Automatically point the 3D viewer at this mutation's residue whenever it opens/changes.
  React.useEffect(() => {
    if (mutation && hasPosition) {
      setHighlight?.({ chain: mutation.chain as string, residue: mutation.position as number })
    }
    // Intentionally not clearing highlight here on mutation===null — handleClose already does that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation?.accession, mutation?.chain, mutation?.position])

  // Fetch structural context for the selected mutation and focus the returned
  // residue in Mol*. This uses the active PDB selected in the main viewer.
  React.useEffect(() => {
    if (!mutation || !query || !mutation.protein_change) {
      setAnalysis(null)
      setAnalysisError(null)
      setAnalysisLoading(false)
      return
    }

    let cancelled = false
    setAnalysis(null)
    setAnalysisError(null)
    setAnalysisLoading(true)

    analyzeMutation(
      query,
      mutation.protein_change,
      mutation.sequence,
      sessionId,
      selectedPdb,
      structureUrls,
    )
      .then((result) => {
        if (cancelled) return
        setAnalysis(result)
        if (result.selected_pdb && result.selected_pdb !== selectedPdb) {
          setSelectedPdb?.(result.selected_pdb)
        }
        const location = result.structure?.[0]
        if (location) {
          setHighlight?.({
            chain: location.chain,
            residue: location.residue.position,
          })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAnalysisError(err instanceof Error ? err.message : 'Unable to analyze this mutation')
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    mutation?.accession,
    mutation?.protein_change,
    mutation?.sequence,
    query,
    selectedPdb,
    structureUrls,
    setHighlight,
    setSelectedPdb,
  ])

  // Fetch a live AI summary whenever the mutation changes.
  React.useEffect(() => {
    if (!mutation) {
      setSummary(null)
      setSummaryError(null)
      return
    }

    let cancelled = false
    setSummary(null)
    setSummaryError(null)
    setSummaryLoading(true)

    const prompt = [
      'Give a concise (3-5 sentence) plain-language summary of this mutation for a researcher.',
      'Cover what is known about its functional/structural impact and clinical relevance if any.',
      '',
      `Accession: ${mutation.accession || 'unknown'}`,
      `Source: ${mutation.source || 'unknown'}`,
      `Clinical significance: ${mutation.clinical_significance || 'unknown'}`,
      `Description: ${mutation.title || 'unknown'}`,
       hasPosition ? `Location: chain ${mutation.chain}, residue ${mutation.position}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    chatService
      .sendMessage(prompt)
      .then((response) => {
        if (cancelled) return
        setSummary(response?.response ?? null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const errText = err instanceof Error ? err.message : 'Failed to generate summary'
        setSummaryError(errText)
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation?.accession])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/25 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 w-[420px] flex flex-col border-l border-[#1a3355] bg-[#08111e] shadow-2xl transition-transform duration-200 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1a3355] bg-[#080e1a]">
          <div className="w-8 h-8 rounded-lg bg-[#0d1b30] border border-[#1a3355] flex items-center justify-center flex-shrink-0">
            <Dna className="w-4 h-4 text-cyan-500/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-white">Selected Mutation</div>
              <span className="px-1.5 py-0.5 rounded border border-cyan-300/30 bg-cyan-300/10 text-[9px] uppercase tracking-wider font-semibold text-cyan-100">
                Active
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {mutation?.protein_change || mutation?.accession || '—'}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#1a3355] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {mutation && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

            {/* Core fields */}
            <div className="rounded-xl border border-[#1a3355] bg-[#0d1829] p-4 space-y-5">
              <Field label="Source">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0d1b30] border border-[#1a3355] text-xs font-mono text-slate-300">
                  <FlaskConical className="w-3 h-3 text-cyan-500/60" />
                  {mutation.source}
                </span>
              </Field>

              <Field label="Accession">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-cyan-400 text-xs">{mutation.accession || '—'}</code>
                  {mutation.accession && (
                    <a
                      href={clinvarUrl(mutation.accession)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors"
                    >
                      ClinVar <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Field>

              <Field label="Protein Change">
                <code className="font-mono text-sm text-cyan-200">
                  {mutation.protein_change || 'Not available'}
                </code>
              </Field>

              <Field label="Clinical Significance">
                {(() => {
                  const s = sigStyle(mutation.clinical_significance)
                  return (
                    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${s.color}`}>
                      {s.label}
                    </span>
                  )
                })()}
              </Field>

              <Field label="Description">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {mutation.title || '—'}
                </p>
              </Field>
            </div>

            {/* Structure section */}
            <div className="rounded-xl border border-[#2b3b4a] bg-[#17222d] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Physical context
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Residue location and nearby contacts
                  </div>
                </div>
                {hasPosition && (
                  <button
                    onClick={() => setHighlight?.({ chain: mutation.chain as string, residue: mutation.position as number })}
                    className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors"
                  >
                    <Crosshair className="w-3 h-3" />
                    Re-focus
                  </button>
                )}
              </div>

              {analysisLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-300 py-3">
                  <span className="w-3 h-3 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
                  Mapping this mutation onto the selected structure…
                </div>
              )}

              {!analysisLoading && analysisError && (
                <div className="flex gap-2 p-2.5 rounded-lg bg-amber-400/10 border border-amber-300/20">
                  <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-100">{analysisError}</div>
                </div>
              )}

              {!analysisLoading && !analysisError && analysis && (
                <div className="space-y-4">
                  {analysis.sequence_warning && (
                    <div className="p-2.5 rounded-lg bg-amber-400/10 border border-amber-300/20 text-xs text-amber-100">
                      {analysis.sequence_warning}
                    </div>
                  )}
                  {analysis.analysis_warning && (
                    <div className="p-2.5 rounded-lg bg-slate-400/10 border border-slate-300/20 text-xs text-slate-200">
                      {analysis.analysis_warning}
                    </div>
                  )}
                  {analysis.structure.length === 0 && (
                    <div className="rounded-lg border border-[#3c5263] bg-[#121a23] p-3 text-xs text-slate-400">
                      No physical region is available to highlight for this mutation.
                    </div>
                  )}
                  {analysis.structure.map((location) => (
                    <div key={`${location.chain}-${location.residue.position}`} className="space-y-3">
                      {location.mutation && (
                        <div className="text-[10px] uppercase tracking-widest text-cyan-200">
                          Mapped change · {location.mutation.original}{location.mutation.position}{location.mutation.new}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-[#3c5263] bg-[#121a23] p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">Chain</div>
                          <div className="font-mono text-sm text-cyan-200 mt-1">{location.chain}</div>
                        </div>
                        <div className="rounded-lg border border-[#3c5263] bg-[#121a23] p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">Residue</div>
                          <div className="font-mono text-sm text-cyan-200 mt-1">
                            {location.residue.name}{location.residue.position}
                          </div>
                        </div>
                      </div>

                      {analysis.domain && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                            Protein domain
                          </div>
                          <div className="text-xs text-slate-200">
                            {analysis.domain.name || 'Annotated domain'} · residues {analysis.domain.start}–{analysis.domain.end}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                          Nearby residues · {location.nearby_residues.length}
                        </div>
                        {location.nearby_residues.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {location.nearby_residues.slice(0, 18).map((nearby) => (
                              <span
                                key={`${nearby.chain}-${nearby.position}-${nearby.residue}`}
                                className="px-2 py-1 rounded-md bg-[#121a23] border border-[#3c5263] text-[10px] font-mono text-slate-200"
                              >
                                {nearby.residue}{nearby.position}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No nearby residues found within 5 Å.</div>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                          Chain interfaces · {location.interfaces.length}
                        </div>
                        {location.interfaces.length > 0 ? (
                          <div className="space-y-1.5">
                            {location.interfaces.map((item) => (
                              <div
                                key={`${item.chain}-${item.partner_chain}`}
                                className="text-xs text-slate-200 rounded-lg bg-[#121a23] border border-[#3c5263] px-2.5 py-2"
                              >
                                Chain {item.chain} contacts chain {item.partner_chain}
                                <span className="text-slate-400"> · {item.partner_residues.length} partner residues</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No chain interface detected within 5 Å.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!analysisLoading && !analysisError && !analysis && (
                <div className="text-xs text-slate-400 py-2">
                  Structural analysis is not available for this record.
                </div>
              )}

              <button
                onClick={handleLoadMutant}
                disabled={modelLoading}
                className="w-full mt-4 px-3 py-2 rounded-lg bg-[#121a23] border border-[#3c5263] text-sm text-slate-200 hover:bg-[#1d2a36] hover:border-cyan-300/40 disabled:opacity-60 disabled:cursor-wait transition-colors"
                >
                <span className="inline-flex items-center justify-center gap-2">
                  {modelLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modelLoading ? 'Loading mutant structure…' : 'Load mutant structure'}
                </span>
              </button>
              {modelError && (
                <div className="flex gap-2 mt-2 p-2.5 rounded-lg bg-amber-400/10 border border-amber-300/20">
                  <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-100">{modelError}</div>
                </div>
              )}
            </div>

            {/* AI Analysis */}
            <div className="rounded-xl border border-[#1a3355] bg-[#0d1829] p-4">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-4 h-4 text-cyan-500/50" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  AI Summary
                </div>
              </div>

              {summaryLoading && (
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}

              {!summaryLoading && summaryError && (
                <div className="flex gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300">{summaryError}</div>
                </div>
              )}

              {!summaryLoading && !summaryError && summary && (
                <div className="prose prose-invert prose-xs max-w-none text-xs text-slate-300 leading-relaxed">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}

              {!summaryLoading && !summaryError && !summary && (
                <p className="text-xs text-slate-500 italic leading-relaxed">No summary available.</p>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  )
}