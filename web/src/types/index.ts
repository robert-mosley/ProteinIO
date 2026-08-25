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
  protein_change: string
  clinical_significance: string | null
  chain: string
  position: number
  new_residue: string
  sequence: string
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
export interface Pocket {
  name?: string
  rank?: number
  score?: number
  probability?: number
  residue_ids?: string
  surf_atoms?: number
  surf_atom_ids?: string
  [key: string]: any
}

export interface ChatResponse {
  response: string
  generated_pdb?: string | null
  pockets?: { chain: string; residue: number } | null
  pockets_list?: Pocket[] | null
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  query: string
  timestamp: number
  protein?: Protein
}
