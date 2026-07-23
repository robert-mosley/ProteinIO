import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { ProteinResponse } from '../types'
import { proteinService } from '../services/ProteinService'

/**
 * Hook to search for and fetch protein data
 * Only fires when query is provided and non-empty
 */
export function useProtein(query: string | null): UseQueryResult<ProteinResponse, Error> {
  return useQuery<ProteinResponse, Error>({
    queryKey: ['protein', query],
    queryFn: async () => {
      if (!query) throw new Error('No query provided')
      return proteinService.search(query)
    },
    enabled: !!query?.trim(),
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  })
}
