import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Network, ArrowRight, Send, Loader2, Trash2 } from 'lucide-react';
import { ViewState, Dataset, RelationshipSuggestion } from '@/types';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

interface RightPanelProps {
  currentView: ViewState;
  datasets: Dataset[];
  suggestions: RelationshipSuggestion[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_PROMPTS = [
  "What datasets did I upload?",
  "How are my tables related?",
  "Which dataset should I analyze first?",
  "What potential data problems exist?"
];

export function RightPanel({ currentView, datasets, suggestions }: RightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestionsCount = suggestions.length;
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const metadata = {
        datasets: datasets.map(d => ({
          name: d.name,
          type: d.type,
          rowCount: d.rowCount,
          columns: d.headers,
          columnTypes: d.headers.map(h => ({ name: h, type: d.columnProfiles[h]?.type || 'unknown' }))
        })),
        relationships: {
          totalDetected: suggestionsCount,
          pendingReview: pendingCount,
          approved: suggestions.filter(s => s.status === 'accepted').map(s => `${s.sourceDatasetId}.${s.sourceColumn} -> ${s.targetDatasetId}.${s.targetColumn} (${s.type})`)
        }
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text })),
          metadata
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'NOT_CONFIGURED') {
          throw new Error('AI Copilot is not configured yet. Please configure the GEMINI_API_KEY environment variable.');
        }
        throw new Error(data.message || data.error || 'Failed to communicate with AI');
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: data.text }]);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the AI.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const hasDatasets = datasets.length > 0;
  const showInitialState = hasDatasets && messages.length === 0;

  return (
    <aside className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] hidden xl:flex flex-col shrink-0 overflow-hidden shadow-2xl shadow-blue-900/5 relative z-10">
      {/* Header */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Analytics Copilot</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Your AI-powered data assistant</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setMessages([])} title="Clear conversation">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {!hasDatasets ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-blue-500 dark:text-blue-400 opacity-50" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[200px] mx-auto">
                AI Copilot will appear here after data is imported.
              </p>
            </div>
          </div>
        ) : showInitialState ? (
          <div className="flex-1 flex flex-col justify-end gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-sm text-sm text-zinc-800 dark:text-zinc-200 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                <p className="mb-2 font-medium">Your datasets are ready.</p>
                <p>I've reviewed the available dataset structure and relationships.</p>
                <p className="mt-2 font-medium">What would you like to explore?</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Suggested</span>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-sm bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-700 dark:text-zinc-300 p-3 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                >
                  <span className="line-clamp-1 pr-2">{prompt}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col max-w-[90%]", msg.role === 'user' ? "self-end" : "self-start")}>
                <div className={cn(
                  "p-3 rounded-2xl text-sm shadow-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-br-sm" 
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-200/50 dark:border-zinc-800/50"
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-body prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col self-start max-w-[85%]">
                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-sm border border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm">
                <p className="font-semibold mb-1">Connection Error</p>
                <p>{error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {hasDatasets && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e]">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Copilot..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50"
            />
            <Button 
              type="submit" 
              size="icon" 
              className={cn(
                "h-8 w-8 shrink-0 rounded-lg transition-all",
                input.trim() && !isLoading ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
              )}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-[10px] text-zinc-400 text-center mt-2 font-medium">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      )}
    </aside>
  );
}
