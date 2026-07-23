import React from 'react'
import { Send, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { chatService } from '../../services/ChatService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function AIAssistantTab() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const message = input.trim()
    if (!message || isLoading) return

    setError(null)
    const userMessage: Message = {
      id: chatService.generateMessageId(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(message)
      const assistantMessage: Message = {
        id: chatService.generateMessageId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
      const errorMessage: Message = {
        id: chatService.generateMessageId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && !isLoading) {
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[60vh] gap-3">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <div className="text-sm">No messages yet</div>
              <div className="text-xs mt-1">Ask a question about the protein</div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3\">
        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900\">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-500 flex-shrink-0 mt-0.5\" />
            <div className="text-xs text-rose-800 dark:text-rose-300\">{error}</div>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something... (Ctrl+Enter to send)\"
          disabled={isLoading}
          rows={2}
          className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm placeholder-slate-500 dark:placeholder-slate-400 focus:border-indigo-500 dark:focus:border-indigo-600 transition outline-none disabled:opacity-50 resize-none\"
        />
        <div className="flex justify-end\">
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition\"
          >
            <Send className="w-4 h-4\" />
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
