import React from 'react'
import { History, FlaskConical, ChevronRight, X } from 'lucide-react'

type Props = {
  history: string[]
  onSelectHistory: (q: string) => void
}

export default function LeftSidebar({ history, onSelectHistory }: Props) {
  return (
    <aside className="sidebar-shell w-56 flex-shrink-0 border-r hidden md:flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-5">

        {/* Recent searches */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-2">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Recent</span>
          </div>
          {history.length === 0 ? (
            <div className="px-2 py-3 rounded-lg border border-dashed border-[#1a3355] text-xs text-slate-400 text-center">
              No searches yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => onSelectHistory(h)}
                   className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-[#1d2a36] text-slate-200 hover:text-cyan-300 transition-all duration-100 group"
                >
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-500 flex-shrink-0" />
                  <span className="text-xs font-mono truncate">{h}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Data sources */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-2">
            <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Data Sources</span>
          </div>
          <div className="space-y-0.5">
            {[
              { name: 'UniProt', color: 'bg-indigo-500', status: 'live' },
              { name: 'RCSB PDB', color: 'bg-cyan-500', status: 'live' },
              { name: 'ClinVar', color: 'bg-emerald-500', status: 'live' },
            ].map((src) => (
              <div key={src.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg">
                <span className={`w-1.5 h-1.5 rounded-full ${src.color} flex-shrink-0`} />
                <span className="text-xs text-slate-200">{src.name}</span>
                <span className="ml-auto text-[9px] text-slate-500 font-mono">live</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#2b3b4a]">
        <div className="text-[10px] text-slate-500 text-center font-mono">ProteinIO v0.1</div>
      </div>
    </aside>
  )
}
