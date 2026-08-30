import React from 'react'
import { Atom } from 'lucide-react'
import ProteinViewer from './ProteinViewer'

interface Props {
  query?: string | null
  selectedPdb?: string | null
  generatedPdb?: string | null
  highlight?: { chain: string; residue: number } | null
}

export default function CenterViewer({ query, selectedPdb, generatedPdb, highlight }: Props) {
  // Derive label for the top bar
  const pdbId = selectedPdb
    ? selectedPdb.split('/').pop()?.replace('.pdb', '') ?? ''
    : null
  const hasGenerated = !!generatedPdb;
  const hasUrl = !!selectedPdb;
  const hasStructure = hasGenerated || hasUrl;
  console.log({
    generatedPdb,

  });



  return (
    <div className="center-viewer flex-1 p-4 overflow-hidden">
      <div className="viewer-shell h-full rounded-2xl border grid-bg relative overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="viewer-toolbar flex items-center gap-3 px-4 py-3 border-b backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#1a3355]" />
            <div className="w-3 h-3 rounded-full bg-[#1a3355]" />
            <div className="w-3 h-3 rounded-full bg-[#1a3355]" />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {pdbId ? `mol* · ${pdbId}` : query ? `mol* · ${query}` : 'mol* · no selection'}
          </div>
          {pdbId && (
            <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              {pdbId}
            </span>
          )}
        </div>

        {/* Viewer area */}
        {hasStructure ? (
          <div className="flex-1 relative overflow-hidden">
            <ProteinViewer
              pdbUrl={selectedPdb ?? undefined}
              pdbText={generatedPdb ?? undefined}
              highlight={highlight ?? undefined}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
            {query ? (
              // Query active but no structure selected / none available
              <>
                <div className="relative">
                  <div className="empty-state-icon relative w-20 h-20 rounded-full border flex items-center justify-center">
                    <Atom className="w-10 h-10 text-slate-600" strokeWidth={1} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-400 mb-1">
                    No experimental structure available.
                  </div>
                  <div className="text-xs text-slate-600 max-w-xs">
                    No PDB structures were found for this protein. Try a different query.
                  </div>
                </div>
              </>
            ) : (
              // No query yet — default placeholder
              <>
                <div className="relative">
                  <div className="empty-state-icon relative w-20 h-20 rounded-full border border-cyan-500/30 flex items-center justify-center">
                    <Atom className="w-10 h-10 text-cyan-500/40" strokeWidth={1} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-1">Mol* 3D Viewer</div>
                  <div className="text-xs text-slate-300 max-w-xs">
                    Search for a protein above to begin exploring its structure, mutations, and sequence data
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {['BRCA1', 'TP53', 'EGFR', 'KRAS', 'MSH6'].map((example) => (
                    <span key={example} className="quiet-control px-2.5 py-1 rounded-lg border text-xs font-mono">
                      {example}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
