import React from 'react';
import './loading-animations.css';

export default function LoadingStatus({ status, isLoading }) {
  if (!status) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2 status-fade-in">
      {isLoading && (
        <div className="relative">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin animate-reverse opacity-30" style={{ animationDelay: '0.5s' }} />
        </div>
      )}
      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
        {status || 'Processing...'}
      </p>
    </div>
  );
}