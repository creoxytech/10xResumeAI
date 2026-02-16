import React, { useEffect, useRef, useCallback } from 'react';
import Button from "./ui/Button";

export default function ChatPanel({
  messages,
  chatInput,
  canSend,
  status,
  quickPrompts,
  onChatInputChange,
  onChatKeyDown,
  onSend,
  onQuickPrompt,
}) {
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [chatInput, autoResize]);

  const showEmptyState = messages.length <= 1;

  return (
    <section className="flex flex-col h-full w-full bg-surface relative" aria-label="Resume assistant chat">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain scale-150" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-foreground leading-tight">Resume Assistant</h2>
            <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              Online
            </p>
          </div>
        </div>
      </header>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto px-4 md:px-5 py-5 scroll-smooth scrollbar-hide" ref={scrollRef}>

        {/* Empty State */}
        {showEmptyState && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 dark:from-indigo-500/10 dark:to-purple-600/10 flex items-center justify-center mb-5 ring-1 ring-indigo-500/10">
              <span className="text-3xl">✨</span>
            </div>
            <h3 className="text-lg font-semibold text-surface-foreground mb-2">Resume Assistant</h3>
            <p className="text-sm text-muted max-w-[280px] leading-relaxed">
              Ready to help you craft a 10x resume.
              <br />
              <span className="text-xs opacity-70">Try one of the quick prompts below.</span>
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={index}
                className={`flex w-full animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <div className={`flex max-w-[88%] md:max-w-[80%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${isUser
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                    : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm'
                    }`}>
                    {isUser ? 'U' : 'AI'}
                  </div>

                  {/* Bubble */}
                  <div className={`px-4 py-3 text-[13px] leading-relaxed ${isUser
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-md'
                    }`}>
                    {message.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4" />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-20 shrink-0">

        {/* Quick Prompts — scrollable chips */}
        {quickPrompts && quickPrompts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 scrollbar-hide">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onQuickPrompt(prompt)}
                className="flex-shrink-0 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-[11px] font-medium text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-sm active:scale-[0.97]"
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="px-4 pb-3 pt-1">
          <div className="relative flex items-end bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-400 transition-all">
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={onChatInputChange}
              onKeyDown={onChatKeyDown}
              rows={1}
              className="flex-1 min-h-[44px] max-h-[140px] py-3 pl-4 pr-12 bg-transparent border-none resize-none focus:outline-none text-sm text-surface-foreground placeholder:text-slate-400 scrollbar-hide"
              placeholder="Ask me to rewrite a section..."
            />
            <button
              onClick={onSend}
              disabled={!canSend}
              className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
              </svg>
            </button>
          </div>
          {status && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{status}</p>
            </div>
          )}
          {!status && (
            <p className="text-[10px] text-center text-muted mt-2 opacity-60">
              AI can make mistakes. Review generated text.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
