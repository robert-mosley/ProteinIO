import { ChatResponse, MutationAnalysis, ProteinResponse } from '../types'

const API_BASE = '/api'

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

export async function getMutationSummary(message: string): Promise<ChatResponse> {
  try {
    const res = await fetch(`${API_BASE}/mutation_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "message": message})
    })

    if (!res.ok) {
      throw new APIError(res.status, 'Failed to get mutation summary')
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

export async function getMutationInfo(sequence: string, protein_change: string): Promise<any> {
  try {
    console.log("getMutationInfo called with", sequence, protein_change);
    const res = await fetch(`${API_BASE}/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence, protein_change })
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

export async function analyzeMutation(
  query: string,
  proteinChange: string,
  sequence: string,
  sessionId: string,
  pdb?: string | null,
  pdbs: string[] = [],
): Promise<MutationAnalysis> {
  try {
    const res = await fetch(`${API_BASE}/analyze_mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        protein_change: proteinChange,
        sequence,
        session_id: sessionId,
        pdb: pdb ?? undefined,
        pdbs,
      }),
    })
    console.log("completed")

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new APIError(res.status, body?.detail || 'Failed to analyze mutation')
    }

    return res.json()
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export { APIError }
