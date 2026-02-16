import React, { useEffect, useState, useCallback, useRef } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import Button from "./ui/Button";

// Register fonts — handle Vite ESM wrapping
pdfMake.vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.default?.pdfMake?.vfs || pdfFonts;

// ─── Build doc definition (for PDF download) ──────
function buildDocDef(text) {
  if (!text?.trim()) {
    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [{ text: 'Your resume will appear here...', color: '#94a3b8', fontSize: 14, alignment: 'center', margin: [0, 300, 0, 0] }],
    };
  }

  const lines = text.split('\n');
  const content = [];
  let isFirst = true;

  for (const line of lines) {
    const t = line.trim();
    if (!t) { content.push({ text: ' ', fontSize: 6 }); continue; }

    const isHeader = /^[A-Z\s&\/\-]{3,}$/.test(t) || /^[A-Z][A-Za-z\s&\/\-]+:$/.test(t);

    if (isFirst) {
      content.push({ text: t, fontSize: 22, bold: true, color: '#1e293b', alignment: 'center', margin: [0, 0, 0, 2] });
      isFirst = false;
    } else if (isHeader) {
      content.push({ text: t.replace(/:$/, ''), fontSize: 12, bold: true, color: '#4338ca', margin: [0, 10, 0, 4], decoration: 'underline', decorationColor: '#c7d2fe' });
    } else if (/^[•\-*]\s/.test(t)) {
      content.push({ text: '  •  ' + t.replace(/^[•\-*]\s*/, ''), fontSize: 10, color: '#334155', margin: [8, 1, 0, 1] });
    } else if (t.includes('|') || t.includes('·')) {
      content.push({ text: t, fontSize: 9, color: '#64748b', alignment: content.length <= 2 ? 'center' : 'left', margin: [0, 0, 0, 2] });
    } else {
      content.push({ text: t, fontSize: 10, color: '#334155', margin: [0, 1, 0, 1], lineHeight: 1.3 });
    }
  }

  return { pageSize: 'A4', pageMargins: [40, 40, 40, 40], content };
}

// ─── Escape HTML special chars ─────────────────────
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Convert resume text to formatted HTML ─────────
function textToHtml(text) {
  if (!text?.trim()) {
    return '<div class="rp-empty">Click here to start writing your resume…</div>';
  }

  const lines = text.split('\n');
  const parts = [];
  let isFirst = true;
  let lineIdx = 0;

  for (const line of lines) {
    const t = line.trim();
    lineIdx++;

    if (!t) {
      parts.push('<div class="rp-spacer"><br></div>');
      continue;
    }

    const isHeader = /^[A-Z\s&\/\-]{3,}$/.test(t) || /^[A-Z][A-Za-z\s&\/\-]+:$/.test(t);

    if (isFirst) {
      parts.push(`<div class="rp-name">${esc(t)}</div>`);
      isFirst = false;
    } else if (lineIdx <= 3 && (t.includes('|') || t.includes('·') || t.includes('@'))) {
      parts.push(`<div class="rp-contact">${esc(t)}</div>`);
    } else if (isHeader) {
      parts.push(`<div class="rp-section">${esc(t.replace(/:$/, ''))}</div>`);
    } else if (/^[•\-*]\s/.test(t)) {
      parts.push(`<div class="rp-bullet"><span class="rp-bullet-dot">•</span> ${esc(t.replace(/^[•\-*]\s*/, ''))}</div>`);
    } else if (t.includes('|') || t.includes('·')) {
      parts.push(`<div class="rp-meta">${esc(t)}</div>`);
    } else {
      parts.push(`<div class="rp-text">${esc(t)}</div>`);
    }
  }

  return parts.join('');
}

// ─── Component ─────────────────────────────────────
export default function CanvasPanel({ canvasText, onCanvasTextChange, onClosePreview, resumeDesign }) {
  const wordCount = canvasText?.trim() ? canvasText.trim().split(/\s+/).length : 0;
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  // PDF Blob URL state
  const [pdfUrl, setPdfUrl] = useState(null);

  // Transform State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Free movement translation
  const [manualZoom, setManualZoom] = useState(false); // If true, disable auto-resize
  const [isPanning, setIsPanning] = useState(false); // Toggle between Edit/Pan

  const isInternalEdit = useRef(false);
  const isEditing = useRef(false);

  // Panning refs
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startTranslate = useRef({ x: 0, y: 0 });
  const scrollPos = useRef({ left: 0, top: 0 }); // Keeping for safety, though unused in new logic

  // Generate PDF Blob URL when resumeDesign changes
  useEffect(() => {
    if (resumeDesign) {
      try {
        const pdfDocGenerator = pdfMake.createPdf(resumeDesign);
        pdfDocGenerator.getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url + '#toolbar=0&navpanes=0&view=FitH');
        });
      } catch (e) {
        console.error("Error generating PDF preview:", e);
      }
    } else {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    }
  }, [resumeDesign]);


  // Responsive scaling logic
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || manualZoom) return; // Don't auto-resize if zoomed manually
      const containerWidth = containerRef.current.clientWidth;
      const padding = 32;
      const targetWidth = 794; // A4 width in px

      const fitScale = (containerWidth - padding) / targetWidth;
      const newScale = Math.min(1, Math.max(0.4, fitScale));
      setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [manualZoom]);

  const handleZoomIn = () => {
    setManualZoom(true);
    setScale(s => Math.min(2.5, s + 0.1));
  };

  const handleZoomOut = () => {
    setManualZoom(true);
    setScale(s => Math.max(0.3, s - 0.1));
  };

  const handleFit = () => {
    setManualZoom(false);
    // Trigger resize logic immediately to re-fit
    setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
  };

  // Update HTML content (Legacy Text Mode)
  useEffect(() => {
    if (resumeDesign) return; // Skip if in design mode
    if (isInternalEdit.current || !editorRef.current) return;
    editorRef.current.innerHTML = textToHtml(canvasText);
  }, [canvasText, resumeDesign]);

  // Handle Edit Input
  const handleInput = useCallback(() => {
    if (!editorRef.current || !onCanvasTextChange) return;
    isInternalEdit.current = true;
    isEditing.current = true;
    const text = editorRef.current.innerText.replace(/\u00A0/g, ' ');
    onCanvasTextChange(text);
    requestAnimationFrame(() => { isInternalEdit.current = false; });
  }, [onCanvasTextChange]);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    if (editorRef.current) {
      editorRef.current.innerHTML = textToHtml(editorRef.current.innerText.replace(/\u00A0/g, ' '));
    }
  }, []);

  // ─── Pan Handlers (Mouse & Touch) ────────────────
  const handleStart = (clientX, clientY) => {
    if (!isPanning || !containerRef.current) return;
    isDragging.current = true;
    startPos.current = { x: clientX, y: clientY };
    startTranslate.current = { x: position.x, y: position.y }; // Capture current translate
    containerRef.current.style.cursor = 'grabbing';
  };

  const handleMove = useCallback((clientX, clientY) => {
    if (!isDragging.current || !isPanning) return;

    // Calculate delta
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;

    // Update position directly
    setPosition({
      x: startTranslate.current.x + dx,
      y: startTranslate.current.y + dy
    });
  }, [isPanning]);

  const handleEnd = () => {
    isDragging.current = false;
    if (containerRef.current && isPanning) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  // Mouse Wrappers
  const onMouseDown = (e) => handleStart(e.pageX, e.pageY);
  const onMouseMove = (e) => {
    if (isDragging.current) e.preventDefault();
    handleMove(e.pageX, e.pageY);
  };
  const onMouseUp = handleEnd;

  // Touch Wrappers
  const onTouchStart = (e) => {
    if (e.touches.length === 1) handleStart(e.touches[0].pageX, e.touches[0].pageY);
  };
  const onTouchEnd = handleEnd;

  // Manually attach non-passive touch move handler
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onTouchMoveNonPassive = (e) => {
      if (isDragging.current && e.touches.length === 1) {
        e.preventDefault(); // Stop scrolling
        handleMove(e.touches[0].pageX, e.touches[0].pageY);
      }
    };

    node.addEventListener('touchmove', onTouchMoveNonPassive, { passive: false });
    return () => node.removeEventListener('touchmove', onTouchMoveNonPassive);
  }, [handleMove]);

  // Block Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (resumeDesign) {
      try {
        pdfMake.createPdf(resumeDesign).download('resume.pdf');
      } catch (e) {
        console.error("Error downloading PDF:", e);
        alert("Failed to generate PDF. The design might be invalid.");
      }
    } else {
      pdfMake.createPdf(buildDocDef(canvasText)).download('resume.pdf');
    }
  }, [canvasText, resumeDesign]);

  return (
    <section className="flex flex-col h-full w-full bg-slate-100 dark:bg-slate-900/50" aria-label="Resume preview">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onClosePreview}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Button>
          <div className="hidden md:block">
            <h2 className="font-semibold text-sm text-surface-foreground">Resume Preview</h2>
            <p className="text-xs text-muted">{resumeDesign ? 'AI Generated Design' : `${wordCount} words · ${isPanning ? 'Drag to move' : 'Click to edit'}`}</p>
          </div>
          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
            <button onClick={handleZoomOut} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500" title="Zoom Out">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.75 9.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" /></svg>
            </button>
            <span className="text-[10px] font-medium w-8 text-center tabular-nums text-slate-600 dark:text-slate-400">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500" title="Zoom In">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
            </button>
            {manualZoom && (
              <button onClick={handleFit} className="px-2 py-1 text-[10px] hover:bg-white dark:hover:bg-slate-700 rounded-md text-indigo-500 font-medium ml-1" title="Fit to width">
                Fit
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pan Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPanning(!isPanning)}
            className={`gap-2 ${isPanning ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'text-slate-500'}`}
            title={isPanning ? "Switch to Edit Mode" : "Switch to Pan Mode"}
          >
            {isPanning ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="currentColor" className="w-5 h-5">
                <path d="M28.09,9.74a4,4,0,0,0-1.16.19c-.19-1.24-1.55-2.18-3.27-2.18A4,4,0,0,0,22.13,8,3.37,3.37,0,0,0,19,6.3a3.45,3.45,0,0,0-2.87,1.32,3.65,3.65,0,0,0-1.89-.51A3.05,3.05,0,0,0,11,9.89v.91c-1.06.4-4.11,1.8-4.91,4.84s.34,8,2.69,11.78a25.21,25.21,0,0,0,5.9,6.41.9.9,0,0,0,.53.17H25.55a.92.92,0,0,0,.55-.19,13.13,13.13,0,0,0,3.75-6.13A25.8,25.8,0,0,0,31.41,18v-5.5A3.08,3.08,0,0,0,28.09,9.74ZM29.61,18a24,24,0,0,1-1.47,9.15A12.46,12.46,0,0,1,25.2,32.2H15.47a23.75,23.75,0,0,1-5.2-5.72c-2.37-3.86-3-8.23-2.48-10.39A5.7,5.7,0,0,1,11,12.76v7.65a.9.9,0,0,0,1.8,0V9.89c0-.47.59-1,1.46-1s1.49.52,1.49,1v5.72h1.8V8.81c0-.28.58-.71,1.46-.71s1.53.48,1.53.75v6.89h1.8V10l.17-.12a2.1,2.1,0,0,1,1.18-.32c.93,0,1.5.44,1.5.68l0,6.5H27V11.87a1.91,1.91,0,0,1,1.12-.33c.86,0,1.52.51,1.52.94Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            )}
            <span className="hidden md:inline">{isPanning ? "Pan Mode" : "Edit Mode"}</span>
          </Button>

          <Button variant="primary" size="sm" onClick={handleDownloadPdf} className="gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            <span className="hidden md:inline">Download</span>
            <span className="md:hidden">PDF</span>
          </Button>
        </div>
      </header>

      {/* Paper area with scaling */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-hidden flex items-center justify-center p-0 relative"
        style={{
          background: 'repeating-conic-gradient(rgba(0,0,0,.03) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
          cursor: isPanning ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none' // Important for free movement
        }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform'
          }}
        >
          {resumeDesign ? (
            <div
              className="resume-paper"
              style={{
                pointerEvents: isPanning ? 'none' : 'auto',
                padding: 0,
                overflow: 'hidden',
                backgroundColor: 'white'
              }}
            >
              <iframe
                src={pdfUrl}
                className="w-full h-full border-none block"
                title="Resume Preview"
                style={{
                  backgroundColor: 'white' // Ensure iframe background is white
                }}
              />
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable={!isPanning}
              suppressContentEditableWarning
              spellCheck={false}
              onInput={handleInput}
              onBlur={handleBlur}
              className="resume-paper"
              style={{ pointerEvents: isPanning ? 'none' : 'auto' }}
            />
          )}

        </div>
      </div>
    </section>
  );
}
