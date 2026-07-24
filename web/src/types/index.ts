/**
 * Protein data from backend
 */
export interface Protein {
  accession: string
  name: string
  sequence: string
  length: number
}

/**
 * PDB structure information
 */
export interface Structure {
  id: string
  title: string
  method: string
  download_url: string
}

/**
 * Known mutation information
 */
export interface Mutation {
  source: string
  accession: string
  title: string
  clinical_significance: string | null
}

/**
 * Full response from /getProtein endpoint
 */
export interface ProteinResponse {
  protein: Protein
  structures: Structure[]
  mutations: Mutation[]
}

/**
 * Chat response from /chat endpoint
 */
export interface ChatResponse {
  response: string
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  query: string
  timestamp: number
  protein?: Protein
}
