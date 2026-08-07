import { ChatResponse } from '../types'
import { postChat as apiPostChat, APIError } from './api'
import { sessionId } from './SessionService'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Props {
  query: string | null
  setSelectedPdb: (url: string | null) => void
}

export class ChatService {
  /**
   * Send a message to the AI assistant
   */
  async sendMessage(message: string): Promise<ChatResponse> {
    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty')
    }

    try {
      const response = await apiPostChat(message.trim(), sessionId)
      return response
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status >= 500) {
          throw new Error('AI service temporarily unavailable. Please try again.')
        }
      }
      throw error
    }
  }

  /**
   * Generate a unique ID for a message
   */
  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const chatService = new ChatService()
