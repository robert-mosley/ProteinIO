import React from 'react'
import { Send, Bot, AlertCircle, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { chatService } from '../../services/ChatService'
import { Pocket } from '../../types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Props {
  setSelectedPdb: (url: string | null) => void
  setGeneratedPdb: (pdb: string | null) => void
  setHighlight: (highlight: { chain: string; residue: number } | null) => void
}

interface ChatResponse {
  response: string
  generated_pdb?: string | null
  pockets?: { chain: string; residue: number } | null
}

export default function AIAssistantTab({ setSelectedPdb, setGeneratedPdb, setHighlight }: Props) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [pocketList, setPocketList] = React.useState<Pocket[] | null>(null)
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const downloadPockets = () => {
    if (!pocketList?.length) return
    const data = JSON.stringify(pocketList, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pockets.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const highlightPocketFirstResidue = (pocket: Pocket) => {
    const residueIds = pocket.residue_ids?.trim() ?? ''
    const first = residueIds.split(/\s+/)[0]
    if (!first || !first.includes('_')) return
    const [chain, res] = first.split('_', 2)
    const residueNumber = Number(res)
    if (chain && Number.isFinite(residueNumber)) {
      setHighlight({ chain, residue: residueNumber })
    }
  }

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const message = input.trim()
    if (!message || isLoading) return

    setError(null)
    setPocketList(null)
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
      console.log('AI response:', response)
      if (response?.generated_pdb) {
        setGeneratedPdb(response.generated_pdb)
      }
      setPocketList(response?.pockets_list ?? null)
      if (response?.pockets) {
        console.log('Highlighting pockets (raw):', response.pockets)
        const chain = response.pockets.chain
        const rawResidue = response.pockets.residue as string | number | undefined

        let residueNumber: number | null = null
        if (typeof rawResidue === 'number') {
          residueNumber = rawResidue
        } else if (typeof rawResidue === 'string') {
          const m = rawResidue.match(/(-?\d+)/)
          if (m) residueNumber = parseInt(m[0], 10)
        }

        if (chain && residueNumber && !Number.isNaN(residueNumber)) {
          console.log('Setting highlight:', { chain, residue: residueNumber })
          setHighlight({ chain, residue: residueNumber })
        } else {
          console.warn('Could not determine numeric residue from pockets:', response.pockets)
          setHighlight(null)
        }
      }

      setMessages((prev) => [...prev, {
        id: chatService.generateMessageId(),
        role: 'assistant',
        content: response.response,
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
            {pocketList && pocketList.length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-[#0d1829] p-3 text-xs text-slate-300">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Predicted Pockets</div>
                    <div className="text-slate-500 text-[11px]">{pocketList.length} pocket(s) returned by P2Rank</div>
                  </div>
                  <button
                    onClick={downloadPockets}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 hover:bg-cyan-500/20 hover:text-white"
                  >
                    Download JSON
                  </button>
                </div>
                <div className="space-y-2">
                  {pocketList.slice(0, 5).map((pocket, index) => {
                    const residueCount = pocket.residue_ids?.trim().split(/\s+/).length ?? 0
                    return (
                      <div key={`${pocket.name ?? 'pocket'}-${index}`} className="rounded-xl border border-slate-700 bg-[#0b1423] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-100">{pocket.name ?? `Pocket ${pocket.rank ?? index + 1}`}</div>
                            <div className="text-slate-500 text-[11px]">score: {pocket.score ?? 'n/a'} · probability: {pocket.probability ?? 'n/a'} · residues: {residueCount}</div>
                          </div>
                          <button
                            onClick={() => highlightPocketFirstResidue(pocket)}
                            className="rounded-lg border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            Highlight first residue
                          </button>
                        </div>
                        {pocket.residue_ids && (
                          <div className="mt-2 text-[11px] text-slate-400 break-words">{pocket.residue_ids}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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