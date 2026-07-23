import React from 'react'

export default function CenterViewer({ title }: { title?: string }) {
  return (
    <div className="flex-1 p-4">
      <div className="h-[72vh] rounded-card bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border dark:border-slate-800 p-4">
        <div className="h-full flex flex-col">
          <div className="text-sm text-slate-500 mb-2">Viewer</div>
          <div className="flex-1 rounded bg-black/5 dark:bg-white/3 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="text-lg font-medium">Mol* Viewer Placeholder</div>
              {title && <div className="mt-2 text-sm text-slate-500">{title}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
