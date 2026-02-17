import React, { useEffect, useRef, useCallback } from 'react';
import Button from "./ui/Button";
import LoadingStatus from "./LoadingStatus";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ResumeArtifactCard from './ResumeArtifactCard';

export default function ChatPanel({
  messages,
  chatInput,
  canSend,
  status,
  isLoading,
  quickPrompts,
  onChatInputChange,
  onChatKeyDown,
  onSend,
  onQuickPrompt,
  onPreviewResume,
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
                  <div className={`px-4 py-3 text-[13px] leading-relaxed prose prose-sm max-w-none dark:prose-invert ${isUser
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-md shadow-md shadow-indigo-500/20 prose-p:text-white prose-a:text-white prose-code:text-white prose-strong:text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-md'
                    }`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 1. Checklists (Actions)
                        ul: ({ node, className, children, ...props }) => {
                          const hasCheckbox = children?.some(child =>
                            child?.props?.node?.tagName === 'input' && child?.props?.type === 'checkbox'
                          );
                          return <ul className={`${className} ${hasCheckbox ? 'list-none pl-0 space-y-1' : 'list-disc pl-4 space-y-1'}`} {...props}>{children}</ul>
                        },
                        li: ({ node, children, ...props }) => {
                          return <li className="marker:text-indigo-400" {...props}>{children}</li>
                        },
                        // 2. Headings
                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-4 mb-2 first:mt-0" {...props} />,
                        // 3. Blockquotes (Tips/Insights)
                        blockquote: ({ node, ...props }) => (
                          <div className="flex gap-2 my-2 pl-3 py-2 border-l-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-r-md">
                            <span className="text-emerald-500">💡</span>
                            <blockquote className="text-xs text-slate-600 dark:text-slate-300 italic not-italic" {...props} />
                          </div>
                        ),
                        // 4. Code Blocks (Snippets)
                        code: ({ node, inline, className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          if (inline) {
                            return <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px] font-mono text-pink-500" {...props}>{children}</code>
                          }
                          return (
                            <div className="relative group my-2">
                              <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-mono">{match ? match[1] : 'text'}</div>
                              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            </div>
                          )
                        },
                        // 5. Tables
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left text-xs" {...props} />
                          </div>
                        ),
                        th: ({ node, ...props }) => <th className="bg-slate-50 dark:bg-slate-800 p-2 font-semibold border-b border-r border-slate-200 dark:border-slate-700 last:border-r-0" {...props} />,
                        td: ({ node, ...props }) => <td className="p-2 border-b border-r border-slate-200 dark:border-slate-700 last:border-r-0 last:border-b-0" {...props} />,
                        // 6. Links
                        a: ({ node, ...props }) => <a className="text-indigo-500 hover:text-indigo-600 underline decoration-indigo-300 underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>

                    {/* Artifact Card (Resume Snapshot) */}
                    {message.resumeData && (
                      <div className="mt-3">
                        <ResumeArtifactCard
                          title="Resume Updated"
                          version={null} // We could track versions if we had them
                          onClick={() => onPreviewResume && onPreviewResume(message.resumeData)}
                        />
                      </div>
                    )}
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
              disabled={!canSend || isLoading}
              className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
              </svg>
            </button>
          </div>
          <LoadingStatus status={status} isLoading={isLoading} />
          {!status && !isLoading && (
            <p className="text-[10px] text-center text-muted mt-2 opacity-60">
              AI can make mistakes. Review generated text.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
