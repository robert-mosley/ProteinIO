import React from 'react'
import { X, Dna, FlaskConical, BrainCircuit, ExternalLink, Crosshair, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Mutation } from '../types'
import { chatService } from '../services/ChatService'
import { MutationInfoService } from '../services/MutationService'
import { sessionId } from '../services/SessionService'

const mutationInfoService = new MutationInfoService()

type Highlight = { chain: string; residue: number }
interface Props {
  mutation: Mutation | null
  onClose: () => void
  /** Wired to ProteinViewer's highlight prop so this workspace can point the 3D view at the mutation's residue. */
  setGeneratedPdb?: (pdb: string) => void
  setHighlight?: (highlight: Highlight | null) => void
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

interface Props {
  mutation: Mutation | null
  onClose: () => void
  /** Wired to ProteinViewer's highlight prop so this workspace can point the 3D view at the mutation's residue. */
  setHighlight?: (highlight: Highlight | null) => void
  setGeneratedPdb?: (pdb: string) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 leading-relaxed">{children}</div>
    </div>
  )
}

export default function MutationWorkspace({ mutation, onClose, setHighlight, setGeneratedPdb }: Props) {
  const visible = mutation !== null

  const [summary, setSummary] = React.useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)

  console.log("mutation ", mutation);

  const hasPosition =
    !!mutation?.chain && typeof mutation?.residue_number === 'number' && Number.isFinite(mutation.residue_number)

  const handleClose = React.useCallback(() => {
    setHighlight?.(null)
    onClose()
  }, [onClose, setHighlight])

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
      setHighlight?.({ chain: mutation.chain as string, residue: mutation.residue_number as number })
    }
    // Intentionally not clearing highlight here on mutation===null — handleClose already does that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation?.accession, mutation?.chain, mutation?.residue_number])

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
      hasPosition ? `Location: chain ${mutation.chain}, residue ${mutation.residue_number}` : '',
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
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
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
            <div className="text-xs font-semibold text-white">Mutation Workspace</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {mutation?.accession || '—'}
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
            <div className="rounded-xl border border-[#1a3355] bg-[#0d1829] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  3D Structure
                </div>
                {hasPosition && (
                  <button
                    onClick={() => setHighlight?.({ chain: mutation.chain as string, residue: mutation.residue_number as number })}
                    className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors"
                  >
                    <Crosshair className="w-3 h-3" />
                    Re-focus
                  </button>
                )}
              </div>
              <button
                  onClick={() => mutationInfoService.MutationInfo(mutation.accession).then((info) => {
                    if (info?.pdb_string) {
                      setGeneratedPdb(info.pdb_string)
                    }
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1b30] border border-[#1a3355] text-sm text-slate-300 hover:bg-[#0f2040] hover:border-[#1a3355]/50 transition-colors"
                >
                  Chain {mutation.chain}, Residue {mutation.residue_number}
              </button>
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