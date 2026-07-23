import React from 'react'
import { Send, Bot, AlertCircle, User } from 'lucide-react'
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

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const message = input.trim()
    if (!message || isLoading) return

    setError(null)
    const userMsg: Message = {
      id: chatService.generateMessageId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(message)
      setMessages((prev) => [...prev, {
        id: chatService.generateMessageId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }])
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Unknown error'
      setError(errText)
      setMessages((prev) => [...prev, {
        id: chatService.generateMessageId(),
        role: 'assistant',
        content: `⚠️ ${errText}`,
        timestamp: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && !isLoading) handleSend()
  }

  return (
    <div className="flex flex-col h-[62vh] gap-3">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400 font-medium">Protein AI Assistant</div>
              <div className="text-xs text-slate-600 mt-1">Ask anything about the protein you're exploring</div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {['What does this protein do?', 'Show me key mutations', 'Explain the structure'].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="px-3 py-1.5 rounded-lg bg-[#0d1b30] border border-[#1a3355] text-xs text-slate-500 hover:text-slate-300 hover:border-[#2a4a6e] transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-100'
                    : 'bg-[#0d1829] border border-[#1a3355] text-slate-300'
                }`}>
                  {msg.role === 'assistant'
                    ? <div className="prose prose-invert prose-xs max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    : msg.content
                  }
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-[#0d1829] border border-[#1a3355]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="space-y-2 border-t border-[#0f2040] pt-3">
        {error && (
          <div className="flex gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300">{error}</div>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this protein… (Ctrl+Enter to send)"
            disabled={isLoading}
            rows={2}
            className="flex-1 p-2.5 rounded-xl bg-[#0d1b30] border border-[#1a3355] text-xs text-white placeholder-slate-700 focus:border-cyan-500/40 focus:outline-none transition resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
