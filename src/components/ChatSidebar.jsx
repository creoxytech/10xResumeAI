import React, { useMemo } from 'react';

/** Time-bucket label (Today, Yesterday, Previous 7 Days, etc.) */
function timeBucket(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'Previous 7 Days';
    if (diffDays <= 30) return 'Previous 30 Days';
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ChatSidebar({
    conversations,
    activeId,
    onSelect,
    onNew,
    onDelete,
    onClose,
    loading,
}) {
    // Group conversations by time bucket
    const groups = useMemo(() => {
        const map = new Map();
        for (const c of conversations) {
            const label = timeBucket(c.updated_at);
            if (!map.has(label)) map.set(label, []);
            map.get(label).push(c);
        }
        return [...map.entries()];
    }, [conversations]);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
                <button
                    onClick={onNew}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all active:scale-[0.98]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New chat
                </button>
                <button
                    onClick={onClose}
                    className="ml-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Close sidebar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-hide">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
                        <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-slate-500">Loading chats…</span>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 opacity-40 text-center px-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 mb-2 text-slate-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                        </svg>
                        <p className="text-xs text-slate-500">No conversations yet</p>
                    </div>
                ) : (
                    groups.map(([label, items]) => (
                        <div key={label}>
                            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                            <div className="space-y-0.5">
                                {items.map((conv) => (
                                    <ConversationItem
                                        key={conv.id}
                                        conv={conv}
                                        isActive={conv.id === activeId}
                                        onSelect={onSelect}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function ConversationItem({ conv, isActive, onSelect, onDelete }) {
    const [showMenu, setShowMenu] = React.useState(false);

    return (
        <div className="relative group">
            <button
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-all ${isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                title={conv.title}
            >
                {conv.title || 'Untitled'}
            </button>

            {/* Hover actions */}
            <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 ${showMenu || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-colors"
                    aria-label="More options"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                    </svg>
                </button>
            </div>

            {/* Dropdown */}
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-36 p-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl z-50 animate-fade-in">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(false);
                                onDelete(conv.id);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                            Delete chat
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
