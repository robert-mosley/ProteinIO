import { getMutationInfo } from "./api"
import { sessionId } from "./SessionService";


export class MutationInfoService {
  async MutationInfo(sequence: string, position: number, new_residue: string): Promise<any> {
    try {
      console.log("MutationInfoService called with beee", sequence, position, new_residue);
      const response = await getMutationInfo(sequence, position, new_residue)
      return response
    } catch (error) {
      throw error
    }
  }
}

export const mutationInfoService = new MutationInfoService()