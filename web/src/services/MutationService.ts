import { getMutationInfo } from "./api"
import { sessionId } from "./SessionService";


export class MutationInfoService {
  async MutationInfo(accession: string): Promise<any> {
    try {
      const response = await getMutationInfo(accession, sessionId)
      return response
    } catch (error) {
      throw error
    }
  }
}

export const mutationInfoService = new MutationInfoService()