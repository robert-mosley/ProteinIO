import React from 'react'
import TopNav from '../components/TopNav'
import LeftSidebar from '../components/LeftSidebar'
import CenterViewer from '../components/CenterViewer'
import RightPanel from '../components/RightPanel'
import { useNavigate } from 'react-router-dom'

export default function Dashboard(){
  const [query, setQuery] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState<string | undefined>(undefined)

  function handleSearch(q: string){
    const val = q.trim() || null
    setQuery(val)
    setTitle(val ? `Protein: ${val}` : undefined)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav onSearch={handleSearch} />
      <div className="flex flex-1">
        <LeftSidebar />
        <CenterViewer title={title} />
        <RightPanel proteinQuery={query} />
      </div>
    </div>
  )
}
