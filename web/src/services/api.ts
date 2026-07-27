import { ProteinResponse } from '../types'

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

    return res.json()
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function postChat(message: string, sessionId: string): Promise<{ response: string }> {
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

export { APIError }
