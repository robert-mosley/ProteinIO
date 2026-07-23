import { ProteinResponse } from '../types'
import { fetchProtein as apiFetchProtein, APIError } from './api'

export class ProteinService {
  /**
   * Search for a protein by query string (accession, name, sequence, etc.)
   */
  async search(query: string): Promise<ProteinResponse> {
    if (!query || !query.trim()) {
      throw new Error('Query cannot be empty')
    }

    try {
      return await apiFetchProtein(query.trim())
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 404) {
          throw new Error(`Protein "${query}" not found. Try searching by UniProt accession or gene name.`)
        }
        if (error.status >= 500) {
          throw new Error('Backend server error. Please try again later.')
        }
      }
      throw error
    }
  }

  /**
   * Format protein sequence for display with line breaks every 50 chars
   */
  formatSequence(sequence: string): string {
    return sequence.replace(/(.{50})/g, '$1\n')
  }

  /**
   * Get color class for structure method
   */
  getMethodColor(method: string): string {
    const lower = method.toLowerCase()
    if (lower.includes('nmr')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    if (lower.includes('cryo')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    if (lower.includes('xray') || lower.includes('x-ray')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
    return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
  }
}

export const proteinService = new ProteinService()
