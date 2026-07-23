import React from 'react'

export default function LeftSidebar() {
  return (
    <aside className="w-64 p-4 border-r dark:border-slate-800 hidden md:block">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Protein Search</h4>
          <div className="mt-2 text-sm text-slate-500">Use the top search to find proteins</div>
        </div>
        <div>
          <h4 className="text-sm font-medium">Recently Viewed</h4>
          <div className="mt-2 text-sm text-slate-500">(placeholder)</div>
        </div>
        <div>
          <h4 className="text-sm font-medium">Saved Projects</h4>
          <div className="mt-2 text-sm text-slate-500">(placeholder)</div>
        </div>
        <div className="mt-6 text-xs text-slate-400">Projects · Mutation Workspace · Experiments · Settings (Coming Soon)</div>
      </div>
    </aside>
  )
}
