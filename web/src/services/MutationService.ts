import { getMutationInfo } from "./api"
import { sessionId } from "./SessionService";


export class MutationInfoService {
  async MutationInfo(sequence: string, protein_change: string): Promise<any> {
    try {
      console.log("MutationInfoService called with beee", sequence, protein_change);
      const response = await getMutationInfo(sequence, protein_change)
      return response
    } catch (error) {
      throw error
    }
  }
}

export const mutationInfoService = new MutationInfoService()