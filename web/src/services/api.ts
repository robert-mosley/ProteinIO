import { ChatResponse, ProteinResponse } from '../types'

// Vite proxies /api to FastAPI during development. In production the built
// React app is served by FastAPI itself, so API requests use the same origin.
const API_BASE = import.meta.env.DEV ? '/api' : ''

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

export async function fetchProtein(query: string): Promise<ProteinResponse> {
  try {
    const res = await fetch(`${API_BASE}/getProtein`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })

    if (!res.ok) {
      if (res.status === 404) {
        throw new APIError(404, `Protein "${query}" not found`)
      }
      throw new APIError(res.status, 'Failed to fetch protein')
    }
    console.log("fetchProtein response", res);

    return res.json()
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function postChat(message: string, sessionId: string): Promise<ChatResponse> {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "query": message, "session_id": sessionId })
    })

    if (!res.ok) {
      throw new APIError(res.status, 'Failed to send chat message')
    }

    return res.json()
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function setCurrentPdb(pdb: string, sessionId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/set_current_pdb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdb, session_id: sessionId })
    })

    if (!res.ok) {
      throw new APIError(res.status, 'Failed to update current PDB')
    }
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getMutationInfo(accession: string, sessionId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/mutation_query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accession, session_id: sessionId })
    })

    if (!res.ok) {
      throw new APIError(res.status, 'Failed to fetch mutation info')
    }

    return res.json()
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export { APIError }
