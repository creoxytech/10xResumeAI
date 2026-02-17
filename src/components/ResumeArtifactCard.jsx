import React from 'react';

export default function ResumeArtifactCard({ title, version, onClick, onDownload, type = 'pdf' }) {
    return (
        <div
            className="group relative flex items-center gap-3 p-3 my-3 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer overflow-hidden"
            onClick={onClick}
        >
            {/* Left Accent Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50 group-hover:bg-indigo-500 transition-colors" />

            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {title || "Resume Updated"}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted">
                    <span>Click to open preview</span>
                    {version && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span>Version {version}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Action / Arrow */}
            <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
            </div>
        </div>
    );
}
