import React, { useState, useEffect } from 'react';
import { ArtifactService } from '../services/artifactService';
import Button from './ui/Button';

export default function ArtifactPanel({ userId, onArtifactSelect }) {
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifacts();
  }, [userId]);

  const loadArtifacts = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await ArtifactService.getArtifacts(userId);
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArtifactSelect = (artifact) => {
    setSelectedArtifact(artifact);
    onArtifactSelect?.(artifact);
  };

  const handleDelete = async (artifactId) => {
    try {
      await ArtifactService.deleteArtifact(artifactId);
      setArtifacts(prev => prev.filter(a => a.id !== artifactId));
      if (selectedArtifact?.id === artifactId) {
        setSelectedArtifact(null);
      }
    } catch (error) {
      console.error('Failed to delete artifact:', error);
    }
  };

  const renderArtifactPreview = (artifact) => {
    switch (artifact.type) {
      case 'pdf':
        return (
          <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
            <iframe
              src={artifact.metadata.url}
              className="w-full h-full border-none"
              title={artifact.title}
            />
          </div>
        );
      case 'javascript':
        return (
          <div className="w-full h-full bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {artifact.code}
            </pre>
          </div>
        );
      default:
        return (
          <div className="w-full h-full bg-slate-50 p-4 rounded-lg overflow-auto">
            <pre className="text-sm whitespace-pre-wrap">
              {artifact.code}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="w-[500px] border-l border-border bg-slate-100 dark:bg-slate-900/50 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface">
        <h2 className="text-sm font-semibold text-surface-foreground">Artifacts</h2>
        <Button variant="ghost" size="sm" onClick={loadArtifacts}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Artifact List */}
        <div className="w-48 border-r border-border bg-white/50 dark:bg-slate-800/50 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted">Loading...</div>
          ) : artifacts.length === 0 ? (
            <div className="p-4 text-center text-muted text-sm">No artifacts yet</div>
          ) : (
            <div className="p-2 space-y-1">
              {artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    selectedArtifact?.id === artifact.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => handleArtifactSelect(artifact)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-foreground truncate">
                        {artifact.title}
                      </p>
                      <p className="text-[10px] text-muted uppercase">
                        {artifact.type} • v{artifact.version}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(artifact.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Artifact Preview */}
        <div className="flex-1 p-4">
          {selectedArtifact ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-surface-foreground">
                    {selectedArtifact.title}
                  </h3>
                  <p className="text-xs text-muted">
                    {selectedArtifact.type} • Version {selectedArtifact.version}
                  </p>
                </div>
                {selectedArtifact.type === 'pdf' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedArtifact.metadata.url;
                      link.download = `${selectedArtifact.title}.pdf`;
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                )}
              </div>
              <div className="flex-1">
                {renderArtifactPreview(selectedArtifact)}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-muted">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-3 opacity-30">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 18H3.75a1.5 1.5 0 0 1-1.5-1.5V4.5a1.5 1.5 0 0 1 1.5-1.5h5.25a1.5 1.5 0 0 1 1.5 1.5v10.5a3 3 0 0 0 3 3h6.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-.75.75Z" />
                </svg>
                <p className="text-sm">Select an artifact to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}