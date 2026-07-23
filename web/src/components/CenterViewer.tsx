import React from 'react'
import { Atom } from 'lucide-react'

export default function CenterViewer({ query }: { query?: string | null }) {
  return (
    <div className="flex-1 p-4 overflow-hidden">
      <div className="h-full rounded-2xl border border-[#0f2040] bg-[#080e1a] grid-bg relative overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0f2040] bg-[#08111e]/80 backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#1a3355]" />
            <div className="w-3 h-3 rounded-full bg-[#1a3355]" />
            <div className="w-3 h-3 rounded-full bg-[#1a3355]" />
          </div>
          <div className="text-xs text-slate-600 font-mono">
            {query ? `mol* · ${query}` : 'mol* · no selection'}
          </div>
          {query && (
            <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              {query}
            </span>
          )}
        </div>

        {/* Viewer area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
          {/* Animated atom icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-500/5 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="relative w-20 h-20 rounded-full border border-cyan-500/20 bg-[#0d1b30]/50 flex items-center justify-center">
              <Atom className="w-10 h-10 text-cyan-500/40" strokeWidth={1} />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-500 mb-1">
              {query ? `Loading structure for "${query}"` : 'Mol* 3D Viewer'}
            </div>
            <div className="text-xs text-slate-700 max-w-xs">
              {query
                ? 'Select a PDB structure from the Structures tab to visualize it here'
                : 'Search for a protein above to begin exploring its structure, mutations, and sequence data'}
            </div>
          </div>

          {!query && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['BRCA1', 'TP53', 'EGFR', 'KRAS', 'MSH6'].map((example) => (
                <span key={example} className="px-2.5 py-1 rounded-lg bg-[#0d1b30] border border-[#1a3355] text-xs font-mono text-slate-500">
                  {example}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
