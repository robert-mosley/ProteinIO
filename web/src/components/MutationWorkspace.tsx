import React from 'react'
import { X, Dna, FlaskConical, BrainCircuit, ExternalLink } from 'lucide-react'
import { Mutation } from '../types'

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
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 leading-relaxed">{children}</div>
    </div>
  )
}

export default function MutationWorkspace({ mutation, onClose }: Props) {
  const visible = mutation !== null

  // Close on Escape
  React.useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
        onClick={onClose}
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
            onClick={onClose}
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
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
                3D Structure
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                Residue highlighting coming soon.
              </div>
            </div>

            {/* AI Analysis */}
            <div className="rounded-xl border border-[#1a3355] bg-[#0d1829] p-4">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-4 h-4 text-cyan-500/50" />
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  AI Analysis
                </div>
              </div>
              <p className="text-xs text-slate-500 italic leading-relaxed">
                Prediction models will be available in a future release.
              </p>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
